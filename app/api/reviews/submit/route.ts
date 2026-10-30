import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import { submitReview } from "@/lib/services/reviews";

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "citizen") {
      return NextResponse.json({ error: "Only citizens can submit reviews" }, { status: 403 });
    }

    const body = await request.json();
    const { appointmentId, rating, comment } = body;

    if (!appointmentId || !rating) {
      return NextResponse.json({ error: "Missing required fields (appointmentId and rating are required)" }, { status: 400 });
    }

    const result = await submitReview(
      appointmentId,
      user.id,
      Number(rating),
      comment ? String(comment) : null
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, review: result.review });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
