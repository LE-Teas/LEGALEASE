"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import { MessageSquare, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { respondSupportTicketAction } from "@/app/actions/admin";
import type { SupportTicket } from "@/lib/types/legal";

export function SupportTicketDialog({ ticket }: { ticket: SupportTicket }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<
    "open" | "in_progress" | "resolved" | "closed"
  >(ticket.status);
  const [adminResponse, setAdminResponse] = useState(
    ticket.admin_response || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await respondSupportTicketAction({
        ticketId: ticket.id,
        status,
        adminResponse,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to update support ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
          <MessageSquare className="size-3 text-[#0CA275]" />
          Respond
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-base text-[#0A2843]">
            Support Ticket: {ticket.subject}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Submitted by {ticket.user?.full_name || "User"} ({ticket.role}) •{" "}
            {new Date(ticket.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {error && (
            <div className="rounded bg-rose-50 border border-rose-200 p-2 text-rose-800">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              User Inquiry ({ticket.category})
            </span>
            <p className="text-slate-800 whitespace-pre-line leading-relaxed">
              {ticket.description}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Ticket Status</Label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as
                    | "open"
                    | "in_progress"
                    | "resolved"
                    | "closed"
                )
              }
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">
              Administrator Resolution / Response (Sent via In-App & SMTP Email)
            </Label>
            <Textarea
              rows={4}
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              required
              placeholder="Write your official support response..."
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Sending...
                </>
              ) : (
                "Save & Notify User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

