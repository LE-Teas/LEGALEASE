"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getAuthState } from "@/lib/auth/profile";
import { extractPdfFromBuffer, PdfExtractionError } from "@/lib/rag/pdf";
import { processDocumentText } from "@/lib/rag/pipeline";

export interface AdminActionResult<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

const idSchema = z.uuid();

async function requireAdmin(): Promise<
  | { ok: false; error: string }
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getAuthState>>["user"]> }
> {
  const { user, profile } = await getAuthState();
  if (!user) return { ok: false, error: "You must be signed in." };
  if (!profile || profile.role !== "admin") {
    return { ok: false, error: "Admin access required." };
  }
  return { ok: true, user };
}

export async function verifyDocument(id: string): Promise<AdminActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid document id." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data: current } = await supabase
    .from("legal_documents")
    .select("metadata")
    .eq("id", parsed.data)
    .maybeSingle();
  const metadata = (current?.metadata as Record<string, unknown> | null) ?? {};

  const { error } = await supabase
    .from("legal_documents")
    .update({
      verification_status: "verified",
      requires_review: false,
      metadata: {
        ...metadata,
        review_reason: null,
        reviewed_at: new Date().toISOString(),
      },
    })
    .eq("id", parsed.data);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/knowledge-base");
  return { ok: true };
}

export async function markDocumentNeedsReview(id: string): Promise<AdminActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid document id." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase
    .from("legal_documents")
    .update({ verification_status: "needs_review" })
    .eq("id", parsed.data);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/knowledge-base");
  return { ok: true };
}

export async function deleteDocument(id: string): Promise<AdminActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid document id." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role key is not configured. No delete allowed." };

  const { data: doc } = await admin
    .from("legal_documents")
    .select("storage_path")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Document not found." };

  // Remove the original PDF from storage (best effort).
  if (doc.storage_path) {
    await admin.storage.from("legal-documents").remove([doc.storage_path]);
  }

  const { error } = await admin.from("legal_documents").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/knowledge-base");
  return { ok: true };
}

/**
 * Bulk delete RAG knowledge base data.
 * target:
 *  - "all": Deletes all legal documents, chunks, and tax/ATL datasets
 *  - "laws": Deletes all federal/provincial statutory acts and their chunks
 *  - "constitution": Deletes specifically constitutional documents and chunks
 *  - "atl": Deletes all taxpayer/ATL datasets and records
 */
export async function bulkDeleteRagData(
  target: "all" | "laws" | "constitution" | "atl" = "all"
): Promise<AdminActionResult<{ deletedDocs: number; deletedChunks: number; deletedAtl: number }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role client unavailable." };

  try {
    let deletedDocs = 0;
    let deletedChunks = 0;
    let deletedAtl = 0;

    // 1. Delete ATL / Filer datasets and records
    if (target === "all" || target === "atl") {
      const { count: atlRecordsCount } = await admin
        .from("filer_records")
        .select("*", { count: "exact", head: true });
      deletedAtl = atlRecordsCount ?? 0;

      await admin.from("filer_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("filer_datasets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    // 2. Delete Legal Documents & Chunks
    if (target === "all" || target === "laws" || target === "constitution") {
      let query = admin.from("legal_documents").select("id, storage_path, title, category");
      if (target === "constitution") {
        query = query.or("category.eq.constitution,title.ilike.%constitution%");
      } else if (target === "laws") {
        query = query.not("category", "eq", "constitution");
      }

      const { data: docsToDelete, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const docIds = (docsToDelete ?? []).map((d) => d.id);
      deletedDocs = docIds.length;

      if (docIds.length > 0) {
        // Best effort storage cleanup
        const paths = (docsToDelete ?? []).map((d) => d.storage_path).filter(Boolean) as string[];
        if (paths.length > 0) {
          try {
            await admin.storage.from("legal-documents").remove(paths);
          } catch {
            /* ignore storage cleanup errors */
          }
        }

        const { count: chunksCount } = await admin
          .from("legal_chunks")
          .select("*", { count: "exact", head: true })
          .in("document_id", docIds);
        deletedChunks = chunksCount ?? 0;

        await admin.from("legal_chunks").delete().in("document_id", docIds);
        await admin.from("legal_documents").delete().in("id", docIds);
      }
    }

    await admin.from("admin_audit_logs").insert({
      admin_id: guard.user.id,
      action: "rag_bulk_delete",
      entity_type: "knowledge_base",
      metadata: { target, deletedDocs, deletedChunks, deletedAtl },
    });

    revalidatePath("/admin/knowledge-base");
    revalidatePath("/admin/filer-status");
    revalidatePath("/admin/ai");
    return {
      ok: true,
      data: { deletedDocs, deletedChunks, deletedAtl },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bulk delete failed.";
    return { ok: false, error: message };
  }
}

/**
 * Re-extract, re-chunk and re-embed a document from its stored original.
 * Requires SUPABASE_SERVICE_ROLE_KEY (storage is service-role only).
 */
export async function reprocessDocument(id: string): Promise<AdminActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid document id." };

  if (!isAdminConfigured()) {
    return { ok: false, error: "Service role key is not configured for reprocessing." };
  }

  const admin = createAdminClient()!;

  const { data: doc } = await admin
    .from("legal_documents")
    .select("id, storage_path, title")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Document not found." };
  if (!doc.storage_path) {
    return { ok: false, error: "No original file was stored for this document." };
  }

  try {
    const { data, error } = await admin.storage
      .from("legal-documents")
      .download(doc.storage_path);
    if (error || !data) {
      throw new Error(`Could not download the original file: ${error?.message ?? "download failed"}`);
    }

    const isText =
      doc.storage_path.toLowerCase().endsWith(".txt") ||
      doc.storage_path.toLowerCase().endsWith(".md") ||
      doc.storage_path.toLowerCase().endsWith(".markdown");

    let pages: Awaited<ReturnType<typeof extractPdfFromBuffer>>["pages"];
    if (isText) {
      const text = Buffer.from(await data.arrayBuffer()).toString("utf8").replace(/\r\n?/g, "\n");
      pages = [{ page: 1, text }];
    } else {
      const buf = Buffer.from(await data.arrayBuffer());
      const extraction = await extractPdfFromBuffer(new Uint8Array(buf));
      pages = extraction.pages;
    }

    await processDocumentText(admin, doc.id, pages, {
      replaceChunks: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof PdfExtractionError && err.kind === "ocr_required") {
      await admin
        .from("legal_documents")
        .update({ processing_status: "failed", requires_review: true })
        .eq("id", doc.id);
    }
    return { ok: false, error: message };
  }

  revalidatePath("/admin/knowledge-base");
  return { ok: true };
}

/**
 * Toggle document active/inactive state.
 */
export async function toggleDocumentActive(id: string): Promise<AdminActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid document id." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Database unavailable." };

  const { data: current } = await admin
    .from("legal_documents")
    .select("is_active, title")
    .eq("id", parsed.data)
    .single();

  if (!current) return { ok: false, error: "Document not found." };

  const nextState = !current.is_active;
  const { error } = await admin
    .from("legal_documents")
    .update({ is_active: nextState })
    .eq("id", parsed.data);

  if (error) return { ok: false, error: error.message };

  await admin.from("admin_audit_logs").insert({
    admin_id: (await getAuthState()).user?.id,
    action: nextState ? "document_activated" : "document_deactivated",
    entity_type: "legal_documents",
    entity_id: parsed.data,
    metadata: { title: current.title },
  });

  revalidatePath("/admin/knowledge-base");
  revalidatePath(`/admin/knowledge-base/${parsed.data}`);
  return { ok: true };
}

/**
 * Update document metadata (title, category, jurisdiction, etc.)
 */
export async function updateDocumentMetadata(
  id: string,
  updates: {
    title?: string;
    short_title?: string;
    document_type?: string;
    category?: string;
    jurisdiction_level?: string;
    province?: string | null;
    year?: number | null;
    official_source_url?: string | null;
    source_authority?: string | null;
    version_label?: string | null;
  }
): Promise<AdminActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid document id." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Database unavailable." };

  const { error } = await admin
    .from("legal_documents")
    .update(updates)
    .eq("id", parsed.data);

  if (error) return { ok: false, error: error.message };

  await admin.from("admin_audit_logs").insert({
    admin_id: (await getAuthState()).user?.id,
    action: "document_metadata_updated",
    entity_type: "legal_documents",
    entity_id: parsed.data,
    metadata: updates,
  });

  revalidatePath("/admin/knowledge-base");
  revalidatePath(`/admin/knowledge-base/${parsed.data}`);
  return { ok: true };
}

/**
 * Upload a legal PDF document from Admin Dashboard.
 * Handles SHA-256 duplicate detection, version collision detection,
 * storage upload, text extraction, chunking, and embedding.
 */
export async function uploadDocumentAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string; documentId?: string; warning?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Database admin client unavailable." };

  try {
    const file = formData.get("file") as File | null;
    if (!file) return { ok: false, error: "No PDF file provided." };

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return { ok: false, error: "Only PDF documents are supported for legal knowledge base." };
    }

    const title = (formData.get("title") as string)?.trim() || file.name.replace(/\.pdf$/i, "");
    const documentType = (formData.get("document_type") as string) || "statute";
    const category = (formData.get("category") as string) || "other";
    const jurisdictionLevel = (formData.get("jurisdiction_level") as string) || "Federal";
    const province = (formData.get("province") as string) || null;
    const yearRaw = formData.get("year") as string;
    const year = yearRaw && !isNaN(Number(yearRaw)) ? Number(yearRaw) : null;
    const sourceAuthority = (formData.get("source_authority") as string) || null;
    const officialSourceUrl = (formData.get("official_source_url") as string) || null;
    const versionLabel = (formData.get("version_label") as string) || null;

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Calculate SHA-256
    const { createHash } = await import("node:crypto");
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    // 2. Exact Duplicate Check
    const { data: existingHash } = await admin
      .from("legal_documents")
      .select("id, title")
      .eq("file_hash", fileHash)
      .maybeSingle();

    if (existingHash) {
      return {
        ok: false,
        error: `Exact duplicate file already exists in Knowledge Base: "${existingHash.title}" (ID: ${existingHash.id}). Ingestion aborted to avoid duplicate embeddings.`,
      };
    }

    // 3. Normalized title & Version Collision Check
    const { slugify } = await import("@/lib/rag/document-catalog");
    const normalizedTitle = slugify(title);

    const { data: existingTitle } = await admin
      .from("legal_documents")
      .select("id, title, version_label")
      .eq("normalized_title", normalizedTitle)
      .maybeSingle();

    let requiresReview = false;
    let reviewReason: string | null = null;
    if (existingTitle) {
      requiresReview = true;
      reviewReason = `Possible different version/amendment of existing law: "${existingTitle.title}". Verification pending admin review.`;
    }

    // 4. Upload original PDF to Supabase Storage
    const storagePath = `originals/${normalizedTitle}-${Date.now()}.pdf`;
    const { error: uploadError } = await admin.storage
      .from("legal-documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.warn("[upload] Storage upload notice:", uploadError.message);
    }

    // 5. Insert document record
    const { data: doc, error: insertError } = await admin
      .from("legal_documents")
      .insert({
        title,
        normalized_title: normalizedTitle,
        short_title: title,
        document_type: documentType,
        category,
        jurisdiction_level: jurisdictionLevel,
        province,
        year,
        source_authority: sourceAuthority,
        official_source_url: officialSourceUrl,
        storage_path: storagePath,
        file_hash: fileHash,
        version_label: versionLabel,
        verification_status: requiresReview ? "needs_review" : "pending",
        processing_status: "extracting",
        requires_review: requiresReview,
        created_by: (await getAuthState()).user?.id,
        metadata: {
          original_filename: file.name,
          file_size_bytes: buffer.length,
          review_reason: reviewReason,
          conflicting_document_id: existingTitle?.id ?? null,
        },
      })
      .select("id")
      .single();

    if (insertError || !doc) {
      return { ok: false, error: `Database insert failed: ${insertError?.message}` };
    }

    // 6. Text extraction
    let pages: Awaited<ReturnType<typeof extractPdfFromBuffer>>["pages"] = [];
    try {
      const extraction = await extractPdfFromBuffer(new Uint8Array(buffer));
      pages = extraction.pages;
    } catch (extractErr) {
      await admin
        .from("legal_documents")
        .update({
          processing_status: "failed",
          requires_review: true,
          metadata: {
            error_message: `Extraction error: ${extractErr instanceof Error ? extractErr.message : String(extractErr)}`,
          },
        })
        .eq("id", doc.id);

      return {
        ok: true,
        documentId: doc.id,
        warning: "Document uploaded but text extraction failed (may require OCR). Marked as Needs Review.",
      };
    }

    if (!pages || pages.length === 0) {
      await admin
        .from("legal_documents")
        .update({
          processing_status: "failed",
          requires_review: true,
          metadata: {
            error_message: "Text extraction failed or document may require OCR.",
          },
        })
        .eq("id", doc.id);

      return {
        ok: true,
        documentId: doc.id,
        warning: "Document appears scanned or text extraction produced 0 pages. Marked as Needs Review.",
      };
    }

    // 7. Chunk + Embed + Store
    try {
      await processDocumentText(admin, doc.id, pages);
    } catch (pipelineErr) {
      console.error("[upload/pipeline]", pipelineErr);
      return {
        ok: true,
        documentId: doc.id,
        warning: `Document saved but processing encountered an error: ${pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr)}`,
      };
    }

    // 8. Audit log
    await admin.from("admin_audit_logs").insert({
      admin_id: (await getAuthState()).user?.id,
      action: "document_uploaded",
      entity_type: "legal_documents",
      entity_id: doc.id,
      metadata: {
        title,
        hash: fileHash,
        requires_review: requiresReview,
      },
    });

    revalidatePath("/admin/knowledge-base");
    return { ok: true, documentId: doc.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload processing failed.";
    return { ok: false, error: message };
  }
}