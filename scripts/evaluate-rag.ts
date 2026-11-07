/**
 * RAG retrieval evaluation.
 *
 * Runs a fixed question set through the REAL retrieval path (embedding +
 * match_legal_chunks) and scores retrieval quality: Hit@K, Mean Reciprocal
 * Rank, and per-category accuracy. Requires a populated, verified knowledge
 * base and configured embedding keys.
 *
 * Usage:
 *   npm run evaluate:rag
 *   npm run evaluate:rag -- --k=5 --questions=tests/rag/legal-questions.json
 *   npm run evaluate:rag -- --report=evaluation-report.json
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { loadEnv } from "@/scripts/lib/load-env";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getAiConfig } from "@/lib/ai/config";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { retrieveLegalChunks } from "@/lib/rag/retrieval";

loadEnv();

const RAW = process.argv.slice(2);
const K = Number(RAW.find((a) => a.startsWith("--k="))?.slice(4) ?? 5);
const questionsPath =
  RAW.find((a) => a.startsWith("--questions="))?.slice(12) ?? null;

const DEFAULT_EVAL_QUESTIONS: EvalQuestion[] = [
  {
    category: "constitutional_law",
    question: "What are the fundamental rights guaranteed under the Constitution of Pakistan?",
    expected_documents: ["the_constitution_of_the_islamic_republic_of_pakistan"],
  },
  {
    category: "property_law",
    question: "What is the procedure for enforcement of women property rights in Pakistan?",
    expected_documents: ["enforcement_of_womens_property_rights_act_2020"],
  },
  {
    category: "criminal_law",
    question: "What measures are enacted for investigation and special trial of anti-rape cases?",
    expected_documents: ["anti_rape_investigation_and_trial_act_2021"],
  },
  {
    category: "family_law",
    question: "How are letters of administration and succession certificates obtained?",
    expected_documents: ["letters_of_administration_and_succession_certificates_act_2020"],
  },
  {
    category: "corporate_law",
    question: "What legal provisions govern the China Pakistan Economic Corridor Authority?",
    expected_documents: ["china_pakistan_economic_corridor_authority_act_2021"],
  },
];
const reportFile = RAW.find((a) => a.startsWith("--report="))?.slice(9) ?? null;

interface EvalQuestion {
  category: string;
  question: string;
  expected_documents: string[];
}

interface PerQuestionResult {
  category: string;
  question: string;
  expected: string[];
  retrieved: string[];
  hit: boolean;
  rank: number | null;
  topSimilarity: number;
}

async function main(): Promise<void> {
  console.log("LegalEase — RAG retrieval evaluation");
  console.log("=====================================");

  if (!isAdminConfigured()) {
    console.error("ABORTED: SUPABASE_SERVICE_ROLE_KEY is required.");
    process.exit(1);
  }

  const cfg = getAiConfig();
  if (!cfg.embeddingApiKey) {
    console.error("ABORTED: no embedding API key configured.");
    process.exit(1);
  }

  const admin = createAdminClient()!;
  const questions: EvalQuestion[] = questionsPath
    ? (JSON.parse(fs.readFileSync(questionsPath, "utf8")) as EvalQuestion[])
    : DEFAULT_EVAL_QUESTIONS;
  console.log(`Questions : ${questions.length}`);
  console.log(`Embedding : ${cfg.embeddingModel} (${cfg.embeddingDimensions}d, ${cfg.embeddingProvider})`);
  console.log(`Hit@K     : ${K} · threshold ${cfg.similarityThreshold}\n`);

  const { data: docs } = await admin
    .from("legal_documents")
    .select("id, normalized_title, verification_status, processing_status");
  const idToNormalized = new Map<string, string>();
  for (const d of docs ?? []) {
    idToNormalized.set(String(d.id), String(d.normalized_title));
  }

  const results: PerQuestionResult[] = [];

  for (let index = 0; index < questions.length; index++) {
    const entry = questions[index];
    const prefix = `[${(index + 1).toString().padStart(2, " ")}/${questions.length}]`;

    let embedding: number[];
    try {
      embedding = await generateEmbedding(entry.question);
    } catch {
      console.log(`${prefix} embed failed for: ${entry.question}`);
      results.push({
        category: entry.category,
        question: entry.question,
        expected: entry.expected_documents,
        retrieved: [],
        hit: false,
        rank: null,
        topSimilarity: 0,
      });
      continue;
    }

    const retrieved = await retrieveLegalChunks(admin, {
      queryEmbedding: embedding,
      matchCount: cfg.maxRetrievedChunks,
      similarityThreshold: cfg.similarityThreshold,
      debug: true,
    });

    const retrievedNormalized = retrieved
      .map((r) => idToNormalized.get(r.documentId))
      .filter((n): n is string => Boolean(n));

    let rank: number | null = null;
    for (const normalized of entry.expected_documents) {
      const found = retrievedNormalized.indexOf(normalized);
      if (found !== -1 && (rank === null || found < rank)) rank = found;
    }

    const hit = rank !== null && rank < K;
    const result: PerQuestionResult = {
      category: entry.category,
      question: entry.question,
      expected: entry.expected_documents,
      retrieved: retrievedNormalized.slice(0, K),
      hit,
      rank: rank !== null && rank < K ? rank + 1 : null,
      topSimilarity: retrieved.length > 0 ? retrieved[0].similarity : 0,
    };
    results.push(result);

    console.log(
      `${prefix} ${hit ? "HIT " : "MISS"} rank=${result.rank ?? "—"} sim=${result.topSimilarity.toFixed(3)} · ${entry.question.slice(0, 70)}`
    );
    if (!hit) {
      console.log(`       expected: ${entry.expected_documents.join(", ")}`);
      console.log(`       retrieved: ${result.retrieved.join(", ") || "none"}`);
    }
  }

  // --- aggregate ------------------------------------------------------------

  const hits = results.filter((r) => r.hit).length;
  const mrrs = results.map((r) => (r.rank ? 1 / r.rank : 0));
  const mrr = mrrs.reduce((a, b) => a + b, 0) / Math.max(1, results.length);

  const perCategory = new Map<string, { total: number; hits: number }>();
  for (const r of results) {
    const entry = perCategory.get(r.category) ?? { total: 0, hits: 0 };
    entry.total += 1;
    if (r.hit) entry.hits += 1;
    perCategory.set(r.category, entry);
  }

  console.log("\n===========================================");
  console.log("EVALUATION SUMMARY");
  console.log("===========================================");
  console.log(`Hit@${K}       : ${hits}/${results.length} (${((hits / Math.max(1, results.length)) * 100).toFixed(1)}%)`);
  console.log(`MRR           : ${mrr.toFixed(3)}`);
  console.log(`Avg top sim   : ${(results.reduce((a, r) => a + r.topSimilarity, 0) / Math.max(1, results.length)).toFixed(3)}`);
  console.log("\nPer category:");
  for (const [category, stats] of perCategory) {
    console.log(
      `  ${category.padEnd(22)} ${stats.hits}/${stats.total} (${((stats.hits / Math.max(1, stats.total)) * 100).toFixed(0)}%)`
    );
  }

  if (reportFile) {
    const report = {
      config: {
        k: K,
        embedding_model: cfg.embeddingModel,
        embedding_provider: cfg.embeddingProvider,
        similarity_threshold: cfg.similarityThreshold,
        match_count: cfg.maxRetrievedChunks,
      },
      aggregate: {
        hitCount: hits,
        total: results.length,
        hitRate: hits / Math.max(1, results.length),
        mrr,
        perCategory: Object.fromEntries(perCategory),
      },
      perQuestion: results,
    };
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\nReport written to ${reportFile}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});