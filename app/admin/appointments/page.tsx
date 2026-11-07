import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarClock,
  Clock,
  Building2,
  Video,
  Phone,
  Search,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppointmentManagementDialog } from "@/components/admin/appointment-management-dialog";
import { formatRate } from "@/lib/data/lawyers";
import type { Appointment } from "@/lib/types/legal";

export const metadata: Metadata = {
  title: "Consultations & Bookings | LegalEase Admin",
  description:
    "Monitor citizen-advocate consultations, fee snapshots, Jitsi video rooms, and scheduling status.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

type AdminAppointmentRow = Omit<
  Appointment,
  | "citizen"
  | "lawyer"
  | "platform_fee"
  | "tax_amount"
  | "total_amount"
  | "lawyer_receivable"
> & {
  platform_fee: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  lawyer_receivable: number | null;
  citizen?: { full_name: string | null; email: string | null; phone: string | null } | null;
  lawyer?: { full_name: string | null; email: string | null; city: string | null } | null;
  session_info?: {
    session_started_at?: string | null;
    session_ended_at?: string | null;
    actual_duration_seconds?: number | null;
    status?: string | null;
  } | null;
  join_events_count?: number;
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    mode?: string;
    payment?: string;
    settlement?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function AdminAppointmentsPage({ searchParams }: PageProps) {
  const { status, mode, payment, settlement, search, page } = await searchParams;
  const supabase = await createClient();

  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = 12;

  let appointments: AdminAppointmentRow[] = [];
  let totalMatching = 0;

  const statusCounts = {
    all: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  };

  if (supabase) {
    const { data: allAppts } = await supabase
      .from("appointments")
      .select("status");
    if (allAppts) {
      statusCounts.all = allAppts.length;
      allAppts.forEach((a) => {
        if (a.status in statusCounts) {
          statusCounts[a.status as keyof typeof statusCounts]++;
        }
      });
    }

    let query = supabase
      .from("appointments")
      .select(
        `
        *,
        citizen:profiles!appointments_citizen_id_fkey(full_name, email, phone),
        lawyer:profiles!appointments_lawyer_id_fkey(full_name, email, city)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (mode && mode !== "all") {
      query = query.eq("consultation_type", mode);
    }

    if (payment && payment !== "all") {
      query = query.eq("payment_status", payment);
    }

    if (settlement && settlement !== "all") {
      query = query.eq("settlement_status", settlement);
    }

    const fromIndex = (currentPage - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    const { data, count, error } = await query.range(fromIndex, toIndex);
    if (!error && data) {
      const rawAppts = data as unknown as AdminAppointmentRow[];
      const apptIds = rawAppts.map((a) => a.id);

      const sessionMap: Record<
        string,
        {
          session_started_at?: string | null;
          session_ended_at?: string | null;
          actual_duration_seconds?: number | null;
          status?: string | null;
        }
      > = {};
      const joinEventsCountMap: Record<string, number> = {};

      if (apptIds.length > 0) {
        try {
          const [sessionsRes, eventsRes] = await Promise.all([
            supabase
              .from("consultation_sessions")
              .select("*")
              .in("appointment_id", apptIds),
            supabase
              .from("consultation_join_events")
              .select("appointment_id")
              .in("appointment_id", apptIds),
          ]);

          for (const s of sessionsRes.data ?? []) {
            sessionMap[s.appointment_id] = s;
          }
          for (const ev of eventsRes.data ?? []) {
            joinEventsCountMap[ev.appointment_id] =
              (joinEventsCountMap[ev.appointment_id] || 0) + 1;
          }
        } catch {
          // ignore if tables not migrated yet
        }
      }

      appointments = rawAppts.map((a) => ({
        ...a,
        session_info: sessionMap[a.id] || null,
        join_events_count: joinEventsCountMap[a.id] || 0,
      }));

      if (search && search.trim()) {
        const q = search.toLowerCase();
        appointments = appointments.filter(
          (a) =>
            a.citizen?.full_name?.toLowerCase().includes(q) ||
            a.lawyer?.full_name?.toLowerCase().includes(q) ||
            a.subject?.toLowerCase().includes(q)
        );
      }
      totalMatching = count || appointments.length;
    }
  }

  const totalPages = Math.ceil(totalMatching / pageSize) || 1;
  const activeTab = status || "all";

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "confirmed":
        return <Badge className="bg-[#0CA275] text-white text-[10px]">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-amber-500 text-white text-[10px]">Pending</Badge>;
      case "completed":
        return <Badge className="bg-blue-600 text-white text-[10px]">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-slate-500 text-white text-[10px]">Cancelled</Badge>;
      case "rejected":
        return <Badge className="bg-rose-600 text-white text-[10px]">Rejected</Badge>;
      default:
        return (
          <Badge variant="outline" className="text-[10px] capitalize">
            {s}
          </Badge>
        );
    }
  };

  const getModeBadge = (m: string) => {
    switch (m) {
      case "video":
        return (
          <span className="inline-flex items-center gap-1 text-blue-700 font-medium text-[11px]">
            <Video className="size-3" /> Video Room
          </span>
        );
      case "phone":
        return (
          <span className="inline-flex items-center gap-1 text-[#0CA275] font-medium text-[11px]">
            <Phone className="size-3" /> Phone Call
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-slate-700 font-medium text-[11px]">
            <Building2 className="size-3" /> In-Person Chamber
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <CalendarClock className="size-6 text-[#0CA275]" />
            Consultation Bookings & Oversight
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track scheduling, financial splits, Jitsi video consultations, session
            telemetry, and administrative dispute resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-lg bg-[#ECFDF5] border border-[#0CA275]/30 px-3 py-1 font-semibold text-[#0CA275]">
            {statusCounts.confirmed} Confirmed
          </span>
          <span className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 font-semibold text-amber-800">
            {statusCounts.pending} Pending
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/admin/appointments?status=all"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "all"
                ? "bg-[#0A2843] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Bookings ({statusCounts.all})
          </Link>
          <Link
            href="/admin/appointments?status=confirmed"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "confirmed"
                ? "bg-[#0CA275] text-white shadow-xs"
                : "bg-[#ECFDF5] text-[#0CA275] hover:bg-emerald-100"
            }`}
          >
            Confirmed ({statusCounts.confirmed})
          </Link>
          <Link
            href="/admin/appointments?status=pending"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "pending"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            Pending ({statusCounts.pending})
          </Link>
          <Link
            href="/admin/appointments?status=completed"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "completed"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-800 hover:bg-blue-100"
            }`}
          >
            Completed ({statusCounts.completed})
          </Link>
          <Link
            href="/admin/appointments?status=cancelled"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "cancelled"
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Cancelled ({statusCounts.cancelled})
          </Link>
        </div>

        {/* Search & Mode/Settlement Filters */}
        <form
          method="GET"
          action="/admin/appointments"
          className="flex flex-wrap items-center gap-2"
        >
          {status && <input type="hidden" name="status" value={status} />}
          <select
            name="mode"
            defaultValue={mode || "all"}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
          >
            <option value="all">All Modes</option>
            <option value="video">Video</option>
            <option value="in_person">In-Person</option>
            <option value="phone">Phone</option>
          </select>
          <select
            name="settlement"
            defaultValue={settlement || "all"}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
          >
            <option value="all">All Settlements</option>
            <option value="eligible">Eligible Payout</option>
            <option value="transferred">Transferred</option>
            <option value="pending">Pending</option>
            <option value="waived">Waived</option>
          </select>
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <Input
              name="search"
              defaultValue={search || ""}
              placeholder="Search citizen, lawyer..."
              className="pl-8 text-xs h-9 bg-white"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-9 text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Appointments Table */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Citizen & Advocate</th>
                  <th className="px-4 py-3">Schedule Time</th>
                  <th className="px-4 py-3">Mode & Telemetry</th>
                  <th className="px-4 py-3">Fee / Platform Cut</th>
                  <th className="px-4 py-3">Payment / Settlement</th>
                  <th className="px-4 py-3">Booking Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                      No consultation records found matching this filter.
                    </td>
                  </tr>
                ) : (
                  appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {a.citizen?.full_name || "Citizen"} →{" "}
                          {a.lawyer?.full_name || "Advocate"}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate max-w-xs">
                          {a.subject}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <Clock className="size-3 text-slate-400" />
                          {a.appointment_date}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {a.start_time?.slice(0, 5)} - {a.end_time?.slice(0, 5)} (
                          {a.duration_minutes || 60}m)
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getModeBadge(a.consultation_type)}
                        {(a.join_events_count ?? 0) > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {a.join_events_count} join/leave events
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.consultation_type === "in_person" ? (
                          <>
                            <div className="font-semibold text-slate-700">
                              Rs. 0 (Free)
                            </div>
                            <div className="text-[10px] text-[#0CA275] font-medium">
                              No Commission
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold text-[#0A2843]">
                              {formatRate(a.total_amount || a.consultation_fee)}
                            </div>
                            <div className="text-[11px] text-[#0CA275]">
                              Cut: {formatRate(a.platform_fee ?? 0)}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            a.payment_status === "paid"
                              ? "bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30"
                              : a.payment_status === "waived"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : a.payment_status === "refunded"
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {a.payment_status || "Unpaid"}
                        </Badge>
                        {a.settlement_status && a.consultation_type === "video" && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase">
                            Set: {a.settlement_status}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(a.status)}
                          {a.status === "completed" && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                              <Star className="size-2.5 text-amber-500" />
                              {a.rating_submitted ? "Rated" : "Unrated"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AppointmentManagementDialog appointment={a} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span>
                Showing page <strong>{currentPage}</strong> of{" "}
                <strong>{totalPages}</strong> ({totalMatching} total)
              </span>
              <div className="flex items-center gap-1">
                {currentPage > 1 && (
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link
                      href={`/admin/appointments?page=${currentPage - 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link
                      href={`/admin/appointments?page=${currentPage + 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                    >
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
