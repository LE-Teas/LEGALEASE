"use server";

import { revalidatePath } from "next/cache";
import { getAuthState } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseFilerSpreadsheet,
  persistFilerDataset,
  lookupCitizenFilerStatus,
  type FilerLookupResult,
  normalizeCnic,
} from "@/lib/services/filer";
import { rateLimit, CNIC_LOOKUP_RATE_LIMIT } from "@/lib/security/rate-limit";
import { hashCnicDigits, maskCnic } from "@/lib/privacy/cnic";

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function requireAdmin() {
  const { user, profile } = await getAuthState();
  if (!user) return { ok: false as const, error: "You must be signed in." };
  if (!profile || profile.role !== "admin") {
    return { ok: false as const, error: "Admin authorization required." };
  }
  return { ok: true as const, user, profile };
}

/**
 * Server action: Citizen lookup of CNIC status.
 *
 * Security controls (audit finding F-4 — previously anonymous and unlimited):
 *  1. Requires an authenticated session. The ATL covers millions of people, so
 *     an unauthenticated lookup is an enumeration oracle.
 *  2. Per-user AND per-target rate limiting, so a signed-in user cannot walk
 *     the CNIC space either.
 *  3. The raw CNIC never reaches SQL: only an HMAC blind index is queried.
 *  4. Audit logged with a masked CNIC (never the raw value).
 *  5. Responses are minimal: status + dataset provenance, no extra fields.
 */
export async function lookupCnicStatusAction(
  cnic: string
): Promise<ActionResult<FilerLookupResult>> {
  try {
    const { user } = await getAuthState();
    if (!user) {
      return { ok: false, error: "Please sign in to check filer status." };
    }

    const cleanCnic = normalizeCnic(cnic);
    if (!cleanCnic) {
      return { ok: false, error: "Invalid CNIC. Please enter a valid 13-digit Pakistani CNIC." };
    }

    // Budget 1: how many lookups this user may run per window.
    const userLimit = rateLimit(`cnic:user:${user.id}`, CNIC_LOOKUP_RATE_LIMIT);
    if (!userLimit.allowed) {
      return {
        ok: false,
        error: `Too many lookups. Please wait ${Math.ceil(
          userLimit.retryAfterMs / 1000
        )} seconds and try again.`,
      };
    }

    // Budget 2: how many times ANY user may probe the same CNIC per window.
    // Blocks a single target from being repeatedly harvested across accounts.
    const targetLimit = rateLimit(
      `cnic:target:${hashCnicDigits(cleanCnic)}`,
      CNIC_LOOKUP_RATE_LIMIT
    );
    if (!targetLimit.allowed) {
      return {
        ok: false,
        error: "Too many lookups for this CNIC. Please try again later.",
      };
    }

    const result = await lookupCitizenFilerStatus(cleanCnic);

    // Audit trail without raw CNIC.
    const admin = createAdminClient();
    if (admin) {
      await admin
        .from("admin_audit_logs")
        .insert({
          admin_id: user.id,
          action: "filer_status_lookup",
          entity_type: "filer_records",
          entity_id: null,
          metadata: {
            cnic_masked: maskCnic(cleanCnic),
            outcome: result.status,
            dataset: result.datasetName,
          },
        })
        .then(
          () => undefined,
          () => undefined // audit failure must never break the lookup
        );
    }

    return { ok: true, data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error checking filer status.";
    return { ok: false, error: message };
  }
}

/**
 * Server action: Admin preview / parse of uploaded CSV or XLSX.
 */
export async function parseFilerFileAction(
  formData: FormData
): Promise<ActionResult<{
  fileName: string;
  fileType: "csv" | "xlsx" | "xls";
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  sampleRecords: Array<{ cnic: string; status: string }>;
  sampleInvalid: Array<{ row: number; reason: string }>;
}>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  try {
    const file = formData.get("file") as File | null;
    if (!file) return { ok: false, error: "No file provided." };

    const name = file.name.toLowerCase();
    let fileType: "csv" | "xlsx" | "xls" | null = null;
    if (name.endsWith(".csv")) fileType = "csv";
    else if (name.endsWith(".xlsx")) fileType = "xlsx";
    else if (name.endsWith(".xls")) fileType = "xls";

    if (!fileType) {
      return { ok: false, error: "Unsupported file type. Please upload a CSV or XLSX file." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseFilerSpreadsheet(buffer, fileType);

    return {
      ok: true,
      data: {
        fileName: file.name,
        fileType,
        totalRows: parsed.totalRows,
        validCount: parsed.validCount,
        duplicateCount: parsed.duplicateCount,
        invalidCount: parsed.invalidRows.length,
        sampleRecords: parsed.sampleRecords,
        sampleInvalid: parsed.invalidRows.slice(0, 10),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse file.";
    return { ok: false, error: message };
  }
}

/**
 * Server action: Admin commits dataset import.
 */
export async function commitFilerDatasetAction(
  formData: FormData
): Promise<ActionResult<{ datasetId: string; importedCount: number }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  try {
    const file = formData.get("file") as File | null;
    if (!file) return { ok: false, error: "No file provided." };

    const source = (formData.get("source") as string) || "FBR Active Taxpayers List (ATL)";
    const taxYear = (formData.get("taxYear") as string) || null;
    const effectiveDate = (formData.get("effectiveDate") as string) || null;
    const activate = formData.get("activateImmediately") === "true";

    const name = file.name.toLowerCase();
    let fileType: "csv" | "xlsx" | "xls" | null = null;
    if (name.endsWith(".csv")) fileType = "csv";
    else if (name.endsWith(".xlsx")) fileType = "xlsx";
    else if (name.endsWith(".xls")) fileType = "xls";

    if (!fileType) {
      return { ok: false, error: "Unsupported file format. Must be CSV or XLSX." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseFilerSpreadsheet(buffer, fileType);

    if (parsed.validCount === 0) {
      return { ok: false, error: "No valid CNIC records found in the uploaded file." };
    }

    const result = await persistFilerDataset(
      file.name,
      fileType,
      source,
      taxYear,
      effectiveDate,
      parsed,
      guard.user.id,
      activate
    );

    // Audit log
    const admin = createAdminClient();
    if (admin) {
      await admin.from("admin_audit_logs").insert({
        admin_id: guard.user.id,
        action: "filer_dataset_uploaded",
        entity_type: "filer_datasets",
        entity_id: result.datasetId,
        metadata: {
          file_name: file.name,
          valid_count: parsed.validCount,
          active: activate,
        },
      });
    }

    revalidatePath("/admin/filer-status");
    revalidatePath("/citizen/filer-status");

    return { ok: true, data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to import dataset.";
    return { ok: false, error: message };
  }
}

/**
 * Server action: Admin activates an existing dataset version.
 */
export async function activateFilerDatasetAction(
  datasetId: string
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Admin database unavailable." };

  try {
    // 1. Deactivate current active datasets
    await admin
      .from("filer_datasets")
      .update({ status: "inactive" })
      .eq("status", "active");

    // 2. Activate target dataset
    const { error } = await admin
      .from("filer_datasets")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", datasetId);

    if (error) throw error;

    // Audit log
    await admin.from("admin_audit_logs").insert({
      admin_id: guard.user.id,
      action: "filer_dataset_activated",
      entity_type: "filer_datasets",
      entity_id: datasetId,
    });

    revalidatePath("/admin/filer-status");
    revalidatePath("/citizen/filer-status");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to activate dataset.";
    return { ok: false, error: message };
  }
}

/**
 * Server action: Admin deactivates an active dataset.
 */
export async function deactivateFilerDatasetAction(
  datasetId: string
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Admin database unavailable." };

  try {
    const { error } = await admin
      .from("filer_datasets")
      .update({ status: "inactive" })
      .eq("id", datasetId);

    if (error) throw error;

    await admin.from("admin_audit_logs").insert({
      admin_id: guard.user.id,
      action: "filer_dataset_deactivated",
      entity_type: "filer_datasets",
      entity_id: datasetId,
    });

    revalidatePath("/admin/filer-status");
    revalidatePath("/citizen/filer-status");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to deactivate dataset.";
    return { ok: false, error: message };
  }
}

/**
 * Server action: Admin deletes a dataset and its records.
 */
export async function deleteFilerDatasetAction(
  datasetId: string
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Admin database unavailable." };

  try {
    const { error } = await admin
      .from("filer_datasets")
      .delete()
      .eq("id", datasetId);

    if (error) throw error;

    await admin.from("admin_audit_logs").insert({
      admin_id: guard.user.id,
      action: "filer_dataset_deleted",
      entity_type: "filer_datasets",
      entity_id: datasetId,
    });

    revalidatePath("/admin/filer-status");
    revalidatePath("/citizen/filer-status");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete dataset.";
    return { ok: false, error: message };
  }
}
