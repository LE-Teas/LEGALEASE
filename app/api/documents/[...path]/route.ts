import { NextResponse } from "next/server";

import { getAuthState } from "@/lib/auth/profile";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Signed-URL broker for private files.
 *
 * SECURITY (audit finding F-5): this handler previously signed ANY path in
 * `verifications`, `documents` or `legal-documents` using the service-role
 * client, for ANY authenticated user, with no ownership or role check. That let
 * a citizen read another lawyer's Bar Council card / CNIC scan — an IDOR on
 * identity documents.
 *
 * The fix authorizes first, then signs:
 *
 *   - `verifications/*`  → admin only, OR the lawyer who owns the record.
 *   - `citizen-files/<userId>/*` → that citizen only (or admin).
 *   - `<userId>/*`       → that user only (or admin).
 *   - `legal-documents/*`→ any authenticated user, but only for a document that
 *                          exists and is verified+active+not repealed (the same
 *                          rule the retrieval RPC applies).
 *
 * A denial returns 404, not 403: distinguishing "exists but forbidden" from
 * "does not exist" would leak the existence of other users' files.
 */

/** Reject traversal, absolute paths and empty segments before touching storage. */
function isSafeStoragePath(path: string): boolean {
  if (!path || path.length > 512) return false;
  if (path.startsWith("/") || path.includes("\\")) return false;
  if (path.includes("..") || path.includes("//")) return false;
  // Reject control characters and encoded traversal.
  if (/[\u0000-\u001f]/.test(path)) return false;
  if (/%2e%2e|%2f%2f/i.test(path)) return false;
  return true;
}

function notFound(): NextResponse {
  return new NextResponse("Not found", { status: 404 });
}

interface Signer {
  sign(bucket: string, path: string): Promise<string | null>;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { user, profile } = await getAuthState();
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: segments } = await context.params;
  const fullPath = (segments ?? []).join("/");
  if (!isSafeStoragePath(fullPath)) return notFound();

  const isAdmin = profile.role === "admin";

  // Use the service-role client only to mint a short-lived signed URL *after*
  // authorization has passed. Falls back to the session client (RLS enforced).
  const signerClient = createAdminClient() ?? (await createClient());
  if (!signerClient) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  }

  const signer: Signer = {
    async sign(bucket, path) {
      const { data } = await signerClient.storage
        .from(bucket)
        .createSignedUrl(path, 300); // 5 minutes
      return data?.signedUrl ?? null;
    },
  };

  const [firstSegment, secondSegment] = fullPath.split("/");

  // ---- 1. Lawyer verification credentials --------------------------------
  // Stored in the private `verifications` bucket. Admin reviews them; the
  // owning lawyer may re-open their own submission.
  const verificationUrl = await signer.sign("verifications", fullPath);
  if (verificationUrl) {
    if (isAdmin) {
      return NextResponse.redirect(verificationUrl);
    }
    // Owner check: path convention is `<lawyerId>/...` or `.../<lawyerId>/...`.
    const ownsByPath =
      firstSegment === user.id || secondSegment === user.id;
    if (ownsByPath) {
      return NextResponse.redirect(verificationUrl);
    }
    return notFound();
  }

  // ---- 2. Citizen private uploads ----------------------------------------
  // Convention written by /api/citizen/files: `citizen-files/<userId>/<file>`.
  if (firstSegment === "citizen-files") {
    if (!isAdmin && secondSegment !== user.id) return notFound();
    const url = await signer.sign("documents", fullPath);
    return url ? NextResponse.redirect(url) : notFound();
  }

  // ---- 3. Per-user private files -----------------------------------------
  if (firstSegment === user.id || isAdmin) {
    const url = await signer.sign("documents", fullPath);
    if (url) return NextResponse.redirect(url);
  }

  // ---- 4. Legal corpus -----------------------------------------------
  // Only publicly citable documents may be opened by ordinary users; this
  // mirrors the `legal_documents_public_select_verified` RLS policy so a
  // withdrawn/repealed statute cannot be served from the original PDF either.
  const legalUrl = await signer.sign("legal-documents", fullPath).catch(() => null);
  if (legalUrl) {
    const supabase = await createClient();
    if (supabase) {
      const { data: doc } = await supabase
        .from("legal_documents")
        .select("id, verification_status, is_active, is_repealed")
        .eq("storage_path", fullPath)
        .maybeSingle();

      const isPublic =
        doc &&
        doc.verification_status === "verified" &&
        doc.is_active === true &&
        doc.is_repealed === false;

      if (isPublic || isAdmin) {
        return NextResponse.redirect(legalUrl);
      }
    }
    return notFound();
  }

  return notFound();
}
