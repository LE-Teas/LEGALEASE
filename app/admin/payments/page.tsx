import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRate } from "@/lib/data/lawyers";

export const metadata: Metadata = {
  title: "Payments & Platform Fees | LegalEase Admin",
  description: "Consultation financial records, platform fee reconciliation, and advocate payout summaries.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

interface PaymentRow {
  id: string;
  appointment_date: string;
  consultation_fee: number;
  platform_fee: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  lawyer_receivable: number | null;
  payment_status: string;
  created_at: string;
  citizen?: { full_name: string | null; email: string | null } | null;
  lawyer?: { full_name: string | null; email: string | null; city: string | null } | null;
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const { status, search } = await searchParams;
  const supabase = await createClient();

  let payments: PaymentRow[] = [];
  let totalGross = 0;
  let totalPlatformFees = 0;
  let totalLawyerPayouts = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let refundedCount = 0;

  if (supabase) {
    // 1. Fetch appointments payment data
    const { data: allAppts } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        consultation_fee,
        platform_fee,
        tax_amount,
        total_amount,
        lawyer_receivable,
        payment_status,
        created_at,
        citizen:profiles!appointments_citizen_id_fkey(full_name, email),
        lawyer:profiles!appointments_lawyer_id_fkey(full_name, email, city)
      `)
      .order("created_at", { ascending: false });

    if (allAppts) {
      allAppts.forEach((a) => {
        const fee = Number(a.platform_fee) || 0;
        const total = Number(a.total_amount) || Number(a.consultation_fee) || 0;
        const receivable = Number(a.lawyer_receivable) || (total - fee);

        if (a.payment_status === "paid") {
          totalGross += total;
          totalPlatformFees += fee;
          totalLawyerPayouts += receivable;
          paidCount++;
        } else if (a.payment_status === "pending" || a.payment_status === "unpaid") {
          pendingCount++;
        } else if (a.payment_status === "refunded") {
          refundedCount++;
        }
      });

      let filtered = allAppts as unknown as PaymentRow[];
      if (status && status !== "all") {
        filtered = filtered.filter((a) => a.payment_status === status);
      }

      if (search && search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.citizen?.full_name?.toLowerCase().includes(q) ||
            a.lawyer?.full_name?.toLowerCase().includes(q) ||
            a.id.toLowerCase().includes(q)
        );
      }

      payments = filtered;
    }
  }

  const activeTab = status || "all";

  const getPaymentStatusBadge = (s: string) => {
    switch (s) {
      case "paid":
        return <Badge className="bg-[#0CA275] text-white text-[10px]">Paid</Badge>;
      case "pending":
      case "unpaid":
        return <Badge className="bg-amber-500 text-white text-[10px]">Pending / Unpaid</Badge>;
      case "refunded":
        return <Badge className="bg-purple-600 text-white text-[10px]">Refunded</Badge>;
      case "failed":
        return <Badge className="bg-rose-600 text-white text-[10px]">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] capitalize">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <Wallet className="size-6 text-[#0CA275]" />
            Financial Ledger & Platform Fees
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Server-verified consultation transactions, revenue reconciliation, and advocate disbursement accounting.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30">
            {formatRate(totalPlatformFees)} Net Platform Revenue
          </Badge>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Gross Consultation Volume</p>
              <p className="font-heading text-2xl font-bold text-[#0A2843] mt-0.5">
                {formatRate(totalGross)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{paidCount} settled transactions</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 text-[#0A2843]">
              <Receipt className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Platform Service Fees</p>
              <p className="font-heading text-2xl font-bold text-[#0CA275] mt-0.5">
                {formatRate(totalPlatformFees)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Retained platform commission</p>
            </div>
            <div className="p-3 rounded-xl bg-[#ECFDF5] text-[#0CA275]">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Advocate Net Disbursements</p>
              <p className="font-heading text-2xl font-bold text-slate-800 mt-0.5">
                {formatRate(totalLawyerPayouts)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Disbursed to advocates</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
              <Building className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Pending Settlements</p>
              <p className="font-heading text-2xl font-bold text-amber-600 mt-0.5">
                {pendingCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Invoices awaiting payment</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gateway Status Notice */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
        <ShieldCheck className="size-4 text-[#0CA275] shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-slate-900">Payment Reconciliation Integrity:</strong> Consultation fees are snapshot at booking into immutable agreement records (<code className="font-mono text-[11px] bg-slate-200/60 px-1 py-0.5 rounded">appointment_agreements</code>). Direct bank transfer verification and 1Link / RAAST settlement integration status are displayed below without simulating unverified payment confirmations.
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/admin/payments?status=all"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "all" ? "bg-[#0A2843] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Ledger Records
          </Link>
          <Link
            href="/admin/payments?status=paid"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "paid" ? "bg-[#0CA275] text-white shadow-xs" : "bg-[#ECFDF5] text-[#0CA275] hover:bg-emerald-100"
            }`}
          >
            Paid ({paidCount})
          </Link>
          <Link
            href="/admin/payments?status=unpaid"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "unpaid" ? "bg-amber-500 text-white shadow-xs" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            Unpaid / Pending ({pendingCount})
          </Link>
          <Link
            href="/admin/payments?status=refunded"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "refunded" ? "bg-purple-600 text-white shadow-xs" : "bg-purple-50 text-purple-800 hover:bg-purple-100"
            }`}
          >
            Refunded ({refundedCount})
          </Link>
        </div>

        <form method="GET" action="/admin/payments" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <Input
              name="search"
              defaultValue={search || ""}
              placeholder="Search by citizen, lawyer, ID..."
              className="pl-8 text-xs h-9 bg-white"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-9 text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Ledger Table */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Transaction Reference</th>
                  <th className="px-4 py-3">Citizen Payer</th>
                  <th className="px-4 py-3">Beneficiary Advocate</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Platform Cut</th>
                  <th className="px-4 py-3">Advocate Net</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                      No payment or consultation ledger records found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const gross = Number(p.total_amount) || Number(p.consultation_fee) || 0;
                    const fee = Number(p.platform_fee) || 0;
                    const net = Number(p.lawyer_receivable) || (gross - fee);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-800">
                          {p.id.slice(0, 10)}...
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{p.citizen?.full_name || "Citizen"}</div>
                          <div className="text-[11px] text-slate-500">{p.citizen?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{p.lawyer?.full_name || "Advocate"}</div>
                          <div className="text-[11px] text-slate-500">{p.lawyer?.city || "Pakistan"}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-[#0A2843]">
                          {formatRate(gross)}
                        </td>
                        <td className="px-4 py-3 text-[#0CA275] font-semibold">
                          {formatRate(fee)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {formatRate(net)}
                        </td>
                        <td className="px-4 py-3">{getPaymentStatusBadge(p.payment_status)}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {p.appointment_date || new Date(p.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
