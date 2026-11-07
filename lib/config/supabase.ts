/**
 * Central access point for Supabase credentials.
 *
 * Both the browser and server Supabase clients read credentials through this
 * module. `getSupabaseEnv` returns `null` when the project has not been
 * configured yet, allowing the site (and auth pages) to start gracefully and
 * show a clear "Supabase not configured" message instead of crashing.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
 */
export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export function getSupabaseEnv(): SupabaseEnv | null {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  // When running in a mobile client or remote browser accessing via local network IP (e.g. 192.168.x.x),
  // replace 127.0.0.1 / localhost with the actual host IP so the client can reach Supabase on port 54321
  if (typeof window !== "undefined") {
    const currentHost = window.location.hostname;
    if (
      currentHost &&
      currentHost !== "localhost" &&
      currentHost !== "127.0.0.1" &&
      (url.includes("127.0.0.1") || url.includes("localhost"))
    ) {
      url = url.replace("127.0.0.1", currentHost).replace("localhost", currentHost);
    }
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}