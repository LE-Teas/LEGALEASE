import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MapPin,
  Briefcase,
  Ban,
  Scale,
  Award,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VerificationDialog } from "@/components/admin/verification-dialog";
import { formatRate } from "@/lib/data/lawyers";
import type { VerificationStatus } from "@/lib/types/legal";

export const metadata: Metadata = {
  title: "Lawyer Verifications | LegalEase Admin",
  description: "Review, approve, reject, or suspend advocate credentials and Bar Council licenses.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; city?: string; page?: string }>;
}

export default async function AdminLawyersPage({ searchParams }: PageProps) {
  const { status, search, city, page } = await searchParams;
  const supabase = await createClient();

  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = 12;

  let lawyers: any[] = [];
  let totalMatchingLawyers = 0;

  const counts: Record<string, number> = {
    all: 0,
    pending: 0,
    verified: 0,
    needs_info: 0,
    rejected: 0,
    suspended: 0,
    not_submitted: 0,
  };

  if (supabase) {
    // 1. Fetch count breakdown
    const { data: allStatuses } = await supabase
      .from("lawyer_profiles")
      .select("verification_status");

    if (allStatuses) {
      counts.all = allStatuses.length;
      allStatuses.forEach((r) => {
        const s = r.verification_status as string;
        if (s in counts) {
          counts[s]++;
        }
      });
    }

    // 2. Query filtered lawyers
    let query = supabase
      .from("lawyer_profiles")
      .select(`
        id,
        professional_title,
        primary_specialization,
        specializations,
        years_of_experience,
        bar_council,
        bar_license_number,
        city,
        office_address,
        consultation_fee,
        verification_status,
        is_published,
        created_at,
        profiles!inner (
          full_name,
          email,
          phone,
          avatar_url
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("verification_status", status);
    }

    if (city && city !== "all") {
      query = query.eq("city", city);
    }

    const fromIndex = (currentPage - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    const { data, count, error } = await query.range(fromIndex, toIndex);
    if (!error && data) {
      // 3. Fetch verification documents for these lawyers
      const lawyerIds = data.map((d: any) => d.id);
      let docMap: Record<string, any> = {};

      if (lawyerIds.length > 0) {
        const { data: docRows } = await supabase
          .from("lawyer_verifications")
          .select("lawyer_id, license_document_path, additional_document_path")
          .in("lawyer_id", lawyerIds);

        if (docRows) {
          docRows.forEach((r) => {
            docMap[r.lawyer_id] = r;
          });
        }
      }

      lawyers = data.map((item: any) => ({
        ...item,
        full_name: item.profiles?.full_name || "Advocate",
        email: item.profiles?.email || "",
        phone: item.profiles?.phone || "",
        avatar_url: item.profiles?.avatar_url || null,
        license_number: item.bar_license_number,
        license_document_path: docMap[item.id]?.license_document_path || null,
        additional_document_path: docMap[item.id]?.additional_document_path || null,
      }));

      if (search && search.trim()) {
        const q = search.toLowerCase();
        lawyers = lawyers.filter(
          (l) =>
            l.full_name.toLowerCase().includes(q) ||
            l.email.toLowerCase().includes(q) ||
            (l.bar_license_number && l.bar_license_number.toLowerCase().includes(q)) ||
            (l.city && l.city.toLowerCase().includes(q)) ||
            (l.bar_council && l.bar_council.toLowerCase().includes(q))
        );
      }

      totalMatchingLawyers = count || lawyers.length;
    }
  }

  const totalPages = Math.ceil(totalMatchingLawyers / pageSize) || 1;
  const activeTab = status || "all";

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "verified":
        return <Badge className="bg-[#0CA275] text-white text-[10px]">Verified & Eligible</Badge>;
      case "pending":
        return <Badge className="bg-amber-500 text-white text-[10px]">Pending Review</Badge>;
      case "needs_info":
        return <Badge className="bg-blue-600 text-white text-[10px]">Needs Info</Badge>;
      case "rejected":
        return <Badge className="bg-rose-600 text-white text-[10px]">Rejected</Badge>;
      case "suspended":
        return <Badge className="bg-slate-700 text-white text-[10px]">Suspended</Badge>;
      case "not_submitted":
        return <Badge variant="outline" className="bg-slate-100 text-slate-600 text-[10px]">Not Submitted</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] capitalize">{s.replace("_", " ")}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <ShieldCheck className="size-6 text-[#0CA275]" />
            Advocate Verification Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review Bar Council enrollment, validate practice licenses, and manage advocate eligibility for citizen bookings.
          </p>
        </div>

        {/* Global Summary */}
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 font-semibold text-amber-800">
            {counts.pending} Applications Pending
          </span>
          <span className="rounded-lg bg-[#ECFDF5] border border-[#0CA275]/30 px-3 py-1 font-semibold text-[#0CA275]">
            {counts.verified} Verified Advocates
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 sm:border-0 sm:pb-0">
          <Link
            href="/admin/lawyers?status=all"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "all" ? "bg-[#0A2843] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All ({counts.all})
          </Link>
          <Link
            href="/admin/lawyers?status=pending"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "pending" ? "bg-amber-500 text-white shadow-xs" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            Pending Review ({counts.pending})
          </Link>
          <Link
            href="/admin/lawyers?status=verified"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "verified" ? "bg-[#0CA275] text-white shadow-xs" : "bg-[#ECFDF5] text-[#0CA275] hover:bg-emerald-100"
            }`}
          >
            Verified ({counts.verified})
          </Link>
          <Link
            href="/admin/lawyers?status=needs_info"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "needs_info" ? "bg-blue-600 text-white shadow-xs" : "bg-blue-50 text-blue-800 hover:bg-blue-100"
            }`}
          >
            Needs Info ({counts.needs_info})
          </Link>
          <Link
            href="/admin/lawyers?status=rejected"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "rejected" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
            }`}
          >
            Rejected ({counts.rejected})
          </Link>
          <Link
            href="/admin/lawyers?status=suspended"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "suspended" ? "bg-slate-800 text-white shadow-xs" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            Suspended ({counts.suspended})
          </Link>
        </div>

        {/* Search */}
        <form method="GET" action="/admin/lawyers" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <Input
              name="search"
              defaultValue={search || ""}
              placeholder="Search advocate, license #, city..."
              className="pl-8 text-xs h-9 bg-white"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-9 text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Lawyers Table */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Advocate & Practice</th>
                  <th className="px-4 py-3">Bar Council & License</th>
                  <th className="px-4 py-3">Jurisdiction</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lawyers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                      No advocate applications found matching this status or search.
                    </td>
                  </tr>
                ) : (
                  lawyers.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{l.full_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {l.primary_specialization || "General Practice"} • {l.years_of_experience || 1}y exp
                        </div>
                        <div className="text-[10px] text-slate-400">{l.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{l.bar_council || "Not submitted"}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {l.license_number ? `Roll #${l.license_number}` : "No license provided"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-700">{l.city || "Pakistan"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#0A2843]">
                          {formatRate(l.consultation_fee || 3000)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(l.verification_status)}</td>
                      <td className="px-4 py-3">
                        {l.is_published ? (
                          <Badge variant="outline" className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-500 text-[10px]">
                            Hidden
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <VerificationDialog lawyer={l} triggerVariant="outline" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span>
                Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalMatchingLawyers} total)
              </span>
              <div className="flex items-center gap-1">
                {currentPage > 1 && (
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link href={`/admin/lawyers?page=${currentPage - 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}>
                      Previous
                    </Link>
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link href={`/admin/lawyers?page=${currentPage + 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}>
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
