import { createClient } from "@/lib/supabase/server";
import type { LegalResourceItem } from "@/lib/types/legal";

export async function getLegalResources(
  category?: string,
  searchQuery?: string
): Promise<LegalResourceItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from("legal_resources")
    .select("*")
    .order("title", { ascending: true });

  if (category && category !== "All") {
    query = query.eq("category", category);
  }

  if (searchQuery && searchQuery.trim()) {
    query = query.or(
      `title.ilike.%${searchQuery.trim()}%,summary.ilike.%${searchQuery.trim()}%`
    );
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

export async function getLegalResourceBySlug(
  slug: string
): Promise<LegalResourceItem | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("legal_resources")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
