import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import { submitLawyerVerification } from "@/lib/services/verifications";

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile || profile.role !== "lawyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { barCouncil, licenseNumber, licenseDocumentPath, additionalDocumentPath } = body;

    if (!barCouncil || !licenseNumber) {
      return NextResponse.json({ error: "Bar council and license number are required" }, { status: 400 });
    }

    const result = await submitLawyerVerification({
      lawyerId: user.id,
      barCouncil,
      licenseNumber,
      licenseDocumentPath,
      additionalDocumentPath,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, verification: result.verification });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
