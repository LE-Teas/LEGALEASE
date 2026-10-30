import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  ShieldCheck,
  CalendarClock,
  Wallet,
  Sparkles,
  BookOpen,
  FileText,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRate } from "@/lib/data/lawyers";

export const metadata: Metadata = {
  title: "Reports & Platform Analytics | LegalEase Admin",
  description: "Aggregated performance metrics, financial reporting, and authenticated CSV data exports.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const { range } = await searchParams;
  const supabase = await createClient();

  // Metrics
  let citizensCount = 0;
  let lawyersCount = 0;
  let verifiedLawyersCount = 0;
  let appointmentsCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalGrossVolume = 0;
  let totalPlatformRevenue = 0;
  let totalDocs = 0;
  let verifiedDocs = 0;
  let totalAiQueries = 0;

  if (supabase) {
    const [profilesRes, lawyerProfilesRes, apptsRes, docsRes, aiRes] = await Promise.all([
      supabase.from("profiles").select("role, created_at"),
      supabase.from("lawyer_profiles").select("verification_status"),
      supabase.from("appointments").select("status, total_amount, platform_fee, consultation_fee, created_at"),
      supabase.from("legal_documents").select("verification_status"),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("role", "assistant"),
    ]);

    if (profilesRes.data) {
      profilesRes.data.forEach((p) => {
        if (p.role === "citizen") citizensCount++;
        else if (p.role === "lawyer") lawyersCount++;
      });
    }

    if (lawyerProfilesRes.data) {
      lawyerProfilesRes.data.forEach((l) => {
        if (l.verification_status === "verified") verifiedLawyersCount++;
      });
    }

    if (apptsRes.data) {
      apptsRes.data.forEach((a) => {
        appointmentsCount++;
        if (a.status === "completed") completedCount++;
        else if (a.status === "cancelled") cancelledCount++;

        totalGrossVolume += Number(a.total_amount) || Number(a.consultation_fee) || 0;
        totalPlatformRevenue += Number(a.platform_fee) || 0;
      });
    }

    if (docsRes.data) {
      totalDocs = docsRes.data.length;
      verifiedDocs = docsRes.data.filter((d) => d.verification_status === "verified").length;
    }

    totalAiQueries = aiRes.count || 0;
  }

  const completionRate = appointmentsCount > 0 ? Math.round((completedCount / appointmentsCount) * 100) : 0;
  const cancellationRate = appointmentsCount > 0 ? Math.round((cancelledCount / appointmentsCount) * 100) : 0;
  const lawyerVerificationRate = lawyersCount > 0 ? Math.round((verifiedLawyersCount / lawyersCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <BarChart3 className="size-6 text-[#0CA275]" />
            Reports & Platform Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated operational data, consultation trends, revenue reconciliation, and authorized CSV downloads.
          </p>
        </div>

        {/* Date Filter & Range */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs">
          <Link
            href="/admin/reports?range=7d"
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              range === "7d" ? "bg-[#0A2843] text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Last 7 Days
          </Link>
          <Link
            href="/admin/reports?range=30d"
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              range === "30d" ? "bg-[#0A2843] text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Last 30 Days
          </Link>
          <Link
            href="/admin/reports"
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              !range ? "bg-[#0A2843] text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All-Time
          </Link>
        </div>
      </div>

      {/* CSV Export Quick Action Cards */}
      <div>
        <h2 className="font-heading text-base font-semibold text-[#0A2843] mb-3">
          Authorized CSV Data Exports
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white hover:border-[#0CA275]/40 transition-colors shadow-xs">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
              <div>
                <p className="font-heading font-semibold text-sm text-[#0A2843] flex items-center gap-1.5">
                  <CalendarClock className="size-4 text-[#0CA275]" />
                  Consultations Export
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Full booking history, fees, consultation modes, and payment statuses.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full text-xs gap-1.5 border-slate-200">
                <a href="/api/admin/reports/export?type=appointments" download>
                  <Download className="size-3.5 text-[#0CA275]" />
                  Download CSV ({appointmentsCount})
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white hover:border-[#0CA275]/40 transition-colors shadow-xs">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
              <div>
                <p className="font-heading font-semibold text-sm text-[#0A2843] flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-[#0CA275]" />
                  Advocates Directory
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bar Council enrollments, license numbers, rates, and verification statuses.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full text-xs gap-1.5 border-slate-200">
                <a href="/api/admin/reports/export?type=lawyers" download>
                  <Download className="size-3.5 text-[#0CA275]" />
                  Download CSV ({lawyersCount})
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white hover:border-[#0CA275]/40 transition-colors shadow-xs">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
              <div>
                <p className="font-heading font-semibold text-sm text-[#0A2843] flex items-center gap-1.5">
                  <Users className="size-4 text-[#0CA275]" />
                  User Accounts Export
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Registered citizens and administrative staff with registration dates.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full text-xs gap-1.5 border-slate-200">
                <a href="/api/admin/reports/export?type=users" download>
                  <Download className="size-3.5 text-[#0CA275]" />
                  Download CSV ({citizensCount + lawyersCount})
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white hover:border-[#0CA275]/40 transition-colors shadow-xs">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
              <div>
                <p className="font-heading font-semibold text-sm text-[#0A2843] flex items-center gap-1.5">
                  <FileText className="size-4 text-purple-600" />
                  Audit Trail Export
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Complete immutable administrative mutations and decision timestamps.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full text-xs gap-1.5 border-slate-200">
                <a href="/api/admin/reports/export?type=audit_logs" download>
                  <Download className="size-3.5 text-purple-600" />
                  Download Audit Log
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Aggregate Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operations & Consultations Metrics */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base text-[#0A2843] flex items-center gap-2">
              <CalendarClock className="size-4 text-[#0CA275]" />
              Consultation Operations Summary
            </CardTitle>
            <CardDescription className="text-xs">
              Platform booking performance and execution reliability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Total Consultations Booked</span>
              <span className="font-bold text-slate-900">{appointmentsCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Completed Consultations</span>
              <span className="font-bold text-[#0CA275]">{completedCount} ({completionRate}%)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Administrative / User Cancellations</span>
              <span className="font-bold text-rose-600">{cancelledCount} ({cancellationRate}%)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Total Gross Client Spend</span>
              <span className="font-bold text-[#0A2843]">{formatRate(totalGrossVolume)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Platform Commission Retained</span>
              <span className="font-bold text-[#0CA275]">{formatRate(totalPlatformRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Legal Intelligence & Knowledge Base Health */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base text-[#0A2843] flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" />
              AI Intelligence & Knowledge Health
            </CardTitle>
            <CardDescription className="text-xs">
              Retrieval performance and statutory database coverage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">AI Assistant Queries Answered</span>
              <span className="font-bold text-slate-900">{totalAiQueries}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Legal Statutes Ingested</span>
              <span className="font-bold text-slate-900">{totalDocs} Documents</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Verified Authoritative Laws (RAG-Eligible)</span>
              <span className="font-bold text-[#0CA275]">{verifiedDocs} Approved</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Advocate Verification Approval Ratio</span>
              <span className="font-bold text-[#0A2843]">{lawyerVerificationRate}% of directory</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Pakistani Statutory Coverage</span>
              <span className="font-bold text-slate-900">Federal &amp; Sindh Code Active</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
