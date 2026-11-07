"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe_card");

  const isVideo =
    appointment.consultation_type === "video" ||
    appointment.consultation_type === "phone";
  const isPaid = appointment.payment_status === "paid";
  const isConfirmed = appointment.status === "confirmed";

  if (!isVideo || isPaid || !isConfirmed) {
    return null;
  }

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
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

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setSuccessMsg(
        "Stripe Sandbox webhook signature verified! Escrow payment confirmed and video room unlocked."
      );
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
                Advocate Accepted · Complete Stripe Sandbox Escrow Checkout
              </h3>
              <p className="text-xs text-slate-600">
                Your advocate has confirmed this {appointment.duration_minutes || 60}-minute
                consultation. Complete checkout via Stripe Sandbox to unlock the video chamber.
              </p>
            </div>
          </div>
          <Badge className="bg-[#0fa176] text-white font-bold text-xs py-1 px-3">
            Stripe Sandbox Escrow
          </Badge>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        {/* Transparent Breakdown */}
        <div className="grid sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-muted-foreground">
              Advocate Fee ({appointment.duration_minutes || 60}m):
            </span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">
              {formatRate(appointment.consultation_fee)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Platform Protection (10%):</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">
              {formatRate(
                appointment.platform_fee || Math.round(appointment.consultation_fee * 0.1)
              )}
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
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Select Stripe Sandbox Checkout Method
            </label>
            <span className="font-mono text-[11px] text-slate-500">
              Test Card: 4242 •••• •••• 4242
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "stripe_card", label: "Stripe Card (Visa / Mastercard)" },
              { id: "stripe_wallet", label: "Apple Pay / Google Pay" },
              { id: "stripe_link", label: "Stripe Link Instant Pay" },
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
            Verified via Stripe-Signature HMAC-SHA256 webhook. Held in escrow until completion.
          </span>

          <Button
            onClick={handlePay}
            disabled={loading}
            className="w-full sm:w-auto bg-[#0fa176] hover:bg-[#0fa176]/90 text-white font-semibold text-xs px-6 shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Processing Stripe Sandbox Checkout…
              </>
            ) : (
              <>
                <ExternalLink className="mr-1.5 size-4" />
                Pay {formatRate(totalPayable)} via Stripe Sandbox
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
