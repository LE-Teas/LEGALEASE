/**
 * AI-Assisted Lawyer Recommendation Engine.
 *
 * Deterministic, explainable, and verified-only lawyer matching.
 * The LLM extracts the legal intent, while the application deterministically ranks
 * verified lawyers using:
 * - Specialization & problem relevance (50%)
 * - Stabilized Bayesian rating quality (20%)
 * - Normalized verified experience (15%)
 * - Fee suitability (10%)
 * - Location & availability compatibility (5%)
 */

import { createClient } from "@/lib/supabase/server";
import type { LawyerIntent } from "@/lib/lawyers/lawyer-intent";

export interface RecommendedLawyer {
  id: string;
  fullName: string;
  professionalTitle: string;
  primarySpecialization: string;
  specializations: string[];
  city: string;
  area: string | null;
  yearsOfExperience: number;
  consultationFee: number;
  rating: number;
  totalReviews: number;
  avatarUrl: string | null;
  compositeScore: number;
  relevanceScore: number;
  whyRecommended: string;
}

interface LawyerCandidateRow {
  id: string;
  professional_title: string | null;
  primary_specialization: string | null;
  specializations: string[] | null;
  years_of_experience: number | null;
  consultation_fee: number | null;
  rating: number | null;
  total_reviews: number | null;
  city: string | null;
  area: string | null;
  bio: string | null;
  verification_status: string;
  is_published: boolean;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

export interface RecommendationWeights {
  enabled: boolean;
  maxRecommendations: number;
  relevanceWeight: number;
  ratingWeight: number;
  experienceWeight: number;
  feeWeight: number;
  locationWeight: number;
  minRelevanceThreshold: number;
}

const DEFAULT_WEIGHTS: RecommendationWeights = {
  enabled: true,
  maxRecommendations: 3,
  relevanceWeight: 50,
  ratingWeight: 20,
  experienceWeight: 15,
  feeWeight: 10,
  locationWeight: 5,
  minRelevanceThreshold: 0.35,
};

/**
 * Loads configurable recommendation weights from the database or defaults.
 */
async function loadRecommendationWeights(): Promise<RecommendationWeights> {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from("ai_recommendation_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (data) {
        return {
          enabled: data.enabled ?? true,
          maxRecommendations: data.max_recommendations ?? 3,
          relevanceWeight: data.relevance_weight ?? 50,
          ratingWeight: data.rating_weight ?? 20,
          experienceWeight: data.experience_weight ?? 15,
          feeWeight: data.fee_weight ?? 10,
          locationWeight: data.location_weight ?? 5,
          minRelevanceThreshold: Number(data.min_relevance_threshold ?? 0.35),
        };
      }
    }
  } catch (err) {
    console.warn("[recommend-lawyers] Could not load weights, using defaults:", err);
  }
  return DEFAULT_WEIGHTS;
}

/**
 * Stabilized Bayesian average for ratings.
 * (v * R + m * C) / (v + m)
 * where v = total reviews, R = average rating, m = 3 (prior count), C = 4.0 (prior mean)
 */
function calculateStabilizedRatingScore(avgRating: number, totalReviews: number): number {
  const m = 3;
  const C = 4.0;
  const v = Math.max(0, totalReviews);
  const R = Math.max(0, Math.min(5, avgRating || 0));

  const bayesian = (v * R + m * C) / (v + m);
  return Math.min(100, Math.max(0, (bayesian / 5.0) * 100));
}

/**
 * Normalized experience score capped at 25 years.
 */
function calculateExperienceScore(years: number): number {
  const capped = Math.min(25, Math.max(0, years || 0));
  return (capped / 25) * 100;
}

/**
 * Fee suitability score.
 */
function calculateFeeScore(fee: number, budget?: number | null): number {
  if (typeof budget === "number" && budget > 0) {
    const diff = Math.abs(fee - budget);
    const ratio = diff / budget;
    return Math.max(0, Math.min(100, (1 - ratio) * 100));
  }
  // If no budget specified, normalize between 1,000 and 15,000 PKR
  if (fee <= 1000) return 90;
  if (fee <= 3000) return 100;
  if (fee <= 6000) return 85;
  if (fee <= 10000) return 70;
  return 55;
}

/**
 * Relevance score matching intent categories and keywords to lawyer profile.
 */
function calculateRelevanceScore(lawyer: LawyerCandidateRow, intent: LawyerIntent): { score: number; matchReasons: string[] } {
  let score = 0;
  const matchReasons: string[] = [];

  const primarySpec = (lawyer.primary_specialization || "").toLowerCase();
  const allSpecs = Array.isArray(lawyer.specializations)
    ? lawyer.specializations.map((s: string) => s.toLowerCase())
    : [];
  const title = (lawyer.professional_title || "").toLowerCase();
  const bio = (lawyer.bio || "").toLowerCase();

  const intentCategory = intent.legal_category.toLowerCase().replace(/_/g, " ");
  const intentSpecs = intent.specializations.map((s) => s.toLowerCase());

  // 1. Primary specialization match
  let primaryMatched = false;
  if (primarySpec.includes(intentCategory) || intentSpecs.some((s) => primarySpec.includes(s))) {
    score += 55;
    primaryMatched = true;
    matchReasons.push(`Primary specialization in ${lawyer.primary_specialization}`);
  }

  // 2. Secondary specialization matches
  const matchedSecondary = allSpecs.filter(
    (s: string) => s.includes(intentCategory) || intentSpecs.some((is) => s.includes(is))
  );
  if (matchedSecondary.length > 0) {
    score += primaryMatched ? 25 : 45;
    if (!primaryMatched) {
      matchReasons.push(`Practice areas include ${matchedSecondary.join(", ")}`);
    }
  }

  // 3. Keyword matches
  if (intent.keywords && intent.keywords.length > 0) {
    let keywordHits = 0;
    for (const kw of intent.keywords) {
      const k = kw.toLowerCase();
      if (title.includes(k) || bio.includes(k) || primarySpec.includes(k)) {
        keywordHits++;
      }
    }
    if (keywordHits > 0) {
      score += Math.min(20, keywordHits * 7);
    }
  }

  return {
    score: Math.min(100, score),
    matchReasons,
  };
}

/**
 * Generates an explainable "Why Recommended" badge summary.
 */
function buildWhyRecommended(
  lawyer: LawyerCandidateRow,
  matchReasons: string[],
  cityMatch: boolean
): string {
  if (matchReasons.length > 0) {
    const loc = cityMatch ? ` in ${lawyer.city}` : "";
    return `${matchReasons[0]}${loc} with ${lawyer.years_of_experience || 1}+ yrs experience.`;
  }
  return `Verified Pakistani legal practitioner with ${lawyer.years_of_experience || 1}+ yrs experience.`;
}

/**
 * Discovers and ranks verified lawyers for a given user intent.
 */
export async function recommendLawyers(intent: LawyerIntent): Promise<RecommendedLawyer[]> {
  const weights = await loadRecommendationWeights();
  if (!weights.enabled || !intent.needs_lawyer) {
    return [];
  }

  const supabase = await createClient();
  if (!supabase) return [];

  // 1. Fetch strictly verified, published lawyers
  const { data: lawyers, error } = await supabase
    .from("lawyer_profiles")
    .select(`
      id,
      professional_title,
      primary_specialization,
      specializations,
      years_of_experience,
      consultation_fee,
      rating,
      total_reviews,
      city,
      area,
      bio,
      verification_status,
      is_published,
      profiles!inner (
        full_name,
        avatar_url
      )
    `)
    .eq("verification_status", "verified")
    .eq("is_published", true)
    .limit(30);

  if (error || !lawyers || lawyers.length === 0) {
    return [];
  }

  // 2. Score each candidate
  const candidates: RecommendedLawyer[] = [];
  const intentCity = (intent.jurisdiction?.city || "Karachi").toLowerCase();

  for (const item of lawyers as unknown as LawyerCandidateRow[]) {
    const { score: relevance, matchReasons } = calculateRelevanceScore(item, intent);

    // Filter out candidates below the minimum relevance threshold
    if (relevance < weights.minRelevanceThreshold * 100) {
      continue;
    }

    const ratingScore = calculateStabilizedRatingScore(item.rating || 0, item.total_reviews || 0);
    const expScore = calculateExperienceScore(item.years_of_experience || 0);
    const feeScore = calculateFeeScore(item.consultation_fee || 0, intent.fee_preference);

    const lawyerCity = (item.city || "").toLowerCase();
    const cityMatch = lawyerCity.includes(intentCity) || intentCity.includes(lawyerCity);
    const locationScore = cityMatch ? 100 : 40;

    // Composite weighted calculation
    const compositeScore = Math.round(
      (relevance * weights.relevanceWeight +
        ratingScore * weights.ratingWeight +
        expScore * weights.experienceWeight +
        feeScore * weights.feeWeight +
        locationScore * weights.locationWeight) /
        100
    );

    const profile = item.profiles ?? { full_name: null, avatar_url: null };
    const whyRecommended = buildWhyRecommended(item, matchReasons, cityMatch);

    candidates.push({
      id: item.id,
      fullName: profile.full_name || "Advocate",
      professionalTitle: item.professional_title || "High Court Advocate",
      primarySpecialization: item.primary_specialization || "General Practice",
      specializations: Array.isArray(item.specializations) ? item.specializations : [],
      city: item.city || "Karachi",
      area: item.area || null,
      yearsOfExperience: item.years_of_experience || 0,
      consultationFee: item.consultation_fee || 0,
      rating: Number((item.rating || 5.0).toFixed(1)),
      totalReviews: item.total_reviews || 0,
      avatarUrl: profile.avatar_url || null,
      compositeScore,
      relevanceScore: relevance,
      whyRecommended,
    });
  }

  // 3. Sort by composite score descending
  candidates.sort((a, b) => b.compositeScore - a.compositeScore);

  // 4. Return top N recommendations
  return candidates.slice(0, weights.maxRecommendations);
}
