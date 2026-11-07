import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

function extractReadableTextFromPdfBuffer(buffer: Buffer): string {
  const rawLatin1 = buffer.toString("latin1");
  const matches: string[] = [];

  const btRegex = /BT[\s\S]*?ET/g;
  let btMatch: RegExpExecArray | null;
  while ((btMatch = btRegex.exec(rawLatin1)) !== null) {
    const block = btMatch[0];
    const strRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let strMatch: RegExpExecArray | null;
    while ((strMatch = strRegex.exec(block)) !== null) {
      const cleaned = strMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/[^\x20-\x7E\n]/g, " ")
        .trim();
      if (cleaned.length > 1) {
        matches.push(cleaned);
      }
    }
  }

  if (matches.length > 5) {
    return matches.join(" ").replace(/\s+/g, " ").trim();
  }

  const printable = buffer
    .toString("utf8")
    .replace(/[^\x20-\x7E\n\r\t\u0600-\u06FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return printable.slice(0, 25000);
}

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient() ?? supabase;
    const { data, error } = await db
      .from("citizen_files")
      .select("*")
      .eq("citizen_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ files: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let fileName = "";
    let fileType = "text/plain";
    let fileSizeBytes = 0;
    let extractedText = "";
    let category = "contract";
    let filePath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const manualNotes = String(formData.get("extracted_text") || "").trim();
      category = String(formData.get("category") || "contract").trim() || "contract";

      if (!file && !manualNotes) {
        return NextResponse.json({ error: "Please select a file or paste document text." }, { status: 400 });
      }

      if (file) {
        fileName = file.name;
        fileType = file.type || "application/octet-stream";
        fileSizeBytes = file.size;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (
          file.name.toLowerCase().endsWith(".pdf") ||
          fileType.includes("pdf")
        ) {
          extractedText = extractReadableTextFromPdfBuffer(buffer);
        } else {
          extractedText = buffer.toString("utf8").trim();
        }

        if (manualNotes) {
          extractedText = `${manualNotes}\n\n${extractedText}`.trim();
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `citizen-files/${user.id}/${Date.now()}_${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from("documents")
          .upload(storagePath, buffer, {
            contentType: fileType,
            upsert: true,
          });
        if (!uploadErr) {
          filePath = storagePath;
        }
      } else {
        fileName = String(formData.get("file_name") || "Private_Legal_Document.txt").trim();
        extractedText = manualNotes;
        fileSizeBytes = Buffer.byteLength(extractedText, "utf8");
      }
    } else {
      const body = (await request.json()) as Record<string, unknown>;
      fileName = String(body.file_name || "Private_Legal_Document.txt").trim();
      fileType = String(body.file_type || "text/plain");
      extractedText = String(body.extracted_text || "").trim();
      category = String(body.category || "contract").trim() || "contract";
      fileSizeBytes = Buffer.byteLength(extractedText, "utf8");
    }

    if (!fileName) {
      return NextResponse.json({ error: "File name is required." }, { status: 400 });
    }

    if (!extractedText || extractedText.length < 10) {
      extractedText =
        extractedText ||
        `Uploaded private legal document (${fileName}). Please provide additional text or clauses if scanned.`;
    }

    const db = createAdminClient() ?? supabase;
    const { data, error } = await db
      .from("citizen_files")
      .insert({
        citizen_id: user.id,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSizeBytes,
        storage_path: filePath,
        extracted_text: extractedText.slice(0, 50000),
        summary: category,
        status: "ready",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ file: data });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing file id." }, { status: 400 });
    }

    const db = createAdminClient() ?? supabase;
    const { error } = await db
      .from("citizen_files")
      .delete()
      .eq("id", id)
      .eq("citizen_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
