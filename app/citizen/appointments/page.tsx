import Link from "next/link";
import {
  Building2,
  Calendar,
  CalendarClock,
  Clock,
  Phone,
  Search,
  Video,
} from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { getCitizenAppointments } from "@/lib/services/appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentActions } from "@/components/citizen/appointment-actions";
import { JoinVideoButton } from "@/components/video/join-video-button";
import { formatRate } from "@/lib/data/lawyers";
import type { Appointment } from "@/lib/types/legal";

export const metadata = {
  title: "My Appointments | Citizen Portal",
  description: "Manage your legal consultations, upcoming sessions, and review completed appointments.",
};

export default async function CitizenAppointmentsPage() {
  const { user } = await getAuthState();
  if (!user) return null;

  const appointments = await getCitizenAppointments(user.id);
  const todayStr = new Date().toISOString().slice(0, 10);

  const upcoming = appointments.filter(
    (a) => (a.status === "confirmed" || a.status === "pending") && a.appointment_date >= todayStr
  );
  const pending = appointments.filter((a) => a.status === "pending");
  const completed = appointments.filter((a) => a.status === "completed");
  const cancelled = appointments.filter((a) => a.status === "cancelled" || a.status === "rejected");

  const renderAppointmentCard = (appt: Appointment) => {
    const statusColors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-900 border-amber-200",
      confirmed: "bg-emerald-100 text-emerald-900 border-emerald-200",
      completed: "bg-blue-100 text-blue-900 border-blue-200",
      cancelled: "bg-slate-100 text-slate-700 border-slate-200",
      rejected: "bg-rose-100 text-rose-900 border-rose-200",
    };

    return (
      <Card key={appt.id} className="overflow-hidden border-border/80 transition-all hover:shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`capitalize font-semibold text-xs ${statusColors[appt.status] || ""}`}>
                  {appt.status}
                </Badge>
                <span className="text-xs text-muted-foreground">• Ref #{appt.id.slice(0, 8)}</span>
              </div>

              <div>
                <h4 className="font-heading text-base font-bold text-navy">
                  {appt.lawyer?.full_name || "Advocate"}
                </h4>
                <p className="text-xs text-slate-600 font-medium">
                  {appt.lawyer_profile?.professional_title || "Advocate High Court"} · {appt.legal_category || "General"}
                </p>
                <p className="mt-1 text-xs text-navy font-semibold">{appt.subject}</p>
                {appt.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{appt.description}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-teal" />
                  {appt.appointment_date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5 text-teal" />
                  {appt.start_time} - {appt.end_time}
                </span>
                <span className="flex items-center gap-1 capitalize">
                  {appt.consultation_type === "in_person" && <Building2 className="size-3.5 text-teal" />}
                  {appt.consultation_type === "video" && <Video className="size-3.5 text-teal" />}
                  {appt.consultation_type === "phone" && <Phone className="size-3.5 text-teal" />}
                  {appt.consultation_type.replace("_", " ")}
                  {appt.consultation_type === "video" && appt.duration_minutes && (
                    <span className="text-[11px] text-muted-foreground font-normal">
                      ({appt.duration_minutes} min)
                    </span>
                  )}
                </span>
                <span className="font-bold text-navy">
                  {appt.consultation_type === "in_person" ? (
                    <span className="text-[#0fa176]">Free</span>
                  ) : (
                    formatRate(appt.consultation_fee)
                  )}
                </span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-0 pt-3 sm:pt-0">
              {appt.status === "confirmed" && appt.consultation_type === "video" && (
                <JoinVideoButton
                  appointmentId={appt.id}
                  appointmentDate={appt.appointment_date}
                  startTime={appt.start_time}
                  endTime={appt.end_time}
                  href={`/citizen/video/${appt.id}`}
                  paymentStatus={appt.payment_status}
                />
              )}
              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <Link href={`/citizen/appointments/${appt.id}`}>Details</Link>
              </Button>
              <AppointmentActions appointment={appt} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = (message: string) => (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <CalendarClock className="size-6" />
      </div>
      <p className="mt-3 font-heading text-sm font-semibold text-navy">{message}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Find and schedule a verified advocate to review contracts, obtain legal advice, or represent you.
      </p>
      <Button asChild size="sm" className="mt-4 bg-navy text-white hover:bg-navy/90 text-xs">
        <Link href="/citizen/lawyers">
          <Search className="mr-1.5 size-3.5" />
          Find a Lawyer
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
            Consultation Bookings
          </h2>
          <p className="text-sm text-muted-foreground">
            View upcoming consultations, pending requests, and consultation history.
          </p>
        </div>
        <Button asChild className="bg-navy text-white hover:bg-navy/90">
          <Link href="/citizen/lawyers">
            <Search className="mr-2 size-4" />
            Book New Consultation
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="upcoming" className="text-xs">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Pending Requests ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs">
            Cancelled ({cancelled.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcoming.length === 0 ? renderEmptyState("No upcoming consultations scheduled.") : upcoming.map(renderAppointmentCard)}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pending.length === 0 ? renderEmptyState("No pending consultation requests awaiting lawyer approval.") : pending.map(renderAppointmentCard)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completed.length === 0 ? renderEmptyState("No completed consultations yet.") : completed.map(renderAppointmentCard)}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelled.length === 0 ? renderEmptyState("No cancelled consultations.") : cancelled.map(renderAppointmentCard)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
