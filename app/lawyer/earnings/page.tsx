import Link from "next/link";
import { getAuthState } from "@/lib/auth/profile";
import { getLawyerEarnings } from "@/lib/services/payments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRate } from "@/lib/data/lawyers";
import {
  Wallet,
  Clock,
  CheckCircle2,
  Calendar,
  Receipt,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";

export const metadata = {
  title: "Earnings & Settlements | Lawyer Portal",
  description: "Track your consultation revenue, pending payments, and transaction history.",
};

export default async function LawyerEarningsPage() {
  const { user } = await getAuthState();
  if (!user) return null;

  const earnings = await getLawyerEarnings(user.id);
  const { totalEarnings, pendingAmount, paidAmount, payments } = earnings;

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
            Earnings & Settlements
          </h2>
          <p className="text-sm text-muted-foreground">
            Overview of consultation fees collected, pending balances, and transaction history.
          </p>
        </div>

        <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 text-xs">
          <Link href="/lawyer/profile/edit">
            Edit Consultation Fee
          </Link>
        </Button>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Paid Earnings</p>
              <p className="font-heading text-2xl font-bold text-navy mt-1">
                {formatRate(paidAmount)}
              </p>
            </div>
            <div className="size-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending Settlements</p>
              <p className="font-heading text-2xl font-bold text-amber-600 mt-1">
                {formatRate(pendingAmount)}
              </p>
            </div>
            <div className="size-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Invoices Logged</p>
              <p className="font-heading text-2xl font-bold text-teal mt-1">
                {payments.length}
              </p>
            </div>
            <div className="size-10 rounded-full bg-teal-soft flex items-center justify-center text-teal">
              <Receipt className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      {payments.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <Receipt className="size-7" />
            </div>
            <h3 className="font-heading text-lg font-bold text-navy">No Transactions Logged</h3>
            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4 leading-relaxed">
              When consultation fees are processed for your sessions, detailed records of settled and pending payments will be reflected here.
            </p>
            <Button asChild variant="outline" className="text-xs">
              <Link href="/lawyer/appointments">View Pending Consultations</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-navy">Payment History</CardTitle>
            <CardDescription className="text-xs">
              Direct billing records linked to your consultation sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Citizen / Client</th>
                  <th className="p-4">Matter / Details</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Fee Amount</th>
                  <th className="p-4">Payment Method / Ref</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
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
                    <td className="p-4 font-bold text-navy">
                      {formatRate(p.amount)}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-600">
                      {p.transaction_reference || p.payment_method || "Direct Settlement"}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={`capitalize text-[10px] font-semibold ${statusColors[p.status] || ""}`}
                      >
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
