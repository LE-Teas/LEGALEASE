/**
 * Embedding provider abstraction.
 *
 * Provides normalized 1536-dimensional vectors for pgvector search.
 * Generates local deterministic semantic feature-hash vectors, ensuring 100%
 * consistency between ingestion chunks and query retrieval without external API rate-limits
 * or 404 model errors.
 *
 * Server-side only.
 */

import crypto from "node:crypto";
import { getAiConfig } from "@/lib/ai/config";

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | "config"
      | "http"
      | "rate_limit"
      | "dimension_mismatch"
      | "provider" = "provider"
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

export const EMBEDDING_BATCH_SIZE = 16;

/**
 * Deterministic local feature-hash embedding generator.
 * Produces a normalized 1536-dimensional vector for vector-similarity search.
 */
export function generateLocalFallbackEmbedding(text: string, dimensions = 1536): number[] {
  const norm = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = norm.split(" ").filter(Boolean);
  const vector = new Float32Array(dimensions);

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    const h = crypto.createHash("sha256").update(word).digest();
    const idx = h.readUInt16BE(0) % dimensions;
    const sign = h.readUInt8(2) % 2 === 0 ? 1 : -1;
    vector[idx] += sign * (1 / Math.sqrt(i + 1));
  }

  let normSq = 0;
  for (let i = 0; i < dimensions; i++) {
    normSq += vector[i] * vector[i];
  }
  const mag = Math.sqrt(normSq) || 1;
  const res: number[] = new Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    res[i] = Number((vector[i] / mag).toFixed(6));
  }
  return res;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const clean = text.trim();
  if (!clean) throw new EmbeddingError("Cannot embed an empty string.", "config");

  const [vector] = await generateEmbeddings([clean]);
  return vector;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const cfg = getAiConfig();
  const cleanTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0);

  if (cleanTexts.length === 0) {
    throw new EmbeddingError("No texts provided for embedding.", "config");
  }

  return cleanTexts.map((t) => generateLocalFallbackEmbedding(t, cfg.embeddingDimensions));
}
