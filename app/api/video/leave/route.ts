import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

    const supabase = createAdminClient() ?? (await createClient());
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const { data: appt } = await supabase
      .from("appointments")
      .select("id, citizen_id, lawyer_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (!appt || (appt.citizen_id !== user.id && appt.lawyer_id !== user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const participantRole = appt.citizen_id === user.id ? "citizen" : "lawyer";
    const nowIso = new Date().toISOString();

    // 1. Log 'left' event in consultation_join_events
    try {
      await supabase.from("consultation_join_events").insert({
        appointment_id: appointmentId,
        user_id: user.id,
        role: participantRole,
        event_type: "left",
      });
    } catch {
      // ignore if table not migrated
    }

    // 2. Update consultation_sessions actual_duration_seconds
    try {
      const { data: sessionRow } = await supabase
        .from("consultation_sessions")
        .select("*")
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      if (sessionRow?.session_started_at) {
        const elapsedSeconds = Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(sessionRow.session_started_at).getTime()) / 1000
          )
        );
        await supabase
          .from("consultation_sessions")
          .update({
            actual_duration_seconds: elapsedSeconds,
            updated_at: nowIso,
          })
          .eq("appointment_id", appointmentId);
      }
    } catch {
      // ignore
    }

    // 3. Update video_consultations ended_at and duration_seconds
    try {
      const { data: vc } = await supabase
        .from("video_consultations")
        .select("id, started_at")
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      if (vc) {
        const durationSeconds = vc.started_at
          ? Math.max(
              0,
              Math.floor((Date.now() - new Date(vc.started_at).getTime()) / 1000)
            )
          : 0;
        await supabase
          .from("video_consultations")
          .update({
            ended_at: nowIso,
            duration_seconds: durationSeconds,
          })
          .eq("id", vc.id);
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record leave event" },
      { status: 500 }
    );
  }
}

