"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Inbox, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailInboxControls() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const handleSyncImap = async () => {
    setSyncing(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_imap" }),
      });
      const data = await res.json();
      setStatusMessage({
        type: data.success ? "ok" : "err",
        text: data.message || "IMAP sync completed",
      });
      router.refresh();
    } catch {
      setStatusMessage({ type: "err", text: "Failed to sync IMAP inbox" });
    } finally {
      setSyncing(false);
    }
  };

  const handleReceiveTestInbound = async () => {
    setSimulating(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate_inbound",
          fromEmail: "citizen.client@legalease.pk",
          subject: "Consultation Payment & Schedule Inquiry",
          text: "Assalam-o-Alaikum, I have completed my Stripe Sandbox escrow payment and wanted to confirm my upcoming video consultation link.",
        }),
      });
      const data = await res.json();
      setStatusMessage({
        type: data.success ? "ok" : "err",
        text: data.message || "Inbound email received",
      });
      router.refresh();
    } catch {
      setStatusMessage({ type: "err", text: "Failed to receive test inbound email" });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncing}
          onClick={handleSyncImap}
          className="text-xs h-8 gap-1.5"
        >
          {syncing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5 text-[#0CA275]" />
          )}
          Sync IMAP Inbox
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={simulating}
          onClick={handleReceiveTestInbound}
          className="text-xs h-8 gap-1.5"
        >
          {simulating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Inbox className="size-3.5 text-navy" />
          )}
          Receive Test Inbound Email
        </Button>
      </div>

      {statusMessage && (
        <span
          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border ${
            statusMessage.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          {statusMessage.type === "ok" ? (
            <CheckCircle2 className="size-3.5 shrink-0" />
          ) : (
            <AlertCircle className="size-3.5 shrink-0" />
          )}
          {statusMessage.text}
        </span>
      )}
    </div>
  );
}

