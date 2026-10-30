"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/profile";
import { refreshOpenRouterModelsFromApi, type NormalizedModel } from "@/lib/ai/openrouter-models";
import { evaluateModel, type EvaluationResult } from "@/lib/ai/model-evaluator";

async function assertAdmin() {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    throw new Error("Unauthorized: Platform Admin privilege required.");
  }
  return { user, profile };
}

/**
 * Refreshes the OpenRouter model catalog from the official API.
 */
export async function refreshOpenRouterModelsAction(): Promise<{
  success: boolean;
  count: number;
  models: NormalizedModel[];
}> {
  await assertAdmin();

  try {
    const models = await refreshOpenRouterModelsFromApi();
    revalidatePath("/admin/ai");
    revalidatePath("/admin/ai/settings");
    return { success: true, count: models.length, models };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to refresh OpenRouter models: ${msg}`);
  }
}

/**
 * Runs evaluation suite on a specific model.
 */
export async function evaluateModelAction(modelId: string): Promise<EvaluationResult> {
  await assertAdmin();

  try {
    const result = await evaluateModel(modelId);
    revalidatePath("/admin/ai");
    revalidatePath("/admin/ai/settings");
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Evaluation failed for ${modelId}: ${msg}`);
  }
}

/**
 * Updates AI routing configuration (mode, models, streaming, weights).
 */
export async function updateAiRoutingConfigAction(config: {
  routing_mode: "auto_free" | "openrouter_free" | "manual";
  primary_model: string;
  fallback_model_1?: string | null;
  fallback_model_2?: string | null;
  streaming_enabled: boolean;
  model_cache_ttl_hours: number;
}) {
  const { user } = await assertAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Database unavailable.");

  const { error } = await supabase
    .from("ai_routing_config")
    .upsert({
      id: "default",
      routing_mode: config.routing_mode,
      primary_model: config.primary_model,
      fallback_model_1: config.fallback_model_1 || null,
      fallback_model_2: config.fallback_model_2 || null,
      streaming_enabled: config.streaming_enabled,
      model_cache_ttl_hours: config.model_cache_ttl_hours,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to update routing configuration: ${error.message}`);
  }

  revalidatePath("/admin/ai");
  revalidatePath("/admin/ai/settings");
  return { success: true };
}

/**
 * Toggles whether a model is excluded by admin from routing.
 */
export async function toggleModelExclusionAction(modelId: string, excluded: boolean) {
  await assertAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Database unavailable.");

  const { error } = await supabase
    .from("openrouter_model_registry")
    .update({
      excluded_by_admin: excluded,
      updated_at: new Date().toISOString(),
    })
    .eq("model_id", modelId);

  if (error) {
    throw new Error(`Failed to toggle model exclusion: ${error.message}`);
  }

  revalidatePath("/admin/ai");
  revalidatePath("/admin/ai/settings");
  return { success: true };
}

/**
 * Updates AI Lawyer Recommendation settings and weights.
 */
export async function updateAiRecommendationSettingsAction(settings: {
  enabled: boolean;
  max_recommendations: number;
  relevance_weight: number;
  rating_weight: number;
  experience_weight: number;
  fee_weight: number;
  location_weight: number;
  min_relevance_threshold: number;
}) {
  const { user } = await assertAdmin();

  // Validate weights total 100%
  const totalWeight =
    settings.relevance_weight +
    settings.rating_weight +
    settings.experience_weight +
    settings.fee_weight +
    settings.location_weight;

  if (totalWeight !== 100) {
    throw new Error(`Weights must total 100%. Current sum: ${totalWeight}%.`);
  }

  const supabase = await createClient();
  if (!supabase) throw new Error("Database unavailable.");

  const { error } = await supabase
    .from("ai_recommendation_settings")
    .upsert({
      id: "default",
      enabled: settings.enabled,
      max_recommendations: settings.max_recommendations,
      relevance_weight: settings.relevance_weight,
      rating_weight: settings.rating_weight,
      experience_weight: settings.experience_weight,
      fee_weight: settings.fee_weight,
      location_weight: settings.location_weight,
      min_relevance_threshold: settings.min_relevance_threshold,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to update recommendation settings: ${error.message}`);
  }

  revalidatePath("/admin/ai");
  revalidatePath("/admin/ai/settings");
  return { success: true };
}
