"use client";

import { useState } from "react";
import { Megaphone, Send, Users, Scale, User, CheckCircle2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { broadcastNotificationAction } from "@/app/actions/admin";

export function BroadcastNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<"all" | "citizen" | "lawyer">("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError("Please provide both a notification title and message body.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await broadcastNotificationAction(target, title, message);
      setSuccess(`Successfully dispatched notification to ${res.count} platform accounts.`);
      setTitle("");
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 1800);
    } catch (err: any) {
      setError(err?.message || "Failed to broadcast notification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs gap-1.5 shadow-xs">
          <Megaphone className="size-3.5" />
          Broadcast Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleBroadcast}>
          <DialogHeader>
            <DialogTitle className="font-heading text-base text-[#0A2843] flex items-center gap-2">
              <Megaphone className="size-4 text-[#0CA275]" />
              Platform-Wide Broadcast
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Transmit official platform announcements or system notices to registered user inboxes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Target Audience selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Recipient Audience</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTarget("all")}
                  className={`rounded-lg border p-2.5 text-left text-xs transition-colors flex flex-col items-center justify-center gap-1 ${
                    target === "all"
                      ? "border-[#0CA275] bg-[#ECFDF5] text-[#0A2843] font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Users className="size-4 text-slate-600" />
                  <span>All Users</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTarget("citizen")}
                  className={`rounded-lg border p-2.5 text-left text-xs transition-colors flex flex-col items-center justify-center gap-1 ${
                    target === "citizen"
                      ? "border-[#0CA275] bg-[#ECFDF5] text-[#0A2843] font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <User className="size-4 text-[#0CA275]" />
                  <span>Citizens Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTarget("lawyer")}
                  className={`rounded-lg border p-2.5 text-left text-xs transition-colors flex flex-col items-center justify-center gap-1 ${
                    target === "lawyer"
                      ? "border-[#0CA275] bg-[#ECFDF5] text-[#0A2843] font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Scale className="size-4 text-blue-600" />
                  <span>Advocates Only</span>
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="notifTitle" className="text-xs font-semibold text-slate-800">
                Notice Title
              </Label>
              <Input
                id="notifTitle"
                placeholder="e.g. Scheduled System Maintenance / Bar Council Updates"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <Label htmlFor="notifBody" className="text-xs font-semibold text-slate-800">
                Announcement Body
              </Label>
              <Textarea
                id="notifBody"
                rows={3}
                placeholder="Write the complete announcement details delivered to users' notification bells..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs gap-1.5"
            >
              <Send className="size-3.5" />
              {loading ? "Transmitting..." : "Send Announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
