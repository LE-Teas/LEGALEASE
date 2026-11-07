import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  CalendarClock,
  Wallet,
  ArrowRight,
  Clock,
  CheckCircle2,
  FileText,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerificationDialog } from "@/components/admin/verification-dialog";
import { LoadDemoUsersButton } from "@/components/admin/load-demo-users-button";
import { formatRate } from "@/lib/data/lawyers";
import {
  DashboardCharts,
  type MonthlyTrend,
  type VerificationBreakdown,
} from "@/components/admin/dashboard-charts";
import type { VerificationStatus } from "@/lib/types/legal";

export const metadata: Metadata = {
  title: "Admin Dashboard | LegalEase — Legal Help. Made Easier.",
  description:
    "Centralized overview of platform metrics, advocate verification queue, and activity.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

interface PendingLawyerRow {
  id: string;
  bar_council: string | null;
  bar_license_number: string | null;
  verification_status: VerificationStatus;
  is_published: boolean;
  city: string | null;
  years_of_experience: number | null;
  consultation_fee: number | null;
  primary_specialization: string | null;
  full_name: string;
  email: string;
  phone: string;
  license_number: string | null;
}

interface RecentAppointmentRow {
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
  created_at: string;
  citizen?: { full_name: string | null } | null;
  lawyer?: { full_name: string | null } | null;
}

interface RecentAuditRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  admin?: { full_name: string | null } | null;
}

function computeCutoffIso(range?: string): string | null {
  if (range !== "7d" && range !== "30d") return null;
  const days = range === "7d" ? 7 : 30;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const { range } = await searchParams;
  const supabase = await createClient();

  const cutoffDateIso = computeCutoffIso(range);

  let totalCitizens = 0;
  let totalLawyers = 0;
  let verifiedLawyers = 0;
  let pendingLawyersCount = 0;
  let rejectedOrSuspendedLawyers = 0;

  let totalAppointments = 0;
  let pendingAppointmentsCount = 0;
  let completedConsultationsCount = 0;
  let totalPlatformRevenue = 0;
  let totalGrossConsultationVolume = 0;

  let totalLegalDocs = 0;
  let pendingLegalDocs = 0;
  let totalAiQueries = 0;

  let pendingLawyers: PendingLawyerRow[] = [];
  let recentAppointments: RecentAppointmentRow[] = [];
  let recentAuditActivity: RecentAuditRow[] = [];

  const verificationBreakdown: VerificationBreakdown = {
    verified: 0,
    pending: 0,
    needs_info: 0,
    rejected: 0,
    suspended: 0,
    not_submitted: 0,
  };

  const monthlyTrends: MonthlyTrend[] = [];

  if (supabase) {
    let profilesQuery = supabase.from("profiles").select("role, created_at");
    if (cutoffDateIso) {
      profilesQuery = profilesQuery.gte("created_at", cutoffDateIso);
    }

    const [profilesRes, lawyerProfilesRes] = await Promise.all([
      profilesQuery,
      supabase.from("lawyer_profiles").select("verification_status, is_published"),
    ]);

    const allProfileDates: string[] = [];
    for (const p of profilesRes.data ?? []) {
      allProfileDates.push(p.created_at);
      if (p.role === "citizen") totalCitizens++;
      if (p.role === "lawyer") totalLawyers++;
    }

    if (lawyerProfilesRes.data) {
      lawyerProfilesRes.data.forEach((lp) => {
        const s = lp.verification_status || "not_submitted";
        if (s in verificationBreakdown) {
          verificationBreakdown[s as keyof VerificationBreakdown]++;
        }
        if (s === "verified") verifiedLawyers++;
        if (s === "pending") pendingLawyersCount++;
        if (s === "rejected" || s === "suspended") rejectedOrSuspendedLawyers++;
      });
    }

    const { data: pendingData } = await supabase
      .from("lawyer_profiles")
      .select(`
        id,
        bar_council,
        bar_license_number,
        verification_status,
        is_published,
        city,
        years_of_experience,
        consultation_fee,
        primary_specialization,
        profiles!inner (
          full_name,
          email,
          phone,
          avatar_url
        )
      `)
      .eq("verification_status", "pending")
      .limit(6);

    pendingLawyers = (
      (pendingData ?? []) as unknown as Array<
        PendingLawyerRow & {
          profiles: {
            full_name: string | null;
            email: string | null;
            phone: string | null;
          } | null;
        }
      >
    ).map((l) => ({
      ...l,
      full_name: l.profiles?.full_name || "Advocate",
      email: l.profiles?.email || "",
      phone: l.profiles?.phone || "",
      license_number: l.bar_license_number,
    }));

    let apptsSummaryQuery = supabase
      .from("appointments")
      .select("id, status, platform_fee, total_amount, consultation_fee, created_at");
    let recentApptsQuery = supabase
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
        total_amount,
        payment_status,
        created_at,
        citizen:profiles!appointments_citizen_id_fkey(full_name),
        lawyer:profiles!appointments_lawyer_id_fkey(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(6);

    if (cutoffDateIso) {
      apptsSummaryQuery = apptsSummaryQuery.gte("created_at", cutoffDateIso);
      recentApptsQuery = recentApptsQuery.gte("created_at", cutoffDateIso);
    }

    const [apptsSummaryRes, recentApptsRes] = await Promise.all([
      apptsSummaryQuery,
      recentApptsQuery,
    ]);

    const allApptRows = apptsSummaryRes.data ?? [];
    totalAppointments = allApptRows.length;
    recentAppointments = (recentApptsRes.data ?? []) as unknown as RecentAppointmentRow[];

    for (const row of allApptRows) {
      if (row.status === "pending") pendingAppointmentsCount++;
      if (row.status === "completed") completedConsultationsCount++;
      totalPlatformRevenue += Number(row.platform_fee) || 0;
      totalGrossConsultationVolume +=
        Number(row.total_amount) || Number(row.consultation_fee) || 0;
    }

    const [docsRes, pendingDocsRes] = await Promise.all([
      supabase.from("legal_documents").select("id", { count: "exact", head: true }),
      supabase
        .from("legal_documents")
        .select("id", { count: "exact", head: true })
        .in("verification_status", ["pending", "needs_review"]),
    ]);

    totalLegalDocs = docsRes.count || 0;
    pendingLegalDocs = pendingDocsRes.count || 0;

    let aiQuery = supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "assistant");
    if (cutoffDateIso) {
      aiQuery = aiQuery.gte("created_at", cutoffDateIso);
    }
    const { count: aiCount } = await aiQuery;
    totalAiQueries = aiCount || 0;

    const { data: auditData } = await supabase
      .from("admin_audit_logs")
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        created_at,
        admin:profiles!admin_audit_logs_admin_id_fkey(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(6);

    recentAuditActivity = (auditData ?? []) as unknown as RecentAuditRow[];

    // Compute real monthly trends for the last 6 months from database timestamps
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = startOfMonth.toLocaleString("default", { month: "short" });

      const usersUpToMonth = allProfileDates.filter(
        (dt) => new Date(dt) < endOfMonth
      ).length;
      const apptsInMonth = allApptRows.filter((a) => {
        const dt = new Date(a.created_at);
        return dt >= startOfMonth && dt < endOfMonth;
      });
      const completedInMonth = apptsInMonth.filter(
        (a) => a.status === "completed"
      ).length;

      monthlyTrends.push({
        month: label,
        users: usersUpToMonth,
        appointments: apptsInMonth.length,
        completed: completedInMonth,
      });
    }
  }

  const statCards = [
    {
      title: "Total Citizens",
      value: totalCitizens,
      subtext: "Verified public accounts",
      icon: Users,
      color: "text-[#0A2843] bg-slate-100",
    },
    {
      title: "Advocates Directory",
      value: totalLawyers,
      subtext: `${verifiedLawyers} verified & published`,
      icon: Scale,
      color: "text-[#0CA275] bg-[#ECFDF5]",
    },
    {
      title: "Verification Queue",
      value: pendingLawyersCount,
      subtext: pendingLawyersCount > 0 ? "Requires review" : "Queue up to date",
      icon: ShieldCheck,
      color:
        pendingLawyersCount > 0
          ? "text-amber-600 bg-amber-50"
          : "text-[#0CA275] bg-[#ECFDF5]",
    },
    {
      title: "Total Consultations",
      value: totalAppointments,
      subtext: `${completedConsultationsCount} completed · ${pendingAppointmentsCount} pending`,
      icon: CalendarClock,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Platform Revenue",
      value: formatRate(totalPlatformRevenue),
      subtext: `Gross: ${formatRate(totalGrossConsultationVolume)}`,
      icon: Wallet,
      color: "text-[#0CA275] bg-[#ECFDF5]",
    },
    {
      title: "Legal Knowledge Base",
      value: totalLegalDocs,
      subtext: `${pendingLegalDocs} pending review`,
      icon: BookOpen,
      color:
        pendingLegalDocs > 0
          ? "text-amber-600 bg-amber-50"
          : "text-emerald-700 bg-emerald-50",
    },
    {
      title: "AI Queries Handled",
      value: totalAiQueries,
      subtext: "Authoritative RAG queries",
      icon: Sparkles,
      color: "text-purple-600 bg-purple-50",
    },
    {
      title: "Advocate Sanctions",
      value: rejectedOrSuspendedLawyers,
      subtext: "Rejected or suspended",
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-[#0A2843]">
              Administrative Command Center
            </h1>
            <Badge className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-xs">
              Live Production
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time metrics, Bar Council advocate verification pipeline, and platform
            oversight for LegalEase.
          </p>
        </div>

        {/* Date Filter & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <LoadDemoUsersButton />

          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 text-xs">
            <Link
              href="/admin?range=7d"
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                range === "7d"
                  ? "bg-[#0A2843] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 Days
            </Link>
            <Link
              href="/admin?range=30d"
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                range === "30d"
                  ? "bg-[#0A2843] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              30 Days
            </Link>
            <Link
              href="/admin"
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                !range ? "bg-[#0A2843] text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Time
            </Link>
          </div>

          <Button
            asChild
            size="sm"
            className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs"
          >
            <Link href="/admin/lawyers">
              <ShieldCheck className="size-3.5 mr-1.5" />
              Review Queue ({pendingLawyersCount})
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid (8 Core Platform Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card
              key={idx}
              className="border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-colors"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{card.title}</p>
                  <p className="font-heading text-2xl font-bold text-[#0A2843] mt-0.5">
                    {card.value}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{card.subtext}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics & Trend Charts */}
      <DashboardCharts
        monthlyTrends={monthlyTrends}
        verificationBreakdown={verificationBreakdown}
        aiQueryCount={totalAiQueries}
        totalAppointments={totalAppointments}
        totalUsers={totalCitizens + totalLawyers}
      />

      {/* Action Tables Grid: Verification Queue & Recent Consultations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Queue */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="font-heading text-base text-[#0A2843] flex items-center gap-2">
                <ShieldCheck className="size-4 text-amber-500" />
                Advocate Verification Queue
              </CardTitle>
              <CardDescription className="text-xs">
                Bar Council credentials awaiting validation by administrative staff
              </CardDescription>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs text-[#0A2843] hover:text-[#0CA275]"
            >
              <Link href="/admin/lawyers">
                View All <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingLawyers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed rounded-lg bg-slate-50/50">
                <CheckCircle2 className="size-6 text-[#0CA275] mx-auto mb-1.5" />
                No pending lawyer verifications at this time.
              </div>
            ) : (
              pendingLawyers.map((lawyer) => (
                <div
                  key={lawyer.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#0A2843]">
                        {lawyer.full_name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
                      >
                        Pending
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {lawyer.bar_council || "Bar Council"} • License #
                      {lawyer.license_number || "N/A"} • {lawyer.city || "Pakistan"}
                    </p>
                  </div>
                  <VerificationDialog lawyer={lawyer} triggerVariant="outline" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Consultations */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="font-heading text-base text-[#0A2843] flex items-center gap-2">
                <CalendarClock className="size-4 text-[#0CA275]" />
                Recent Consultations
              </CardTitle>
              <CardDescription className="text-xs">
                Latest consultation bookings and payments across the platform
              </CardDescription>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs text-[#0A2843] hover:text-[#0CA275]"
            >
              <Link href="/admin/appointments">
                View All <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAppointments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed rounded-lg bg-slate-50/50">
                <CalendarClock className="size-6 text-slate-400 mx-auto mb-1.5" />
                No consultation bookings recorded yet.
              </div>
            ) : (
              recentAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#0A2843]">
                      {appt.citizen?.full_name || "Citizen"} →{" "}
                      {appt.lawyer?.full_name || "Advocate"}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="size-3 text-slate-400" />
                      {appt.appointment_date} at {appt.start_time} •{" "}
                      <span className="capitalize">
                        {appt.consultation_type || "in_person"}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#0A2843]">
                      {formatRate(appt.total_amount || appt.consultation_fee)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        appt.status === "confirmed"
                          ? "bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30"
                          : appt.status === "pending"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : appt.status === "completed"
                              ? "bg-blue-50 text-blue-800 border-blue-300"
                              : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      {appt.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Activity Trail */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="font-heading text-base text-[#0A2843] flex items-center gap-2">
              <FileText className="size-4 text-purple-600" />
              Administrative Audit Log (Recent Actions)
            </CardTitle>
            <CardDescription className="text-xs">
              Immutable logging of all advocate verification approvals, policy
              adjustments, and system mutations
            </CardDescription>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs text-[#0A2843] hover:text-[#0CA275]"
          >
            <Link href="/admin/audit-logs">
              Full Audit Trail <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentAuditActivity.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 border border-dashed rounded-lg bg-slate-50/50">
              No audit records generated yet. Privileged administrator operations will be
              logged here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentAuditActivity.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 font-mono text-[11px] truncate">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    By{" "}
                    <strong className="text-slate-700">
                      {log.admin?.full_name || "Administrator"}
                    </strong>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    Target: {log.entity_type} ({log.entity_id || "N/A"})
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
