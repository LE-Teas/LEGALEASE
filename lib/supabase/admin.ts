/**
 * Server-only Supabase client that uses the service role key.
 *
 * Use ONLY in the ingestion/evaluation scripts and admin-only server actions.
 * The service role bypasses RLS — never import this into code that serves
 * citizens, and never expose the key with a NEXT_PUBLIC_ prefix.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/config/supabase";

export function createAdminClient() {
  const env = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !serviceRoleKey) return null;
  return createSupabaseClient(env.url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isAdminConfigured(): boolean {
  return (
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && Boolean(getSupabaseEnv())
  );
}

export const getAdminSupabase = createAdminClient;