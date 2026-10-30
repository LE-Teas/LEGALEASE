import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { getAuthState } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

/**
 * POST /api/video/token
 * Body: { appointmentId: string }
 *
 * Returns: { roomName: string, displayName: string, role: "citizen" | "lawyer" }
 *
 * Validates:
 *   - User is authenticated
 *   - Appointment belongs to user (citizen or lawyer)
 *   - consultation_type = 'video'
 *   - status = 'confirmed'
 *   - Current time is within [appointmentDate + startTime - 15min, appointmentDate + endTime + 30min]
 */
export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    // Fetch appointment with payment status and duration
    const { data: appt, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, citizen_id, lawyer_id, appointment_date, start_time, end_time, consultation_type, status, payment_status, duration_minutes")
      .eq("id", appointmentId)
      .single();

    if (fetchErr || !appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Authorization: user must be participant
    const isParticipant = appt.citizen_id === user.id || appt.lawyer_id === user.id;
    if (!isParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Must be video consultation
    if (appt.consultation_type !== "video") {
      return NextResponse.json(
        { error: "This appointment is not a video consultation." },
        { status: 400 }
      );
    }

    // Must be confirmed by lawyer
    if (appt.status !== "confirmed") {
      return NextResponse.json(
        { error: "Video consultation is only available for accepted/confirmed appointments." },
        { status: 400 }
      );
    }

    // Must have confirmed payment
    if (appt.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Video consultation requires confirmed payment in escrow before room access is granted." },
        { status: 402 }
      );
    }

    // Time-window check: allow joining 15 min before start until 30 min after end
    const now = new Date();
    const windowStart = new Date(`${appt.appointment_date}T${appt.start_time}`);
    windowStart.setMinutes(windowStart.getMinutes() - 15);
    const windowEnd = new Date(`${appt.appointment_date}T${appt.end_time}`);
    windowEnd.setMinutes(windowEnd.getMinutes() + 30);

    // Allow anyway for dev / if check is disabled via env
    const skipTimeCheck = process.env.VIDEO_SKIP_TIME_CHECK === "true";
    if (!skipTimeCheck && (now < windowStart || now > windowEnd)) {
      return NextResponse.json(
        {
          error: `Video room opens 15 minutes before the appointment. It is currently available between ${windowStart.toLocaleTimeString()} and ${windowEnd.toLocaleTimeString()}.`,
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
        },
        { status: 403 }
      );
    }

    // Get or create persistent room in video_consultations
    const { data: existing } = await supabase
      .from("video_consultations")
      .select("room_name")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    let roomName: string;

    if (existing?.room_name) {
      roomName = existing.room_name;
    } else {
      // Generate a secure random room name
      const randomPart = crypto.randomBytes(16).toString("hex");
      roomName = `legalease-${randomPart}`;

      // Insert — ignore unique conflict if race condition
      await supabase.from("video_consultations").upsert(
        {
          appointment_id: appointmentId,
          room_name: roomName,
        },
        { onConflict: "appointment_id", ignoreDuplicates: true }
      );

      // Re-fetch in case of conflict (another participant created it first)
      const { data: refetched } = await supabase
        .from("video_consultations")
        .select("room_name")
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      roomName = refetched?.room_name || roomName;
    }

    // Record join time for this role
    const role = appt.lawyer_id === user.id ? "lawyer" : "citizen";
    const joinField = role === "citizen" ? "citizen_joined_at" : "lawyer_joined_at";
    await supabase
      .from("video_consultations")
      .update({ [joinField]: new Date().toISOString() })
      .eq("appointment_id", appointmentId);

    // Initialize or fetch authoritative consultation_session
    const { data: existingSession } = await supabase
      .from("consultation_sessions")
      .select("*")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    let sessionStartedAt = existingSession?.session_started_at;
    const durationMinutes = appt.duration_minutes || 60;

    if (!existingSession) {
      const nowIso = new Date().toISOString();
      sessionStartedAt = nowIso;
      await supabase.from("consultation_sessions").insert({
        appointment_id: appointmentId,
        session_started_at: nowIso,
        booked_duration_minutes: durationMinutes,
        status: "active",
      });
    }

    // Log join event
    await supabase.from("consultation_join_events").insert({
      appointment_id: appointmentId,
      user_id: user.id,
      role,
      event_type: "joined",
    });

    return NextResponse.json({
      roomName,
      displayName: profile.full_name || user.email || "Participant",
      role,
      durationMinutes,
      sessionStartedAt,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[video/token]", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Internal error" }, { status: 500 });
  }
}
