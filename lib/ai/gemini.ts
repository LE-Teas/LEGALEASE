/**
 * Google Gemini client abstraction using @google/generative-ai SDK.
 * Supports Google Gemini Free Tier (gemini-2.5-flash / gemini-1.5-flash).
 * Server-side only — GEMINI_API_KEY is read from process.env and never exposed.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAiConfig } from "@/lib/ai/config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  jsonObject?: boolean;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  taskType?: string;
  stream?: boolean;
  onToken?: (token: string) => void;
}

export class GeminiError extends Error {
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
    this.name = "GeminiError";
  }
}

let cachedClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  const cfg = getAiConfig();
  const apiKey = cfg.geminiApiKey;
  if (!apiKey) {
    throw new GeminiError(
      "GEMINI_API_KEY is not configured in .env. Please set GEMINI_API_KEY.",
      "config"
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
  }
  return cachedClient;
}

/**
 * Chat completion via Google Gemini with automatic fallback on temporary spikes / 503.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<{ content: string; model: string }> {
  const cfg = getAiConfig();
  const client = getGeminiClient();
  const primaryModel = options.model ?? cfg.geminiModel;
  // Models to try in order if the primary is experiencing high demand (503/429)
  const candidateModels = [
    primaryModel,
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemma-4-31b-it",
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  let lastError: Error | null = null;

  for (const modelName of candidateModels) {
    try {
      const generativeModel = client.getGenerativeModel({
        model: modelName,
        systemInstruction: systemMessage?.content,
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxTokens,
          responseMimeType: options.jsonObject ? "application/json" : undefined,
        },
      });

      // If conversationMessages has only one message or multiple
      if (conversationMessages.length <= 1) {
        const prompt = conversationMessages[0]?.content ?? systemMessage?.content ?? "";
        const result = await generativeModel.generateContent(prompt);
        const content = result.response.text();
        if (!content) {
          throw new GeminiError(`Gemini returned an empty completion for model ${modelName}.`, "empty");
        }
        return { content, model: modelName };
      }

      // Multi-turn chat
      const history = conversationMessages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const lastMessage = conversationMessages[conversationMessages.length - 1];
      const chat = generativeModel.startChat({ history });
      const result = await chat.sendMessage(lastMessage.content);
      const content = result.response.text();

      if (!content) {
        throw new GeminiError(`Gemini returned an empty completion for model ${modelName}.`, "empty");
      }

      return { content, model: modelName };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(msg);

      // If it is a 503 (high demand) or 429 (rate limit), try next candidate model
      if (/503|high demand|overloaded|spikes in demand|RESOURCE_EXHAUSTED|429/i.test(msg)) {
        console.warn(`[Gemini] ${modelName} returned temporary error (${msg.slice(0, 100)}). Falling back to next model...`);
        continue;
      }

      // Other hard error: break and throw
      if (err instanceof GeminiError) throw err;
      throw new GeminiError(`Gemini request failed (${modelName}): ${msg}`, "http");
    }
  }

  throw new GeminiError(
    `All Gemini candidate models failed. Last error: ${lastError?.message || "Unknown error"}`,
    "http"
  );
}

/**
 * Streaming completion via Gemini.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): AsyncGenerator<string, void, unknown> {
  const cfg = getAiConfig();
  const client = getGeminiClient();
  const modelName = options.model ?? cfg.geminiModel;

  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const generativeModel = client.getGenerativeModel({
    model: modelName,
    systemInstruction: systemMessage?.content,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxTokens,
    },
  });

  const prompt = conversationMessages[conversationMessages.length - 1]?.content ?? "";
  const resultStream = await generativeModel.generateContentStream(prompt);

  for await (const chunk of resultStream.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}
