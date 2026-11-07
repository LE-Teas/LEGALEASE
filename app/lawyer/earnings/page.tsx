import Link from "next/link";
import { getAuthState } from "@/lib/auth/profile";
import { getLawyerEarnings } from "@/lib/services/payments";
import { getOrCreateLawyerProfile } from "@/lib/services/lawyer-portal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRate } from "@/lib/data/lawyers";
import { PayoutBankForm } from "@/components/lawyer/payout-bank-form";
import {
  Wallet,
  Clock,
  CheckCircle2,
  Receipt,
  Percent,
} from "lucide-react";

export const metadata = {
  title: "Earnings & Settlements | Lawyer Portal",
  description: "Track your consultation revenue, platform commission deductions, pending escrow settlements, and transaction history.",
};

export default async function LawyerEarningsPage() {
  const { user } = await getAuthState();
  if (!user) return null;

  const [earnings, lawyerProfile] = await Promise.all([
    getLawyerEarnings(user.id),
    getOrCreateLawyerProfile(user.id),
  ]);

  const {
    grossAmount,
    platformCommission,
    pendingAmount,
    paidAmount,
    payments,
  } = earnings;

  const statusColors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-900 border-emerald-200",
    pending: "bg-amber-100 text-amber-900 border-amber-200",
    failed: "bg-rose-100 text-rose-900 border-rose-200",
    refunded: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
            Earnings, Commission & Escrow Ledger
          </h2>
          <p className="text-sm text-muted-foreground">
            Transparent breakdown of gross video consultation fees, 10% platform commission, and net 90% advocate disbursements.
          </p>
        </div>

        <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 text-xs">
          <Link href="/lawyer/profile/edit">
            Edit Consultation Fee
          </Link>
        </Button>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Gross Escrow Collected</p>
              <p className="font-heading text-2xl font-bold text-navy mt-1">
                {formatRate(grossAmount)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">100% Client Paid Volume</p>
            </div>
            <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-navy">
              <Wallet className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Platform Commission (10%)</p>
              <p className="font-heading text-2xl font-bold text-slate-700 mt-1">
                {formatRate(platformCommission)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Video Escrow Infrastructure Fee</p>
            </div>
            <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Percent className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Settled Net Share (90%)</p>
              <p className="font-heading text-2xl font-bold text-emerald-700 mt-1">
                {formatRate(paidAmount)}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Disbursed to Advocate</p>
            </div>
            <div className="size-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Escrow Pending Settlement</p>
              <p className="font-heading text-2xl font-bold text-amber-600 mt-1">
                {formatRate(pendingAmount)}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">90% Net Awaiting Release</p>
            </div>
            <div className="size-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Bank Configuration */}
      <PayoutBankForm
        initialBankName={lawyerProfile?.bank_name || ""}
        initialAccountTitle={lawyerProfile?.bank_account_title || ""}
        initialIban={lawyerProfile?.bank_iban || ""}
      />

      {/* Transaction History */}
      {payments.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <Receipt className="size-7" />
            </div>
            <h3 className="font-heading text-lg font-bold text-navy">No Transactions Logged</h3>
            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4 leading-relaxed">
              When consultation fees are processed via Stripe Sandbox Escrow for your sessions, detailed records of gross fees, 10% commission, and 90% net advocate payouts will be reflected here.
            </p>
            <Button asChild variant="outline" className="text-xs">
              <Link href="/lawyer/appointments">View Pending Consultations</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-navy">Payment & Settlement Ledger</CardTitle>
            <CardDescription className="text-xs">
              Direct Stripe Sandbox escrow billing records linked to your consultation sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Citizen / Client</th>
                  <th className="p-4">Matter / Details</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Gross Fee</th>
                  <th className="p-4">Commission (10%)</th>
                  <th className="p-4">Net Advocate Share (90%)</th>
                  <th className="p-4">Gateway / Order Ref</th>
                  <th className="p-4">Escrow / Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const gross = Number(p.amount) || 0;
                  const comm = Math.round(gross * 0.1);
                  const net = gross - comm;
                  const settlement = p.appointment?.settlement_status || "pending";
                  const isSettled = settlement === "transferred" || settlement === "settled";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-navy">
                        {p.citizen?.full_name || "Citizen Client"}
                      </td>
                      <td className="p-4 text-slate-700">
                        {p.appointment?.subject || "Legal Consultation"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4 font-medium text-slate-700">
                        {formatRate(gross)}
                      </td>
                      <td className="p-4 text-slate-500">
                        -{formatRate(comm)}
                      </td>
                      <td className="p-4 font-bold text-emerald-700">
                        {formatRate(net)}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-600">
                        {p.provider_order_id || p.transaction_reference || p.payment_method || "Stripe Sandbox"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`capitalize text-[10px] font-semibold ${statusColors[p.status] || ""}`}
                          >
                            {p.status}
                          </Badge>
                          {p.status === "paid" && (
                            <Badge
                              variant="outline"
                              className={`uppercase text-[10px] ${
                                isSettled
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              }`}
                            >
                              {settlement}
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
