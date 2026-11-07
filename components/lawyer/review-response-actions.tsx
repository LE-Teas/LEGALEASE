"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, MessageSquareReply, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/errors";

interface ReviewResponseActionsProps {
  reviewId: string;
  initialResponse?: string | null;
  initialFlagged?: boolean;
  initialFlagReason?: string | null;
}

export function ReviewResponseActions({
  reviewId,
  initialResponse = null,
  initialFlagged = false,
  initialFlagReason = null,
}: ReviewResponseActionsProps) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [responseText, setResponseText] = useState(initialResponse || "");
  const [flagReason, setFlagReason] = useState(initialFlagReason || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          lawyerResponse: responseText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save response.");
      setReplyOpen(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          isFlagged: true,
          flagReason: flagReason.trim() || "Flagged by advocate for compliance review.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to flag review.");
      setFlagOpen(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      {initialResponse && !replyOpen && (
        <div className="rounded-lg border border-teal/20 bg-emerald-50/50 p-3 space-y-1">
          <p className="text-[11px] font-bold text-[#0d2b43]">
            Your Official Advocate Response:
          </p>
          <p className="text-xs text-slate-700 whitespace-pre-wrap">
            {initialResponse}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setReplyOpen(!replyOpen);
              setFlagOpen(false);
            }}
            className="h-7 text-[11px]"
          >
            <MessageSquareReply className="mr-1.5 size-3 text-[#0fa176]" />
            {initialResponse ? "Edit Reply" : "Reply Publicly"}
          </Button>

          {!initialFlagged ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFlagOpen(!flagOpen);
                setReplyOpen(false);
              }}
              className="h-7 text-[11px] text-slate-500 hover:text-rose-600"
            >
              <Flag className="mr-1 size-3" />
              Flag for Moderation
            </Button>
          ) : (
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
              <Flag className="mr-1 size-2.5" />
              Flagged for Admin Review
            </Badge>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {replyOpen && (
        <form onSubmit={handleSaveReply} className="space-y-2 rounded-lg bg-slate-50 p-3 border border-slate-200">
          <Textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={2}
            placeholder="Write a professional public response to this client review..."
            className="text-xs bg-white"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReplyOpen(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !responseText.trim()}
              size="sm"
              className="h-7 bg-[#0d2b43] text-white text-xs"
            >
              <Send className="mr-1 size-3 text-[#0fa176]" />
              {saving ? "Posting..." : "Post Reply"}
            </Button>
          </div>
        </form>
      )}

      {flagOpen && (
        <form onSubmit={handleFlag} className="space-y-2 rounded-lg bg-rose-50/50 p-3 border border-rose-200">
          <Textarea
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            rows={2}
            placeholder="Specify why this review violates platform guidelines (e.g., abusive language or factually inaccurate)..."
            className="text-xs bg-white"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFlagOpen(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
            >
              {saving ? "Submitting..." : "Submit Flag to Admin"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

