/**
 * LegalEase legal knowledge-base ingestion.
 *
 * Usage:
 *   npm run ingest:legal -- "C:\path\to\knowledge-base"
 *   npm run ingest:legal -- "C:\path\to\kb" --verify --dry-run
 *   npm run ingest:legal -- --path=C:\kb --overrides=overrides.json --report=report.json
 *
 * Flags:
 *   --path=<dir>          source folder (or first positional arg)
 *   --verify              mark freshly ingested documents as verified (dev use)
 *   --dry-run             scan + classify + hash only; write nothing
 *   --reprocess           re-ingest already-ingested files (same hash)
 *   --overrides=<file>    JSON: { "<filename>": { category, jurisdiction_level,
 *                         province, city, year, short_title } }
 *   --chunk-size=<n>      max chunk size (default 1600)
 *   --soft-size=<n>       soft chunk target (default 900)
 *   --overlap=<n>         overlap for long-section splits (default 120)
 *   --report=<file>       write a JSON ingestion report
 *   --skip-storage        do not upload originals to Supabase Storage
 *
 * Pipeline per file: hash → duplicate check → classify → upload original →
 * extract → legal-aware chunk → embed → store → mark ready.
 * Failures are contained per-file; the run always produces a summary.
 */

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnv } from "@/scripts/lib/load-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiConfig } from "@/lib/ai/config";
import {
  classifyDocument,
  extractVersionLabel,
  slugify,
  stripExtension,
} from "@/lib/rag/document-catalog";
import { extractPdfFromFile, PdfExtractionError } from "@/lib/rag/pdf";
import { processDocumentText } from "@/lib/rag/pipeline";
import { isAdminConfigured } from "@/lib/supabase/admin";

loadEnv();

// --- CLI parsing -------------------------------------------------------------

interface CliOptions {
  folder: string | null;
  verify: boolean;
  dryRun: boolean;
  reprocess: boolean;
  skipStorage: boolean;
  overridesFile: string | null;
  reportFile: string | null;
  chunkSize: number;
  softSize: number;
  overlap: number;
}

const RAW = process.argv.slice(2);
const opts: CliOptions = {
  folder: null,
  verify: RAW.includes("--verify"),
  dryRun: RAW.includes("--dry-run"),
  reprocess: RAW.includes("--reprocess"),
  skipStorage: RAW.includes("--skip-storage"),
  overridesFile: null,
  reportFile: null,
  chunkSize: 1600,
  softSize: 900,
  overlap: 120,
};

for (const arg of RAW) {
  if (arg.startsWith("--path=")) opts.folder = arg.slice(7);
  else if (arg.startsWith("--overrides=")) opts.overridesFile = arg.slice(12);
  else if (arg.startsWith("--report=")) opts.reportFile = arg.slice(9);
  else if (arg.startsWith("--chunk-size=")) opts.chunkSize = Number(arg.slice(13));
  else if (arg.startsWith("--soft-size=")) opts.softSize = Number(arg.slice(12));
  else if (arg.startsWith("--overlap=")) opts.overlap = Number(arg.slice(10));
  else if (!arg.startsWith("--") && !opts.folder) opts.folder = arg;
}

// --- state ------------------------------------------------------------------

interface Overrides {
  category?: string;
  jurisdiction_level?: string;
  province?: string | null;
  city?: string | null;
  year?: number;
  short_title?: string | null;
}

let overrides: Record<string, Overrides> = {};
if (opts.overridesFile) {
  overrides = JSON.parse(fs.readFileSync(opts.overridesFile, "utf8"));
}

const stats = {
  filesScanned: 0,
  newDocuments: 0,
  duplicatesSkipped: 0,
  requiresReview: [] as string[],
  successfullyProcessed: 0,
  failed: [] as { file: string; reason: string }[],
  chunksCreated: 0,
  embeddingsGenerated: 0,
  ocrRequired: [] as string[],
  versionCollisions: [] as string[],
};

function log(step: string, message: string): void {
  console.log(`[${step}] ${message}`);
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function findPdfs(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findPdfs(full)));
    } else if (/\.(pdf|txt|md|markdown)$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results.sort((a, b) => a.localeCompare(b));
}

function displayName(file: string): string {
  return path.basename(file);
}

async function markVersionReview(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  normalizedTitle: string,
  selfId: string,
  selfHash: string
): Promise<void> {
  const { data } = await supabase
    .from("legal_documents")
    .select("id, title, file_hash, version_label, metadata")
    .eq("normalized_title", normalizedTitle)
    .neq("id", selfId)
    .neq("file_hash", selfHash);

  if (!data || data.length === 0) return;

  for (const row of data) {
    const metadata = (row.metadata as Record<string, unknown>) ?? {};
    await supabase.from("legal_documents").update({
      requires_review: true,
      metadata: {
        ...metadata,
        review_reason:
          `Multiple files detected for "${normalizedTitle}" with different hashes — requires version comparison.`,
        reviewed_at: null,
      },
    }).eq("id", row.id);
    stats.versionCollisions.push(
      `${row.title} (${row.version_label ?? "no version label"})`
    );
  }

  // Also flag the document we just created.
  const self = await supabase.from("legal_documents").select("metadata").eq("id", selfId).maybeSingle();
  const selfMeta = (self.data?.metadata as Record<string, unknown>) ?? {};
  await supabase.from("legal_documents").update({
    requires_review: true,
    metadata: {
      ...selfMeta,
      review_reason: `Multiple files detected for "${normalizedTitle}" with different hashes — requires version comparison.`,
    },
  }).eq("id", selfId);
}

async function ingestFile(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  file: string
): Promise<void> {
  const name = displayName(file);
  const fileBuffer = await fs.promises.readFile(file);
  const hash = sha256(fileBuffer);
  const classified = classifyDocument(name);
  const fileOverride = overrides[name] ?? overrides[stripExtension(name)] ?? {};

  const category = (fileOverride.category ?? classified.category) as string;
  const jurisdictionLevel = (fileOverride.jurisdiction_level ??
    classified.jurisdictionLevel) as string;
  const province = fileOverride.province !== undefined ? fileOverride.province : classified.province;
  const year = fileOverride.year ?? classified.year;
  const shortTitle = fileOverride.short_title ?? classified.shortTitle ?? null;
  const versionLabel = extractVersionLabel(name) ?? (year ? `${year} edition` : null);

  if (opts.dryRun) {
    log("dry-run", `${name} → ${classified.title} (${category}, ${jurisdictionLevel}${province ? `, ${province}` : ""})`);
    stats.filesScanned += 1;
    stats.newDocuments += 1;
    return;
  }

  // 1 — exact duplicate check (same SHA-256).
  const existing = await supabase
    .from("legal_documents")
    .select("id, processing_status")
    .eq("file_hash", hash)
    .maybeSingle();

  if (existing.data) {
    if (!opts.reprocess && existing.data.processing_status === 'ready') {
      log("skip", `${name} is an exact duplicate of an existing document (status=${existing.data.processing_status}).`);
      stats.filesScanned += 1;
      stats.duplicatesSkipped += 1;
      return;
    }
    log("reprocess", `${name} already exists — reprocessing.`);
  }

  // 2 — version collision detection (same normalized title, different hash).
  const normalizedTitle = classified.normalizedTitle;
  const matchedOthers = await supabase
    .from("legal_documents")
    .select("id")
    .eq("normalized_title", normalizedTitle)
    .neq("file_hash", hash)
    .limit(1);
  const hasVersionCollision = (matchedOthers.data?.length ?? 0) > 0;

  // 3 — storage upload (best effort, never fatal).
  let storagePath: string | null = null;
  if (!opts.skipStorage) {
    try {
      const safeName = slugify(stripExtension(name));
      const ext = path.extname(name).toLowerCase();
      const storageDir = `legal/${slugify(normalizedTitle)}`;
      const objectPath = `${storageDir}/${hash.slice(0, 12)}-${safeName}${ext}`;
      const { error } = await supabase.storage
        .from("legal-documents")
        .upload(objectPath, fileBuffer, {
          contentType:
            ext === ".pdf"
              ? "application/pdf"
              : ext === ".md" || ext === ".markdown"
                ? "text/markdown"
                : "text/plain",
          upsert: true,
        });
      if (error) {
        log("warn", `${name}: storage upload failed → ${error.message} (continuing without original copy)`);
      } else {
        storagePath = objectPath;
      }
    } catch (err) {
      log("warn", `${name}: storage upload exception → ${err instanceof Error ? err.message : String(err)} (continuing)`);
    }
  }

  // 4 — create/update the document row.
  let documentId = existing.data?.id ?? null;
  if (!documentId) {
    const insert = await supabase.from("legal_documents").insert({
      title: classified.title,
      normalized_title: normalizedTitle,
      short_title: shortTitle,
      document_type: classified.documentType,
      category,
      jurisdiction_level: jurisdictionLevel,
      province,
      city: fileOverride.city ?? null,
      country: "Pakistan",
      year,
      official_source_url: null,
      source_authority: classified.sourceAuthority,
      storage_path: storagePath,
      file_hash: hash,
      verification_status: opts.verify ? "verified" : "pending",
      processing_status: "pending",
      version_label: versionLabel,
      is_active: true,
      is_repealed: false,
      requires_review: false,
      page_count: null,
      metadata: { source_filename: name },
    }).select("id").single();

    if (insert.error) {
      stats.failed.push({ file: name, reason: `DB insert: ${insert.error.message}` });
      return;
    }
    documentId = insert.data.id;
  } else if (storagePath) {
    await supabase.from("legal_documents").update({ storage_path: storagePath }).eq("id", documentId);
  }

  stats.filesScanned += 1;
  stats.newDocuments += 1;

  if (hasVersionCollision) {
    await markVersionReview(supabase, normalizedTitle, documentId, hash);
    stats.requiresReview.push(`${name} → version collision with an existing copy of ${normalizedTitle}`);
  }

  // 5 — extract text.
  let pagesCount = 0;
  try {
    if (/\.(txt|md|markdown)$/i.test(file)) {
      const text = fileBuffer.toString("utf8").replace(/\r\n?/g, "\n");
      const extracted = await processDocumentText(supabase, documentId, [
        { page: 1, text },
      ], { chunking: buildChunkingOptions() });
      pagesCount = 1;
      stats.successfullyProcessed += 1;
      stats.chunksCreated += extracted.chunkCount;
      stats.embeddingsGenerated += extracted.embeddingsGenerated;
      log("ok", `${name} → ${extracted.chunkCount} chunks, ${extracted.embeddingsGenerated} embeddings`);
      return;
    }

    const extraction = await extractPdfFromFile(file);
    pagesCount = extraction.pageCount;
    const result = await processDocumentText(supabase, documentId, extraction.pages, {
      chunking: buildChunkingOptions(),
    });
    stats.successfullyProcessed += 1;
    stats.chunksCreated += result.chunkCount;
    stats.embeddingsGenerated += result.embeddingsGenerated;
    log("ok", `${name} → ${extraction.pageCount} pages, ${result.chunkCount} chunks, ${result.embeddingsGenerated} embeddings`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    if (err instanceof PdfExtractionError && err.kind === "ocr_required") {
      const meta = await supabase.from("legal_documents").select("metadata").eq("id", documentId).maybeSingle();
      const metadata = (meta.data?.metadata as Record<string, unknown>) ?? {};
      await supabase.from("legal_documents").update({
        processing_status: "failed",
        requires_review: true,
        metadata: { ...metadata, error_message: reason, error_at: new Date().toISOString() },
      }).eq("id", documentId);
      stats.ocrRequired.push(name);
      stats.requiresReview.push(name);
    }
    stats.failed.push({ file: name, reason });
    log("fail", `${name} → ${reason}`);
    void pagesCount;
  }
}

function buildChunkingOptions() {
  return {
    maxChunkSize: opts.chunkSize,
    softChunkSize: opts.softSize,
    overlap: opts.overlap,
  };
}

// --- main --------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("LegalEase — legal knowledge base ingestion");
  console.log("===========================================");

  if (!opts.folder) {
    console.error("Missing knowledge-base folder.\nUsage: npm run ingest:legal -- \"C:\\path\\to\\knowledge-base\"");
    process.exit(1);
  }
  if (!fs.existsSync(opts.folder)) {
    console.error(`Folder not found: ${opts.folder}`);
    process.exit(1);
  }

  const cfg = getAiConfig();
  console.log(`Embedding provider: ${cfg.embeddingProvider} · model: ${cfg.embeddingModel} · dimensions: ${cfg.embeddingDimensions}`);
  console.log(`Chunking: max=${opts.chunkSize} soft=${opts.softSize} overlap=${opts.overlap}`);
  console.log(`Mode: ${opts.dryRun ? "DRY RUN" : opts.verify ? "verify-on-ingest (dev)" : "import (verification=pending)"}`);

  if (!isAdminConfigured()) {
    console.error("\nABORTED: SUPABASE_SERVICE_ROLE_KEY (and Supabase URL) must be set in .env.local to ingest.");
    console.error("Add: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createAdminClient()!;
  const files = await findPdfs(opts.folder);
  console.log(`Found ${files.length} document(s) under ${opts.folder}\n`);

  for (const file of files) {
    try {
      await ingestFile(supabase, file);
    } catch (err) {
      stats.failed.push({ file: displayName(file), reason: err instanceof Error ? err.message : String(err) });
    }
  }

  const summary = {
    files_scanned: stats.filesScanned,
    new_documents: stats.newDocuments,
    duplicates_skipped: stats.duplicatesSkipped,
    successfully_processed: stats.successfullyProcessed,
    failed: stats.failed,
    requires_review: stats.requiresReview,
    ocr_required: stats.ocrRequired,
    version_collisions: stats.versionCollisions,
    chunks_created: stats.chunksCreated,
    embeddings_generated: stats.embeddingsGenerated,
  };

  console.log("\n===========================================");
  console.log("INGESTION SUMMARY");
  console.log("===========================================");
  console.log(`Files scanned          : ${summary.files_scanned}`);
  console.log(`New documents          : ${summary.new_documents}`);
  console.log(`Duplicates skipped     : ${summary.duplicates_skipped}`);
  console.log(`Successfully processed : ${summary.successfully_processed}`);
  console.log(`Failed                 : ${summary.failed.length}`);
  console.log(`Chunks created         : ${summary.chunks_created}`);
  console.log(`Embeddings generated   : ${summary.embeddings_generated}`);
  if (summary.requires_review.length) {
    console.log(`\nDocuments requiring review (${summary.requires_review.length}):`);
    summary.requires_review.forEach((item) => console.log(`  - ${item}`));
  }
  if (summary.ocr_required.length) {
    console.log(`\nPDFs that appear scanned/image-based (need OCR):`);
    summary.ocr_required.forEach((item) => console.log(`  - ${item}`));
  }
  if (summary.version_collisions.length) {
    console.log(`\nVersion collisions detected (needs review):`);
    summary.version_collisions.forEach((item) => console.log(`  - ${item}`));
  }
  if (summary.failed.length) {
    console.log("\nFailed files:");
    summary.failed.forEach((f) => console.log(`  - ${f.file}: ${f.reason}`));
  }
  console.log("\nDocuments are imported with verification_status='pending' by default.");
  console.log("Mark them verified from /admin/knowledge-base, or re-run with --verify (dev only).");

  if (opts.reportFile) {
    fs.writeFileSync(opts.reportFile, JSON.stringify(summary, null, 2));
    console.log(`\nReport written to ${opts.reportFile}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
