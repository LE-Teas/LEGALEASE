import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import { processAppointmentPayment } from "@/lib/services/payments";

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "citizen") {
      return NextResponse.json({ error: "Only citizens can complete consultation payments" }, { status: 403 });
    }

    const body = await request.json();
    const { appointmentId, paymentMethod } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const result = await processAppointmentPayment(
      appointmentId,
      user.id,
      paymentMethod || "jazzcash_escrow"
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      payment: result.payment,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Payment processing failed" }, { status: 500 });
  }
}
