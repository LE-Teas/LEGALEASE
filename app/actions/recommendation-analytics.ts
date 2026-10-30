"use server";

import { logRecommendationEvent } from "@/lib/lawyers/recommendation-analytics";
import { getAuthState } from "@/lib/auth/profile";

export async function trackLawyerRecommendationClickAction(
  lawyerId: string,
  eventType: "profile_click" | "booking_click",
  legalCategory?: string | null,
  score?: number | null
) {
  try {
    const { user } = await getAuthState();
    await logRecommendationEvent({
      eventType,
      lawyerId,
      legalCategory,
      recommendationScore: score,
      userId: user?.id || null,
    });
  } catch {
    /* non-fatal */
  }
}
