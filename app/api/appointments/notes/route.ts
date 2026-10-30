import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile || profile.role !== "lawyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, lawyerNotes } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointment ID" }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    // Verify ownership: lawyer must be the assigned lawyer
    const { data: appt, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, lawyer_id")
      .eq("id", appointmentId)
      .single();

    if (fetchErr || !appt || appt.lawyer_id !== user.id) {
      return NextResponse.json({ error: "Appointment not found or unauthorized" }, { status: 403 });
    }

    const { error: updateErr } = await supabase
      .from("appointments")
      .update({
        lawyer_notes: lawyerNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
