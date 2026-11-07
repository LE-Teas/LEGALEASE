import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/services/notifications";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get("appointmentId");
    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId." }, { status: 400 });
    }

    const db = createAdminClient() ?? supabase;
    const { data: appt } = await db
      .from("appointments")
      .select("id, citizen_id, lawyer_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (!appt || (appt.citizen_id !== user.id && appt.lawyer_id !== user.id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data, error } = await db
      .from("appointment_messages")
      .select("*, sender:profiles!appointment_messages_sender_id_fkey(id, full_name, role)")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      appointmentId?: string;
      content?: string;
      message?: string;
    };
    const appointmentId = String(body.appointmentId || "").trim();
    const messageText = String(body.message || body.content || "").trim();

    if (!appointmentId || !messageText) {
      return NextResponse.json(
        { error: "Appointment ID and message content are required." },
        { status: 400 }
      );
    }

    const db = createAdminClient() ?? supabase;
    const { data: appt } = await db
      .from("appointments")
      .select("id, citizen_id, lawyer_id, subject")
      .eq("id", appointmentId)
      .maybeSingle();

    if (!appt || (appt.citizen_id !== user.id && appt.lawyer_id !== user.id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const senderRole = appt.lawyer_id === user.id ? "lawyer" : "citizen";
    const recipientId = senderRole === "lawyer" ? appt.citizen_id : appt.lawyer_id;
    const recipientLink =
      senderRole === "lawyer"
        ? `/citizen/appointments/${appointmentId}`
        : `/lawyer/appointments/${appointmentId}`;

    const { data: msg, error } = await db
      .from("appointment_messages")
      .insert({
        appointment_id: appointmentId,
        sender_id: user.id,
        sender_role: senderRole,
        message: messageText.slice(0, 2500),
      })
      .select("*, sender:profiles!appointment_messages_sender_id_fkey(id, full_name, role)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await sendNotification(
      recipientId,
      "appointment_message",
      `New Message on Consultation: ${appt.subject || "Legal Consultation"}`,
      messageText.slice(0, 180),
      { appointment_id: appointmentId, link: recipientLink }
    );

    return NextResponse.json({ message: msg });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
