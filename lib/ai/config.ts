/**
 * Server-only AI configuration, read from environment variables at runtime.
 * Configured exclusively for Google Gemini Free Tier API.
 *
 * Never import this module (or any of its dependencies) from a Client Component.
 */

export interface AiConfig {
  /** Google Gemini API Key */
  geminiApiKey: string | null;
  geminiModel: string;

  /** Model accessors */
  embeddingProvider: string;
  embeddingApiKey: string | null;
  embeddingModel: string;

  /** Embeddings */
  embeddingDimensions: number;

  /** RAG retrieval knobs */
  maxRetrievedChunks: number;
  similarityThreshold: number;
  maxContextChunks: number;
  maxHistoryMessages: number;
}

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_EMBEDDING_DIMENSIONS = 1536; // matches pgvector definition in schema
const DEFAULT_THRESHOLD = 0.20;

function env(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function numberEnv(name: string, fallback: number): number {
  const value = env(name);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getAiConfig(): AiConfig {
  const geminiApiKey = env("GEMINI_API_KEY") ?? env("GOOGLE_API_KEY") ?? env("GOOGLE_GENERATIVE_AI_API_KEY");
  const geminiModel = env("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL;

  return {
    geminiApiKey,
    geminiModel,
    embeddingProvider: "gemini",
    embeddingApiKey: geminiApiKey,
    embeddingModel: "text-embedding-004",
    embeddingDimensions: numberEnv("EMBEDDING_DIMENSIONS", DEFAULT_EMBEDDING_DIMENSIONS),
    maxRetrievedChunks: numberEnv("LEGALEASE_MAX_RETRIEVED_CHUNKS", 8),
    similarityThreshold: numberEnv("LEGALEASE_SIMILARITY_THRESHOLD", DEFAULT_THRESHOLD),
    maxContextChunks: numberEnv("LEGALEASE_MAX_CONTEXT_CHUNKS", 6),
    maxHistoryMessages: numberEnv("LEGALEASE_MAX_HISTORY_MESSAGES", 8),
  };
}

export function embeddingsConfigError(): string | null {
  const cfg = getAiConfig();
  if (!cfg.geminiApiKey) {
    return "GEMINI_API_KEY is not configured in .env.";
  }
  return null;
}

export function chatConfigError(): string | null {
  const cfg = getAiConfig();
  if (!cfg.geminiApiKey) {
    return "GEMINI_API_KEY is not configured in .env. Please set GEMINI_API_KEY.";
  }
  return null;
}
