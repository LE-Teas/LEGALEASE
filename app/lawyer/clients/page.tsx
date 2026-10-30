import Link from "next/link";
import { getAuthState } from "@/lib/auth/profile";
import { getLawyerClients } from "@/lib/services/lawyer-portal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Calendar,
  Clock,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
} from "lucide-react";

export const metadata = {
  title: "My Clients | Lawyer Portal",
  description: "Manage client relationships and consultation records on LegalEase.",
};

export default async function LawyerClientsPage() {
  const { user } = await getAuthState();
  if (!user) return null;

  const clients = await getLawyerClients(user.id);

  const activeClientsCount = clients.filter((c) => Boolean(c.upcoming_consultation_date)).length;
  const totalConsultations = clients.reduce((acc, c) => acc + c.consultation_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
            My Clients
          </h2>
          <p className="text-sm text-muted-foreground">
            Citizens who have scheduled or completed legal consultations with you.
          </p>
        </div>

        <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5">
          <Link href="/lawyer/appointments">
            <CalendarCheck className="mr-2 size-4 text-teal" />
            View All Consultations
          </Link>
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Unique Clients</p>
              <p className="font-heading text-2xl font-bold text-navy mt-1">{clients.length}</p>
            </div>
            <div className="size-10 rounded-full bg-navy/10 flex items-center justify-center text-navy">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Clients with Upcoming Sessions</p>
              <p className="font-heading text-2xl font-bold text-teal mt-1">{activeClientsCount}</p>
            </div>
            <div className="size-10 rounded-full bg-teal-soft flex items-center justify-center text-teal">
              <Calendar className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Consultations Held</p>
              <p className="font-heading text-2xl font-bold text-gold mt-1">{totalConsultations}</p>
            </div>
            <div className="size-10 rounded-full bg-amber-50 flex items-center justify-center text-gold">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Directory */}
      {clients.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <Users className="size-7" />
            </div>
            <h3 className="font-heading text-lg font-bold text-navy">No Clients Yet</h3>
            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6">
              When citizens book consultations through your profile, their client profile and consultation history will securely appear here.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild className="bg-navy text-white hover:bg-navy/90 text-xs">
                <Link href="/lawyer/availability">Set Your Available Hours</Link>
              </Button>
              <Button asChild variant="outline" className="text-xs">
                <Link href="/lawyer/profile/edit">Enhance Public Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((client) => {
            const initials = client.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "CL";

            return (
              <Card key={client.citizen_id} className="border-border hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-11 border border-border">
                        <AvatarImage src={client.avatar_url || ""} alt={client.full_name} />
                        <AvatarFallback className="bg-navy text-white font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="font-heading text-base font-bold text-navy leading-tight">
                          {client.full_name}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] mt-1 text-teal border-teal/30 bg-teal-soft/30">
                          {client.consultation_count} {client.consultation_count === 1 ? "Session" : "Sessions"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-slate-600">
                    {client.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Last consultation:</span>
                      <span className="font-medium text-slate-800">
                        {new Date(client.last_consultation_date).toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {client.upcoming_consultation_date && (
                      <div className="flex justify-between text-teal pt-1 border-t border-slate-200/60 font-semibold">
                        <span>Upcoming:</span>
                        <span>
                          {new Date(client.upcoming_consultation_date).toLocaleDateString("en-PK", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-navy hover:text-navy hover:bg-slate-100 justify-between"
                  >
                    <Link href={`/lawyer/appointments`}>
                      <span>View Appointments</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
