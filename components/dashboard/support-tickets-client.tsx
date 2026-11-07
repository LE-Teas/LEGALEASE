"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, LifeBuoy, Plus, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { SupportTicket } from "@/lib/types/legal";
import { getErrorMessage } from "@/lib/errors";

interface SupportTicketsClientProps {
  initialTickets: SupportTicket[];
  roleLabel: "Citizen" | "Advocate";
}

export function SupportTicketsClient({
  initialTickets,
  roleLabel,
}: SupportTicketsClientProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit support ticket.");
      }

      setTickets((prev) => [data.ticket, ...prev]);
      setSubject("");
      setDescription("");
      setSuccessMsg("Your support ticket has been submitted. Our compliance & support desk will respond shortly.");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "resolved":
      case "closed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "in_progress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-amber-50 text-amber-800 border-amber-200";
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left: Submit New Support Ticket */}
      <Card className="border-slate-200 lg:col-span-1">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="font-heading text-base text-[#0d2b43] flex items-center gap-2">
            <LifeBuoy className="size-4.5 text-[#0fa176]" />
            Open a Support Ticket
          </CardTitle>
          <CardDescription className="text-xs">
            Submit a formal inquiry or dispute to the LegalEase Administration Desk
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                {successMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`Brief summary of your ${roleLabel.toLowerCase()} inquiry...`}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                >
                  <option value="general">General Help</option>
                  <option value="booking">Consultation Booking</option>
                  <option value="payment">Escrow / Refund / Fee</option>
                  <option value="verification">Bar Licence / Account</option>
                  <option value="technical">Video Room / Technical</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Priority</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high" | "urgent")}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Detailed Message</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
                placeholder="Include any relevant Booking Reference ID, transaction reference, or details..."
                className="text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || !subject.trim() || !description.trim()}
              className="w-full bg-[#0d2b43] hover:bg-[#0d2b43]/90 text-white text-xs h-10"
            >
              {submitting ? (
                "Submitting Ticket..."
              ) : (
                <>
                  <Send className="mr-1.5 size-3.5 text-[#0fa176]" />
                  Submit Support Ticket
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Right: Ticket History & Admin Responses */}
      <Card className="border-slate-200 lg:col-span-2">
        <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-heading text-base text-[#0d2b43]">
              Your Support Tickets ({tickets.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Track live status updates and official responses from LegalEase Support
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] border-[#0fa176]/30 text-[#0fa176] bg-emerald-50">
            Email & In-App Notified
          </Badge>
        </CardHeader>
        <CardContent className="p-5">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Plus className="size-8 text-slate-300" />
              <p className="mt-2 font-heading text-sm font-semibold text-[#0d2b43]">
                No support tickets submitted
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                If you need assistance with a consultation, escrow payment, or account verification, submit a ticket on the left.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] capitalize font-semibold ${statusColor(t.status)}`}>
                        {t.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {t.category}
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        #{t.id.slice(0, 8)}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="size-3" />
                      {new Date(t.created_at).toLocaleDateString("en-PK", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-heading text-sm font-bold text-[#0d2b43]">
                      {t.subject}
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">
                      {t.description || t.message}
                    </p>
                  </div>

                  {t.admin_response && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 space-y-1">
                      <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        Official Admin Desk Response
                      </p>
                      <p className="text-xs text-emerald-950 whitespace-pre-wrap">
                        {t.admin_response}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
