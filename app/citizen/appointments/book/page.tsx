import { notFound } from "next/navigation";
import { getAuthState } from "@/lib/auth/profile";
import { searchLawyers, getLawyerDetails } from "@/lib/services/lawyers";
import { AppointmentBookingClient } from "@/components/citizen/appointment-booking-client";

export const metadata = {
  title: "Book Consultation | Citizen Portal | LegalEase",
  description: "Schedule a physical or video legal consultation with verified advocates across Pakistan.",
};

interface BookPageProps {
  searchParams?: Promise<{ lawyerId?: string; date?: string }>;
}

export default async function CitizenAppointmentBookingPage({ searchParams }: BookPageProps) {
  const { user } = await getAuthState();
  if (!user) return notFound();

  const resolvedParams = searchParams ? await searchParams : {};
  const lawyers = await searchLawyers({ sort: "recommended" });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Book an Advocate Consultation
        </h2>
        <p className="text-sm text-muted-foreground">
          Select verified legal counsel, check open chamber hours, and schedule an in-person or video consultation.
        </p>
      </div>

      <AppointmentBookingClient
        initialLawyers={lawyers}
        selectedLawyerId={resolvedParams.lawyerId}
        preselectedDate={resolvedParams.date}
      />
    </div>
  );
}

