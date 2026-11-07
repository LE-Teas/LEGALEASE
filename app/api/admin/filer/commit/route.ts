import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthState } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseFilerSpreadsheet, persistFilerDataset } from "@/lib/services/filer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile || profile.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Admin authorization required." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
    }

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
      return NextResponse.json(
        { ok: false, error: "Unsupported file format. Must be CSV or XLSX." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseFilerSpreadsheet(buffer, fileType);

    if (parsed.validCount === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid CNIC records found in the uploaded file." },
        { status: 400 }
      );
    }

    const result = await persistFilerDataset(
      file.name,
      fileType,
      source,
      taxYear,
      effectiveDate,
      parsed,
      user.id,
      activate
    );

    // Audit log
    const admin = createAdminClient();
    if (admin) {
      await admin.from("admin_audit_logs").insert({
        admin_id: user.id,
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

    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to import dataset.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

