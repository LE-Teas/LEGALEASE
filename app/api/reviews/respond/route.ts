import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import { respondOrFlagReview } from "@/lib/services/reviews";

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile || profile.role !== "lawyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { reviewId, lawyerResponse, isFlagged, flagReason } = body;

    if (!reviewId) {
      return NextResponse.json({ error: "Missing reviewId" }, { status: 400 });
    }

    const res = await respondOrFlagReview({
      reviewId,
      lawyerId: user.id,
      lawyerResponse,
      isFlagged,
      flagReason,
    });

    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update review" },
      { status: 500 }
    );
  }
}

