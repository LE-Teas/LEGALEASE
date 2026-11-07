import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CalendarClock,
  Clock,
  Compass,
  FilePlus2,
  FileText,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { getCitizenAppointments } from "@/lib/services/appointments";
import { getCitizenDocuments } from "@/lib/services/documents";
import { getUserNotifications } from "@/lib/services/notifications";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JoinVideoButton } from "@/components/video/join-video-button";

export const metadata = {
  title: "Citizen Dashboard | LegalEase",
};

export default async function CitizenDashboardPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile) return null;

  const firstName = profile.full_name ? profile.full_name.split(" ")[0] : "Citizen";

  // Fetch real data in parallel
  const [appointments, documents, notifications] = await Promise.all([
    getCitizenAppointments(user.id),
    getCitizenDocuments(user.id),
    getUserNotifications(user.id),
  ]);

  // Fetch recent AI conversations
  const supabase = await createClient();
  let conversations: { id: string; title: string; updated_at: string }[] = [];
  if (supabase) {
    const { data: convData } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(4);
    if (convData) conversations = convData;
  }

  // Filter upcoming consultations (confirmed or pending, sorted soonest)
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingAppointments = appointments
    .filter((a) => (a.status === "confirmed" || a.status === "pending") && a.appointment_date >= todayStr)
    .slice(0, 3);

  const unratedCompletedAppointments = appointments.filter(
    (a) => a.status === "completed" && !a.rating_submitted
  );

  // Time-of-day greeting
  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Mandatory Post-Consultation Rating Banner */}
      {unratedCompletedAppointments.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                <Star className="size-5 fill-white" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm font-bold text-amber-950">
                    Mandatory Consultation Feedback Required ({unratedCompletedAppointments.length})
                  </p>
                  <Badge className="bg-amber-600 text-white text-[10px]">Action Required</Badge>
                </div>
                <p className="mt-0.5 text-xs text-amber-900">
                  Please submit your mandatory 1–5 star rating for your completed consultation with{" "}
                  <span className="font-semibold">
                    {unratedCompletedAppointments[0].lawyer?.full_name || "Advocate"}
                  </span>{" "}
                  ({unratedCompletedAppointments[0].subject}) to finalize consultation feedback records.
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="shrink-0 bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold"
            >
              <Link href={`/citizen/appointments/${unratedCompletedAppointments[0].id}`}>
                <Star className="mr-1.5 size-3.5" />
                Submit Rating Now
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            {timeGreeting}, {firstName}
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            How can LegalEase assist your legal needs today?
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="bg-teal hover:bg-teal-hover text-white">
            <Link href="/citizen/ai-assistant">
              <Sparkles className="mr-2 size-4" />
              Ask Legal AI
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5">
            <Link href="/citizen/lawyers">
              <Search className="mr-2 size-4" />
              Find a Lawyer
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/citizen/ai-assistant" className="group">
          <Card className="h-full border-teal/30 bg-teal-soft/20 transition-all hover:-translate-y-0.5 hover:border-teal/60 hover:shadow-md">
            <CardContent className="flex flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-teal text-white">
                  <Sparkles className="size-5" />
                </span>
                <Badge className="bg-navy text-white text-[10px]">Instant</Badge>
              </div>
              <div className="mt-4">
                <p className="font-heading font-semibold text-navy group-hover:text-teal">
                  Ask Legal AI
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Grounded legal answers with cited statutory Pakistani laws.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/citizen/lawyers" className="group">
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-navy/40 hover:shadow-md">
            <CardContent className="flex flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-navy text-white">
                  <Users className="size-5" />
                </span>
                <Badge variant="outline" className="text-[10px]">Verified</Badge>
              </div>
              <div className="mt-4">
                <p className="font-heading font-semibold text-navy group-hover:text-navy/80">
                  Find a Lawyer
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Search by practice area, nearby location, and transparent fees.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/citizen/documents/generate" className="group">
          <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-navy/40 hover:shadow-md">
            <CardContent className="flex flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
                  <FilePlus2 className="size-5" />
                </span>
                <Badge variant="outline" className="text-[10px]">Templates</Badge>
              </div>
              <div className="mt-4">
                <p className="font-heading font-semibold text-navy group-hover:text-navy/80">
                  Generate Document
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create formal notices, affidavits, undertakings, and agreements.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* FYP 1 Core Modules Banner */}
      <div className="rounded-2xl border border-teal/30 bg-mint/30 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-teal text-white text-[10px]">FYP 1 Core Suite</Badge>
              <h3 className="font-heading text-lg font-bold text-navy">
                Legal Intelligence & Citizen Services
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Statutory procedural roadmaps, grounded AI legal assistance, and automated document generation.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Link href="/citizen/navigator" className="group">
            <Card className="h-full border-border bg-white transition hover:-translate-y-0.5 hover:border-teal hover:shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="grid size-8 place-items-center rounded-lg bg-teal/10 text-teal">
                    <Compass className="size-4" />
                  </span>
                  <Badge variant="outline" className="text-[10px] text-teal border-teal/40">Step-by-Step</Badge>
                </div>
                <h4 className="mt-3 font-heading text-sm font-bold text-navy group-hover:text-teal">
                  Action Navigator
                </h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Structured procedural roadmap, statutory timelines, and court checklist.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/citizen/documents/generate" className="group">
            <Card className="h-full border-border bg-white transition hover:-translate-y-0.5 hover:border-teal hover:shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="grid size-8 place-items-center rounded-lg bg-teal/10 text-teal">
                    <FileText className="size-4" />
                  </span>
                  <Badge variant="outline" className="text-[10px] text-navy border-navy/20">Templates</Badge>
                </div>
                <h4 className="mt-3 font-heading text-sm font-bold text-navy group-hover:text-teal">
                  Document Generator
                </h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Generate formal notices, affidavits, undertakings, and rental agreements.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/citizen/ai-assistant" className="group">
            <Card className="h-full border-border bg-white transition hover:-translate-y-0.5 hover:border-teal hover:shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="grid size-8 place-items-center rounded-lg bg-teal/10 text-teal">
                    <Sparkles className="size-4" />
                  </span>
                  <Badge variant="outline" className="text-[10px] text-teal border-teal/30">File / Non-File</Badge>
                </div>
                <h4 className="mt-3 font-heading text-sm font-bold text-navy group-hover:text-teal">
                  RAG Legal AI
                </h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Grounded queries across Pakistan Code & private document confirmation.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols) */}
        <div className="space-y-8 lg:col-span-2">
          {/* Upcoming Consultations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 pb-4">
              <div>
                <CardTitle className="font-heading text-lg text-navy">
                  Upcoming Consultations
                </CardTitle>
                <CardDescription className="text-xs">
                  Your scheduled meetings with verified advocates
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-teal hover:text-navy text-xs">
                <Link href="/citizen/appointments">View all ({appointments.length})</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              {upcomingAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <CalendarClock className="size-6" />
                  </div>
                  <p className="mt-3 font-heading text-sm font-semibold text-navy">
                    No upcoming consultations
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    You have no scheduled consultations. Browse verified lawyers to book an in-person, video, or phone session.
                  </p>
                  <Button asChild size="sm" className="mt-4 bg-navy text-white hover:bg-navy/90">
                    <Link href="/citizen/lawyers">
                      <Search className="mr-1.5 size-3.5" />
                      Find a Lawyer
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50/80"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-heading text-sm font-bold text-navy">
                            {appt.lawyer?.full_name || "Advocate"}
                          </p>
                          <Badge
                            variant={appt.status === "confirmed" ? "default" : "secondary"}
                            className={
                              appt.status === "confirmed"
                                ? "bg-emerald-600 text-white text-[10px]"
                                : "bg-amber-100 text-amber-900 text-[10px]"
                            }
                          >
                            {appt.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{appt.subject}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5 text-teal" />
                            {appt.appointment_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5 text-teal" />
                            {appt.start_time} - {appt.end_time}
                          </span>
                          <span className="capitalize text-slate-500">
                            • {appt.consultation_type.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
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
                        <Button asChild size="sm" variant="outline" className="text-xs">
                          <Link href={`/citizen/appointments/${appt.id}`}>View Details</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent AI Conversations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 pb-4">
              <div>
                <CardTitle className="font-heading text-lg text-navy">
                  Recent AI Legal Sessions
                </CardTitle>
                <CardDescription className="text-xs">
                  Review prior questions answered from the verified legal knowledge base
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-teal hover:text-navy text-xs">
                <Link href="/citizen/ai-assistant">Open Assistant</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-teal-soft text-teal">
                    <MessageSquare className="size-6" />
                  </div>
                  <p className="mt-3 font-heading text-sm font-semibold text-navy">
                    No conversations yet
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Ask your first question about rent laws, inheritance, family matters, or FIR procedures.
                  </p>
                  <Button asChild size="sm" className="mt-4 bg-teal hover:bg-teal-hover text-white">
                    <Link href="/citizen/ai-assistant">
                      <Sparkles className="mr-1.5 size-3.5" />
                      Ask LegalEase AI
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {conversations.map((conv) => (
                    <Link
                      key={conv.id}
                      href={`/citizen/ai-assistant?id=${conv.id}`}
                      className="group flex flex-col justify-between rounded-xl border border-slate-200 p-4 transition-all hover:border-teal/50 hover:bg-teal-soft/20"
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="mt-0.5 size-4 shrink-0 text-teal" />
                        <p className="font-heading text-xs font-semibold text-navy line-clamp-2 group-hover:text-teal">
                          {conv.title}
                        </p>
                      </div>
                      <span className="mt-3 text-[10px] text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-8">
          {/* Recent Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 pb-4">
              <div>
                <CardTitle className="font-heading text-base text-navy">
                  Legal Documents
                </CardTitle>
                <CardDescription className="text-xs">Your drafted and generated forms</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-teal hover:text-navy text-xs">
                <Link href="/citizen/documents">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {documents.length === 0 ? (
                <div className="py-6 text-center">
                  <FileText className="mx-auto size-8 text-slate-300" />
                  <p className="mt-2 text-xs font-medium text-slate-600">No documents generated</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Draft legal notices, undertakings, or affidavits in minutes.
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-3 text-xs">
                    <Link href="/citizen/documents/generate">Create Document</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.slice(0, 4).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2.5"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate text-xs font-semibold text-navy">{doc.title}</p>
                        <p className="text-[10px] capitalize text-muted-foreground">{doc.template_type.replace("_", " ")}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Important Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 pb-4">
              <div>
                <CardTitle className="font-heading text-base text-navy">
                  Notifications
                </CardTitle>
                <CardDescription className="text-xs">Updates and consultation alerts</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-teal hover:text-navy text-xs">
                <Link href="/citizen/notifications">All</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  All caught up! No new notifications.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 3).map((n) => (
                    <div key={n.id} className="space-y-0.5 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                      <p className="text-xs font-semibold text-navy">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.created_at).toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
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
