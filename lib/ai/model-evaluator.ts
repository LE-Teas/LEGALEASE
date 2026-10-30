/**
 * LegalEase AI Model Evaluator.
 *
 * Runs non-private representative benchmarks to evaluate candidate free models:
 * - Pakistani legal context understanding
 * - Strict JSON structured output adherence
 * - Citation compliance and hallucination rejection
 * - Measured latency
 *
 * Never uses citizen private data or CNICs. Run strictly on-demand or background.
 */

import { getAiConfig } from "@/lib/ai/config";
import { createClient } from "@/lib/supabase/server";

export interface EvaluationResult {
  modelId: string;
  success: boolean;
  latencyMs: number;
  structuredOutputScore: number; // 0 - 100
  citationScore: number; // 0 - 100
  groundingScore: number; // 0 - 100
  overallScore: number; // 0 - 100
  errorDetail?: string;
}

const EVALUATION_PROMPT_SYSTEM = `You are the LegalEase AI evaluation harness.
Respond ONLY with a valid JSON object matching this schema:
{
  "category": "rent_tenancy" | "family" | "criminal" | "other",
  "statute_title": string,
  "section": string,
  "explanation": string
}
Do NOT include markdown formatting or backticks if possible, just valid JSON.`;

const EVALUATION_PROMPT_USER = `Context: Under Section 15 of the Sindh Rented Premises Ordinance 1979, a landlord may apply to the Rent Controller for the eviction of the tenant if the tenant has failed to pay rent within the stipulated time.
Question: Under which law and section can a tenant be evicted for non-payment of rent in Karachi?`;

/**
 * Evaluates a single model using standard LegalEase test prompts.
 */
export async function evaluateModel(modelId: string): Promise<EvaluationResult> {
  const cfg = getAiConfig();
  if (!cfg.openRouterApiKey) {
    return {
      modelId,
      success: false,
      latencyMs: 0,
      structuredOutputScore: 0,
      citationScore: 0,
      groundingScore: 0,
      overallScore: 0,
      errorDetail: "OPENROUTER_API_KEY is not set.",
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.openRouterApiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: EVALUATION_PROMPT_SYSTEM },
          { role: "user", content: EVALUATION_PROMPT_USER },
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      return {
        modelId,
        success: false,
        latencyMs,
        structuredOutputScore: 0,
        citationScore: 0,
        groundingScore: 0,
        overallScore: 0,
        errorDetail: `HTTP ${res.status}: ${errText.slice(0, 150)}`,
      };
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON
    let parsed: any = null;
    let structuredScore = 0;
    try {
      let clean = content.trim();
      if (clean.startsWith("```")) {
        clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
      }
      const first = clean.indexOf("{");
      const last = clean.lastIndexOf("}");
      if (first !== -1 && last > first) {
        clean = clean.slice(first, last + 1);
      }
      parsed = JSON.parse(clean);
      if (parsed && typeof parsed === "object") {
        structuredScore = 100;
      }
    } catch {
      structuredScore = 0;
    }

    // Citation and grounding check against Sindh Rented Premises Ordinance 1979 Section 15
    let citationScore = 0;
    let groundingScore = 0;

    const lower = (content + " " + JSON.stringify(parsed || {})).toLowerCase();
    if (lower.includes("15") || (parsed && String(parsed.section).includes("15"))) {
      citationScore += 50;
    }
    if (lower.includes("sindh rented premises") || lower.includes("srpo") || lower.includes("1979")) {
      citationScore += 50;
    }

    if (lower.includes("rent controller") || lower.includes("eviction") || lower.includes("non-payment")) {
      groundingScore += 60;
    }
    if (parsed && (parsed.category === "rent_tenancy" || parsed.category === "rent")) {
      groundingScore += 40;
    }

    const overallScore = Math.round(
      structuredScore * 0.3 + citationScore * 0.35 + groundingScore * 0.35
    );

    const result: EvaluationResult = {
      modelId,
      success: overallScore >= 50,
      latencyMs,
      structuredOutputScore: structuredScore,
      citationScore,
      groundingScore,
      overallScore,
    };

    // Update evaluation in database
    try {
      const supabase = await createClient();
      if (supabase) {
        await supabase
          .from("openrouter_model_registry")
          .update({
            internal_evaluation: {
              structured_output_success: structuredScore,
              citation_compliance: citationScore,
              grounding_success: groundingScore,
              latency_ms: latencyMs,
              overall_score: overallScore,
            },
            latency_ms: latencyMs,
            rank_score: overallScore,
            health_status: overallScore >= 50 ? "healthy" : "degraded",
            last_evaluated_at: new Date().toISOString(),
          })
          .eq("model_id", modelId);
      }
    } catch {
      // non-fatal
    }

    return result;
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      modelId,
      success: false,
      latencyMs,
      structuredOutputScore: 0,
      citationScore: 0,
      groundingScore: 0,
      overallScore: 0,
      errorDetail: err?.message || String(err),
    };
  } finally {
    clearTimeout(timeout);
  }
}
