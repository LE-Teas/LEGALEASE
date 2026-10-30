import { type NextRequest, NextResponse } from "next/server";
import { createSsrProxyClient } from "@/lib/supabase/proxy";
import {
  dashboardPathForRole,
  getRoleForUser,
} from "@/lib/auth/roles";

export const config = {
  matcher: ["/citizen/:path*", "/lawyer/:path*", "/admin/:path*"],
};

/**
 * Server-side route protection (Next.js 16 "proxy" — the renamed middleware).
 *
 * - Unauthenticated users are redirected to /login.
 * - Citizens may only access /citizen/*, lawyers only /lawyer/*, and admins
 *   only /admin/*.
 * - Not configured? Pass through untouched (the app runs without Supabase).
 *
 * Note: route protection is enforced here AND re-checked inside each
 * dashboard page. Never rely on the proxy alone.
 */
export async function proxy(request: NextRequest) {
  const client = await createSsrProxyClient(request);
  if (!client) return NextResponse.next();

  const { supabase, response } = client;
  const pathname = request.nextUrl.pathname;
  const isCitizenArea = pathname.startsWith("/citizen");
  const isLawyerArea = pathname.startsWith("/lawyer");
  const isAdminArea = pathname.startsWith("/admin");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const role = await getRoleForUser(supabase, user);

  const allowed =
    (isCitizenArea && role === "citizen") ||
    (isLawyerArea && role === "lawyer") ||
    (isAdminArea && role === "admin");

  if (!allowed) {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPathForRole(role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}