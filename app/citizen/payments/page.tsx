import Link from "next/link";
import { CreditCard, Receipt, Search } from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { getCitizenPayments } from "@/lib/services/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRate } from "@/lib/data/lawyers";

export const metadata = {
  title: "Billing & Payments | Citizen Portal",
  description: "Track your consultation payment receipts and billing history.",
};

export default async function CitizenPaymentsPage() {
  const { user } = await getAuthState();
  if (!user) return null;

  const payments = await getCitizenPayments(user.id);

  const statusColors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-900 border-emerald-200",
    pending: "bg-amber-100 text-amber-900 border-amber-200",
    failed: "bg-rose-100 text-rose-900 border-rose-200",
    refunded: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Billing & Payments
        </h2>
        <p className="text-sm text-muted-foreground">
          View your consultation fee records, transaction references, and payment receipts.
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Receipt className="size-7" />
          </div>
          <h3 className="mt-4 font-heading text-lg font-bold text-navy">
            No payment records found
          </h3>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            When you confirm and complete legal consultations with verified advocates, payment receipts and invoices will be logged here.
          </p>
          <Button asChild size="sm" className="mt-5 bg-navy text-white hover:bg-navy/90 text-xs">
            <Link href="/citizen/lawyers">
              <Search className="mr-1.5 size-3.5" />
              Find a Lawyer
            </Link>
          </Button>
        </div>
      ) : (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-navy">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Advocate</th>
                  <th className="p-4">Matter / Consultation</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Method / Ref</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-navy">
                      {p.lawyer?.full_name || "Advocate"}
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
                      {p.transaction_reference || p.payment_method || "Bank Transfer"}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={`capitalize text-[10px] font-semibold ${statusColors[p.status] || ""}`}>
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
