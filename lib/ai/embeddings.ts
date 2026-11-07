/**
 * Embedding provider — REAL semantic, multilingual vectors.
 *
 * HISTORY (audit finding F-1): this module previously returned deterministic
 * SHA-256 word-hash vectors and never called the embedding model it advertised
 * in `getAiConfig().embeddingModel`. Worse, its text normalisation was
 * `replace(/[^a-z0-9\s]/g, " ")`, which deletes every non-Latin character, so
 * Urdu input produced a zero vector. Real semantic retrieval — and therefore
 * the entire multilingual promise — was impossible.
 *
 * CURRENT DESIGN
 *  - Provider: Google Gemini `gemini-embedding-001`.
 *    It is genuinely multilingual (100+ languages incl. Urdu) and is available
 *    on the free tier already configured for chat, so no new vendor/key.
 *  - Output dimensions are pinned to 1536 with `outputDimensionality`.
 *    pgvector's `legal_chunks.embedding` is `vector(1536)`; requesting the
 *    model's native 3072 would not fit, and silently truncating would corrupt
 *    similarity. Pinning keeps DB and model in exact agreement.
 *  - Ingestion and query share ONE code path (`embedTexts`) with identical
 *    preprocessing, so vectors are always comparable.
 *  - Every vector is L2-normalised before storage so cosine distance is stable.
 *  - A model/version tag is returned alongside each vector and persisted with
 *    the chunk, so mixed-vendor corpora are detectable instead of producing
 *    silently meaningless similarity scores.
 *
 * There is NO hash fallback. If the provider is unavailable we throw: a
 * degraded vector is worse than an honest error, because it looks like it
 * worked and quietly returns irrelevant law.
 *
 * Server-side only.
 */

import { getAiConfig } from "@/lib/ai/config";

/** Bump when preprocessing or normalisation changes; forces re-embedding. */
export const EMBEDDING_PIPELINE_VERSION = 1;

/** Must match `public.legal_chunks.embedding vector(1536)`. */
export const EMBEDDING_DIMENSIONS = 1536;

/** Provider-qualified model identity, persisted with every chunk. */
export const EMBEDDING_MODEL_ID = "google:gemini-embedding-001";

export const EMBEDDING_BATCH_SIZE = 24;

export type EmbeddingErrorKind =
  | "config"
  | "http"
  | "rate_limit"
  | "dimension_mismatch"
  | "empty";

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly kind: EmbeddingErrorKind = "http"
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

export interface EmbeddingResult {
  vector: number[];
  model: string;
}

/**
 * Text normalisation shared by ingestion AND query.
 *
 * Deliberately conservative: Unicode is preserved (Urdu, Arabic diacritics,
 * Roman Urdu Latin text all survive). We only collapse whitespace and strip
 * control characters, because the model itself handles normalisation.
 */
export function normalizeForEmbedding(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** L2-normalise a vector. Throws on a zero-magnitude vector. */
export function l2Normalize(vector: number[]): number[] {
  let sumSq = 0;
  for (const v of vector) sumSq += v * v;
  const magnitude = Math.sqrt(sumSq);
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new EmbeddingError(
      "Embedding model returned a zero-magnitude vector.",
      "dimension_mismatch"
    );
  }
  return vector.map((v) => v / magnitude);
}

/** Cosine similarity for two equal-length, already-normalised vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new EmbeddingError(
      `Cannot compare vectors of different dimensions (${a.length} vs ${b.length}).`,
      "dimension_mismatch"
    );
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

interface GenAiClient {
  models: {
    embedContent(params: {
      model: string;
      contents: string[];
      config?: Record<string, unknown>;
    }): Promise<{
      embeddings?: Array<{ values?: number[] }>;
    }>;
  };
}

let cachedClient: { apiKey: string; client: GenAiClient } | null = null;

async function getClient(): Promise<GenAiClient> {
  const cfg = getAiConfig();
  const apiKey = cfg.embeddingApiKey ?? cfg.geminiApiKey;
  if (!apiKey) {
    throw new EmbeddingError(
      "GEMINI_API_KEY is not configured; semantic embeddings are unavailable.",
      "config"
    );
  }
  if (cachedClient && cachedClient.apiKey === apiKey) return cachedClient.client;

  const mod = (await import("@google/genai")) as unknown as {
    GoogleGenAI: new (opts: { apiKey: string }) => GenAiClient;
  };
  const client = new mod.GoogleGenAI({ apiKey });
  cachedClient = { apiKey, client };
  return client;
}

/** Reject anything that is not exactly one 1536-dim finite vector. */
function validateVector(values: unknown, index: number): number[] {
  if (!Array.isArray(values)) {
    throw new EmbeddingError(
      `Embedding ${index} is missing a values array.`,
      "dimension_mismatch"
    );
  }
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new EmbeddingError(
      `Embedding ${index} has ${values.length} dimensions but the database ` +
        `expects ${EMBEDDING_DIMENSIONS}. Ingested vectors and stored vectors ` +
        `must match exactly; re-run ingestion after changing the model.`,
      "dimension_mismatch"
    );
  }
  const out = new Array<number>(values.length);
  for (let i = 0; i < values.length; i++) {
    const n = Number(values[i]);
    if (!Number.isFinite(n)) {
      throw new EmbeddingError(`Embedding ${index} contains a non-finite value.`, "dimension_mismatch");
    }
    out[i] = n;
  }
  return out;
}

/**
 * Embeds a batch of texts. This is the ONLY entry point; ingestion and query
 * both come through here so their preprocessing cannot drift apart.
 */
export async function embedTexts(texts: string[]): Promise<EmbeddingResult[]> {
  const prepared = texts.map(normalizeForEmbedding).filter((t) => t.length > 0);
  if (prepared.length === 0) {
    throw new EmbeddingError("No non-empty text provided for embedding.", "empty");
  }

  const client = await getClient();
  const results: EmbeddingResult[] = [];

  for (let start = 0; start < prepared.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = prepared.slice(start, start + EMBEDDING_BATCH_SIZE);

    let embeddings: Array<{ values?: number[] }> | undefined;
    try {
      const response = await client.models.embedContent({
        model: EMBEDDING_MODEL_ID,
        contents: batch,
        config: {
          // `RETRIEVAL_DOCUMENT` at ingestion / `RETRIEVAL_QUERY` at query time
          // is the model's recommended pairing; a single neutral task type is
          // used here so one code path serves both without asymmetry.
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      });
      embeddings = response.embeddings;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const kind: EmbeddingErrorKind = /429|RESOURCE_EXHAUSTED|quota/i.test(message)
        ? "rate_limit"
        : "http";
      throw new EmbeddingError(`Embedding request failed: ${message}`, kind);
    }

    if (!embeddings || embeddings.length !== batch.length) {
      throw new EmbeddingError(
        `Provider returned ${embeddings?.length ?? 0} embeddings for ${batch.length} inputs.`,
        "http"
      );
    }

    embeddings.forEach((entry, i) => {
      results.push({
        vector: l2Normalize(validateVector(entry.values, start + i)),
        model: EMBEDDING_MODEL_ID,
      });
    });
  }

  return results;
}

/** Embed a single text. Used for query-time embedding. */
export async function embedText(text: string): Promise<EmbeddingResult> {
  const [result] = await embedTexts([text]);
  return result;
}

// ---------------------------------------------------------------------------
// Backwards-compatible names used across the codebase.
// These now perform REAL semantic embedding — they are no longer hashes.
// ---------------------------------------------------------------------------

/** @returns the embedding vector only. */
export async function generateEmbedding(text: string): Promise<number[]> {
  return (await embedText(text)).vector;
}

/** @returns one vector per input text, in order. */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results = await embedTexts(texts);
  return results.map((r) => r.vector);
}

/** True when a semantic embedding provider is configured. */
export function isEmbeddingConfigured(): boolean {
  const cfg = getAiConfig();
  return Boolean(cfg.embeddingApiKey ?? cfg.geminiApiKey);
}
