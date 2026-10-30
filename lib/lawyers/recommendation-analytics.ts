/**
 * Privacy-safe Lawyer Recommendation Analytics.
 *
 * Tracks impressions and interaction clicks without logging sensitive citizen queries.
 */

import { createClient } from "@/lib/supabase/server";

export type RecommendationEventType = "impression" | "profile_click" | "booking_click";

export interface LogRecommendationEventParams {
  eventType: RecommendationEventType;
  lawyerId: string;
  legalCategory?: string | null;
  recommendationScore?: number | null;
  userId?: string | null;
}

export async function logRecommendationEvent(params: LogRecommendationEventParams): Promise<void> {
  try {
    const supabase = await createClient();
    if (!supabase) return;

    await supabase.from("ai_recommendation_events").insert({
      event_type: params.eventType,
      lawyer_id: params.lawyerId,
      legal_category: params.legalCategory || null,
      recommendation_score: params.recommendationScore || null,
      user_id: params.userId || null,
    });
  } catch (err) {
    // Non-fatal analytics error
    console.warn("[recommendation-analytics] Failed to log event:", err);
  }
}
