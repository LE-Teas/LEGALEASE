"use server";

import { getAuthState } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyQuery } from "@/lib/rag/classifier";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { retrieveLegalChunks } from "@/lib/rag/retrieval";
import { chatCompletion } from "@/lib/ai/openrouter";
import { getAiConfig } from "@/lib/ai/config";
import { buildGenerationUserPrompt } from "@/lib/rag/prompts";
import { buildCitationLookup, buildSources, validateCitations } from "@/lib/rag/citations";
import { legalAnswerSchema } from "@/lib/ai/schemas";
import type { LegalCitation } from "@/lib/ai/schemas";

export interface RagTestResult {
  ok: boolean;
  error?: string;
  data?: {
    query: string;
    classification: {
      category: string | null;
      confidence: string;
      jurisdictionLevel: string | null;
      province: string | null;
    };
    retrieval: {
      totalFound: number;
      topK: number;
      similarityThreshold: number;
      retrievalLatencyMs: number;
      chunks: Array<{
        chunkId: string;
        documentId: string;
        documentTitle: string;
        sectionNumber: string | null;
        sectionTitle: string | null;
        articleNumber: string | null;
        pageNumber: number | null;
        similarity: number;
        contentSnippet: string;
      }>;
    };
    generation: {
      model: string;
      generationLatencyMs: number;
      rawAnswer: string;
      structuredAnswer: unknown;
      citationsValidated: LegalCitation[];
      sources: Array<Record<string, unknown>>;
      needsLawyer: boolean;
      insufficientContext: boolean;
    };
  };
}

export async function testLegalRagQueryAction(
  query: string
): Promise<RagTestResult> {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    return { ok: false, error: "Admin access required for RAG testing." };
  }

  if (!query || query.trim().length === 0) {
    return { ok: false, error: "Please enter a test legal query." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { ok: false, error: "Admin database unavailable." };
  }

  const cfg = getAiConfig();

  try {
    // 1. Classification
    const classification = classifyQuery(query);

    // 2. Embedding generation + vector retrieval
    const retrievalStart = Date.now();
    const queryVector = await generateEmbedding(query);
    const retrievedChunks = await retrieveLegalChunks(adminClient, {
      queryEmbedding: queryVector,
      category: classification.category,
      jurisdictionLevel: classification.jurisdictionLevel,
      province: classification.province,
      matchCount: cfg.maxRetrievedChunks,
      similarityThreshold: cfg.similarityThreshold,
      debug: true,
    });
    const retrievalLatencyMs = Date.now() - retrievalStart;

    // 3. Prompt construction — buildGenerationUserPrompt returns ChatMessage[]
    //    which includes both the system prompt and user content.
    const messages = buildGenerationUserPrompt({
      question: query,
      chunks: retrievedChunks,
      history: [],
    });

    // 4. OpenRouter Generation
    const generationStart = Date.now();
    const completion = await chatCompletion(messages, {
      jsonObject: true,
      temperature: 0.15,
    });
    const generationLatencyMs = Date.now() - generationStart;

    let structured: unknown = null;
    try {
      structured = JSON.parse(completion.content);
    } catch {
      structured = { answer: completion.content };
    }

    const parsed = legalAnswerSchema.safeParse(structured);
    const answerData = parsed.success
      ? parsed.data
      : {
          answer:
            (structured as { answer?: string })?.answer || completion.content,
          summary: (structured as { summary?: string })?.summary || "",
          legal_category: classification.category ?? "other",
          jurisdiction: classification.jurisdictionLevel ?? "Federal",
          citations: [] as LegalCitation[],
          confidence: "low" as const,
          needs_lawyer: true,
          insufficient_context: true,
        };

    // 5. Validate citations strictly against retrieved chunks
    const citationLookup = buildCitationLookup(retrievedChunks);
    const validatedCitations = validateCitations(
      answerData.citations ?? [],
      citationLookup
    );
    const sources = buildSources(retrievedChunks, validatedCitations);

    return {
      ok: true,
      data: {
        query,
        classification: {
          category: classification.category,
          confidence: classification.confidence,
          jurisdictionLevel: classification.jurisdictionLevel,
          province: classification.province,
        },
        retrieval: {
          totalFound: retrievedChunks.length,
          topK: cfg.maxRetrievedChunks,
          similarityThreshold: cfg.similarityThreshold,
          retrievalLatencyMs,
          chunks: retrievedChunks.map((c) => ({
            chunkId: c.chunkId,
            documentId: c.documentId,
            documentTitle: c.documentTitle,
            sectionNumber: c.sectionNumber,
            sectionTitle: c.sectionTitle,
            articleNumber: c.articleNumber,
            pageNumber: c.pageNumber,
            similarity: Math.round(c.similarity * 1000) / 1000,
            contentSnippet:
              c.content.slice(0, 200) + (c.content.length > 200 ? "..." : ""),
          })),
        },
        generation: {
          model: cfg.openRouterModel,
          generationLatencyMs,
          rawAnswer: answerData.answer,
          structuredAnswer: answerData,
          citationsValidated: validatedCitations,
          sources,
          needsLawyer: answerData.needs_lawyer,
          insufficientContext: answerData.insufficient_context,
        },
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "RAG testing encountered an error.";
    return { ok: false, error: message };
  }
}
