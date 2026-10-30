"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { useRouter } from "next/navigation";
import { CreditCard, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatRate } from "@/lib/data/lawyers";
import type { Appointment } from "@/lib/types/legal";

interface ConsultationPaymentCardProps {
  appointment: Appointment;
}

export function ConsultationPaymentCard({ appointment }: ConsultationPaymentCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("jazzcash_escrow");

  const isVideo = appointment.consultation_type === "video";
  const isPaid = appointment.payment_status === "paid";
  const isConfirmed = appointment.status === "confirmed";

  if (!isVideo || isPaid || !isConfirmed) {
    return null;
  }

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment transaction could not be completed.");
      }

      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  const totalPayable = appointment.total_amount || appointment.consultation_fee || 0;

  return (
    <Card className="border-2 border-[#0fa176] bg-[#0fa176]/5 shadow-sm overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0fa176]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#0d2b43] text-white">
              <CreditCard className="size-5 text-[#0fa176]" />
            </span>
            <div>
              <h3 className="font-heading text-base font-bold text-[#0d2b43]">
                Advocate Accepted · Complete Escrow Payment
              </h3>
              <p className="text-xs text-slate-600">
                Your advocate has confirmed this {appointment.duration_minutes || 60}-minute video consultation. Secure payment to unlock the video chamber.
              </p>
            </div>
          </div>
          <Badge className="bg-[#0fa176] text-white font-bold text-xs py-1 px-3">
            Payment Required
          </Badge>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Transparent Breakdown */}
        <div className="grid sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-muted-foreground">Advocate Fee ({appointment.duration_minutes || 60}m):</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">
              {formatRate(appointment.consultation_fee)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Platform Protection (10%):</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">
              {formatRate(appointment.platform_fee || Math.round(appointment.consultation_fee * 0.1))}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Total Payable to Escrow:</span>
            <p className="font-bold text-[#0fa176] text-sm mt-0.5">
              {formatRate(totalPayable)}
            </p>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">
            Select Escrow Payment Method (Pakistan)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "jazzcash_escrow", label: "JazzCash" },
              { id: "easypaisa_escrow", label: "EasyPaisa" },
              { id: "bank_escrow", label: "1Link Bank Payout" },
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id)}
                className={`py-2 px-3 text-xs rounded-lg font-medium border text-center transition-all ${
                  paymentMethod === method.id
                    ? "bg-[#0d2b43] text-white border-[#0d2b43] font-bold shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-slate-600 flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-[#0fa176] shrink-0" />
            Funds held securely in escrow until consultation completion.
          </span>

          <Button
            onClick={handlePay}
            disabled={loading}
            className="w-full sm:w-auto bg-[#0fa176] hover:bg-[#0fa176]/90 text-white font-semibold text-xs px-6 shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Securing Escrow…
              </>
            ) : (
              <>
                <CreditCard className="mr-1.5 size-4" />
                Pay {formatRate(totalPayable)} & Unlock Chamber
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
