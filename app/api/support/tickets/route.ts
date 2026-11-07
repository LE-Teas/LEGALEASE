import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/services/notifications";

export async function GET() {
  const { user, profile } = await getAuthState();
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) {
    return NextResponse.json({ tickets: [] });
  }

  let query = supabase
    .from("support_tickets")
    .select("*, user:profiles!support_tickets_user_id_fkey(full_name, email, role)")
    .order("created_at", { ascending: false });

  if (profile.role !== "admin") {
    query = query.eq("user_id", user.id);
  }

  const { data } = await query.limit(50);
  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const category = String(body.category || "technical").trim();
    const subject = String(body.subject || "").trim();
    const description = String(body.description || body.message || "").trim();
    const appointmentId = body.appointmentId ? String(body.appointmentId) : null;

    if (!subject || !description) {
      return NextResponse.json(
        { error: "Subject and description are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient() ?? (await createClient());
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        role: profile.role === "lawyer" ? "lawyer" : "citizen",
        category,
        subject,
        description,
        appointment_id: appointmentId,
        status: "open",
      })
      .select("*")
      .single();

    if (error || !ticket) {
      return NextResponse.json(
        { error: error?.message || "Failed to create support ticket" },
        { status: 500 }
      );
    }

    // Notify admins
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    for (const admin of admins ?? []) {
      await sendNotification(
        admin.id,
        "support_ticket_created",
        `New Support Ticket (${profile.role}): ${subject.slice(0, 50)}`,
        `${profile.full_name} submitted a ${category} support ticket: ${description.slice(0, 120)}`,
        { ticket_id: ticket.id }
      );
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit ticket" },
      { status: 500 }
    );
  }
}
