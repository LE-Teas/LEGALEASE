import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/profile";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { user, profile } = await getAuthState();
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await context.params;
  const fullPath = (path ?? []).join("/");

  const supabase = createAdminClient() ?? (await createClient());
  if (supabase && fullPath) {
    for (const bucket of ["verifications", "documents", "legal-documents"]) {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fullPath, 3600);
      if (data?.signedUrl) {
        return NextResponse.redirect(data.signedUrl);
      }
    }
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>Verification Document Viewer</title></head>
<body style="font-family:Inter,Arial,sans-serif;background:#F8FAFC;padding:40px;color:#0F172A;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:28px;">
    <h1 style="margin:0 0 8px;font-size:18px;color:#0A2843;">LegalEase Verification Credential Viewer</h1>
    <p style="margin:0 0 16px;font-size:13px;color:#64748B;">Document Path: <code>${fullPath}</code></p>
    <div style="padding:16px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;font-size:13px;color:#065F46;">
      This verification credential path is registered in the advocate verification record. If uploaded to Supabase Storage bucket <code>verifications</code>, it redirects automatically.
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

