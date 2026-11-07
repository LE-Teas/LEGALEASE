import { NextRequest, NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import { parseFilerSpreadsheet } from "@/lib/services/filer";

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

    const name = file.name.toLowerCase();
    let fileType: "csv" | "xlsx" | "xls" | null = null;
    if (name.endsWith(".csv")) fileType = "csv";
    else if (name.endsWith(".xlsx")) fileType = "xlsx";
    else if (name.endsWith(".xls")) fileType = "xls";

    if (!fileType) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type. Please upload a CSV or XLSX file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseFilerSpreadsheet(buffer, fileType);

    return NextResponse.json({
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse file.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

