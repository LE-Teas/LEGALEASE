import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthState } from "@/lib/auth/profile";
import { DocumentDetailClient } from "@/components/admin/document-detail-client";

export const metadata: Metadata = {
  title: "Document Inspector | Admin Knowledge Base",
  description: "Inspect legal document metadata, verification status, and vector chunks.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    redirect("/");
  }

  const { id } = await params;
  const admin = createAdminClient();
  if (!admin) redirect("/");

  // Fetch document
  const { data: doc, error: docErr } = await admin
    .from("legal_documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (docErr || !doc) {
    notFound();
  }

  // Fetch chunks
  const { data: chunks } = await admin
    .from("legal_chunks")
    .select("id, chunk_index, section_number, section_title, article_number, page_number, token_count, content")
    .eq("document_id", id)
    .order("chunk_index", { ascending: true })
    .limit(200);

  // Generate signed download URL if storage path exists
  let downloadUrl: string | null = null;
  if (doc.storage_path) {
    const { data: signed } = await admin.storage
      .from("legal-documents")
      .createSignedUrl(doc.storage_path, 3600);
    downloadUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <DocumentDetailClient
        document={doc}
        chunks={chunks ?? []}
        downloadUrl={downloadUrl}
      />
    </div>
  );
}
