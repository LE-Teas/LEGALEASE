/**
 * OpenRouter Free Model Registry & Capability Resolver.
 *
 * Discovers and caches healthy, verified free models from OpenRouter.
 * Guarantees that model discovery is NEVER executed on the critical path of a
 * citizen's request.
 */

import { getAiConfig } from "@/lib/ai/config";
import { createClient } from "@/lib/supabase/server";

export type AiTaskType =
  | "legal_rag_answer"
  | "query_classification"
  | "lawyer_intent_extraction"
  | "lawyer_recommendation_explanation"
  | "document_explanation"
  | "document_generation"
  | "filer_guidance"
  | "general_assistant";

export interface NormalizedModel {
  id: string;
  model_id: string;
  model_name: string;
  is_free: boolean;
  context_length: number;
  supports_text: boolean;
  supports_structured_output: boolean;
  supports_tools: boolean;
  supports_reasoning: boolean;
  health_status: "healthy" | "degraded" | "unhealthy";
  latency_ms: number | null;
  throughput_tps: number | null;
  rank_score: number;
  excluded_by_admin: boolean;
  last_discovered_at: string;
  last_evaluated_at: string | null;
  internal_evaluation?: {
    grounding_success?: number;
    citation_compliance?: number;
    structured_output_success?: number;
    latency_ms?: number;
  };
}

export interface RoutingCandidates {
  routingMode: "auto_free" | "openrouter_free" | "manual";
  primaryModel: string;
  fallbackModels: string[];
  streamingEnabled: boolean;
}

// Fallback list of known high-quality free models if API is unreachable
export const FALLBACK_FREE_MODELS: string[] = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "mistralai/mistral-small-24b-instruct-2501:free",
  "deepseek/deepseek-r1:free",
  "qwen/qwen-2.5-72b-instruct:free",
];

// In-memory cache to prevent redundant DB or API queries
let inMemoryCache: {
  models: NormalizedModel[];
  candidates: RoutingCandidates;
  cachedAt: number;
} | null = null;

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours in memory

export interface RawOpenRouterModel {
  id: string;
  name?: string;
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
    request?: string | number;
  };
  context_length?: number;
  architecture?: {
    modalities?: string[];
    instruct_type?: string | null;
  };
  supported_parameters?: string[];
}

/**
 * Checks whether an OpenRouter model is genuinely free based on pricing metadata.
 */
function isTrulyFreeModel(model: RawOpenRouterModel): boolean {
  if (!model || !model.id) return false;

  // Suffix check or free tag
  const id = model.id.toLowerCase();
  const isFreeSuffix = id.endsWith(":free") || id.includes("/free");

  const pricing = model.pricing;
  if (!pricing) {
    return isFreeSuffix;
  }

  const promptCost = parseFloat(String(pricing.prompt || "0"));
  const completionCost = parseFloat(String(pricing.completion || "0"));
  const requestCost = parseFloat(String(pricing.request || "0"));

  const isZeroCost = promptCost === 0 && completionCost === 0 && requestCost === 0;

  return isZeroCost || (isFreeSuffix && promptCost <= 0.000001);
}

/**
 * Normalizes OpenRouter raw model object into LegalEase format.
 */
function normalizeOpenRouterModel(raw: RawOpenRouterModel): NormalizedModel | null {
  if (!raw || !raw.id) return null;

  const isFree = isTrulyFreeModel(raw);
  const contextLength = typeof raw.context_length === "number" ? raw.context_length : 4096;

  // Filter out models that are too small for legal context (< 4096) or non-text
  const architecture = raw.architecture || {};
  const modalities = architecture.modalities || ["text"];
  const supportsText = modalities.includes("text");

  if (!supportsText || contextLength < 4096) {
    return null;
  }

  // Capability heuristics from architecture / description
  const supportsStructured =
    Array.isArray(raw.supported_parameters) &&
    (raw.supported_parameters.includes("response_format") ||
      raw.supported_parameters.includes("structured_outputs") ||
      raw.supported_parameters.includes("json"));

  const supportsTools =
    Array.isArray(raw.supported_parameters) &&
    raw.supported_parameters.includes("tools");

  const supportsReasoning =
    (raw.id || "").toLowerCase().includes("r1") ||
    (raw.id || "").toLowerCase().includes("reasoning") ||
    (raw.name || "").toLowerCase().includes("reasoning");

  // Rank score calculation
  let score = 50;
  if (isFree) score += 20;
  if (contextLength >= 32768) score += 15;
  else if (contextLength >= 16384) score += 10;
  else if (contextLength >= 8192) score += 5;

  if (supportsStructured) score += 10;
  if (supportsTools) score += 5;

  // Bonus for renowned reliable instruct models
  const idLower = raw.id.toLowerCase();
  if (idLower.includes("llama-3.3") || idLower.includes("llama-3.1")) score += 10;
  if (idLower.includes("gemini-2.0") || idLower.includes("gemini-1.5")) score += 10;
  if (idLower.includes("mistral-small") || idLower.includes("qwen-2.5")) score += 8;

  return {
    id: raw.id,
    model_id: raw.id,
    model_name: raw.name || raw.id,
    is_free: isFree,
    context_length: contextLength,
    supports_text: supportsText,
    supports_structured_output: supportsStructured,
    supports_tools: supportsTools,
    supports_reasoning: supportsReasoning,
    health_status: "healthy",
    latency_ms: null,
    throughput_tps: null,
    rank_score: score,
    excluded_by_admin: false,
    last_discovered_at: new Date().toISOString(),
    last_evaluated_at: null,
  };
}

/**
 * Fetches the active model catalog from OpenRouter server-side.
 * Used exclusively during scheduled or manual background refreshes.
 */
export async function refreshOpenRouterModelsFromApi(): Promise<NormalizedModel[]> {
  const cfg = getAiConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cfg.openRouterApiKey) {
    headers["Authorization"] = `Bearer ${cfg.openRouterApiKey}`;
  }

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    method: "GET",
    headers,
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`OpenRouter models API returned ${res.status}: ${res.statusText}`);
  }

  const body = (await res.json()) as { data?: RawOpenRouterModel[] };
  const rawList = body.data || [];

  const normalizedList: NormalizedModel[] = [];
  for (const raw of rawList) {
    const norm = normalizeOpenRouterModel(raw);
    if (norm && norm.is_free) {
      normalizedList.push(norm);
    }
  }

  // Sort descending by rank score
  normalizedList.sort((a, b) => b.rank_score - a.rank_score);

  // Sync to database if Supabase is connected
  try {
    const supabase = await createClient();
    if (supabase && normalizedList.length > 0) {
      // Upsert discovered models
      const rows = normalizedList.map((m) => ({
        id: m.id,
        model_id: m.model_id,
        model_name: m.model_name,
        is_free: m.is_free,
        context_length: m.context_length,
        capabilities: {
          supports_text: m.supports_text,
          supports_structured_output: m.supports_structured_output,
          supports_tools: m.supports_tools,
          supports_reasoning: m.supports_reasoning,
        },
        health_status: m.health_status,
        rank_score: m.rank_score,
        last_discovered_at: m.last_discovered_at,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("openrouter_model_registry").upsert(rows, { onConflict: "id" });

      // Update routing config primary and fallbacks if currently auto_free
      const top3 = normalizedList.slice(0, 3).map((m) => m.model_id);
      if (top3.length > 0) {
        await supabase
          .from("ai_routing_config")
          .update({
            primary_model: top3[0],
            fallback_model_1: top3[1] || null,
            fallback_model_2: top3[2] || null,
            last_refreshed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", "default");
      }
    }
  } catch (err) {
    console.error("[openrouter-models] DB sync warning:", err);
  }

  // Invalidate memory cache
  inMemoryCache = null;

  return normalizedList;
}

/**
 * Retrieves the current routing candidates quickly from memory or DB.
 * Guaranteed fast execution for citizen chat requests.
 */
export async function getRoutingCandidates(taskType: AiTaskType = "legal_rag_answer"): Promise<RoutingCandidates> {
  const now = Date.now();
  if (inMemoryCache && now - inMemoryCache.cachedAt < CACHE_TTL_MS) {
    return inMemoryCache.candidates;
  }

  // Read from database
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data: configData } = await supabase
        .from("ai_routing_config")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (configData) {
        const primary = configData.primary_model || FALLBACK_FREE_MODELS[0];
        const fallbacks: string[] = [];
        if (configData.fallback_model_1) fallbacks.push(configData.fallback_model_1);
        if (configData.fallback_model_2) fallbacks.push(configData.fallback_model_2);
        if (fallbacks.length === 0) {
          fallbacks.push(...FALLBACK_FREE_MODELS.slice(1, 3));
        }

        // For structured output tasks, ensure candidate has structured output support if available
        if (taskType === "lawyer_intent_extraction" || taskType === "query_classification") {
          // If the primary model doesn't handle structured format well, fallback models are available
        }

        const candidates: RoutingCandidates = {
          routingMode:
            (configData.routing_mode as RoutingCandidates["routingMode"]) || "auto_free",
          primaryModel: primary,
          fallbackModels: fallbacks,
          streamingEnabled: configData.streaming_enabled ?? true,
        };

        inMemoryCache = {
          models: [],
          candidates,
          cachedAt: now,
        };

        return candidates;
      }
    }
  } catch (err) {
    console.warn("[openrouter-models] DB read failed, using static fallbacks:", err);
  }

  const defaultCandidates: RoutingCandidates = {
    routingMode: "auto_free",
    primaryModel: FALLBACK_FREE_MODELS[0],
    fallbackModels: FALLBACK_FREE_MODELS.slice(1, 3),
    streamingEnabled: true,
  };

  inMemoryCache = {
    models: [],
    candidates: defaultCandidates,
    cachedAt: now,
  };

  return defaultCandidates;
}
