import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Phone,
  User,
  Video,
  XCircle,
  Star,
  ShieldCheck,
} from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { getAppointmentById } from "@/lib/services/appointments";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentDecisionButtons } from "@/components/lawyer/appointment-decision-buttons";
import { JoinVideoButton } from "@/components/video/join-video-button";
import { ConsultationNotesCard } from "@/components/lawyer/consultation-notes-card";

export const metadata = {
  title: "Appointment Details | Lawyer Portal | LegalEase",
};

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-800 border-rose-200", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-600 border-slate-200", icon: XCircle },
};

function formatConsultType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function LawyerAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await getAuthState();
  if (!user || !profile) return null;

  const appointment = await getAppointmentById(id, user.id);
  if (!appointment) notFound();

  // Fetch review if completed
  const supabase = await createClient();
  let review: any = null;
  if (supabase) {
    const { data: rev } = await supabase
      .from("reviews")
      .select("*, citizen:profiles!reviews_citizen_id_fkey(full_name)")
      .eq("appointment_id", appointment.id)
      .maybeSingle();
    review = rev;
  }

  const status = statusConfig[appointment.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const citizen = appointment.citizen;

  const ConsultIcon =
    appointment.consultation_type === "video"
      ? Video
      : appointment.consultation_type === "phone"
      ? Phone
      : MapPin;

  const isVideo = appointment.consultation_type === "video";
  const isPhysical = appointment.consultation_type === "in_person";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/lawyer/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#0d2b43] transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Appointments
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[#0d2b43]">
            Appointment Details
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Consultation with {citizen?.full_name || "Client"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={`${status.color} border text-sm px-3 py-1`}>
            <StatusIcon className="mr-1.5 size-4" />
            {status.label}
          </Badge>
          {appointment.status === "confirmed" && isVideo && (
            <JoinVideoButton
              appointmentId={appointment.id}
              appointmentDate={appointment.appointment_date}
              startTime={appointment.start_time}
              endTime={appointment.end_time}
              href={`/lawyer/video/${appointment.id}`}
              paymentStatus={appointment.payment_status}
            />
          )}
          {(appointment.status === "pending" || appointment.status === "confirmed") && (
            <AppointmentDecisionButtons
              appointmentId={appointment.id}
              status={appointment.status}
              consultationType={appointment.consultation_type}
              paymentStatus={appointment.payment_status}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[#0d2b43]">
              <User className="size-5 text-[#0fa176]" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Name" value={citizen?.full_name || "—"} />
            <InfoRow label="Email" value={citizen?.email || "—"} />
            <InfoRow label="Phone" value={citizen?.phone || "Not provided"} />
            <InfoRow label="City" value={citizen?.city || "Not provided"} />
          </CardContent>
        </Card>

        {/* Consultation Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[#0d2b43]">
              <Calendar className="size-5 text-[#0fa176]" />
              Consultation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Date"
              value={new Date(appointment.appointment_date + "T00:00:00").toLocaleDateString(
                "en-PK",
                { weekday: "long", month: "long", day: "numeric", year: "numeric" }
              )}
            />
            <InfoRow
              label="Time & Duration"
              value={`${appointment.start_time?.slice(0, 5)} – ${appointment.end_time?.slice(0, 5)} (${appointment.duration_minutes || 60} mins)`}
            />
            <InfoRow
              label="Type"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <ConsultIcon className="size-3.5 text-[#0fa176]" />
                  {formatConsultType(appointment.consultation_type)}
                </span>
              }
            />
            <InfoRow
              label="Consultation Fee"
              value={
                isPhysical
                  ? "Free (Physical Booking)"
                  : `Rs. ${Number(appointment.consultation_fee || 0).toLocaleString()}`
              }
            />
            <InfoRow
              label="Payment / Escrow"
              value={
                <Badge
                  variant="outline"
                  className={`text-xs capitalize font-semibold ${
                    appointment.payment_status === "paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : appointment.payment_status === "waived"
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }`}
                >
                  {appointment.payment_status === "paid"
                    ? "Paid in Escrow"
                    : appointment.payment_status === "waived"
                    ? "Free / Waived"
                    : "Awaiting Client Payment"}
                </Badge>
              }
            />
            {appointment.settlement_status && (
              <InfoRow
                label="Commission Settlement"
                value={
                  <Badge variant="outline" className="text-xs uppercase">
                    {appointment.settlement_status}
                  </Badge>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Video Chamber Banner for Confirmed Video Consultations */}
        {appointment.status === "confirmed" && isVideo && (
          <Card className="border-emerald-300 bg-emerald-50/40 lg:col-span-2">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#0fa176] text-white shrink-0">
                  <Video className="size-5" />
                </span>
                <div>
                  <h3 className="font-heading text-sm font-bold text-emerald-950">
                    Encrypted Video Consultation Room Ready ({appointment.duration_minutes || 60}m)
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {appointment.payment_status === "paid"
                      ? `Client payment verified in escrow. Video room opens 15 mins prior to appointment.`
                      : `Awaiting client escrow payment before room access is unlocked.`}
                  </p>
                </div>
              </div>
              <JoinVideoButton
                appointmentId={appointment.id}
                appointmentDate={appointment.appointment_date}
                startTime={appointment.start_time}
                endTime={appointment.end_time}
                href={`/lawyer/video/${appointment.id}`}
                paymentStatus={appointment.payment_status}
              />
            </CardContent>
          </Card>
        )}

        {/* In-Person Chamber Notice */}
        {isPhysical && (
          <Card className="border-slate-200 bg-slate-50/50 lg:col-span-2">
            <CardContent className="p-4 flex items-center gap-3 text-xs text-slate-700">
              <MapPin className="size-4.5 text-[#0fa176] shrink-0" />
              <div>
                <strong>In-Person Chamber Consultation:</strong> Scheduled at your designated chamber address (
                {appointment.lawyer_profile?.office_address || "Office Address on Profile"}). The client will visit your chamber. No video room or commission fee applies.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Rating & Feedback (if completed and reviewed) */}
        {review && (
          <Card className="lg:col-span-2 border border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-[#0d2b43]">
                <Star className="size-4.5 text-amber-500 fill-amber-500" />
                Client Review & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`size-4 ${
                        s <= review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-[#0d2b43]">{review.rating} / 5 Stars</span>
                <span className="text-xs text-muted-foreground ml-2">
                  by {review.citizen?.full_name || "Client"}
                </span>
              </div>
              {review.comment ? (
                <p className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-slate-200 italic">
                  "{review.comment}"
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No written comment provided.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Subject & Description */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[#0d2b43]">
              <FileText className="size-5 text-[#0fa176]" />
              Client Intake & Legal Matter Brief
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Subject</p>
              <p className="text-sm font-semibold text-slate-900">
                {appointment.subject || "Legal Consultation"}
              </p>
            </div>
            {appointment.legal_category && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Practice Category</p>
                <Badge variant="outline" className="text-xs text-[#0fa176] border-[#0fa176]/30 bg-[#0fa176]/10 font-semibold">
                  {appointment.legal_category}
                </Badge>
              </div>
            )}
            {appointment.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Matter Description</p>
                <div className="rounded-lg bg-slate-50 p-3.5 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-200">
                  {appointment.description}
                </div>
              </div>
            )}
            {appointment.citizen_notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Client Shared Notes / Context</p>
                <div className="rounded-lg bg-amber-50/50 border border-amber-200 p-3 text-xs text-amber-950 leading-relaxed">
                  {appointment.citizen_notes}
                </div>
              </div>
            )}
            {appointment.early_completion_reason && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Early Completion Note / Summary</p>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-950 leading-relaxed">
                  {appointment.early_completion_reason}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Private Lawyer Consultation Notes */}
        <div className="lg:col-span-2">
          <ConsultationNotesCard
            appointmentId={appointment.id}
            initialNotes={appointment.lawyer_notes}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}
