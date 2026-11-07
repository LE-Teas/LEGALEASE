/**
 * LegalEase RAG orchestration — the single entry point the chat API and the
 * evaluation script both use.
 *
 * Pipeline:
 *   history → conversation-aware question rewrite → classification →
 *   embedding → vector retrieval → grounded generation (JSON) →
 *   citation validation → structured answer.
 *
 * All LLM output is validated against the retrieved chunks before anything is
 * persisted or shown to the user.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getAiConfig } from "@/lib/ai/config";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { chatCompletion, GeminiError } from "@/lib/ai/gemini";
import { legalAnswerSchema, type LegalAnswer } from "@/lib/ai/schemas";
import { dedupeChunks, retrieveLegalChunks, type RetrievedChunk } from "@/lib/rag/retrieval";
import { classifyQuery } from "@/lib/rag/classifier";
import {
  buildGenerationUserPrompt,
  buildStandaloneQuestionMessages,
  type ConversationTurn,
} from "@/lib/rag/prompts";
import {
  buildCitationLookup,
  buildSources,
  validateCitations,
} from "@/lib/rag/citations";
import { extractLawyerIntent } from "@/lib/lawyers/lawyer-intent";
import { recommendLawyers, type RecommendedLawyer } from "@/lib/lawyers/recommend-lawyers";

export interface PrivateDocumentContext {
  id: string;
  fileName: string;
  content: string;
}

export interface LegalRagContext {
  supabase: SupabaseClient;
  userId: string;
  conversationId?: string | null;
  question: string;
  /** Optional user-scoped private file for File-Based RAG mode */
  privateDocument?: PrivateDocumentContext | null;
  /** Overrides for tests/evaluation (no LLM rewrite, fixed conversation). */
  skipHistoryRewrite?: boolean;
  debugMode?: boolean;
}

export interface RagAnswer {
  mode: "answer" | "insufficient";
  standaloneQuestion: string;
  classification: ReturnType<typeof classifyQuery>;
  retrieved: {
    count: number;
    categories: string[];
    documents: string[];
    maxSimilarity: number;
  };
  answerText: string;
  summary: string;
  legalCategory: string;
  jurisdiction: string;
  citations: LegalAnswer["citations"];
  sources: Array<Record<string, unknown>>;
  confidence: "high" | "medium" | "low";
  needsLawyer: boolean;
  insufficientContext: boolean;
  llmModel: string;
  recommendedLawyers?: import("@/lib/lawyers/recommend-lawyers").RecommendedLawyer[];
}

export class RagPipelineError extends Error {
  constructor(
    message: string,
    public readonly kind: "config" | "llm" | "retrieval" | "validation" = "llm"
  ) {
    super(message);
    this.name = "RagPipelineError";
  }
}

const MAX_HISTORY_TURNS = (() => {
  const n = Number(process.env.LEGALEASE_MAX_HISTORY_MESSAGES);
  return Number.isFinite(n) && n > 0 ? n : 8;
})();

async function loadRecentHistory(
  supabase: SupabaseClient,
  userId: string,
  conversationId?: string | null
): Promise<ConversationTurn[]> {
  if (!conversationId) return [];

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!conv) return [];

  const { data } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY_TURNS * 2)
    .returns<Array<{ role: "user" | "assistant"; content: string }>>();

  return (data ?? []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0
  );
}

function parseLlmJson(raw: string): Record<string, unknown> {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new RagPipelineError("The model did not return a JSON object.", "validation");
  }
  return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
}

function validateAnswer(raw: Record<string, unknown>): LegalAnswer {
  const result = legalAnswerSchema.safeParse(raw);
  if (!result.success) {
    throw new RagPipelineError(
      `The model returned an answer that failed validation: ${z
        .prettifyError(result.error)
        .slice(0, 400)}`,
      "validation"
    );
  }
  return result.data;
}

async function insufficientAnswer(input: {
  question: string;
  standaloneQuestion: string;
  classification: ReturnType<typeof classifyQuery>;
}): Promise<RagAnswer> {
  let recommendedLawyers: RecommendedLawyer[] = [];
  try {
    const intent = await extractLawyerIntent(input.standaloneQuestion, input.classification);
    intent.needs_lawyer = true;
    recommendedLawyers = await recommendLawyers(intent);
  } catch {
    /* non-fatal */
  }

  return {
    mode: "insufficient",
    standaloneQuestion: input.standaloneQuestion,
    classification: input.classification,
    retrieved: { count: 0, categories: [], documents: [], maxSimilarity: 0 },
    answerText:
      "I could not find sufficient verified legal material in the LegalEase knowledge base to answer your question reliably. " +
      "This happens when the question falls outside the currently loaded laws, or asks for case-specific detail. " +
      "Please reword the question (for example, mention the legal area such as rent, family, or criminal), or contact a qualified lawyer for authoritative guidance.",
    summary: "No sufficient verified material was found to answer this question.",
    legalCategory: "other",
    jurisdiction: "Pakistan",
    citations: [],
    sources: [],
    confidence: "low",
    needsLawyer: true,
    insufficientContext: true,
    llmModel: "none",
    recommendedLawyers,
  };
}

export async function askLegalQuestion(context: LegalRagContext): Promise<RagAnswer> {
  const { supabase, userId, question, conversationId, privateDocument } = context;
  const cfg = getAiConfig();

  if (!cfg.geminiApiKey) {
    throw new RagPipelineError("GEMINI_API_KEY is not configured.", "config");
  }

  const history = await loadRecentHistory(supabase, userId, conversationId);

  // 1 — conversation-aware standalone question.
  let standaloneQuestion = question;
  if (!context.skipHistoryRewrite && history.length > 0) {
    const rewriteMessages = buildStandaloneQuestionMessages({
      history: history.slice(-MAX_HISTORY_TURNS),
      latestQuestion: question,
    });
    if (rewriteMessages) {
      try {
        const res = await chatCompletion(rewriteMessages, { maxTokens: 200, temperature: 0 });
        const rewritten = res.content.trim().replace(/^["'`]+|["'`]+$/g, "");
        if (rewritten.length >= 3 && rewritten.length <= 1000) {
          standaloneQuestion = rewritten;
        }
      } catch {
        // fall back to the raw question; a rewrite failure is non-fatal
      }
    }
  }

  // 2 — classification (retrieval hint).
  const classification = classifyQuery(standaloneQuestion);

  // 3 — embed the retrieval query.
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(standaloneQuestion);
  } catch (err) {
    throw new RagPipelineError(
      `Failed to embed the question: ${err instanceof Error ? err.message : String(err)}`,
      "retrieval"
    );
  }

  // 4 — retrieve. Search the verified corpus. We only narrow by category if the corpus
  // actually returns chunks with that category, otherwise fall back to searching all documents.
  let retrieved = await retrieveLegalChunks(supabase, {
    queryEmbedding,
    matchCount: cfg.maxRetrievedChunks,
    similarityThreshold: cfg.similarityThreshold,
    category: null, // Search across full verified corpus for maximal recall
    jurisdictionLevel: null,
    province: null,
    debug: context.debugMode,
  });

  const chunks = dedupeChunks(retrieved, 4);

  if (privateDocument && privateDocument.content.trim().length > 0) {
    const privateChunk: RetrievedChunk = {
      chunkId: privateDocument.id,
      documentId: privateDocument.id,
      documentTitle: `[Citizen Private File] ${privateDocument.fileName}`,
      content: privateDocument.content.slice(0, 6000),
      sectionNumber: "Private Vault Document",
      articleNumber: null,
      sectionTitle: privateDocument.fileName,
      pageNumber: 1,
      category: "private_document",
      jurisdictionLevel: "user_scoped",
      province: null,
      officialSourceUrl: null,
      versionLabel: "User Upload",
      similarity: 1.0,
      verificationStatus: "verified",
    };
    chunks.unshift(privateChunk);
  }

  if (chunks.length === 0) {
    console.warn("[askLegalQuestion] 0 chunks retrieved for:", standaloneQuestion);
    return await insufficientAnswer({ question, standaloneQuestion, classification });
  }

  console.log(`[askLegalQuestion] Retrieved ${chunks.length} chunks. Top chunk: ${chunks[0].documentTitle} (sim ${chunks[0].similarity})`);

  // 5 — grounded generation.
  const messages = buildGenerationUserPrompt({
    question,
    chunks: chunks.slice(0, cfg.maxContextChunks),
    history: history.slice(-MAX_HISTORY_TURNS).slice(0, 4),
  });

  let llmText: string;
  let llmModel: string;
  try {
    const res = await chatCompletion(messages, { jsonObject: true, maxTokens: 1300, temperature: 0.2 });
    llmText = res.content;
    llmModel = res.model;
  } catch (err) {
    if (err instanceof GeminiError) {
      throw new RagPipelineError(err.message, err.kind === "config" ? "config" : "llm");
    }
    throw err;
  }

  // 6 — parse + validate.
  let parsed: Record<string, unknown>;
  try {
    parsed = parseLlmJson(llmText);
  } catch (err) {
    throw err instanceof RagPipelineError
      ? err
      : new RagPipelineError(`Could not parse the model's answer: ${(err as Error).message}`, "validation");
  }

  console.log("[askLegalQuestion] Parsed LLM output:", {
    summary: parsed.summary,
    insufficient_context: parsed.insufficient_context,
    confidence: parsed.confidence,
    citations_count: Array.isArray(parsed.citations) ? parsed.citations.length : 0,
  });

  const answer = validateAnswer(parsed);

  // If LLM identifies that the knowledge base lacks sufficient context or cannot answer
  if (answer.insufficient_context) {
    console.warn("[askLegalQuestion] LLM reported insufficient_context: true");
    return await insufficientAnswer({ question, standaloneQuestion, classification });
  }
  const lookup = buildCitationLookup(chunks);
  const citations = validateCitations(answer.citations, lookup);
  const sources = buildSources(chunks, citations);

  const categories = [...new Set(chunks.map((c) => c.category))];
  const documents = [...new Set(chunks.map((c) => c.documentTitle))];

  // 7 — Lawyer recommendations (only if legal representation is appropriate)
  let recommendedLawyers: RecommendedLawyer[] = [];
  try {
    const intent = await extractLawyerIntent(standaloneQuestion, classification);
    if (intent.needs_lawyer || answer.needs_lawyer) {
      intent.needs_lawyer = true;
      if (answer.legal_category && answer.legal_category !== "other") {
        intent.legal_category = answer.legal_category;
      }
      recommendedLawyers = await recommendLawyers(intent);
    }
  } catch (err) {
    console.warn("[legal-rag] Lawyer recommendation skipped:", err);
  }

  return {
    mode: "answer",
    standaloneQuestion,
    classification,
    retrieved: {
      count: chunks.length,
      categories,
      documents,
      maxSimilarity: Math.max(...chunks.map((c) => c.similarity), 0),
    },
    answerText: answer.answer,
    summary: answer.summary,
    legalCategory: answer.legal_category,
    jurisdiction: answer.jurisdiction,
    citations,
    sources,
    confidence: answer.confidence,
    needsLawyer: answer.needs_lawyer,
    insufficientContext: answer.insufficient_context,
    llmModel,
    recommendedLawyers,
  };
}
