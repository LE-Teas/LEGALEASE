"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { useRouter } from "next/navigation";
import { Loader2, Star, Trash2 } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Appointment } from "@/lib/types/legal";

interface AppointmentActionsProps {
  appointment: Appointment;
  hasReview?: boolean;
}

export function AppointmentActions({ appointment, hasReview = false }: AppointmentActionsProps) {
  const router = useRouter();

  // Cancel State
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Review State
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/appointments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          status: "cancelled",
          notes: cancelReason.trim() || "Cancelled by citizen.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      setCancelOpen(false);
      router.refresh();
    } catch (err) {
      setCancelError(getErrorMessage(err) || "Failed to cancel consultation");
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setReviewError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");
      setReviewOpen(false);
      router.refresh();
    } catch (err) {
      setReviewError(getErrorMessage(err) || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const canCancel = appointment.status === "pending" || appointment.status === "confirmed";
  const canReview = appointment.status === "completed" && !hasReview && !appointment.rating_submitted;

  return (
    <div className="flex items-center gap-2">
      {canCancel && (
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
              Cancel Consultation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading text-lg text-navy">
                Cancel Consultation
              </DialogTitle>
              <DialogDescription className="text-xs">
                Are you sure you want to cancel your consultation for {appointment.appointment_date} with {appointment.lawyer?.full_name}?
              </DialogDescription>
            </DialogHeader>

            {cancelError && (
              <Alert variant="destructive">
                <AlertDescription>{cancelError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 py-2">
              <Label htmlFor="cancel-reason" className="text-xs font-semibold text-slate-700">
                Reason for Cancellation (Shared with Advocate)
              </Label>
              <Textarea
                id="cancel-reason"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Schedule conflict, matter resolved, or need to reschedule..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
                Keep Appointment
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                Yes, Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {canReview && (
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 bg-gold text-white hover:bg-gold/90 font-semibold text-xs">
              <Star className="mr-1.5 size-3.5 fill-navy-dark" />
              Leave Review
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading text-lg text-navy">
                Review Consultation
              </DialogTitle>
              <DialogDescription className="text-xs">
                Rate your consultation experience with {appointment.lawyer?.full_name}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
              {reviewError && (
                <Alert variant="destructive">
                  <AlertDescription>{reviewError}</AlertDescription>
                </Alert>
              )}

              {/* Star selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Rating (1 to 5 Stars)</Label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`size-6 ${
                          star <= rating
                            ? "fill-gold text-gold"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-navy">{rating} / 5</span>
                </div>
              </div>

              {/* Feedback comment */}
              <div className="space-y-1.5">
                <Label htmlFor="review-comment" className="text-xs font-semibold text-slate-700">
                  Written Feedback (Optional)
                </Label>
                <Textarea
                  id="review-comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details on the advocate's clarity, responsiveness, and legal guidance..."
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewOpen(false)}
                  disabled={submittingReview}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-[#0d2b43] text-white hover:bg-[#0d2b43]/90 font-semibold"
                >
                  {submittingReview ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Rating"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
