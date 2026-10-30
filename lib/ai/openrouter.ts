/**
 * OpenRouter chat-completions abstraction with dynamic free-model routing,
 * resilient multi-tier failover, and streaming support.
 *
 * Server-side only — OPENROUTER_API_KEY is read from process.env and never exposed.
 */

import { getAiConfig } from "@/lib/ai/config";
import { getRoutingCandidates, type AiTaskType } from "@/lib/ai/openrouter-models";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  /** Request `response_format: { type: "json_object" }` when supported. */
  jsonObject?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** Explicit model override; if omitted, the task-aware free model router chooses */
  model?: string;
  /** Task type for capability selection (e.g. "legal_rag_answer", "lawyer_intent_extraction") */
  taskType?: AiTaskType;
  /** Optional stream callbacks or flags */
  stream?: boolean;
  onToken?: (token: string) => void;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | "config"
      | "http"
      | "rate_limit"
      | "timeout"
      | "empty" = "http"
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

async function postChatSingle(
  model: string,
  messages: ChatMessage[],
  jsonObject: boolean,
  maxTokens: number,
  temperature: number,
  timeoutMs: number
): Promise<string> {
  const cfg = getAiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const payload: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonObject) payload.response_format = { type: "json_object" };

  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.openRouterApiKey}`,
        "HTTP-Referer": "https://legalease.pk",
        "X-Title": "LegalEase Pakistan",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        detail = body.error?.message ?? "";
      } catch {
        /* ignore */
      }
      if (res.status === 401) {
        throw new OpenRouterError(
          "OpenRouter rejected the API key (401).",
          "config"
        );
      }
      if (res.status === 429) {
        throw new OpenRouterError(
          `OpenRouter rate limited (${model}): ${detail || res.statusText}`,
          "rate_limit"
        );
      }
      throw new OpenRouterError(
        `OpenRouter error (${model}, ${res.status}): ${detail || res.statusText}`,
        res.status >= 500 ? "http" : "http"
      );
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content || content.trim().length === 0) {
      throw new OpenRouterError(
        `OpenRouter returned an empty completion for ${model}.`,
        "empty"
      );
    }
    return content.trim();
  } catch (err) {
    if (err instanceof OpenRouterError) throw err;
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new OpenRouterError(
      aborted
        ? `OpenRouter request timed out for ${model} after ${timeoutMs}ms.`
        : `OpenRouter request failed for ${model}: ${err instanceof Error ? err.message : String(err)}`,
      aborted ? "timeout" : "http"
    );
  } finally {
    clearTimeout(timeout);
  }
}

export interface ChatCompletionResult {
  content: string;
  model: string;
}

/**
 * Executes chat completion with multi-tier failover:
 * Primary free candidate -> Fallback candidate 1 -> Fallback candidate 2.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const cfg = getAiConfig();
  if (!cfg.openRouterApiKey) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not configured.",
      "config"
    );
  }

  const maxTokens = options.maxTokens ?? 1200;
  const temperature = options.temperature ?? 0.2;
  const timeoutMs = 45_000; // 45 seconds per model attempt

  // Determine candidate models
  let candidateModels: string[] = [];
  if (options.model) {
    candidateModels = [options.model];
  } else {
    const candidates = await getRoutingCandidates(options.taskType || "legal_rag_answer");
    if (candidates.routingMode === "openrouter_free") {
      candidateModels = ["openrouter/free", candidates.primaryModel, ...candidates.fallbackModels];
    } else {
      candidateModels = [candidates.primaryModel, ...candidates.fallbackModels];
    }
  }

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      // First attempt with jsonObject if requested
      try {
        const content = await postChatSingle(
          model,
          messages,
          Boolean(options.jsonObject),
          maxTokens,
          temperature,
          timeoutMs
        );
        return { content, model };
      } catch (err) {
        // If rejected due to json_object format, retry this model once without jsonObject
        if (options.jsonObject && err instanceof OpenRouterError && err.kind === "http") {
          const content = await postChatSingle(
            model,
            messages,
            false,
            maxTokens,
            temperature,
            timeoutMs
          );
          return { content, model };
        }
        throw err;
      }
    } catch (err) {
      lastError = err as Error;
      console.warn(`[OpenRouter Failover] Model ${model} failed:`, (err as Error).message);
      // If config error (401), fail immediately
      if (err instanceof OpenRouterError && err.kind === "config") {
        throw err;
      }
      // Otherwise continue to next candidate in the pool
    }
  }

  throw (
    lastError ||
    new OpenRouterError("All eligible models in the pool failed to respond.", "http")
  );
}

/**
 * Streams chat completion using OpenRouter Server-Sent Events (SSE).
 * Calls `onToken` as deltas arrive, and resolves with full content.
 */
export async function streamChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions & { onToken: (token: string) => void }
): Promise<ChatCompletionResult> {
  const cfg = getAiConfig();
  if (!cfg.openRouterApiKey) {
    throw new OpenRouterError("OPENROUTER_API_KEY is not configured.", "config");
  }

  const maxTokens = options.maxTokens ?? 1200;
  const temperature = options.temperature ?? 0.2;

  let candidateModels: string[] = [];
  if (options.model) {
    candidateModels = [options.model];
  } else {
    const candidates = await getRoutingCandidates(options.taskType || "legal_rag_answer");
    candidateModels = [candidates.primaryModel, ...candidates.fallbackModels];
  }

  for (const model of candidateModels) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.openRouterApiKey}`,
          "HTTP-Referer": "https://legalease.pk",
          "X-Title": "LegalEase Pakistan",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Stream HTTP ${res.status}: ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              options.onToken(delta);
            }
          } catch {
            /* ignore SSE parsing glitches */
          }
        }
      }

      clearTimeout(timeout);
      if (fullContent.trim().length > 0) {
        return { content: fullContent.trim(), model };
      }
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`[OpenRouter Streaming Failover] Model ${model} stream failed:`, err);
      // fall over to next candidate
    }
  }

  // If streaming failed on all models, fall back to non-streaming chatCompletion
  const fallbackResult = await chatCompletion(messages, options);
  options.onToken(fallbackResult.content);
  return fallbackResult;
}