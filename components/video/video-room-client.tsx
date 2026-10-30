"use client";

import { useEffect, useState, useCallback } from "react";
import { getErrorMessage } from "@/lib/errors";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  Lock,
  ShieldCheck,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { JitsiRoom } from "@/components/video/jitsi-room";

interface VideoRoomClientProps {
  appointmentId: string;
  backHref: string;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  otherPartyName?: string;
}

type Phase = "pre-call" | "in-call" | "ended";

export function VideoRoomClient({
  appointmentId,
  backHref,
  appointmentDate,
  startTime,
  endTime,
  otherPartyName,
}: VideoRoomClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("pre-call");
  const [roomName, setRoomName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("Participant");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/video/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to access video room");
      setRoomName(data.roomName);
      setDisplayName(data.displayName || "Participant");
      if (data.durationMinutes) {
        setDurationMinutes(data.durationMinutes);
      }
      setPhase("in-call");
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = useCallback(() => {
    setPhase("ended");
    setRoomName(null);
  }, []);

  if (phase === "in-call" && roomName) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#0d2b43] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Appointment
          </Link>
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
            <ShieldCheck className="size-3.5" />
            <span className="font-semibold">Encrypted Session Active ({durationMinutes}m)</span>
          </div>
        </div>
        <JitsiRoom
          roomName={roomName}
          displayName={displayName}
          appointmentId={appointmentId}
          durationMinutes={durationMinutes}
          onLeave={handleLeave}
        />
        <p className="text-center text-xs text-muted-foreground">
          Leaving the video room does <strong>not</strong> automatically complete your appointment.
          The lawyer must mark the appointment as completed separately.
        </p>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="max-w-md mx-auto space-y-6 py-12 text-center">
        <div className="flex justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-navy/10">
            <Video className="size-8 text-navy" />
          </span>
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold text-navy">Session Ended</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You have left the video consultation. Your appointment record has not been changed.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={requestToken} className="bg-navy text-white hover:bg-navy/90">
            <Video className="mr-2 size-4" />
            Rejoin Session
          </Button>
          <Button asChild variant="outline">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 size-4" />
              Back to Appointment
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Pre-call screen
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-navy -ml-2">
          <Link href={backHref}>
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Appointment
          </Link>
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <span className="flex size-16 items-center justify-center rounded-full bg-navy text-white">
                <Video className="size-8" />
              </span>
            </div>
            <h2 className="font-heading text-2xl font-bold text-navy">
              Video Consultation
            </h2>
            {otherPartyName && (
              <p className="text-sm text-muted-foreground">
                with <span className="font-semibold text-slate-700">{otherPartyName}</span>
              </p>
            )}
          </div>

          {/* Appointment info */}
          {(appointmentDate || startTime) && (
            <div className="flex items-center justify-center gap-6 py-3 border-y border-slate-100">
              {appointmentDate && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Calendar className="size-4 text-teal" />
                  <span>{appointmentDate}</span>
                </div>
              )}
              {startTime && endTime && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Clock className="size-4 text-teal" />
                  <span>{startTime?.slice(0, 5)} – {endTime?.slice(0, 5)}</span>
                </div>
              )}
            </div>
          )}

          {/* Security notice */}
          <div className="rounded-xl bg-navy/5 border border-navy/10 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-navy shrink-0" />
              <span className="text-xs font-bold text-navy">Secure & Private</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1 ml-6 list-disc">
              <li>End-to-end encrypted video session via Jitsi Meet</li>
              <li>No recording by LegalEase unless explicitly enabled</li>
              <li>Unique room generated for this appointment only</li>
              <li>Leaving the session does not mark appointment as completed</li>
            </ul>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={requestToken}
            disabled={loading}
            className="w-full bg-navy text-white hover:bg-navy/90 font-semibold py-5"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Video className="mr-2 size-5" />
                Join Video Consultation
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
