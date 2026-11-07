"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
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
  AlertCircle,
  User,
  Scale,
  MapPin,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRate } from "@/lib/data/lawyers";
import { getErrorMessage } from "@/lib/errors";
import type { ConsultationType, LawyerWithProfile } from "@/lib/types/legal";

interface AppointmentBookingClientProps {
  initialLawyers: LawyerWithProfile[];
  selectedLawyerId?: string;
  preselectedDate?: string;
}

const DURATION_OPTIONS = [60, 75, 90, 105, 120, 135, 150, 165, 180];

export function AppointmentBookingClient({
  initialLawyers,
  selectedLawyerId,
  preselectedDate,
}: AppointmentBookingClientProps) {
  const router = useRouter();

  // Selected lawyer
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerWithProfile | null>(() => {
    if (selectedLawyerId) {
      const match = initialLawyers.find((l) => l.id === selectedLawyerId);
      if (match) return match;
    }
    return initialLawyers.length > 0 ? initialLawyers[0] : null;
  });

  // Search/Filter for lawyers if user wants to change lawyer
  const [lawyerSearch, setLawyerSearch] = useState("");

  // Form State
  const [consultationType, setConsultationType] = useState<ConsultationType>("in_person");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (preselectedDate && /^\d{4}-\d{2}-\d{2}$/.test(preselectedDate)) {
      return preselectedDate;
    }
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

  // Filtered lawyers list for quick selection
  const filteredLawyers = initialLawyers.filter((l) => {
    if (!lawyerSearch.trim()) return true;
    const term = lawyerSearch.toLowerCase();
    return (
      l.full_name?.toLowerCase().includes(term) ||
      l.primary_specialization?.toLowerCase().includes(term) ||
      l.city?.toLowerCase().includes(term)
    );
  });

  // Calculate fee breakdown whenever consultationType, lawyer fee, or duration changes
  useEffect(() => {
    if (isPhysical || !selectedLawyer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFeeBreakdown({
        consultation_fee: 0,
        platform_fee: 0,
        tax_amount: 0,
        total_amount: 0,
      });
      return;
    }

    const baseFee = selectedLawyer.consultation_fee || 0;
    const proratedFee = Math.round((baseFee * durationMinutes) / 60);

    fetch(`/api/platform/fees?fee=${proratedFee}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.feeBreakdown) {
          setFeeBreakdown({
            consultation_fee: data.feeBreakdown.consultation_fee,
            platform_fee: data.feeBreakdown.platform_fee,
            tax_amount: data.feeBreakdown.tax_amount,
            total_amount: data.feeBreakdown.total_amount,
          });
        }
      })
      .catch((err) => {
        console.error("Fee calculation error:", err);
      });
  }, [selectedLawyer, consultationType, durationMinutes, isPhysical]);

  // Fetch available slots when lawyer, date, or duration changes
  useEffect(() => {
    if (!selectedLawyer || !selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }

    setLoadingSlots(true);
    setSelectedSlot(null);
    const activeDuration = isPhysical ? 60 : durationMinutes;

    fetch(`/api/lawyers/${selectedLawyer.id}/slots?date=${selectedDate}&duration=${activeDuration}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.slots && Array.isArray(data.slots)) {
          setAvailableSlots(data.slots);
          if (data.slots.length > 0) {
            setSelectedSlot(data.slots[0]);
          }
        } else {
          setAvailableSlots([]);
        }
      })
      .catch((err) => {
        console.error("Slot fetch error:", err);
        setAvailableSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedLawyer, selectedDate, durationMinutes, isPhysical]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLawyer) {
      setError("Please select a lawyer for your consultation.");
      return;
    }

    if (!selectedSlot) {
      setError("Please choose an available consultation time slot.");
      return;
    }

    if (!subject.trim()) {
      setError("Please provide a subject for this consultation.");
      return;
    }

    if (!agreementAccepted) {
      setError("You must review and accept the Consultation Booking Agreement before scheduling.");
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
          lawyerId: selectedLawyer.id,
          appointmentDate: selectedDate,
          startTime: selectedSlot.start_time,
          endTime: selectedSlot.end_time,
          consultationType,
          durationMinutes: activeDuration,
          legalCategory: selectedLawyer.primary_specialization,
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

      router.push(`/citizen/appointments/${appointmentId}`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to book consultation. Please try another slot.");
    } finally {
      setSubmitting(false);
    }
  };

  // Next 14 days quick selector
  const upcomingDays = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + (i + 1));
    return {
      value: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" }),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-navy">
          <Link href="/citizen/appointments">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Appointments
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Lawyer Selection & Information */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg font-bold text-navy flex items-center gap-2">
                <User className="size-4 text-teal" />
                Select Legal Counsel
              </CardTitle>
              <CardDescription className="text-xs">
                Choose a verified advocate for your consultation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search by name, law area, or city..."
                value={lawyerSearch}
                onChange={(e) => setLawyerSearch(e.target.value)}
                className="text-xs"
              />

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {filteredLawyers.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    No verified advocates matched your search.
                  </p>
                ) : (
                  filteredLawyers.map((l) => {
                    const isSelected = selectedLawyer?.id === l.id;
                    const initials = (l.full_name || "LE")
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLawyer(l)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-teal bg-teal/5 shadow-sm"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <Avatar className="size-10 border border-slate-200 bg-white shrink-0">
                          {l.avatar_url && <AvatarImage src={l.avatar_url} alt={l.full_name || ""} />}
                          <AvatarFallback className="bg-navy text-gold text-xs font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-navy truncate">{l.full_name}</h4>
                            <ShieldCheck className="size-3 text-teal shrink-0" />
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {l.primary_specialization || "General Practice"} · {l.city}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-navy">
                              {l.consultation_fee ? formatRate(l.consultation_fee) : "Fee on request"}/hr
                            </span>
                            {l.rating && Number(l.rating) > 0 ? (
                              <span className="flex items-center text-amber-600 font-medium">
                                <Star className="size-3 fill-amber-500 mr-0.5" />
                                {Number(l.rating).toFixed(1)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Lawyer Highlight Card */}
          {selectedLawyer && (
            <Card className="border-teal/30 bg-teal/[0.02]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-navy">
                  <Scale className="size-4 text-teal" />
                  Selected Advocate Details
                </div>
                <div className="text-xs space-y-1 text-slate-700">
                  <p className="font-semibold text-navy">{selectedLawyer.full_name}</p>
                  <p className="text-muted-foreground">
                    {selectedLawyer.professional_title || "Advocate High Court"}
                  </p>
                  {selectedLawyer.office_address && (
                    <div className="flex items-start gap-1 text-[11px] text-muted-foreground pt-1">
                      <MapPin className="size-3 text-teal shrink-0 mt-0.5" />
                      <span>{selectedLawyer.office_address}, {selectedLawyer.city}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Full Booking Form */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-teal text-white text-[10px]">Step 2 of 2</Badge>
                <span className="text-xs text-muted-foreground">Appointment Details</span>
              </div>
              <CardTitle className="font-heading text-xl text-navy">
                Schedule Your Consultation Session
              </CardTitle>
              <CardDescription className="text-xs">
                Select your preferred meeting format, duration, and date.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmitBooking} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Consultation Type Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-navy">Consultation Format *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setConsultationType("in_person")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                        consultationType === "in_person"
                          ? "border-teal bg-teal/10 text-navy font-semibold shadow-sm"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Building2 className="size-5 mb-1.5 text-teal" />
                      <span className="text-xs font-bold">Physical Meeting</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        Office Chamber (0% Fee)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConsultationType("video")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                        consultationType === "video"
                          ? "border-teal bg-teal/10 text-navy font-semibold shadow-sm"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Video className="size-5 mb-1.5 text-teal" />
                      <span className="text-xs font-bold">Video Session</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        Encrypted Room + Timer
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConsultationType("phone")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                        consultationType === "phone"
                          ? "border-teal bg-teal/10 text-navy font-semibold shadow-sm"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Phone className="size-5 mb-1.5 text-teal" />
                      <span className="text-xs font-bold">Direct Phone</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        Telephonic Consultation
                      </span>
                    </button>
                  </div>
                </div>

                {/* Duration Picker (For video and phone) */}
                {!isPhysical && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-navy">
                        Duration (60–180 Minutes) *
                      </Label>
                      <span className="text-xs font-bold text-teal">{durationMinutes} minutes</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map((min) => (
                        <Button
                          key={min}
                          type="button"
                          size="sm"
                          variant={durationMinutes === min ? "default" : "outline"}
                          className={`text-xs h-8 ${
                            durationMinutes === min
                              ? "bg-navy text-white hover:bg-navy/90"
                              : "text-slate-700"
                          }`}
                          onClick={() => setDurationMinutes(min)}
                        >
                          {min}m
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Picker */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-navy">Consultation Date *</Label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {upcomingDays.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        size="sm"
                        variant={selectedDate === day.value ? "default" : "outline"}
                        className={`text-xs shrink-0 h-9 px-3 ${
                          selectedDate === day.value
                            ? "bg-navy text-white hover:bg-navy/90"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                        onClick={() => setSelectedDate(day.value)}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-2 text-xs w-full sm:w-60"
                  />
                </div>

                {/* Slot Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-navy">Available Time Slots *</Label>
                    {loadingSlots && (
                      <span className="flex items-center text-xs text-muted-foreground">
                        <Loader2 className="mr-1 size-3 animate-spin text-teal" />
                        Checking calendar...
                      </span>
                    )}
                  </div>

                  {loadingSlots ? (
                    <div className="p-8 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-slate-200">
                      Loading open hours from advocate chamber calendar...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="p-6 text-center text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                      No open slots on {selectedDate}. Please pick another date or format above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {availableSlots.map((slot, idx) => {
                        const isSelected =
                          selectedSlot?.start_time === slot.start_time &&
                          selectedSlot?.end_time === slot.end_time;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                              isSelected
                                ? "border-teal bg-teal text-white shadow-sm font-semibold"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <Clock className={`size-3 ${isSelected ? "text-white" : "text-teal"}`} />
                            {slot.start_time} - {slot.end_time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Consultation Legal Details */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="subject" className="text-xs font-semibold text-navy">
                      Subject / Legal Inquiry Title *
                    </Label>
                    <Input
                      id="subject"
                      placeholder="e.g. Tenancy agreement dispute and eviction notice vetting"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-xs font-semibold text-navy">
                      Case Summary / Primary Questions (Optional)
                    </Label>
                    <Textarea
                      id="description"
                      rows={3}
                      placeholder="Briefly describe your situation, contracts involved, or specific relief sought..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="citizenNotes" className="text-xs font-semibold text-navy">
                      Private Notes for Advocate (Optional)
                    </Label>
                    <Textarea
                      id="citizenNotes"
                      rows={2}
                      placeholder="Mention any documents you will bring or specific scheduling notes..."
                      value={citizenNotes}
                      onChange={(e) => setCitizenNotes(e.target.value)}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>

                {/* Fee Breakdown Display */}
                {!isPhysical && feeBreakdown.total_amount > 0 && (
                  <div className="rounded-xl border border-teal/20 bg-teal/[0.03] p-4 space-y-2">
                    <h5 className="text-xs font-bold text-navy flex items-center justify-between">
                      <span>Consultation Fee Estimate ({durationMinutes} mins)</span>
                      <span className="text-sm text-navy">{formatRate(feeBreakdown.total_amount)}</span>
                    </h5>
                    <div className="text-[11px] space-y-1 text-muted-foreground border-t border-teal/10 pt-2">
                      <div className="flex justify-between">
                        <span>Advocate Fee:</span>
                        <span className="font-medium text-slate-700">{formatRate(feeBreakdown.consultation_fee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform Escrow Fee:</span>
                        <span className="font-medium text-slate-700">{formatRate(feeBreakdown.platform_fee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Provincial Sales Tax:</span>
                        <span className="font-medium text-slate-700">{formatRate(feeBreakdown.tax_amount)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Terms Acceptance */}
                <div className="flex items-start gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="agreement"
                    checked={agreementAccepted}
                    onChange={(e) => setAgreementAccepted(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-slate-300 text-teal focus:ring-teal"
                    required
                  />
                  <label htmlFor="agreement" className="text-xs text-muted-foreground leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" className="text-teal underline font-medium">
                      Consultation Booking Agreement
                    </Link>{" "}
                    and LegalEase cancellation policy. I understand that video consultations require escrow confirmation once accepted by the advocate.
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    type="submit"
                    disabled={submitting || !selectedSlot || !subject.trim() || !agreementAccepted}
                    className="bg-navy text-white hover:bg-navy/90 font-semibold px-6 shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 size-4 text-gold" />
                        Confirm Consultation Booking
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
