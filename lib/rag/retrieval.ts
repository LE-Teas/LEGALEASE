/**
 * Vector retrieval against the verified legal corpus via the
 * match_legal_chunks RPC (security definer). Filters are applied inside the
 * RPC so citizens can never see unverified/non-ready/repealed documents.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  sectionNumber: string | null;
  articleNumber: string | null;
  sectionTitle: string | null;
  pageNumber: number | null;
  category: string;
  jurisdictionLevel: string;
  province: string | null;
  officialSourceUrl: string | null;
  versionLabel: string | null;
  similarity: number;
  verificationStatus?: string;
  processingStatus?: string;
  requiresReview?: boolean;
}

export interface RetrieveOptions {
  queryEmbedding: number[];
  matchCount?: number;
  similarityThreshold?: number;
  category?: string | null;
  jurisdictionLevel?: string | null;
  province?: string | null;
  documentId?: string | null;
  /** Use the debug RPC (includes pending/unverified docs). Server/admin only. */
  debug?: boolean;
}

function vectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

function mapRows(rows: unknown[]): RetrievedChunk[] {
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      chunkId: String(r.chunk_id ?? ""),
      documentId: String(r.document_id ?? ""),
      documentTitle: String(r.document_title ?? ""),
      content: String(r.content ?? ""),
      sectionNumber: r.section_number ? String(r.section_number) : null,
      articleNumber: r.article_number ? String(r.article_number) : null,
      sectionTitle: r.section_title ? String(r.section_title) : null,
      pageNumber: typeof r.page_number === "number" ? (r.page_number as number) : null,
      category: String(r.category ?? ""),
      jurisdictionLevel: String(r.jurisdiction_level ?? ""),
      province: r.province ? String(r.province) : null,
      officialSourceUrl: r.official_source_url ? String(r.official_source_url) : null,
      versionLabel: r.version_label ? String(r.version_label) : null,
      similarity: typeof r.similarity === "number" ? (r.similarity as number) : 0,
      ...(r.verification_status ? { verificationStatus: String(r.verification_status) } : {}),
      ...(r.processing_status ? { processingStatus: String(r.processing_status) } : {}),
      ...(typeof r.requires_review === "boolean" ? { requiresReview: r.requires_review as boolean } : {}),
    };
  });
}

export async function retrieveLegalChunks(
  supabase: SupabaseClient,
  options: RetrieveOptions
): Promise<RetrievedChunk[]> {
  const primaryFn = options.debug ? "match_legal_chunks_debug" : "match_legal_chunks";

  const params: Record<string, unknown> = {
    query_embedding: vectorLiteral(options.queryEmbedding),
    match_count: options.matchCount ?? 8,
    similarity_threshold: options.similarityThreshold ?? 0.35,
    p_category: options.category ?? null,
    p_jurisdiction_level: options.jurisdictionLevel ?? null,
    p_province: options.province ?? null,
    p_document_id: options.documentId ?? null,
  };

  let { data, error } = await supabase.rpc(primaryFn, params);

  // Gracefully fallback to match_legal_chunks if match_legal_chunks_debug is missing in schema cache
  if (error && options.debug && (error.code === "PGRST202" || /match_legal_chunks_debug/i.test(error.message))) {
    const fallback = await supabase.rpc("match_legal_chunks", params);
    data = fallback.data;
    error = fallback.error;
  }
  if (error) {
    throw new Error(
      `Retrieval failed: ${error.message}${
        /dimension/i.test(error.message)
          ? " (vector dimension mismatch — check EMBEDDING_DIMENSIONS vs legal_chunks.embedding)"
          : ""
      }`
    );
  }

  return mapRows(Array.isArray(data) ? data : []);
}

/** Deduplicate overlapping chunks (same doc nearby slices) for prompt context. */
export function dedupeChunks(
  chunks: RetrievedChunk[],
  maxDocs = 4
): RetrievedChunk[] {
  const seenDocs = new Set<string>();
  const seenContent = new Set<string>();
  const result: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    const fingerprint = chunk.content.slice(0, 120);
    const docCount = seenDocs.has(chunk.documentId) ? 1 : 0;
    const nextDocCount = seenDocs.size + (docCount === 0 ? 1 : 0);

    if (nextDocCount > maxDocs) break;
    if (seenContent.has(fingerprint)) continue;

    seenContent.add(fingerprint);
    seenDocs.add(chunk.documentId);
    result.push(chunk);
  }

  return result;
}