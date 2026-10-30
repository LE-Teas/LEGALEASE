import { createClient } from "@/lib/supabase/server";
import type { LawyerWithProfile, Specialization } from "@/lib/types/legal";

export interface SearchLawyersParams {
  query?: string;
  specialization?: string;
  city?: string;
  area?: string;
  minExperience?: number;
  maxFee?: number;
  minRating?: number;
  sort?: "recommended" | "nearest" | "highest_rated" | "experience" | "fee_low";
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

/**
 * Searches published lawyers using real Supabase queries.
 * When latitude & longitude are provided, invokes the PostGIS RPC `find_nearby_lawyers`.
 */
export async function searchLawyers(
  params: SearchLawyersParams = {}
): Promise<LawyerWithProfile[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const {
    query,
    specialization,
    city,
    area,
    minExperience,
    maxFee,
    minRating,
    sort = "recommended",
    latitude,
    longitude,
    radiusKm = 50,
  } = params;

  // 1. PostGIS Nearby Search if coordinates are supplied
  if (typeof latitude === "number" && typeof longitude === "number") {
    const { data: nearbyData, error: nearbyError } = await supabase.rpc(
      "find_nearby_lawyers",
      {
        p_latitude: latitude,
        p_longitude: longitude,
        p_radius_km: radiusKm,
        p_specialization: specialization && specialization !== "all" ? specialization : null,
        p_city: city && city !== "all" ? city : null,
      }
    );

    if (!nearbyError && nearbyData) {
      let results: LawyerWithProfile[] = nearbyData.map((row: any) => ({
        ...row,
        email: "",
        phone: null,
      }));

      if (query && query.trim()) {
        const q = query.toLowerCase();
        results = results.filter(
          (l) =>
            l.full_name.toLowerCase().includes(q) ||
            l.professional_title.toLowerCase().includes(q) ||
            l.city.toLowerCase().includes(q) ||
            (l.area && l.area.toLowerCase().includes(q))
        );
      }

      if (minExperience) {
        results = results.filter((l) => l.years_of_experience >= minExperience);
      }
      if (maxFee) {
        results = results.filter((l) => l.consultation_fee <= maxFee);
      }
      if (minRating) {
        results = results.filter((l) => l.rating >= minRating);
      }

      return results;
    }
  }

  // 2. Standard Filtered Database Query
  let dbQuery = supabase
    .from("lawyer_profiles")
    .select(`
      *,
      profiles!inner (
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq("is_published", true)
    .eq("verification_status", "verified");

  if (city && city !== "all") {
    dbQuery = dbQuery.ilike("city", `%${city}%`);
  }
  if (area && area !== "all") {
    dbQuery = dbQuery.ilike("area", `%${area}%`);
  }
  if (specialization && specialization !== "all") {
    dbQuery = dbQuery.or(
      `primary_specialization.ilike.%${specialization}%,specializations.cs.{${specialization}}`
    );
  }
  if (minExperience && minExperience > 0) {
    dbQuery = dbQuery.gte("years_of_experience", minExperience);
  }
  if (maxFee && maxFee > 0) {
    dbQuery = dbQuery.lte("consultation_fee", maxFee);
  }
  if (minRating && minRating > 0) {
    dbQuery = dbQuery.gte("rating", minRating);
  }

  // Sort
  if (sort === "highest_rated") {
    dbQuery = dbQuery.order("rating", { ascending: false });
  } else if (sort === "experience") {
    dbQuery = dbQuery.order("years_of_experience", { ascending: false });
  } else if (sort === "fee_low") {
    dbQuery = dbQuery.order("consultation_fee", { ascending: true });
  } else {
    // Recommended default: verified first, then highest rating
    dbQuery = dbQuery
      .order("verification_status", { ascending: false })
      .order("rating", { ascending: false });
  }

  const { data, error } = await dbQuery;

  if (error || !data) {
    return [];
  }

  let results: LawyerWithProfile[] = data.map((item: any) => ({
    ...item,
    full_name: item.profiles?.full_name || "Lawyer",
    email: item.profiles?.email || "",
    phone: item.profiles?.phone || null,
    avatar_url: item.profiles?.avatar_url || null,
  }));

  if (query && query.trim()) {
    const q = query.toLowerCase();
    results = results.filter(
      (l) =>
        l.full_name.toLowerCase().includes(q) ||
        l.professional_title.toLowerCase().includes(q) ||
        l.primary_specialization.toLowerCase().includes(q) ||
        l.specializations?.some((s: string) => s.toLowerCase().includes(q)) ||
        l.city.toLowerCase().includes(q)
    );
  }

  return results;
}

export async function getLawyerDetails(id: string): Promise<LawyerWithProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("lawyer_profiles")
    .select(`
      *,
      profiles!inner (
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    full_name: data.profiles?.full_name || "Lawyer",
    email: data.profiles?.email || "",
    phone: data.profiles?.phone || null,
    avatar_url: data.profiles?.avatar_url || null,
  };
}

export async function getLawyersFromDb() {
  const { mapDbLawyerToLawyer } = await import("@/lib/data/lawyers");
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("lawyer_profiles")
    .select(`
      *,
      profiles!inner (
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq("is_published", true)
    .eq("verification_status", "verified")
    .order("rating", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((item: any) =>
    mapDbLawyerToLawyer({
      ...item,
      full_name: item.profiles?.full_name || "Lawyer",
      email: item.profiles?.email || "",
      phone: item.profiles?.phone || null,
      avatar_url: item.profiles?.avatar_url || null,
    })
  );
}

export async function getLawyerById(id: string) {
  const { mapDbLawyerToLawyer } = await import("@/lib/data/lawyers");
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("lawyer_profiles")
    .select(`
      *,
      profiles!inner (
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return mapDbLawyerToLawyer({
    ...data,
    full_name: data.profiles?.full_name || "Lawyer",
    email: data.profiles?.email || "",
    phone: data.profiles?.phone || null,
    avatar_url: data.profiles?.avatar_url || null,
  });
}

