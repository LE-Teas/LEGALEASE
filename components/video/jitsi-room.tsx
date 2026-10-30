"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, PhoneOff, Maximize2, Minimize2, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JitsiRoomProps {
  roomName: string;
  displayName: string;
  appointmentId?: string;
  durationMinutes?: number;
  onLeave?: () => void;
}

interface JitsiApiInstance {
  dispose: () => void;
  addEventListeners: (listeners: Record<string, unknown>) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (
      domain: string,
      options: Record<string, unknown>
    ) => JitsiApiInstance;
  }
}

export function JitsiRoom({ roomName, displayName, appointmentId, durationMinutes = 60, onLeave }: JitsiRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApiInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // Server-authoritative timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(durationMinutes * 60);
  const [warningLevel, setWarningLevel] = useState<"normal" | "warning" | "critical" | "expired">("normal");
  const [isExpired, setIsExpired] = useState(false);

  const handleLeave = useCallback(() => {
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }
    onLeave?.();
  }, [onLeave]);

  // Server-authoritative timer sync
  useEffect(() => {
    if (!appointmentId) return;

    const fetchTimer = async () => {
      try {
        const res = await fetch(`/api/consultation/timer?appointmentId=${appointmentId}`);
        const data = await res.json();
        if (data && typeof data.remainingSeconds === "number") {
          setRemainingSeconds(data.remainingSeconds);
          setWarningLevel(data.warningLevel);
          setIsExpired(data.isExpired);
        }
      } catch {
        // Fallback to local decrement if server call fails temporarily
      }
    };

    fetchTimer();
    const serverPollInterval = setInterval(fetchTimer, 10000); // Poll server every 10s

    const tickInterval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) {
          setIsExpired(true);
          setWarningLevel("expired");
        } else if (next <= 300) {
          setWarningLevel("critical");
        } else if (next <= 600) {
          setWarningLevel("warning");
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(serverPollInterval);
      clearInterval(tickInterval);
    };
  }, [appointmentId, durationMinutes]);

  useEffect(() => {
    // Load Jitsi script once
    const scriptId = "jitsi-external-api";
    const loadApi = () => {
      if (!containerRef.current) return;
      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: containerRef.current,
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          disableInviteFunctions: true,
          enableClosePage: false,
          toolbarButtons: [
            "microphone",
            "camera",
            "hangup",
            "chat",
            "settings",
            "raisehand",
            "tileview",
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_ALWAYS_VISIBLE: true,
          MOBILE_APP_PROMO: false,
        },
        width: "100%",
        height: "100%",
      });

      api.addEventListeners({
        videoConferenceJoined: () => setLoading(false),
        readyToClose: handleLeave,
        videoConferenceLeft: handleLeave,
      });

      apiRef.current = api;
    };

    if (window.JitsiMeetExternalAPI) {
      loadApi();
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = loadApi;
      document.head.appendChild(script);
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, displayName, handleLeave]);

  // Format remaining seconds into HH:MM:SS or MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      className={`relative flex flex-col bg-[#0d2b43] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
        fullscreen ? "fixed inset-0 z-50 rounded-none" : "w-full h-[620px]"
      }`}
    >
      {/* Top Header Bar with Server-Authoritative Timer & Status */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0d2b43] backdrop-blur-sm border-b border-white/10 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#0fa176] animate-pulse" />
          <span className="text-xs font-semibold text-white/90 tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-[#0fa176]" />
            Encrypted Video Consultation · LegalEase
          </span>
        </div>

        {/* Server-Controlled Timer Display */}
        <div className="flex items-center gap-2">
          {warningLevel === "expired" ? (
            <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-500/50 text-rose-200 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              <Clock className="size-3.5 text-rose-400" />
              <span>Time Expired ({durationMinutes}m booked)</span>
            </div>
          ) : warningLevel === "critical" ? (
            <div className="flex items-center gap-1.5 bg-rose-900/60 border border-rose-400/50 text-rose-100 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              <AlertTriangle className="size-3.5 text-rose-400" />
              <span>5 Min Warning · Remaining: {formatTime(remainingSeconds)}</span>
            </div>
          ) : warningLevel === "warning" ? (
            <div className="flex items-center gap-1.5 bg-amber-900/60 border border-amber-400/50 text-amber-100 px-3 py-1 rounded-full text-xs font-bold">
              <Clock className="size-3.5 text-amber-400" />
              <span>10 Min Warning · Remaining: {formatTime(remainingSeconds)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/90 px-3 py-1 rounded-full text-xs font-medium">
              <Clock className="size-3.5 text-[#0fa176]" />
              <span>Session Time Remaining: <strong className="text-white font-mono">{formatTime(remainingSeconds)}</strong></span>
            </div>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs px-3 bg-rose-600 hover:bg-rose-700"
            onClick={handleLeave}
          >
            <PhoneOff className="mr-1.5 size-3.5" />
            Leave Room
          </Button>
        </div>
      </div>

      {/* Floating Notice if Expired */}
      {isExpired && (
        <div className="bg-rose-700/90 text-white text-xs px-4 py-2 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-white" />
            <span>
              <strong>Allocated consultation duration has concluded.</strong> Please conclude your consultation. The advocate will mark the appointment completed.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] bg-white text-rose-700 hover:bg-white/90 border-none"
            onClick={handleLeave}
          >
            Finish Consultation
          </Button>
        </div>
      )}

      {/* IFrame mount point */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d2b43] z-10">
            <Loader2 className="size-8 text-[#0fa176] animate-spin mb-3" />
            <p className="text-sm text-white/70">Connecting to secure encrypted chamber…</p>
            <p className="text-xs text-white/40 mt-1">Authorized for {displayName}</p>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
