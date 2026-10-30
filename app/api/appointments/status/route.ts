import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { getAuthState } from "@/lib/auth/profile";
import { updateAppointmentStatus } from "@/lib/services/appointments";
import type { AppointmentStatus } from "@/lib/types/legal";

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, status, notes } = body;

    if (!appointmentId || !status) {
      return NextResponse.json({ error: "Missing appointmentId or status" }, { status: 400 });
    }

    const role = profile.role === "lawyer" ? "lawyer" : "citizen";

    const result = await updateAppointmentStatus(
      appointmentId,
      status as AppointmentStatus,
      user.id,
      role,
      notes
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
