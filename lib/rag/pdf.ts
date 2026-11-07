/**
 * PDF text extraction (server-side).
 *
 * Uses pdfjs-dist's legacy build, which runs in plain Node (no worker). Page
 * number information is preserved so legal-aware chunking can keep section →
 * page mappings. Scanned/image-only PDFs yield almost no text; callers detect
 * that and mark the document as requiring OCR.
 */

import path from "node:path";
import type { ExtractedPage } from "@/lib/rag/chunking";

export class PdfExtractionError extends Error {
  constructor(
    message: string,
    public readonly kind: "invalid_pdf" | "extraction" | "ocr_required" = "extraction"
  ) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

/** Minimum usable text for a scanned PDF to be considered text-extractable. */
export const MIN_USABLE_CHARS = 120;

export interface PdfExtractionResult {
  pages: ExtractedPage[];
  pageCount: number;
  /** Total extracted characters (before normalization). */
  charCount: number;
}

async function loadPdfjs() {
  // Legacy build provides a Node-compatible ESM entry.
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

function itemToText(item: { str?: string; hasEOL?: boolean }): string {
  const str = item.str ?? "";
  return item.hasEOL ? `${str}\n` : str.endsWith(" ") ? str : `${str} `;
}

export async function extractPdfFromBuffer(buffer: Uint8Array): Promise<PdfExtractionResult> {
  const pdfjs = await loadPdfjs();

  // Resolve standard fonts directory for Node.js environment
  const standardFontDataUrl =
    path.resolve(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/").replace(/\\/g, "/") + "/";

  let doc: Record<string, unknown> | null = null;

  try {
    const loadingTask = (pdfjs as unknown as {
      getDocument(params: Record<string, unknown>): {
        promise: Promise<{
          numPages: number;
          getPage(i: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }>;
          cleanup?(): Promise<void> | void;
          destroy?(): Promise<void> | void;
        }>;
      };
    }).getDocument({
      data: buffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      standardFontDataUrl,
    });
    const loaded = await loadingTask.promise;
    doc = loaded as unknown as Record<string, unknown>;

    const pages: ExtractedPage[] = [];
    let charCount = 0;
    const rawPapers: string[] = [];

    for (let i = 1; i <= loaded.numPages; i++) {
      const page = await loaded.getPage(i);
      const content = await page.getTextContent();
      const raw = (content.items as { str?: string; hasEOL?: boolean }[])
        .map(itemToText)
        .join("");
      charCount += raw.length;
      rawPapers.push(raw);
      pages.push({ page: i, text: raw });
    }

    if (charCount < MIN_USABLE_CHARS * loaded.numPages || charCount < MIN_USABLE_CHARS) {
      throw new PdfExtractionError(
        "PDF appears to be scanned/image-based and requires OCR (little or no extractable text).",
        "ocr_required"
      );
    }

    return { pages, pageCount: loaded.numPages, charCount };
  } catch (err) {
    if (err instanceof PdfExtractionError) throw err;
    if (err instanceof Error && /Invalid PDF|Failed to fetch|FormatError|password|encrypted/i.test(err.message)) {
      throw new PdfExtractionError(
        `Could not read this PDF: ${err.message}`,
        err.message.toLowerCase().includes("password") ? "invalid_pdf" : "extraction"
      );
    }
    throw new PdfExtractionError(
      `PDF extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      "extraction"
    );
  } finally {
    try {
      if (doc && typeof (doc as { cleanup?: () => unknown }).cleanup === "function") {
        await (doc as { cleanup: () => Promise<void> | void }).cleanup();
      } else if (doc && typeof (doc as { destroy?: () => unknown }).destroy === "function") {
        await (doc as { destroy: () => Promise<void> | void }).destroy();
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

/** Read a PDF file directly. */
export async function extractPdfFromFile(filePath: string): Promise<PdfExtractionResult> {
  const { readFile } = await import("node:fs/promises");
  const content = await readFile(filePath);
  return extractPdfFromBuffer(new Uint8Array(content));
}
