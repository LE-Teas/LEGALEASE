/**
 * LegalEase CNIC Filer / Non-Filer Service
 *
 * Provides exact, structured taxpayer status verification against Admin-uploaded
 * active ATL (Active Taxpayers List) datasets.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS (per RAG_Filer.md):
 * 1. Filer status is NEVER determined by an LLM or semantic RAG.
 * 2. Filer records are NOT stored in pgvector.
 * 3. Citizen CNICs are NEVER sent to OpenRouter.
 * 4. The entire dataset is NEVER sent to the browser.
 * 5. Not Found is explicitly NOT classified as Non-Filer.
 */

import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface FilerLookupResult {
  found: boolean;
  cnicFormatted: string;
  status: "filer" | "non_filer" | "not_found";
  taxYear: string | null;
  source: string | null;
  effectiveDate: string | null;
  datasetName: string | null;
  datasetUploadedAt: string | null;
  guidance?: VerifiedFilerGuidance | null;
}

export interface VerifiedFilerGuidance {
  title: string;
  summary: string;
  legalBasis: string;
  authority: string;
  steps: Array<{
    step: number;
    title: string;
    description: string;
    requirements: string[];
  }>;
  benefits: string[];
  penaltiesForNonFiling: string[];
  portalUrl: string;
}

export interface FilerDatasetSummary {
  id: string;
  fileName: string;
  fileType: string;
  source: string;
  taxYear: string | null;
  effectiveDate: string | null;
  recordCount: number;
  filerCount: number;
  nonFilerCount: number;
  status: "processing" | "ready" | "active" | "inactive" | "failed";
  uploadedBy: string | null;
  uploadedAt: string;
  activatedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface ParseFilerResult {
  records: Array<{
    cnic: string;
    status: "filer" | "non_filer";
    taxYear?: string;
    source?: string;
  }>;
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidRows: Array<{ row: number; cnic?: string; reason: string }>;
  sampleRecords: Array<{ cnic: string; status: string }>;
}

/**
 * Normalizes any CNIC string (e.g., "42101-1234567-1" or "4210112345671") to
 * exactly 13 numeric digits. Returns null if invalid.
 */
export function normalizeCnic(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length !== 13) return null;
  return digits;
}

/**
 * Formats a 13-digit CNIC into standard Pakistani display format: XXXXX-XXXXXXX-X
 */
export function formatCnic(digits: string): string {
  const clean = digits.replace(/[^0-9]/g, "");
  if (clean.length !== 13) return digits;
  return `${clean.slice(0, 5)}-${clean.slice(5, 12)}-${clean.slice(12)}`;
}

/**
 * Normalizes input status string into 'filer' | 'non_filer' | null.
 */
export function normalizeFilerStatus(
  raw: string | null | undefined
): "filer" | "non_filer" | null {
  if (!raw) return null;
  const clean = String(raw).trim().toLowerCase().replace(/[\s\-_]/g, "");
  if (clean === "filer" || clean === "active" || clean === "atl") {
    return "filer";
  }
  if (
    clean === "nonfiler" ||
    clean === "inactive" ||
    clean === "notatl" ||
    clean === "non_filer"
  ) {
    return "non_filer";
  }
  return null;
}

/**
 * Verified step-by-step guidance under Pakistani law (Income Tax Ordinance, 2001)
 * explaining how a citizen can become an active filer.
 */
export const VERIFIED_NON_FILER_GUIDANCE: VerifiedFilerGuidance = {
  title: "How to Become an Active Filer in Pakistan",
  summary:
    "Under Section 181 and Section 114 of the Income Tax Ordinance, 2001, any citizen with taxable income or owning specified assets is required to register with the Federal Board of Revenue (FBR) and file an annual Income Tax Return to appear on the Active Taxpayers List (ATL).",
  legalBasis: "Income Tax Ordinance, 2001 (Sections 114, 181, 182, and 100BA read with Tenth Schedule)",
  authority: "Federal Board of Revenue (FBR), Government of Pakistan",
  portalUrl: "https://iris.fbr.gov.pk",
  steps: [
    {
      step: 1,
      title: "Obtain National Tax Number (NTN) via Iris Portal",
      description:
        "Visit the official FBR Iris portal (iris.fbr.gov.pk) and click 'Registration for Unregistered Person'. Enter your 13-digit CNIC, mobile number (registered in your own name), and email address.",
      requirements: [
        "13-digit valid Computerized National Identity Card (CNIC)",
        "Active mobile phone SIM registered on your own CNIC",
        "Personal active email address for verification codes",
      ],
    },
    {
      step: 2,
      title: "Complete E-Enrollment & Profile Details",
      description:
        "Submit the SMS and email verification codes. Log in using your assigned password and PIN. Complete Form 181 (Application for Registration) with your residential address and bank account details.",
      requirements: [
        "Utility bill (electricity or gas) of current residence",
        "International Bank Account Number (IBAN) certificate or cheque copy",
      ],
    },
    {
      step: 3,
      title: "Prepare & Submit Income Tax Return (Form 114)",
      description:
        "Navigate to 'Declaration' -> 'Returns/Statements' -> select the relevant Tax Year (July 1 to June 30). Declare all sources of annual income (salary, business, rental, foreign, capital gains) and agricultural income if applicable.",
      requirements: [
        "Salary certificates / employer tax deduction (Section 149 certificates)",
        "Annual bank account statement (1st July to 30th June) with withholding tax certificates (Section 231A/236)",
        "Proof of any vehicle, property, or investment tax deductions",
      ],
    },
    {
      step: 4,
      title: "Complete Wealth Statement (Section 116)",
      description:
        "Reconcile your opening wealth, total income, annual personal expenses, and closing wealth. The wealth reconciliation must balance to zero before submission.",
      requirements: [
        "Personal expenditure records for the year",
        "Details of assets: residential/commercial property, vehicles, bank balances, prize bonds",
      ],
    },
    {
      step: 5,
      title: "Verify Active Taxpayer List (ATL) Status & Surcharge if Late",
      description:
        "Once your return is submitted before the official deadline (or late with payment of the ATL Surcharge under Section 182A: PKR 1,000 for individuals), your name is immediately updated on the weekly Active Taxpayers List.",
      requirements: [
        "Payment of ATL surcharge (Challan PSID via e-payment) if filing after statutory deadline",
      ],
    },
  ],
  benefits: [
    "50% to 100% lower withholding tax rates on banking transactions and cash withdrawals",
    "Significantly lower capital gains and transfer taxes when buying or selling real estate",
    "Substantially lower motor vehicle token tax, registration, and transfer fees",
    "Reduced tax rates on dividend income, prize bonds, and bank interest/profit",
  ],
  penaltiesForNonFiling: [
    "Double withholding tax rates across real estate, vehicles, and financial transactions (Tenth Schedule)",
    "Inability to purchase certain high-value assets or commercial properties",
    "Statutory penalty notices under Section 182 of the Income Tax Ordinance, 2001",
  ],
};

/**
 * Parses an uploaded CSV or Excel file containing CNIC and Status.
 */
export function parseFilerSpreadsheet(
  buffer: Buffer,
  fileType: "csv" | "xlsx" | "xls"
): ParseFilerResult {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    raw: false,
    cellDates: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Spreadsheet contains no worksheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Unable to read worksheet data.");
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  if (!rows || rows.length < 2) {
    throw new Error("File contains no data rows or is missing a header row.");
  }

  const headerRow = rows[0].map((col) =>
    String(col ?? "").trim().toLowerCase()
  );

  // Flexible column detection
  const cnicColIdx = headerRow.findIndex(
    (h) =>
      h === "cnic" ||
      h === "cnic_no" ||
      h === "cnic_number" ||
      h === "nic" ||
      h === "identity_number" ||
      h.includes("cnic")
  );

  const statusColIdx = headerRow.findIndex(
    (h) =>
      h === "status" ||
      h === "filer_status" ||
      h === "atl_status" ||
      h === "taxpayer_status" ||
      h.includes("status")
  );

  const taxYearColIdx = headerRow.findIndex(
    (h) => h === "tax_year" || h === "taxyear" || h === "year"
  );

  const sourceColIdx = headerRow.findIndex(
    (h) => h === "source" || h === "authority"
  );

  if (cnicColIdx === -1) {
    throw new Error(
      `Could not detect a CNIC column in the header row. Expected 'CNIC' or 'cnic_no'. Found: ${headerRow.join(", ")}`
    );
  }

  if (statusColIdx === -1) {
    throw new Error(
      `Could not detect a Status column in the header row. Expected 'Status' or 'filer_status'. Found: ${headerRow.join(", ")}`
    );
  }

  const records: Array<{
    cnic: string;
    status: "filer" | "non_filer";
    taxYear?: string;
    source?: string;
  }> = [];

  const invalidRows: Array<{ row: number; cnic?: string; reason: string }> = [];
  const seenCnics = new Set<string>();
  let duplicateCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawCnic = row[cnicColIdx];
    const rawStatus = row[statusColIdx];
    const rawTaxYear = taxYearColIdx !== -1 ? row[taxYearColIdx] : null;
    const rawSource = sourceColIdx !== -1 ? row[sourceColIdx] : null;

    const normalizedCnic = normalizeCnic(rawCnic != null ? String(rawCnic) : "");
    if (!normalizedCnic) {
      invalidRows.push({
        row: i + 1,
        cnic: String(rawCnic ?? ""),
        reason: "Invalid CNIC format (must be 13 digits)",
      });
      continue;
    }

    const normalizedStatus = normalizeFilerStatus(
      rawStatus != null ? String(rawStatus) : ""
    );
    if (!normalizedStatus) {
      invalidRows.push({
        row: i + 1,
        cnic: normalizedCnic,
        reason: `Invalid status '${rawStatus}'. Expected 'Filer' or 'Non-Filer'.`,
      });
      continue;
    }

    if (seenCnics.has(normalizedCnic)) {
      duplicateCount++;
      continue;
    }

    seenCnics.add(normalizedCnic);
    records.push({
      cnic: normalizedCnic,
      status: normalizedStatus,
      taxYear: rawTaxYear ? String(rawTaxYear).trim() : undefined,
      source: rawSource ? String(rawSource).trim() : undefined,
    });
  }

  const sampleRecords = records.slice(0, 5).map((r) => ({
    cnic: formatCnic(r.cnic),
    status: r.status,
  }));

  return {
    records,
    totalRows: rows.length - 1,
    validCount: records.length,
    duplicateCount,
    invalidRows: invalidRows.slice(0, 50), // keep top 50 invalid for reporting
    sampleRecords,
  };
}

/**
 * Checks a citizen's CNIC against the active filer dataset.
 * Server-side only; does not send CNIC to any external service or LLM.
 */
export async function lookupCitizenFilerStatus(
  rawCnic: string
): Promise<FilerLookupResult> {
  const cleanCnic = normalizeCnic(rawCnic);
  if (!cleanCnic) {
    throw new Error("Please enter a valid 13-digit Pakistani CNIC number.");
  }

  const formatted = formatCnic(cleanCnic);
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Database unavailable. Please try again later.");
  }

  // First try the RPC function
  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    "lookup_active_filer_status",
    { p_cnic: cleanCnic }
  );

  if (!rpcErr && rpcData && rpcData.length > 0) {
    const row = rpcData[0];
    const found = Boolean(row.found);
    const status = found
      ? (row.status as "filer" | "non_filer")
      : "not_found";

    return {
      found,
      cnicFormatted: formatted,
      status,
      taxYear: row.tax_year || null,
      source: row.source || "FBR Active Taxpayers List",
      effectiveDate: row.effective_date || null,
      datasetName: row.dataset_name || null,
      datasetUploadedAt: row.dataset_uploaded_at || null,
      guidance: status === "non_filer" ? VERIFIED_NON_FILER_GUIDANCE : null,
    };
  }

  // Fallback: direct table queries via server client
  const { data: activeDataset } = await supabase
    .from("filer_datasets")
    .select("id, file_name, source, tax_year, effective_date, uploaded_at")
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeDataset) {
    return {
      found: false,
      cnicFormatted: formatted,
      status: "not_found",
      taxYear: null,
      source: "No active dataset configured",
      effectiveDate: null,
      datasetName: null,
      datasetUploadedAt: null,
      guidance: null,
    };
  }

  const { data: record } = await supabase
    .from("filer_records")
    .select("status, tax_year, source, effective_date")
    .eq("dataset_id", activeDataset.id)
    .eq("cnic_normalized", cleanCnic)
    .maybeSingle();

  if (record) {
    const status = record.status as "filer" | "non_filer";
    return {
      found: true,
      cnicFormatted: formatted,
      status,
      taxYear: record.tax_year || activeDataset.tax_year,
      source: record.source || activeDataset.source,
      effectiveDate: record.effective_date || activeDataset.effective_date,
      datasetName: activeDataset.file_name,
      datasetUploadedAt: activeDataset.uploaded_at,
      guidance: status === "non_filer" ? VERIFIED_NON_FILER_GUIDANCE : null,
    };
  }

  return {
    found: false,
    cnicFormatted: formatted,
    status: "not_found",
    taxYear: activeDataset.tax_year,
    source: activeDataset.source,
    effectiveDate: activeDataset.effective_date,
    datasetName: activeDataset.file_name,
    datasetUploadedAt: activeDataset.uploaded_at,
    guidance: null,
  };
}

/**
 * Bulk imports a parsed dataset into the database using batch operations.
 */
export async function persistFilerDataset(
  fileName: string,
  fileType: "csv" | "xlsx" | "xls",
  source: string,
  taxYear: string | null,
  effectiveDate: string | null,
  parsed: ParseFilerResult,
  adminUserId: string,
  activateImmediately = false
): Promise<{ datasetId: string; importedCount: number }> {
  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error("Admin database client unavailable.");
  }

  const filerCount = parsed.records.filter((r) => r.status === "filer").length;
  const nonFilerCount = parsed.records.filter((r) => r.status === "non_filer").length;

  // Insert dataset header
  const { data: dataset, error: datasetErr } = await adminClient
    .from("filer_datasets")
    .insert({
      file_name: fileName,
      file_type: fileType,
      source: source || "FBR Active Taxpayers List (ATL)",
      tax_year: taxYear,
      effective_date: effectiveDate,
      record_count: parsed.validCount,
      filer_count: filerCount,
      non_filer_count: nonFilerCount,
      status: activateImmediately ? "active" : "ready",
      uploaded_by: adminUserId,
      activated_at: activateImmediately ? new Date().toISOString() : null,
      metadata: {
        total_rows_in_file: parsed.totalRows,
        duplicate_rows_skipped: parsed.duplicateCount,
        invalid_rows_count: parsed.invalidRows.length,
        sample_invalid_rows: parsed.invalidRows.slice(0, 10),
      },
    })
    .select("id")
    .single();

  if (datasetErr || !dataset) {
    throw new Error(`Failed to create dataset record: ${datasetErr?.message}`);
  }

  const datasetId = dataset.id;

  // If activating immediately, deactivate any previous active datasets
  if (activateImmediately) {
    await adminClient
      .from("filer_datasets")
      .update({ status: "inactive" })
      .eq("status", "active")
      .neq("id", datasetId);
  }

  // Insert records in batches of 1000
  const BATCH_SIZE = 1000;
  for (let i = 0; i < parsed.records.length; i += BATCH_SIZE) {
    const batch = parsed.records.slice(i, i + BATCH_SIZE).map((r) => ({
      dataset_id: datasetId,
      cnic_normalized: r.cnic,
      status: r.status,
      tax_year: r.taxYear || taxYear,
      source: r.source || source,
      effective_date: effectiveDate,
    }));

    const { error: batchErr } = await adminClient
      .from("filer_records")
      .insert(batch);

    if (batchErr) {
      console.error(`[filer/import] Batch error at index ${i}:`, batchErr);
      // Clean up dataset on failure
      await adminClient.from("filer_datasets").update({ status: "failed" }).eq("id", datasetId);
      throw new Error(`Batch insert failed: ${batchErr.message}`);
    }
  }

  return { datasetId, importedCount: parsed.validCount };
}
