"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthState } from "@/lib/auth/profile";
import { extractPdfFromBuffer } from "@/lib/rag/pdf";
import { processDocumentText } from "@/lib/rag/pipeline";
import { slugify, classifyDocument, cleanTitle, type LegalCategory } from "@/lib/rag/document-catalog";
import { parseFilerSpreadsheet, persistFilerDataset } from "@/lib/services/filer";

export interface BulkUploadFileResult {
  fileName: string;
  status: "success" | "skipped" | "failed";
  type: "law" | "constitution" | "atl";
  chunksCreated?: number;
  message?: string;
}

export interface BulkUploadSummary {
  ok: boolean;
  error?: string;
  totalFiles: number;
  successful: number;
  skipped: number;
  failed: number;
  totalChunks: number;
  results: BulkUploadFileResult[];
}

async function requireAdmin() {
  const { user, profile } = await getAuthState();
  if (!user) return { ok: false as const, error: "You must be signed in." };
  if (!profile || profile.role !== "admin") {
    return { ok: false as const, error: "Admin access required." };
  }
  return { ok: true as const, user };
}

/**
 * 1-Click Zero-Config Bulk Upload Action.
 * Automatically ingests files without requiring manual field entry:
 * - Detects type (Constitution, Federal/Provincial Laws, ATL/FBR excel)
 * - Automatically derives Title, Year, Category from file names & content
 * - Automatically parses text, chunks text, and generates Gemini embeddings
 * - Sets status directly to 'verified' & 'ready' so it's immediately active in RAG
 */
export async function autoBulkIngestAction(formData: FormData): Promise<BulkUploadSummary> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return {
      ok: false,
      error: guard.error,
      totalFiles: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      totalChunks: 0,
      results: [],
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "Admin database unavailable.",
      totalFiles: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      totalChunks: 0,
      results: [],
    };
  }

  const files = formData.getAll("files") as File[];
  if (!files || files.length === 0) {
    return {
      ok: false,
      error: "No files selected for bulk upload.",
      totalFiles: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      totalChunks: 0,
      results: [],
    };
  }

  const results: BulkUploadFileResult[] = [];
  let successful = 0;
  let skipped = 0;
  let failed = 0;
  let totalChunks = 0;

  for (const file of files) {
    const rawName = file.name;
    const lowerName = rawName.toLowerCase();

    // ─── 1. Handle ATL Excel / CSV File ───────────────────────────────────────
    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".csv") || lowerName.endsWith(".xls") || lowerName.includes("atl")) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileType: "csv" | "xlsx" | "xls" = lowerName.endsWith(".csv")
          ? "csv"
          : lowerName.endsWith(".xls")
            ? "xls"
            : "xlsx";

        const parsed = parseFilerSpreadsheet(buffer, fileType);

        await persistFilerDataset(
          rawName,
          fileType,
          "FBR Official Active Taxpayer List",
          String(new Date().getFullYear()),
          new Date().toISOString().slice(0, 10),
          parsed,
          guard.user.id,
          true
        );

        results.push({
          fileName: rawName,
          status: "success",
          type: "atl",
          message: `Active Taxpayer List imported: ${parsed.records.length} records.`,
        });
        successful++;
      } catch (atlErr: unknown) {
        failed++;
        results.push({
          fileName: rawName,
          status: "failed",
          type: "atl",
          message: atlErr instanceof Error ? atlErr.message : String(atlErr),
        });
      }
      continue;
    }

    // ─── 2. Handle PDF Legal Documents (Laws & Constitution) ─────────────────
    if (lowerName.endsWith(".pdf")) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileHash = createHash("sha256").update(buffer).digest("hex");

        // Duplicate check by hash
        const { data: existingDoc } = await admin
          .from("legal_documents")
          .select("id, title")
          .eq("file_hash", fileHash)
          .maybeSingle();

        if (existingDoc) {
          skipped++;
          results.push({
            fileName: rawName,
            status: "skipped",
            type: "law",
            message: `Exact file already exists ("${existingDoc.title}").`,
          });
          continue;
        }

        // Auto-detect Title, Classification, and Category
        const classified = classifyDocument(rawName);
        const isConstitution =
          lowerName.includes("constitution") || rawName.toLowerCase().includes("constitution");

        const category: LegalCategory = isConstitution ? "constitutional" : classified.category;
        const finalTitle = classified.title || cleanTitle(rawName);
        const normalizedTitle = classified.normalizedTitle || slugify(finalTitle);

        // Save original in storage (best-effort)
        const storagePath = `originals/${normalizedTitle}-${Date.now()}.pdf`;
        try {
          await admin.storage
            .from("legal-documents")
            .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });
        } catch {
          /* non-fatal */
        }

        // Insert legal document record directly marked as verified & ready for instant RAG
        const { data: doc, error: insertErr } = await admin
          .from("legal_documents")
          .insert({
            title: finalTitle,
            normalized_title: normalizedTitle,
            short_title: classified.shortTitle || finalTitle,
            document_type: isConstitution ? "constitution" : classified.documentType || "statute",
            category,
            jurisdiction_level: classified.jurisdictionLevel || "Federal",
            province: classified.province,
            year: classified.year,
            file_hash: fileHash,
            storage_path: storagePath,
            verification_status: "verified",
            processing_status: "extracting",
            requires_review: false,
            created_by: guard.user.id,
            metadata: {
              original_filename: rawName,
              auto_ingested: true,
              ingested_at: new Date().toISOString(),
            },
          })
          .select("id")
          .single();

        if (insertErr || !doc) {
          throw new Error(insertErr?.message || "Failed to create document record.");
        }

        // Extract text pages
        const extraction = await extractPdfFromBuffer(new Uint8Array(buffer));
        if (!extraction.pages || extraction.pages.length === 0) {
          await admin
            .from("legal_documents")
            .update({
              processing_status: "failed",
              requires_review: true,
              metadata: { error_message: "Document appears to be scanned and requires OCR." },
            })
            .eq("id", doc.id);

          failed++;
          results.push({
            fileName: rawName,
            status: "failed",
            type: isConstitution ? "constitution" : "law",
            message: "No text extractable (image-based scan).",
          });
          continue;
        }

        // Chunk and Embed with Gemini
        await processDocumentText(admin, doc.id, extraction.pages);

        // Fetch chunk count
        const { count: cCount } = await admin
          .from("legal_chunks")
          .select("*", { count: "exact", head: true })
          .eq("document_id", doc.id);

        const chunksNum = cCount ?? 0;
        totalChunks += chunksNum;
        successful++;

        results.push({
          fileName: rawName,
          status: "success",
          type: isConstitution ? "constitution" : "law",
          chunksCreated: chunksNum,
          message: `Indexed into ${chunksNum} vector chunks.`,
        });
      } catch (docErr: unknown) {
        failed++;
        results.push({
          fileName: rawName,
          status: "failed",
          type: "law",
          message: docErr instanceof Error ? docErr.message : String(docErr),
        });
      }
      continue;
    }

    // Unsupported format
    skipped++;
    results.push({
      fileName: rawName,
      status: "skipped",
      type: "law",
      message: "Unsupported file extension. Please select PDF, XLSX, or CSV files.",
    });
  }

  revalidatePath("/admin/knowledge-base");
  revalidatePath("/admin/filer-status");
  revalidatePath("/admin/ai");

  return {
    ok: true,
    totalFiles: files.length,
    successful,
    skipped,
    failed,
    totalChunks,
    results,
  };
}
