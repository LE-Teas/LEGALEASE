"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminCancelAppointmentAction } from "@/app/actions/admin";

export function PaymentRefundButton({
  appointmentId,
  disabled,
}: {
  appointmentId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRefund = async () => {
    setLoading(true);
    try {
      await adminCancelAppointmentAction(
        appointmentId,
        "Refunded by Administrator from Financial Ledger"
      );
      router.refresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || loading}
      onClick={handleRefund}
      className="h-7 text-[11px] text-purple-700 border-purple-200 hover:bg-purple-50 gap-1"
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <RotateCcw className="size-3" />
      )}
      Refund
    </Button>
  );
}

