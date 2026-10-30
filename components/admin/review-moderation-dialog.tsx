"use client";

import { useState } from "react";
import { Star, Eye, EyeOff, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { moderateReviewAction } from "@/app/actions/admin";

interface ReviewRecord {
  id: string;
  rating: number;
  comment: string;
  is_visible: boolean;
  moderated_at?: string | null;
  created_at: string;
  citizen: {
    full_name: string;
    email?: string | null;
  };
  lawyer: {
    full_name: string;
    city?: string | null;
  };
}

export function ReviewModerationDialog({ review }: { review: ReviewRecord }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleModeration = async (targetVisibility: boolean) => {
    if (!targetVisibility && !reason.trim()) {
      setError("Please specify a moderation reason for hiding this client feedback.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await moderateReviewAction(review.id, targetVisibility, reason);
      setOpen(false);
      setReason("");
    } catch (err: any) {
      setError(err?.message || "Failed to update review moderation status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs h-7 border-slate-200">
          Moderate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-3.5 ${
                    i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                  }`}
                />
              ))}
              <span className="font-bold text-xs text-slate-800 ml-1">{review.rating} / 5</span>
            </div>
            <Badge
              variant="outline"
              className={
                review.is_visible
                  ? "bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]"
                  : "bg-rose-50 text-rose-700 border-rose-200 text-[10px]"
              }
            >
              {review.is_visible ? "Published" : "Hidden by Moderator"}
            </Badge>
          </div>

          <DialogTitle className="font-heading text-base text-[#0A2843] pt-1">
            Review Moderation: {review.lawyer?.full_name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            By {review.citizen?.full_name} on {new Date(review.created_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Comment quote box */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Citizen Feedback
            </span>
            <p className="text-slate-800 italic leading-relaxed">
              &ldquo;{review.comment}&rdquo;
            </p>
          </div>

          {/* Reason input */}
          <div className="space-y-1.5">
            <Label htmlFor="modReason" className="text-xs font-semibold text-slate-800">
              Moderation Reason (Required when hiding · Recorded in Audit Trail)
            </Label>
            <Textarea
              id="modReason"
              rows={2}
              placeholder="e.g. Violation of moderation policy (inappropriate language, off-topic, or verified defamatory claim)."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs bg-white"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          {review.is_visible ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={loading || !reason.trim()}
              onClick={() => handleModeration(false)}
              className="text-xs gap-1.5"
            >
              <EyeOff className="size-3.5" />
              {loading ? "Hiding..." : "Hide from Public"}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={() => handleModeration(true)}
              className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs gap-1.5"
            >
              <Eye className="size-3.5" />
              {loading ? "Restoring..." : "Restore & Publish"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
