import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Video,
  Star,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { getAppointmentById } from "@/lib/services/appointments";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentActions } from "@/components/citizen/appointment-actions";
import { formatRate } from "@/lib/data/lawyers";
import { JoinVideoButton } from "@/components/video/join-video-button";
import { ConsultationPaymentCard } from "@/components/citizen/consultation-payment-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Appointment Details | Citizen Portal | LegalEase",
};

export default async function CitizenAppointmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthState();
  if (!user) return null;

  const appt = await getAppointmentById(id, user.id);
  if (!appt || appt.citizen_id !== user.id) {
    notFound();
  }

  // Check if review exists for this appointment
  const supabase = await createClient();
  let hasReview = false;
  if (supabase) {
    const { data: rev } = await supabase
      .from("reviews")
      .select("id")
      .eq("appointment_id", appt.id)
      .maybeSingle();
    if (rev) hasReview = true;
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-300",
    confirmed: "bg-emerald-100 text-emerald-900 border-emerald-300",
    completed: "bg-blue-100 text-blue-900 border-blue-300",
    cancelled: "bg-slate-100 text-slate-700 border-slate-300",
    rejected: "bg-rose-100 text-rose-900 border-rose-300",
  };

  const isVideo = appt.consultation_type === "video";
  const isPhysical = appt.consultation_type === "in_person";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-[#0d2b43] -ml-2">
          <Link href="/citizen/appointments">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to All Consultations
          </Link>
        </Button>
      </div>

      {/* Mandatory Review Prompt if consultation completed and unreviewed */}
      {appt.status === "completed" && !hasReview && (
        <Card className="border-2 border-amber-400 bg-amber-50/70 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0">
                <Star className="size-5 fill-current" />
              </span>
              <div>
                <h4 className="font-heading text-sm font-bold text-amber-950">
                  Mandatory Citizen Feedback Required
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Your consultation has concluded. Please rate your experience (1–5 stars) with {appt.lawyer?.full_name} to finish the feedback process.
                </p>
              </div>
            </div>
            <AppointmentActions appointment={appt} hasReview={false} />
          </CardContent>
        </Card>
      )}

      {/* Escrow Payment Action Card for Accepted Video Consultations */}
      {appt.status === "confirmed" && isVideo && appt.payment_status !== "paid" && (
        <ConsultationPaymentCard appointment={appt} />
      )}

      {/* Main Header Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`capitalize font-bold text-xs ${statusColors[appt.status] || ""}`}>
                  {appt.status}
                </Badge>
                <span className="text-xs text-muted-foreground">Booking ID #{appt.id}</span>
              </div>
              <CardTitle className="font-heading text-xl text-[#0d2b43] mt-1">
                {appt.subject}
              </CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {appt.status === "confirmed" && isVideo && (
                <JoinVideoButton
                  appointmentId={appt.id}
                  appointmentDate={appt.appointment_date}
                  startTime={appt.start_time}
                  endTime={appt.end_time}
                  href={`/citizen/video/${appt.id}`}
                  paymentStatus={appt.payment_status}
                />
              )}
              <AppointmentActions appointment={appt} hasReview={hasReview} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Advocate Information */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#0d2b43] text-white">
                <User className="size-6 text-[#0fa176]" />
              </span>
              <div>
                <p className="font-heading text-sm font-bold text-[#0d2b43]">
                  {appt.lawyer?.full_name || "Advocate"}
                </p>
                <p className="text-xs text-slate-600">
                  {appt.lawyer_profile?.professional_title || "Advocate High Court"}
                </p>
                <p className="text-[11px] text-muted-foreground">{appt.lawyer?.email}</p>
              </div>
            </div>

            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href={`/citizen/lawyers/${appt.lawyer_id}`}>View Advocate Profile</Link>
            </Button>
          </div>

          {/* Time & Consultation Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-3.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Calendar className="size-4 text-[#0fa176]" />
                Scheduled Date
              </span>
              <p className="mt-1 font-heading text-sm font-bold text-[#0d2b43]">
                {appt.appointment_date}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Clock className="size-4 text-[#0fa176]" />
                Time Slot & Duration
              </span>
              <p className="mt-1 font-heading text-sm font-bold text-[#0d2b43]">
                {appt.start_time?.slice(0, 5)} - {appt.end_time?.slice(0, 5)}
              </p>
              <p className="text-[11px] text-[#0fa176] font-semibold mt-0.5">
                {appt.duration_minutes || 60} Minutes Allocated
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                {isPhysical && <Building2 className="size-4 text-[#0fa176]" />}
                {isVideo && <Video className="size-4 text-[#0fa176]" />}
                {!isPhysical && !isVideo && <Phone className="size-4 text-[#0fa176]" />}
                Consultation Mode
              </span>
              <p className="mt-1 font-heading text-sm font-bold text-[#0d2b43] capitalize">
                {isPhysical ? "Physical Chamber Visit" : isVideo ? "Encrypted Video Room" : "Phone Call"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isPhysical ? "In-Person Consultation" : "Browser-based Jitsi Meet"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
              <span className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-[#0fa176]" />
                  Fee & Escrow Status
                </span>
                <Badge variant="outline" className={`text-[10px] uppercase font-semibold ${
                  appt.payment_status === "paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : appt.payment_status === "waived"
                    ? "bg-blue-50 text-blue-700 border-blue-300"
                    : "bg-amber-50 text-amber-700 border-amber-300"
                }`}>
                  {appt.payment_status || "unpaid"}
                </Badge>
              </span>
              <p className="mt-1 font-heading text-sm font-bold text-[#0d2b43]">
                {isPhysical ? "Free (No Charge)" : formatRate(appt.total_amount || appt.consultation_fee)}
              </p>
              {isPhysical ? (
                <p className="text-[10px] text-[#0fa176] font-semibold mt-0.5">
                  Free Citizen Booking Policy
                </p>
              ) : appt.platform_fee ? (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Fee: {formatRate(appt.consultation_fee)} + Platform: {formatRate(appt.platform_fee)}
                </p>
              ) : null}
            </div>
          </div>

          {/* Office Address if In-Person */}
          {isPhysical && (
            <div className="rounded-xl border border-[#0fa176]/30 bg-[#0fa176]/10 p-4">
              <div className="flex items-start gap-2.5">
                <MapPin className="size-4.5 text-[#0fa176] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#0d2b43]">Meeting Location / Chamber Address</p>
                  <p className="text-xs text-slate-800 mt-0.5 font-medium">
                    {appt.lawyer_profile?.office_address || "Office Address specified on advocate profile"} ({appt.lawyer?.city || "Chamber"})
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Please arrive 5–10 minutes prior to your scheduled time slot. No payment or video link is required.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Video Session Security & Escrow Confirmation */}
          {isVideo && appt.payment_status === "paid" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Consultation Payment Secured in Escrow</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Your {appt.duration_minutes || 60}-minute video chamber is authorized and ready for your appointment window.
                  </p>
                </div>
              </div>
              {appt.status === "confirmed" && (
                <JoinVideoButton
                  appointmentId={appt.id}
                  appointmentDate={appt.appointment_date}
                  startTime={appt.start_time}
                  endTime={appt.end_time}
                  href={`/citizen/video/${appt.id}`}
                  paymentStatus={appt.payment_status}
                />
              )}
            </div>
          )}

          {/* Description & Citizen Notes */}
          <div className="space-y-4 border-t border-slate-200 pt-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description of Legal Matter
              </h4>
              <p className="mt-1.5 text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
                {appt.description || "No additional description provided."}
              </p>
            </div>

            {appt.citizen_notes && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Your Preparation Notes
                </h4>
                <p className="mt-1 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {appt.citizen_notes}
                </p>
              </div>
            )}

            {appt.lawyer_notes && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0fa176]">
                  Advocate Advice & Instructions
                </h4>
                <p className="mt-1 text-xs text-slate-800 bg-[#0fa176]/10 p-3.5 rounded-lg border border-[#0fa176]/20">
                  {appt.lawyer_notes}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
