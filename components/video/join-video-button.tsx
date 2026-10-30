"use client";

import Link from "next/link";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JoinVideoButtonProps {
  appointmentId: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string;       // HH:MM or HH:MM:SS
  endTime: string;         // HH:MM or HH:MM:SS
  href: string;
  paymentStatus?: string;
}

function isWithinWindow(date: string, start: string, end: string): boolean {
  if (process.env.NEXT_PUBLIC_VIDEO_SKIP_TIME_CHECK === "true") return true;
  const now = new Date();
  const windowStart = new Date(`${date}T${start}`);
  windowStart.setMinutes(windowStart.getMinutes() - 15);
  const windowEnd = new Date(`${date}T${end}`);
  windowEnd.setMinutes(windowEnd.getMinutes() + 30);
  return now >= windowStart && now <= windowEnd;
}

export function JoinVideoButton({
  appointmentDate,
  startTime,
  endTime,
  href,
  paymentStatus,
}: JoinVideoButtonProps) {
  // If payment status is provided and not paid, keep button locked
  if (paymentStatus && paymentStatus !== "paid") {
    return (
      <span
        className="inline-flex"
        title="Video chamber access unlocks once client payment is confirmed in LegalEase escrow."
      >
        <Button
          size="sm"
          className="h-8 bg-slate-200 text-slate-500 hover:bg-slate-200 text-xs font-semibold cursor-not-allowed border border-slate-300"
          disabled
        >
          <Video className="mr-1.5 size-3.5 text-slate-400" />
          Locked (Payment Required)
        </Button>
      </span>
    );
  }

  const active = isWithinWindow(appointmentDate, startTime, endTime);

  if (active) {
    return (
      <Button
        asChild
        size="sm"
        className="h-8 bg-[#0fa176] hover:bg-[#0fa176]/90 text-white text-xs font-semibold shadow-xs"
      >
        <Link href={href}>
          <Video className="mr-1.5 size-3.5" />
          Join Video Consultation
        </Link>
      </Button>
    );
  }

  return (
    <span
      className="inline-flex"
      title={`Video room opens 15 minutes before your appointment (${startTime?.slice(0, 5)}) and stays available 30 minutes after end (${endTime?.slice(0, 5)}).`}
    >
      <Button
        size="sm"
        className="h-8 bg-[#0fa176]/50 text-white text-xs font-semibold cursor-not-allowed"
        disabled
      >
        <Video className="mr-1.5 size-3.5" />
        Join Video Consultation
      </Button>
    </span>
  );
}
