import Link from "next/link";
import { getAuthState } from "@/lib/auth/profile";
import { getLawyerAppointments } from "@/lib/services/appointments";
import { LawyerAppointmentsListView } from "@/components/lawyer/appointments-list-view";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export const metadata = {
  title: "Consultation Appointments | Lawyer Portal | LegalEase",
  description: "Review, accept, manage, and conduct consultations with prospective clients across Pakistan.",
};

export default async function LawyerAppointmentsPage() {
  const { user } = await getAuthState();
  if (!user) return null;

  const appointments = await getLawyerAppointments(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
            Consultations & Bookings
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your client appointments, pending intake requests, and session outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 text-xs">
            <Link href="/lawyer/availability">
              <Clock className="mr-1.5 size-3.5 text-teal" />
              Adjust Chamber Hours
            </Link>
          </Button>
        </div>
      </div>

      <LawyerAppointmentsListView initialAppointments={appointments} />
    </div>
  );
}
