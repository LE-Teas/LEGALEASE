"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  CalendarClock,
  Clock,
  Info,
  Loader2,
  Phone,
  ShieldCheck,
  Video,
  CheckCircle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatRate } from "@/lib/data/lawyers";
import type { ConsultationType, LawyerWithProfile } from "@/lib/types/legal";

interface BookingDialogProps {
  lawyer: LawyerWithProfile;
  initialOpen?: boolean;
}

const DURATION_OPTIONS = [60, 75, 90, 105, 120, 135, 150, 165, 180];

export function BookingDialog({ lawyer, initialOpen = false }: BookingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);

  // Form State
  const [consultationType, setConsultationType] = useState<ConsultationType>("in_person");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [availableSlots, setAvailableSlots] = useState<{ start_time: string; end_time: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start_time: string; end_time: string } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [citizenNotes, setCitizenNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  const [feeBreakdown, setFeeBreakdown] = useState<{
    consultation_fee: number;
    platform_fee: number;
    tax_amount: number;
    total_amount: number;
  }>({
    consultation_fee: 0,
    platform_fee: 0,
    tax_amount: 0,
    total_amount: 0,
  });

  const isPhysical = consultationType === "in_person";

  // Calculate fee breakdown whenever consultationType, lawyer fee, or duration changes
  useEffect(() => {
    if (isPhysical) {
      setFeeBreakdown({
        consultation_fee: 0,
        platform_fee: 0,
        tax_amount: 0,
        total_amount: 0,
      });
      return;
    }

    if (!open) return;

    // Prorated or hourly consultation fee based on duration (minimum 60 min)
    const baseFee = lawyer.consultation_fee || 0;
    const proratedFee = Math.round((baseFee * durationMinutes) / 60);

    fetch(`/api/platform/fees?fee=${proratedFee}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.fees) {
          setFeeBreakdown(data.fees);
        } else {
          const platFee = Math.round(proratedFee * 0.1);
          setFeeBreakdown({
            consultation_fee: proratedFee,
            platform_fee: platFee,
            tax_amount: 0,
            total_amount: proratedFee + platFee,
          });
        }
      })
      .catch(() => {
        const platFee = Math.round(proratedFee * 0.1);
        setFeeBreakdown({
          consultation_fee: proratedFee,
          platform_fee: platFee,
          tax_amount: 0,
          total_amount: proratedFee + platFee,
        });
      });
  }, [open, isPhysical, durationMinutes, lawyer.consultation_fee]);

  // Fetch slots whenever lawyer, selected date, or duration changes
  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);

    const activeDuration = isPhysical ? 60 : durationMinutes;

    fetch(`/api/lawyers/${lawyer.id}/slots?date=${selectedDate}&duration=${activeDuration}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setAvailableSlots(data.slots || []);
        if (data.slots && data.slots.length > 0) {
          setSelectedSlot(data.slots[0]);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load slots:", err);
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [open, lawyer.id, selectedDate, durationMinutes, isPhysical]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError("Please select an available time slot.");
      return;
    }
    if (!subject.trim()) {
      setError("Please describe the subject of your legal matter.");
      return;
    }
    if (!agreementAccepted) {
      setError("You must review and accept the Consultation Booking Agreement to proceed.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const activeDuration = isPhysical ? 60 : durationMinutes;

      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId: lawyer.id,
          appointmentDate: selectedDate,
          startTime: selectedSlot.start_time,
          endTime: selectedSlot.end_time,
          consultationType,
          durationMinutes: activeDuration,
          legalCategory: lawyer.primary_specialization,
          subject: subject.trim(),
          description: description.trim() || undefined,
          citizenNotes: citizenNotes.trim() || undefined,
          agreementAccepted: true,
          agreementVersion: "v1.0",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to book consultation");
      }

      const appointmentId = data.appointmentId || data.appointment_id || data.appointment?.id;
      if (!appointmentId) {
        throw new Error("Appointment created, but ID was missing. Please check your appointments dashboard.");
      }

      setOpen(false);
      router.push(`/citizen/appointments/${appointmentId}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to book consultation. Please try another slot.");
    } finally {
      setSubmitting(false);
    }
  };

  // Generate next 14 days dates for quick selection
  const upcomingDays = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + (i + 1));
    return {
      value: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" }),
    };
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#0d2b43] text-white hover:bg-[#0d2b43]/90 font-semibold shadow-sm">
          <CalendarClock className="mr-2 size-4 text-[#0fa176]" />
          Book Consultation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#0fa176] text-white text-[10px]">Booking</Badge>
            <span className="text-xs text-muted-foreground">{lawyer.full_name}</span>
          </div>
          <DialogTitle className="font-heading text-xl text-[#0d2b43]">
            Schedule Legal Consultation
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isPhysical ? (
              <span className="font-medium text-[#0fa176]">
                Free In-Person Chamber Consultation — No booking fee or platform commission.
              </span>
            ) : (
              <span>
                Standard rate: {formatRate(lawyer.consultation_fee || 0)} / hr. Select your preferred duration (60 – 180 min).
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 1. Consultation Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              1. Select Consultation Mode
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {lawyer.offers_in_person && (
                <button
                  type="button"
                  onClick={() => setConsultationType("in_person")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                    consultationType === "in_person"
                      ? "border-[#0d2b43] bg-[#0d2b43]/5 text-[#0d2b43] font-semibold ring-2 ring-[#0d2b43]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className="size-5 mb-1 text-[#0fa176]" />
                  <span className="text-xs font-bold">Physical Visit</span>
                  <span className="text-[10px] text-[#0fa176] font-semibold">100% Free Booking</span>
                </button>
              )}

              {lawyer.offers_video && (
                <button
                  type="button"
                  onClick={() => setConsultationType("video")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                    consultationType === "video"
                      ? "border-[#0d2b43] bg-[#0d2b43]/5 text-[#0d2b43] font-semibold ring-2 ring-[#0d2b43]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Video className="size-5 mb-1 text-[#0fa176]" />
                  <span className="text-xs font-bold">Online Video Call</span>
                  <span className="text-[10px] text-slate-500">Encrypted Jitsi Meet</span>
                </button>
              )}

              {lawyer.offers_phone && (
                <button
                  type="button"
                  onClick={() => setConsultationType("phone")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                    consultationType === "phone"
                      ? "border-[#0d2b43] bg-[#0d2b43]/5 text-[#0d2b43] font-semibold ring-2 ring-[#0d2b43]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Phone className="size-5 mb-1 text-[#0fa176]" />
                  <span className="text-xs font-bold">Phone Call</span>
                  <span className="text-[10px] text-slate-500">Audio Consultation</span>
                </button>
              )}
            </div>

            {consultationType === "in_person" && lawyer.office_address && (
              <div className="rounded-lg border border-[#0fa176]/30 bg-[#0fa176]/10 p-2.5 text-xs text-slate-700 flex items-start gap-2 mt-2">
                <Info className="size-4 text-[#0fa176] shrink-0 mt-0.5" />
                <div>
                  <strong>Chamber Location:</strong> {lawyer.office_address} ({lawyer.city})
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Physical consultations require advocate acceptance. No online payment or LegalEase commission is charged.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Duration Selector (Required for Video Consultations) */}
          {consultationType === "video" && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  2. Select Video Consultation Duration (60 – 180 Minutes)
                </Label>
                <Badge variant="outline" className="border-[#0fa176] text-[#0fa176] text-[10px] font-bold">
                  {durationMinutes} Minutes Booked
                </Badge>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {DURATION_OPTIONS.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDurationMinutes(min)}
                    className={`rounded-lg py-2 px-1 text-xs font-medium transition-all ${
                      durationMinutes === min
                        ? "bg-[#0d2b43] text-white font-bold shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {min} min
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sessions are timed automatically with server-authoritative limits. Warnings are issued at 10 and 5 minutes remaining.
              </p>
            </div>
          )}

          {/* 3. Select Date */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <Label className="text-xs font-semibold text-slate-700">
              {consultationType === "video" ? "3. Select Date" : "2. Select Date"}
            </Label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {upcomingDays.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setSelectedDate(day.value)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs transition-colors ${
                    selectedDate === day.value
                      ? "bg-[#0d2b43] text-white font-bold"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Select Time Slot */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              {consultationType === "video" ? "4." : "3."} Available Time Slot ({selectedDate})
            </Label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-[#0fa176]" />
                Checking advocate schedule for {isPhysical ? "60" : durationMinutes} min slot...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-muted-foreground">
                No slots available on this date for the selected duration. Please pick another date or adjust duration.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot?.start_time === slot.start_time;
                  return (
                    <button
                      key={slot.start_time}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`flex items-center justify-center rounded-lg py-2 px-2 text-xs transition-all ${
                        isSelected
                          ? "bg-[#0fa176] text-white font-bold ring-2 ring-[#0fa176]/30"
                          : "border border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Clock className="size-3 mr-1 opacity-70" />
                      {slot.start_time} - {slot.end_time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Matter Details */}
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <Label className="text-xs font-semibold text-slate-700">
              {consultationType === "video" ? "5." : "4."} Legal Matter Details
            </Label>
            <div className="space-y-1">
              <Label htmlFor="subject" className="text-xs">
                Matter Subject *
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Tenancy agreement dispute or property title verification"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs">
                Brief Description (Confidential)
              </Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide high-level context about your situation for the advocate..."
              />
            </div>
          </div>

          {/* 6. Fee Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-[#0fa176]" />
                Transparent Fee Breakdown
              </span>
              <Badge variant="outline" className="text-[10px] bg-white">
                PKR Guaranteed
              </Badge>
            </div>

            {isPhysical ? (
              <div className="space-y-2 text-slate-600">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                  <span>Physical consultation booking is <strong>100% free</strong>. No online fee or platform commission is charged.</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-semibold text-[#0d2b43] text-sm">
                  <span>Total Payable to LegalEase:</span>
                  <span className="text-[#0fa176] font-bold">Rs. 0 (Free)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Advocate Fee ({durationMinutes} mins):</span>
                  <span className="font-medium text-slate-800">
                    {formatRate(feeBreakdown.consultation_fee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Commission & Escrow Protection:</span>
                  <span className="font-medium text-slate-800">
                    {formatRate(feeBreakdown.platform_fee)}
                  </span>
                </div>
                {feeBreakdown.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Sales Tax / Levies:</span>
                    <span className="font-medium text-slate-800">
                      {formatRate(feeBreakdown.tax_amount)}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-semibold text-[#0d2b43] text-sm">
                  <span>Total Payable:</span>
                  <span>{formatRate(feeBreakdown.total_amount)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Payment is only requested after the advocate accepts your request. Video chamber opens upon payment confirmation.
                </p>
              </div>
            )}
          </div>

          {/* 7. Consultation Agreement Acceptance */}
          <div className="flex items-start gap-2.5 rounded-lg border border-[#0fa176]/20 bg-[#0fa176]/5 p-3">
            <input
              type="checkbox"
              id="agreement"
              checked={agreementAccepted}
              onChange={(e) => setAgreementAccepted(e.target.checked)}
              className="mt-0.5 size-4 rounded border-slate-300 text-[#0d2b43] focus:ring-[#0d2b43] accent-[#0d2b43] cursor-pointer"
            />
            <label htmlFor="agreement" className="text-[11px] leading-tight text-slate-700 cursor-pointer">
              I agree to the{" "}
              <span className="font-semibold text-[#0d2b43] underline">LegalEase Consultation Terms & Fee Policy (v1.0)</span>
              . I understand this consultation request is subject to advocate acceptance and will be recorded securely.
            </label>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Total Fee</p>
              <p className="font-heading font-bold text-[#0d2b43] text-base">
                {isPhysical ? "Rs. 0 (Free)" : formatRate(feeBreakdown.total_amount)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !selectedSlot || loadingSlots}
                className="bg-[#0d2b43] text-white hover:bg-[#0d2b43]/90 font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Confirm Consultation"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
