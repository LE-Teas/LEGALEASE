import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/auth/types";
import { getProfileForUser } from "@/lib/auth/roles";

export * from "@/lib/auth/roles";

export interface AuthState {
  user: User | null;
  profile: Profile | null;
}

/**
 * Server-side session + profile lookup for Server Components and Server
 * Actions. Returns `{ user: null, profile: null }` when Supabase is not
 * configured, so callers render gracefully instead of throwing.
 */
export async function getAuthState(): Promise<AuthState> {
  const supabase = await createClient();
  if (!supabase) return { user: null, profile: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const profile = await getProfileForUser(supabase, user.id);
  return { user, profile };
}