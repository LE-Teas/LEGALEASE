import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/profile";

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface LawyerExportRow {
  id: string;
  bar_council: string | null;
  bar_license_number: string | null;
  primary_specialization: string | null;
  years_of_experience: number | null;
  consultation_fee: number | null;
  verification_status: string;
  is_published: boolean;
  profiles?: { full_name: string | null; email: string | null } | null;
}

interface AuditLogExportRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  admin?: { full_name: string | null; email: string | null } | null;
}

interface AppointmentExportRow {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  consultation_type: string | null;
  consultation_fee: number;
  platform_fee: number | null;
  total_amount: number | null;
  payment_status: string;
  citizen?: { full_name: string | null; email: string | null } | null;
  lawyer?: { full_name: string | null; email: string | null; city: string | null } | null;
}

export const maxDuration = 60;

export async function GET(request: Request) {
  const { user, profile } = await getAuthState();
  if (!user || !profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Unauthorized. Administrator privileges required." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "appointments";
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  const csvRows: string[] = [];
  const filename = `legalease_${type}_export_${new Date().toISOString().slice(0, 10)}.csv`;

  if (type === "users") {
    const { data: users } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, city, is_active, created_at")
      .order("created_at", { ascending: false });

    csvRows.push(
      [
        "User ID",
        "Full Name",
        "Email",
        "Role",
        "City",
        "Active Status",
        "Registration Date",
      ].join(",")
    );
    (users || []).forEach((u) => {
      csvRows.push(
        [
          escapeCsvField(u.id),
          escapeCsvField(u.full_name),
          escapeCsvField(u.email),
          escapeCsvField(u.role),
          escapeCsvField(u.city || "Pakistan"),
          escapeCsvField(u.is_active ? "Active" : "Suspended"),
          escapeCsvField(new Date(u.created_at).toISOString()),
        ].join(",")
      );
    });
  } else if (type === "lawyers") {
    const { data: lawyers } = await supabase
      .from("lawyer_profiles")
      .select(`
        id,
        bar_council,
        bar_license_number,
        primary_specialization,
        years_of_experience,
        city,
        consultation_fee,
        verification_status,
        is_published,
        created_at,
        profiles!inner (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    csvRows.push(
      [
        "Lawyer ID",
        "Full Name",
        "Email",
        "Bar Council",
        "License Roll #",
        "Specialization",
        "Experience (Years)",
        "Fee (PKR)",
        "Verification Status",
        "Published",
      ].join(",")
    );
    ((lawyers ?? []) as unknown as LawyerExportRow[]).forEach((l) => {
      csvRows.push(
        [
          escapeCsvField(l.id),
          escapeCsvField(l.profiles?.full_name),
          escapeCsvField(l.profiles?.email),
          escapeCsvField(l.bar_council || "Not Provided"),
          escapeCsvField(l.bar_license_number || "N/A"),
          escapeCsvField(l.primary_specialization || "General"),
          escapeCsvField(l.years_of_experience || 1),
          escapeCsvField(l.consultation_fee || 0),
          escapeCsvField(l.verification_status),
          escapeCsvField(l.is_published ? "Yes" : "No"),
        ].join(",")
      );
    });
  } else if (type === "audit_logs") {
    const { data: logs } = await supabase
      .from("admin_audit_logs")
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        created_at,
        admin:profiles!admin_audit_logs_admin_id_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(500);

    csvRows.push(
      [
        "Log ID",
        "Administrator",
        "Admin Email",
        "Action",
        "Entity Type",
        "Entity ID",
        "Timestamp",
      ].join(",")
    );
    ((logs ?? []) as unknown as AuditLogExportRow[]).forEach((log) => {
      csvRows.push(
        [
          escapeCsvField(log.id),
          escapeCsvField(log.admin?.full_name || "System"),
          escapeCsvField(log.admin?.email || ""),
          escapeCsvField(log.action),
          escapeCsvField(log.entity_type),
          escapeCsvField(log.entity_id || ""),
          escapeCsvField(new Date(log.created_at).toISOString()),
        ].join(",")
      );
    });
  } else {
    const { data: appts } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        status,
        consultation_type,
        consultation_fee,
        platform_fee,
        tax_amount,
        total_amount,
        payment_status,
        created_at,
        citizen:profiles!appointments_citizen_id_fkey(full_name, email),
        lawyer:profiles!appointments_lawyer_id_fkey(full_name, email, city)
      `)
      .order("created_at", { ascending: false });

    csvRows.push(
      [
        "Appointment ID",
        "Citizen Name",
        "Citizen Email",
        "Advocate Name",
        "Advocate City",
        "Date",
        "Start Time",
        "End Time",
        "Type",
        "Status",
        "Consultation Fee",
        "Platform Fee",
        "Total Paid",
        "Payment Status",
      ].join(",")
    );
    ((appts ?? []) as unknown as AppointmentExportRow[]).forEach((a) => {
      csvRows.push(
        [
          escapeCsvField(a.id),
          escapeCsvField(a.citizen?.full_name || "Citizen"),
          escapeCsvField(a.citizen?.email || ""),
          escapeCsvField(a.lawyer?.full_name || "Advocate"),
          escapeCsvField(a.lawyer?.city || "Pakistan"),
          escapeCsvField(a.appointment_date),
          escapeCsvField(a.start_time),
          escapeCsvField(a.end_time),
          escapeCsvField(a.consultation_type),
          escapeCsvField(a.status),
          escapeCsvField(a.consultation_fee || 0),
          escapeCsvField(a.platform_fee || 0),
          escapeCsvField(a.total_amount || a.consultation_fee || 0),
          escapeCsvField(a.payment_status || "unpaid"),
        ].join(",")
      );
    });
  }

  const csvContent = csvRows.join("\r\n");

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
