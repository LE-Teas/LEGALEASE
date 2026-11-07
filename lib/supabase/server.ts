import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/config/supabase";
import { createAdminClient } from "@/lib/supabase/admin";

export { createAdminClient };

/**
 * Server-side Supabase client (Server Components, Server Actions, Route
 * Handlers). Uses `@supabase/ssr` so auth cookies are kept in sync with the
 * browser.
 *
 * Returns `null` when the project is not configured yet — callers should
 * handle that state (e.g. friendly "not configured" UI) instead of crashing.
 */
export async function createClient() {
  const env = getSupabaseEnv();

  if (!env) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component when cookies are read-only.
          // Safe to ignore as this branch only runs in middleware.
        }
      },
    },
  });
}
