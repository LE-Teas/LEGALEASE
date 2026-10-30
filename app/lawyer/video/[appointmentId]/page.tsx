import { notFound } from "next/navigation";
import { getAuthState } from "@/lib/auth/profile";
import { getAppointmentById } from "@/lib/services/appointments";
import { VideoRoomClient } from "@/components/video/video-room-client";

interface PageProps {
  params: Promise<{ appointmentId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { appointmentId } = await params;
  return {
    title: `Video Consultation | Lawyer Portal | LegalEase`,
    description: `Join your video consultation for appointment ${appointmentId}`,
  };
}

export default async function LawyerVideoRoomPage({ params }: PageProps) {
  const { appointmentId } = await params;
  const { user } = await getAuthState();
  if (!user) return null;

  const appt = await getAppointmentById(appointmentId, user.id);
  if (!appt || appt.lawyer_id !== user.id) {
    notFound();
  }

  if (appt.consultation_type !== "video") {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <VideoRoomClient
        appointmentId={appointmentId}
        backHref={`/lawyer/appointments/${appointmentId}`}
        appointmentDate={appt.appointment_date}
        startTime={appt.start_time}
        endTime={appt.end_time}
        otherPartyName={appt.citizen?.full_name || "Your Client"}
      />
    </div>
  );
}
