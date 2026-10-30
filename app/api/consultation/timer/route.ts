import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { getAuthState } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get("appointmentId");

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    // Fetch appointment
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select("id, citizen_id, lawyer_id, status, payment_status, duration_minutes, appointment_date, start_time, end_time")
      .eq("id", appointmentId)
      .single();

    if (apptErr || !appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const isParticipant = appt.citizen_id === user.id || appt.lawyer_id === user.id;
    if (!isParticipant && profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch or create consultation session
    let { data: session } = await supabase
      .from("consultation_sessions")
      .select("*")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    const bookedDurationMinutes = appt.duration_minutes || 60;
    const durationSeconds = bookedDurationMinutes * 60;

    if (!session && appt.status === "confirmed" && appt.payment_status === "paid") {
      const nowIso = new Date().toISOString();
      const { data: created } = await supabase
        .from("consultation_sessions")
        .insert({
          appointment_id: appointmentId,
          session_started_at: nowIso,
          booked_duration_minutes: bookedDurationMinutes,
          status: "active",
        })
        .select("*")
        .single();
      session = created;
    }

    const now = new Date();
    const sessionStartedAt = session ? new Date(session.session_started_at) : now;
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - sessionStartedAt.getTime()) / 1000));
    const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
    const isExpired = remainingSeconds <= 0 || session?.status === "expired" || session?.status === "ended";

    if (session && remainingSeconds <= 0 && session.status === "active") {
      await supabase
        .from("consultation_sessions")
        .update({ status: "expired", session_ended_at: now.toISOString() })
        .eq("id", session.id);
    }

    let warningLevel: "normal" | "warning" | "critical" | "expired" = "normal";
    if (isExpired) {
      warningLevel = "expired";
    } else if (remainingSeconds <= 300) {
      warningLevel = "critical"; // 5 min warning
    } else if (remainingSeconds <= 600) {
      warningLevel = "warning"; // 10 min warning
    }

    return NextResponse.json({
      serverTime: now.toISOString(),
      sessionStartedAt: sessionStartedAt.toISOString(),
      bookedDurationMinutes,
      durationSeconds,
      elapsedSeconds,
      remainingSeconds,
      isExpired,
      warningLevel,
      sessionStatus: session?.status || "active",
      appointmentStatus: appt.status,
      paymentStatus: appt.payment_status,
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) || "Timer calculation error" }, { status: 500 });
  }
}
