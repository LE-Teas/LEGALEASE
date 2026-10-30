import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { getAuthState } from "@/lib/auth/profile";
import { createAppointment } from "@/lib/services/appointments";

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "citizen") {
      return NextResponse.json({ error: "Only citizens can book consultations" }, { status: 403 });
    }

    const body = await request.json();
    const {
      lawyerId,
      appointmentDate,
      startTime,
      endTime,
      consultationType,
      durationMinutes,
      legalCategory,
      subject,
      description,
      citizenNotes,
      agreementAccepted,
      agreementVersion,
    } = body;

    if (!lawyerId || !appointmentDate || !startTime || !endTime || !subject) {
      return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
    }

    const duration = Number(durationMinutes) || 60;
    if (duration < 60 || duration > 180) {
      return NextResponse.json(
        { error: "Consultation duration must be between 60 and 180 minutes." },
        { status: 400 }
      );
    }

    if (!agreementAccepted) {
      return NextResponse.json(
        { error: "You must review and accept the Consultation Booking Agreement before scheduling." },
        { status: 400 }
      );
    }

    // Extract client IP if available
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const result = await createAppointment({
      citizenId: user.id,
      lawyerId,
      appointmentDate,
      startTime,
      endTime,
      consultationType: consultationType || "in_person",
      durationMinutes: duration,
      legalCategory,
      subject,
      description,
      citizenNotes,
      agreementVersion: agreementVersion || "v1.0",
      ipAddress,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const apptId = result.appointmentId || result.appointment?.id;

    return NextResponse.json({
      success: true,
      appointmentId: apptId,
      appointment_id: apptId,
      appointment: result.appointment || { id: apptId },
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
