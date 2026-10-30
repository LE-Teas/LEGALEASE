import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  FileCheck,
  FileText,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import {
  getOrCreateLawyerProfile,
  calculateProfileCompletion,
} from "@/lib/services/lawyer-portal";
import { getLawyerAppointments } from "@/lib/services/appointments";
import { getLawyerReviews } from "@/lib/services/reviews";
import { getLawyerEarnings } from "@/lib/services/payments";
import { getUserNotifications } from "@/lib/services/notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentDecisionButtons } from "@/components/lawyer/appointment-decision-buttons";
import { JoinVideoButton } from "@/components/video/join-video-button";
import { formatRate } from "@/lib/data/lawyers";

export const metadata = {
  title: "Lawyer Dashboard | LegalEase",
  description: "Overview of appointments, client requests, verification status, and consultation earnings.",
};

export default async function LawyerDashboardPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile) return null;

  const [lawyerProfile, appointments, reviews, earnings, notifications] = await Promise.all([
    getOrCreateLawyerProfile(user.id),
    getLawyerAppointments(user.id),
    getLawyerReviews(user.id),
    getLawyerEarnings(user.id),
    getUserNotifications(user.id),
  ]);

  if (!lawyerProfile) return null;

  const { percentage: profileCompletion, missingFields } = calculateProfileCompletion(
    lawyerProfile,
    profile
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  const todayAppointments = appointments.filter(
    (a) => a.appointment_date === todayStr && (a.status === "confirmed" || a.status === "pending")
  );
  const pendingRequests = appointments.filter((a) => a.status === "pending");
  const completedAppointments = appointments.filter((a) => a.status === "completed");
  const upcomingConsultations = appointments
    .filter((a) => a.status === "confirmed" && a.appointment_date >= todayStr)
    .slice(0, 5);
  const cancelledAppointments = appointments.filter(
    (a) => a.status === "cancelled" || a.status === "rejected"
  );

  const unreadNotificationsCount = notifications.filter((n) => !n.read_at).length;

  const isVerified = lawyerProfile.verification_status === "verified";
  const isPublished = lawyerProfile.is_published ?? true;
  const isEligibleForDiscovery = isVerified && isPublished && (profile.is_active ?? true);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  // Verification status banner configuration
  const verificationConfig: Record<
    string,
    { title: string; desc: string; badge: string; color: string; icon: React.ElementType }
  > = {
    verified: {
      title: "Verified Advocate — Bar Council Validated",
      desc: "Your Bar Council license is verified. You appear in citizen legal discovery and AI recommendations.",
      badge: "Verified Advocate",
      color: "bg-emerald-50 border-emerald-200 text-emerald-950",
      icon: BadgeCheck,
    },
    pending: {
      title: "Verification Under Administrator Review",
      desc: "Your Bar Council credentials have been received and are undergoing verification by compliance administrators.",
      badge: "Pending Review",
      color: "bg-amber-50 border-amber-200 text-amber-950",
      icon: Clock,
    },
    needs_info: {
      title: "Additional Verification Information Required",
      desc: "Platform compliance administrators have requested supplementary licensing documentation.",
      badge: "Action Required",
      color: "bg-orange-50 border-orange-200 text-orange-950",
      icon: AlertCircle,
    },
    rejected: {
      title: "Verification Rejected",
      desc: "Your bar council licence submission could not be verified. Please review feedback and resubmit.",
      badge: "Rejected",
      color: "bg-rose-50 border-rose-200 text-rose-950",
      icon: ShieldAlert,
    },
    not_submitted: {
      title: "Bar Council Verification Not Submitted",
      desc: "Submit your Bar Council licence number and certificate scan to earn the Verified Advocate badge and activate public discovery.",
      badge: "Not Submitted",
      color: "bg-slate-50 border-slate-200 text-slate-800",
      icon: ShieldCheck,
    },
  };

  const vStatus =
    verificationConfig[lawyerProfile.verification_status] || verificationConfig.not_submitted;
  const VIcon = vStatus.icon;

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Links */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-navy sm:text-3xl">
              {greeting}, {profile.full_name}
            </h2>
            {isVerified && (
              <Badge variant="secondary" className="gap-1 bg-teal-soft text-teal text-xs">
                <BadgeCheck className="size-3.5 text-teal" />
                Verified
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Advocate Portal • {lawyerProfile.professional_title || "Advocate High Court"} • {lawyerProfile.city || "Pakistan"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 text-xs">
            <Link href="/lawyer/availability">Manage Hours</Link>
          </Button>
          <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 text-xs">
            <Link href="/lawyer/documents">Chamber Documents</Link>
          </Button>
          <Button asChild className="bg-navy text-white hover:bg-navy/90 text-xs font-semibold">
            <Link href="/lawyer/profile/edit">Edit Chamber Profile</Link>
          </Button>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 ${vStatus.color}`}>
        <div className="flex items-start gap-3.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white shadow-xs shrink-0">
            <VIcon className="size-5 text-teal" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-bold">{vStatus.title}</h3>
              <Badge variant="outline" className="bg-white text-[10px] font-semibold">
                {vStatus.badge}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed opacity-90 max-w-2xl">
              {vStatus.desc}
            </p>
          </div>
        </div>

        {lawyerProfile.verification_status !== "verified" ? (
          <Button asChild size="sm" className="bg-navy text-white hover:bg-navy/90 text-xs shrink-0">
            <Link href="/lawyer/verification">
              {lawyerProfile.verification_status === "not_submitted" ? "Submit Licence" : "View Status & Notes"}
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="bg-white text-xs shrink-0">
            <Link href="/lawyer/verification">Licence Details</Link>
          </Button>
        )}
      </div>

      {/* Real Statistics Metric Cards (6 KPI Grid) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link href="/lawyer/appointments" className="block transition-transform hover:-translate-y-0.5">
          <Card className="border-border hover:border-teal/50 h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Today&apos;s Sessions
                </span>
                <Calendar className="size-4 text-teal" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-heading text-2xl font-bold text-navy">
                  {todayAppointments.length}
                </span>
                <span className="text-[11px] text-muted-foreground">scheduled</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/lawyer/appointments" className="block transition-transform hover:-translate-y-0.5">
          <Card className={`border hover:border-amber-400 h-full ${pendingRequests.length > 0 ? "border-amber-300 bg-amber-50/20" : "border-border"}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Pending Requests
                </span>
                <Clock className="size-4 text-amber-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-heading text-2xl font-bold text-navy">
                  {pendingRequests.length}
                </span>
                <span className="text-[11px] text-muted-foreground">awaiting review</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/lawyer/appointments" className="block transition-transform hover:-translate-y-0.5">
          <Card className="border-border hover:border-emerald-400 h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Completed
                </span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-heading text-2xl font-bold text-navy">
                  {completedAppointments.length}
                </span>
                <span className="text-[11px] text-muted-foreground">sessions</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/lawyer/reviews" className="block transition-transform hover:-translate-y-0.5">
          <Card className="border-border hover:border-gold/50 h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Average Rating
                </span>
                <Star className="size-4 fill-gold text-gold" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-heading text-2xl font-bold text-navy">
                  {Number(lawyerProfile.rating || 0).toFixed(1)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ({lawyerProfile.review_count || 0})
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/lawyer/earnings" className="block transition-transform hover:-translate-y-0.5">
          <Card className="border-border hover:border-teal/50 h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Settled Fees
                </span>
                <Wallet className="size-4 text-teal" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-bold text-navy">
                  {formatRate(earnings.paidAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/lawyer/notifications" className="block transition-transform hover:-translate-y-0.5">
          <Card className={`border hover:border-navy/40 h-full ${unreadNotificationsCount > 0 ? "border-teal/40 bg-teal-soft/10" : "border-border"}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Unread Alerts
                </span>
                <Bell className="size-4 text-teal" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-heading text-2xl font-bold text-navy">
                  {unreadNotificationsCount}
                </span>
                <span className="text-[11px] text-muted-foreground">notifications</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Grid: Consultations, Schedule & Chamber Status */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols) */}
        <div className="space-y-8 lg:col-span-2">
          {/* New Appointment Requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <CardTitle className="font-heading text-lg text-navy">
                  New Consultation Requests
                </CardTitle>
                <CardDescription className="text-xs">
                  Respond to citizens requesting legal counsel
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {pendingRequests.length} pending
              </Badge>
            </CardHeader>
            <CardContent className="p-5">
              {pendingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No pending consultation requests at the moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/30 p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-heading text-sm font-bold text-navy">
                            {appt.citizen?.full_name || "Citizen Client"}
                          </p>
                          <Badge variant="outline" className="bg-white text-[10px] capitalize">
                            {appt.consultation_type.replace("_", " ")}
                          </Badge>
                          {appt.legal_category && (
                            <Badge variant="outline" className="text-[10px] text-teal border-teal/30 bg-white">
                              {appt.legal_category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-700">{appt.subject}</p>
                        {appt.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{appt.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                          <span className="flex items-center gap-1 font-semibold">
                            <Calendar className="size-3 text-teal" />
                            {appt.appointment_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-teal" />
                            {appt.start_time} - {appt.end_time}
                          </span>
                          <span className="font-bold text-navy">{formatRate(appt.consultation_fee)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-slate-600">
                          <Link href={`/lawyer/appointments/${appt.id}`}>Details</Link>
                        </Button>
                        <AppointmentDecisionButtons appointmentId={appt.id} status="pending" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Schedule & Upcoming Consultations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <CardTitle className="font-heading text-lg text-navy">
                  Confirmed Upcoming Consultations
                </CardTitle>
                <CardDescription className="text-xs">
                  Next scheduled client sessions ({todayStr})
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-teal hover:text-navy text-xs">
                <Link href="/lawyer/appointments">All ({appointments.length})</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              {upcomingConsultations.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No upcoming confirmed consultations scheduled.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingConsultations.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal">
                            {appt.appointment_date} • {appt.start_time?.slice(0, 5)} - {appt.end_time?.slice(0, 5)}
                          </span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {appt.consultation_type.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs font-bold text-navy">{appt.citizen?.full_name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{appt.subject}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {appt.status === "confirmed" && appt.consultation_type === "video" && (
                          <JoinVideoButton
                            appointmentId={appt.id}
                            appointmentDate={appt.appointment_date}
                            startTime={appt.start_time}
                            endTime={appt.end_time}
                            href={`/lawyer/video/${appt.id}`}
                          />
                        )}
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                          <Link href={`/lawyer/appointments/${appt.id}`}>Workspace</Link>
                        </Button>
                        <AppointmentDecisionButtons appointmentId={appt.id} status={appt.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consultation Outcomes Summary Bar */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm text-navy font-bold">
                Consultation Outcomes Overview
              </CardTitle>
              <CardDescription className="text-xs">
                Aggregate breakdown across all booking history ({appointments.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="font-heading text-lg font-bold text-emerald-800">
                    {completedAppointments.length}
                  </span>
                  <p className="text-[10px] text-emerald-700 font-medium">Completed</p>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="font-heading text-lg font-bold text-blue-800">
                    {upcomingConsultations.length}
                  </span>
                  <p className="text-[10px] text-blue-700 font-medium">Upcoming</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="font-heading text-lg font-bold text-amber-800">
                    {pendingRequests.length}
                  </span>
                  <p className="text-[10px] text-amber-700 font-medium">Pending</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-heading text-lg font-bold text-slate-700">
                    {cancelledAppointments.length}
                  </span>
                  <p className="text-[10px] text-slate-600 font-medium">Cancelled/Declined</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Profile Completion, Visibility & Reviews (1 Col) */}
        <div className="space-y-8">
          {/* Chamber Profile Status & Visibility */}
          <Card className="border-border">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-base text-navy">
                    Chamber Profile Status
                  </CardTitle>
                  <CardDescription className="text-xs">Public discovery readiness</CardDescription>
                </div>
                <span className="font-heading font-bold text-teal text-sm">
                  {profileCompletion}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-teal transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>

              {/* Discovery status pill */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs border border-slate-200">
                <span className="text-muted-foreground">Directory Visibility:</span>
                <Badge
                  className={`text-[10px] font-semibold ${
                    isEligibleForDiscovery
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  }`}
                >
                  {isEligibleForDiscovery ? "Live in Search" : "Paused"}
                </Badge>
              </div>

              {missingFields.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Recommended steps to complete:</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {missingFields.slice(0, 3).map((f) => (
                      <li key={f} className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Add {f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  Your profile meets all discovery criteria!
                </div>
              )}

              <Button asChild size="sm" className="w-full bg-navy text-white hover:bg-navy/90 text-xs">
                <Link href="/lawyer/profile/edit">Update Chamber Details</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Earnings & Financial Overview Card */}
          <Card className="border-border">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading text-base text-navy">Earnings & Fees</CardTitle>
                <CardDescription className="text-xs">Direct consultation revenue</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs text-teal hover:text-navy">
                <Link href="/lawyer/earnings">Ledger</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Realized Payouts:</span>
                <span className="font-heading font-bold text-navy text-sm">
                  {formatRate(earnings.paidAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending Settlements:</span>
                <span className="font-heading font-bold text-amber-600 text-sm">
                  {formatRate(earnings.pendingAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-muted-foreground">Consultation Fee:</span>
                <span className="font-medium text-slate-800">
                  {formatRate(lawyerProfile.consultation_fee)} / {lawyerProfile.consultation_duration} mins
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Reviews Card */}
          <Card className="border-border">
            <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading text-base text-navy">Client Feedback</CardTitle>
                <CardDescription className="text-xs">From completed consultations</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs text-teal hover:text-navy">
                <Link href="/lawyer/reviews">All ({reviews.length})</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {reviews.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No client reviews received yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-navy">{r.citizen?.full_name}</p>
                        <div className="flex items-center text-gold">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="size-3 fill-gold" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}