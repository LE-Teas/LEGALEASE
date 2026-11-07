"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { AppointmentMessage } from "@/lib/types/legal";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

interface AppointmentMessagesCardProps {
  appointmentId: string;
  currentUserId: string;
  counterpartyName: string;
}

export function AppointmentMessagesCard({
  appointmentId,
  currentUserId,
  counterpartyName,
}: AppointmentMessagesCardProps) {
  const [messages, setMessages] = useState<AppointmentMessage[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(
      `/api/appointments/messages?appointmentId=${encodeURIComponent(appointmentId)}`,
      { cache: "no-store" }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { messages?: AppointmentMessage[] } | null) => {
        if (active && data?.messages) {
          setMessages(data.messages);
        }
      })
      .catch(() => {
        /* ignore */
      });

    // Realtime subscription for incoming messages
    const supabase = createClient();
    if (!supabase) return () => { active = false; };

    const channel = supabase
      .channel(`realtime:messages:${appointmentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointment_messages",
          filter: `appointment_id=eq.${appointmentId}`,
        },
        (payload) => {
          const newMsg = payload.new as AppointmentMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [appointmentId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          message: content.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message.");
      }

      setMessages((prev) => [...prev, data.message]);
      setContent("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-heading text-base text-[#0d2b43] flex items-center gap-2">
            <MessageSquare className="size-4.5 text-[#0fa176]" />
            Consultation Messages & Case Follow-Up
          </CardTitle>
          <CardDescription className="text-xs">
            Direct communication thread with {counterpartyName} for pre-session documents, chamber instructions, and follow-up clarifications
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[10px] border-[#0fa176]/30 text-[#0fa176] bg-emerald-50">
          SMTP + In-App Alerted
        </Badge>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="max-h-72 overflow-y-auto space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          {messages.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              No messages exchanged yet. Send a message below to coordinate with {counterpartyName}.
            </p>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs ${
                      isMine
                        ? "bg-[#0d2b43] text-white"
                        : "bg-white border border-slate-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold ${
                          isMine ? "text-[#0fa176]" : "text-[#0d2b43]"
                        }`}
                      >
                        {isMine ? "You" : m.sender?.full_name || counterpartyName}
                      </span>
                      <span
                        className={`text-[10px] ${
                          isMine ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {new Date(m.created_at).toLocaleString("en-PK", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {m.message || m.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error && (
          <p className="text-xs text-rose-600">{error}</p>
        )}

        <form onSubmit={handleSend} className="flex items-end gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            placeholder={`Write a message to ${counterpartyName}...`}
            className="text-xs flex-1 resize-none"
          />
          <Button
            type="submit"
            disabled={sending || !content.trim()}
            className="bg-[#0fa176] hover:bg-[#0c8863] text-white text-xs h-10 shrink-0"
          >
            <Send className="mr-1.5 size-3.5" />
            {sending ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
