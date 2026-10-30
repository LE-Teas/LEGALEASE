import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import {
  getLawyerAvailability,
  setLawyerAvailability,
  getLawyerTimeOff,
  addLawyerTimeOff,
  deleteLawyerTimeOff,
} from "@/lib/services/availability";

export async function GET() {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile || profile.role !== "lawyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [availability, timeOff] = await Promise.all([
      getLawyerAvailability(user.id),
      getLawyerTimeOff(user.id),
    ]);

    return NextResponse.json({ availability, timeOff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile || profile.role !== "lawyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "set_availability") {
      const result = await setLawyerAvailability(user.id, body.slots || []);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "add_time_off") {
      const result = await addLawyerTimeOff(
        user.id,
        body.start_datetime,
        body.end_datetime,
        body.reason
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "delete_time_off") {
      const result = await deleteLawyerTimeOff(body.id);
      return NextResponse.json({ success: result.success });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
