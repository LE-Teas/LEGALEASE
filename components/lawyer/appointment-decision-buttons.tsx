"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  X,
  XCircle,
  FileCheck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AppointmentDecisionButtonsProps {
  appointmentId: string;
  status: string;
  consultationType?: string;
  paymentStatus?: string;
}

export function AppointmentDecisionButtons({
  appointmentId,
  status,
  consultationType = "video",
  paymentStatus = "unpaid",
}: AppointmentDecisionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"confirm" | "reject" | "complete" | "cancel" | null>(null);

  // Dialog state for rejection/cancellation reason
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"reject" | "cancel">("reject");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Dialog state for Mark Completed
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completeError, setCompleteError] = useState<string | null>(null);

  const isVideo = consultationType === "video";
  const isPaid = paymentStatus === "paid" || consultationType === "in_person";

  const handleConfirm = async () => {
    setLoading("confirm");
    try {
      const res = await fetch("/api/appointments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          status: "confirmed",
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const handleCompleteSubmit = async () => {
    setLoading("complete");
    setCompleteError(null);
    try {
      const res = await fetch("/api/appointments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          status: "completed",
          notes: completionNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark consultation completed");
      }
      setCompleteDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      setCompleteError(err?.message || "Error completing appointment");
    } finally {
      setLoading(null);
    }
  };

  const openReasonDialog = (type: "reject" | "cancel") => {
    setActionType(type);
    setReason("");
    setError(null);
    setDialogOpen(true);
  };

  const handleReasonSubmit = async () => {
    const newStatus = actionType === "reject" ? "rejected" : "cancelled";
    setLoading(actionType);
    setError(null);
    try {
      const res = await fetch("/api/appointments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          status: newStatus,
          notes: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update appointment");
      }
      setDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Error updating appointment");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        {status === "pending" && (
          <>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={loading !== null}
              className="h-8 bg-[#0fa176] hover:bg-[#0fa176]/90 text-white text-xs font-semibold shadow-xs"
            >
              {loading === "confirm" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="mr-1 size-3.5" />
              )}
              Accept Request
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openReasonDialog("reject")}
              disabled={loading !== null}
              className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
            >
              <X className="mr-1 size-3.5" />
              Decline
            </Button>
          </>
        )}

        {status === "confirmed" && (
          <>
            {isVideo && !isPaid ? (
              <span title="Video consultation can only be completed after client payment has been confirmed in escrow.">
                <Button
                  size="sm"
                  disabled
                  className="h-8 bg-slate-200 text-slate-500 hover:bg-slate-200 text-xs font-semibold cursor-not-allowed border border-slate-300"
                >
                  <Lock className="mr-1.5 size-3.5 text-slate-400" />
                  Mark Completed (Awaiting Payment)
                </Button>
              </span>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setCompletionNotes("");
                  setCompleteError(null);
                  setCompleteDialogOpen(true);
                }}
                disabled={loading !== null}
                className="h-8 bg-[#0d2b43] text-white hover:bg-[#0d2b43]/90 text-xs font-semibold shadow-xs"
              >
                <CheckCircle2 className="mr-1.5 size-3.5 text-[#0fa176]" />
                Mark Completed
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => openReasonDialog("cancel")}
              disabled={loading !== null}
              className="h-8 text-slate-500 hover:text-rose-700 hover:bg-rose-50 text-xs"
            >
              <XCircle className="mr-1 size-3.5" />
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Rejection / Cancellation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-[#0d2b43] flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />
              {actionType === "reject" ? "Decline Consultation Request" : "Cancel Confirmed Consultation"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {actionType === "reject"
                ? "The client will be notified immediately of the decline."
                : "Please specify why this confirmed consultation cannot proceed (e.g. court emergency). The citizen will be notified."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="reasonText" className="text-xs font-semibold text-slate-700">
              Reason / Explanation to Client (Optional)
            </Label>
            <Textarea
              id="reasonText"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                actionType === "reject"
                  ? "e.g. Outside practice specialization, schedule full, or conflict of interest."
                  : "e.g. Urgent court appearance required on this date."
              }
              rows={3}
              className="text-xs"
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={loading !== null}
              className="text-xs"
            >
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={handleReasonSubmit}
              disabled={loading !== null}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                actionType === "reject" ? "Confirm Decline" : "Confirm Cancellation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Completed Dialog (with early completion reason check) */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-[#0d2b43] flex items-center gap-2">
              <FileCheck className="size-5 text-[#0fa176]" />
              Mark Consultation as Completed
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will record the official completion timestamp, update settlement status to eligible, and enable citizen review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="completeNotes" className="text-xs font-semibold text-slate-700">
              Session Summary / Early Completion Reason (Optional)
            </Label>
            <Textarea
              id="completeNotes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="e.g. Legal guidance delivered on property agreement; both parties satisfied with discussion."
              rows={3}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              If the session concluded earlier than the booked duration, please state the mutual agreement or reason above.
            </p>
            {completeError && <p className="text-xs text-rose-600">{completeError}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompleteDialogOpen(false)}
              disabled={loading !== null}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCompleteSubmit}
              disabled={loading !== null}
              className="bg-[#0fa176] hover:bg-[#0fa176]/90 text-white text-xs font-semibold"
            >
              {loading === "complete" ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Completing...
                </>
              ) : (
                "Confirm Completion"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
