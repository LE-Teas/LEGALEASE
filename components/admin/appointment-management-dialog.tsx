"use client";

import { useState } from "react";
import {
  CalendarClock,
  Clock,
  User,
  Scale,
  Video,
  Phone,
  Building2,
  Wallet,
  AlertTriangle,
  XCircle,
  ExternalLink,
  CheckCircle2,
  DollarSign,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { adminCancelAppointmentAction, adminSettleAppointmentAction } from "@/app/actions/admin";
import { formatRate } from "@/lib/data/lawyers";

interface AppointmentDetailsRecord {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  consultation_type: string;
  duration_minutes?: number | null;
  legal_category?: string | null;
  subject: string;
  description?: string | null;
  status: string;
  consultation_fee: number;
  platform_fee: number;
  tax_amount: number;
  total_amount: number;
  lawyer_receivable: number;
  payment_status: string;
  settlement_status?: string | null;
  settlement_reference?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  early_completion_reason?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  citizen: {
    full_name: string;
    email: string;
    phone?: string | null;
  };
  lawyer: {
    full_name: string;
    email: string;
    city?: string | null;
  };
}

export function AppointmentManagementDialog({
  appointment,
}: {
  appointment: AppointmentDetailsRecord;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError("Please specify a cancellation reason for the citizen and lawyer.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await adminCancelAppointmentAction(appointment.id, cancelReason);
      setOpen(false);
      setShowCancelConfirm(false);
      setCancelReason("");
    } catch (err: any) {
      setError(err?.message || "Failed to cancel appointment.");
    } finally {
      setLoading(false);
    }
  };

  const handleSettlePayout = async () => {
    setSettling(true);
    setError(null);
    try {
      const res = await adminSettleAppointmentAction(appointment.id);
      setSuccessMsg(`Advocate payout transferred successfully (Ref: ${res.payoutRef}).`);
      setTimeout(() => {
        setOpen(false);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to process settlement payout.");
    } finally {
      setSettling(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "confirmed":
        return <Badge className="bg-[#0CA275] text-white text-[10px]">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-amber-500 text-white text-[10px]">Pending Approval</Badge>;
      case "completed":
        return <Badge className="bg-blue-600 text-white text-[10px]">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-slate-500 text-white text-[10px]">Cancelled</Badge>;
      case "rejected":
        return <Badge className="bg-rose-600 text-white text-[10px]">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] capitalize">{s}</Badge>;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "video":
        return <Video className="size-3.5 text-blue-600" />;
      case "phone":
        return <Phone className="size-3.5 text-[#0CA275]" />;
      default:
        return <Building2 className="size-3.5 text-slate-600" />;
    }
  };

  const isPhysical = appointment.consultation_type === "in_person";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs h-7 border-slate-200">
          Inspect Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {getStatusBadge(appointment.status)}
              <Badge
                variant="outline"
                className={`text-[10px] capitalize ${
                  appointment.payment_status === "paid"
                    ? "bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30"
                    : appointment.payment_status === "waived"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                Payment: {appointment.payment_status || "Unpaid"}
              </Badge>
              {appointment.settlement_status && (
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  Settlement: {appointment.settlement_status}
                </Badge>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Ref: {appointment.id.slice(0, 8)}
            </span>
          </div>

          <DialogTitle className="font-heading text-lg text-[#0A2843] pt-1">
            {appointment.subject}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 flex items-center gap-2">
            <Clock className="size-3 text-slate-400" />
            {appointment.appointment_date} from {appointment.start_time} to {appointment.end_time} ({appointment.duration_minutes || 60}m duration)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              {successMsg}
            </div>
          )}

          {/* Citizen and Lawyer info */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div>
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <User className="size-3" /> Citizen
              </span>
              <p className="font-semibold text-slate-800 mt-0.5">{appointment.citizen?.full_name}</p>
              <p className="text-[11px] text-slate-500">{appointment.citizen?.email}</p>
              {appointment.citizen?.phone && (
                <p className="text-[10px] text-slate-400">{appointment.citizen?.phone}</p>
              )}
            </div>
            <div>
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Scale className="size-3" /> Advocate
              </span>
              <p className="font-semibold text-slate-800 mt-0.5">{appointment.lawyer?.full_name}</p>
              <p className="text-[11px] text-slate-500">{appointment.lawyer?.email}</p>
              <p className="text-[10px] text-slate-400">{appointment.lawyer?.city || "Pakistan"}</p>
            </div>
          </div>

          {/* Description & Consultation Mode */}
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Consultation Mode & Duration:</span>
              <span className="flex items-center gap-1.5 font-semibold capitalize text-slate-800">
                {getModeIcon(appointment.consultation_type)}
                {appointment.consultation_type.replace("_", " ")} ({appointment.duration_minutes || 60} minutes)
              </span>
            </div>

            {appointment.consultation_type === "video" && appointment.status === "confirmed" && (
              <div className="flex items-center justify-between bg-blue-50/60 p-2 rounded text-blue-900 border border-blue-200">
                <span className="flex items-center gap-1 font-medium text-[11px]">
                  <Video className="size-3.5 text-blue-600" />
                  Jitsi Meet Consultation Room Active ({appointment.duration_minutes || 60}m limit)
                </span>
                <a
                  href={`/citizen/video/${appointment.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
                >
                  Inspect Room <ExternalLink className="size-3" />
                </a>
              </div>
            )}

            <div>
              <span className="text-slate-400 text-[11px] block">Citizen Inquiry Description:</span>
              <p className="text-slate-700 mt-1 leading-relaxed">
                {appointment.description || "No additional description provided at booking."}
              </p>
            </div>
          </div>

          {/* Completion Info */}
          {appointment.completed_at && (
            <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-3 text-slate-700 space-y-1">
              <span className="font-semibold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                Consultation Completion Record:
              </span>
              <p className="text-[11px] text-slate-600">
                Completed at {new Date(appointment.completed_at).toLocaleString("en-PK")} by{" "}
                <strong className="capitalize">{appointment.completed_by || "lawyer"}</strong>.
              </p>
              {appointment.early_completion_reason && (
                <p className="text-[11px] text-slate-700 bg-white p-2 rounded border border-emerald-100 mt-1">
                  <strong>Session Note / Reason:</strong> {appointment.early_completion_reason}
                </p>
              )}
            </div>
          )}

          {/* Financial Breakdown & Commission Snapshot */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-1.5">
            <span className="font-semibold text-slate-800 text-[11px] block mb-1">
              Financial Breakdown & Commission Snapshot
            </span>
            {isPhysical ? (
              <div className="rounded bg-blue-50/50 border border-blue-200 p-2 text-blue-900 text-xs font-medium">
                Physical consultation booking is 100% free. No online consultation fee or LegalEase platform commission applies.
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Agreed Gross Consultation Fee</span>
                  <span className="font-medium text-slate-800">{formatRate(appointment.consultation_fee)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Platform Commission (10%)</span>
                  <span className="font-medium text-[#0CA275]">{formatRate(appointment.platform_fee)}</span>
                </div>
                {appointment.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax Amount</span>
                    <span className="font-medium text-slate-800">{formatRate(appointment.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
                  <span>Total Escrow Paid / Payable</span>
                  <span className="text-[#0A2843] font-bold">
                    {formatRate(appointment.total_amount || appointment.consultation_fee)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Advocate Net Receivable Payout</span>
                  <span className="font-medium text-slate-700">
                    {formatRate(appointment.lawyer_receivable || appointment.consultation_fee - appointment.platform_fee)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Settlement Action Button if eligible */}
          {appointment.status === "completed" && appointment.settlement_status === "eligible" && !isPhysical && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-bold text-emerald-950 text-xs">
                    Eligible for Commission Settlement Payout
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Advocate Net Share: <strong>{formatRate(appointment.lawyer_receivable)}</strong> (Commission retained: {formatRate(appointment.platform_fee)})
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleSettlePayout}
                  disabled={settling}
                  className="bg-[#0CA275] hover:bg-[#0CA275]/90 text-white text-xs font-semibold h-8"
                >
                  {settling ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Settling…
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-1 size-3.5" />
                      Authorize Transfer
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Cancellation section */}
          {appointment.status !== "cancelled" && appointment.status !== "completed" && (
            <div className="space-y-2 pt-1">
              {!showCancelConfirm ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                >
                  <XCircle className="size-3.5 mr-1.5" />
                  Administrative Cancellation
                </Button>
              ) : (
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
                    <AlertTriangle className="size-4 text-rose-600" />
                    Confirm Consultation Cancellation
                  </div>
                  <Label htmlFor="cancelReason" className="text-[11px] text-slate-700">
                    Mandatory Cancellation Reason (Sent to both Citizen and Advocate)
                  </Label>
                  <Textarea
                    id="cancelReason"
                    rows={2}
                    placeholder="e.g. Cancelled due to advocate schedule emergency or scheduling conflict."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="text-xs bg-white"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCancelConfirm(false)}
                      className="text-xs h-7"
                    >
                      Dismiss
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={loading || !cancelReason.trim()}
                      onClick={handleCancel}
                      className="text-xs h-7"
                    >
                      {loading ? "Cancelling..." : "Confirm Cancellation"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
