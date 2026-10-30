import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import {
  saveCitizenDocument,
  deleteCitizenDocument,
  getCitizenDocuments,
} from "@/lib/services/documents";

export async function GET() {
  try {
    const { user } = await getAuthState();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const documents = await getCitizenDocuments(user.id);
    return NextResponse.json({ documents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, templateType, title, formData, generatedContent, status } = body;

    if (!templateType || !title || !generatedContent) {
      return NextResponse.json({ error: "Missing required document fields" }, { status: 400 });
    }

    const result = await saveCitizenDocument({
      id,
      citizenId: user.id,
      templateType,
      title,
      formData: formData || {},
      generatedContent,
      status: status || "draft",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, document: result.document });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await getAuthState();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

    const result = await deleteCitizenDocument(id, user.id);
    return NextResponse.json({ success: result.success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
