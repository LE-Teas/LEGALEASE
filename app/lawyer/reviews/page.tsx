import { getAuthState } from "@/lib/auth/profile";
import { getLawyerReviews } from "@/lib/services/reviews";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReviewResponseActions } from "@/components/lawyer/review-response-actions";
import { Star, MessageSquare } from "lucide-react";

export const metadata = {
  title: "Client Reviews | Lawyer Portal",
  description: "View verified feedback and ratings submitted by your consultation clients.",
};

export default async function LawyerReviewsPage() {
  const { user } = await getAuthState();
  if (!user) return null;

  const reviews = await getLawyerReviews(user.id);

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1)
      : "0.0";

  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
    const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { stars, count, percentage };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Client Reviews & Ratings
        </h2>
        <p className="text-sm text-muted-foreground">
          Verified feedback submitted by citizens following completed consultations. You can post official replies or flag reviews for moderation.
        </p>
      </div>

      {/* Aggregate Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rating Score Card */}
        <Card className="border-border md:col-span-1 flex flex-col justify-center items-center p-6 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Overall Rating
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-heading text-5xl font-extrabold text-navy">{averageRating}</span>
            <span className="text-slate-400 text-lg">/ 5.0</span>
          </div>

          <div className="flex items-center gap-1 mt-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`size-5 ${
                  star <= Math.round(Number(averageRating))
                    ? "fill-gold text-gold"
                    : "fill-slate-100 text-slate-300"
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Based on {totalReviews} verified {totalReviews === 1 ? "review" : "reviews"}
          </p>
        </Card>

        {/* Rating Distribution Breakdown */}
        <Card className="border-border md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm text-navy font-bold">
              Rating Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of feedback scores across all completed sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {distribution.map(({ stars, count, percentage }) => (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 w-12 font-medium text-slate-700 shrink-0">
                  <span>{stars}</span>
                  <Star className="size-3 fill-gold text-gold" />
                </div>

                <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gold transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="w-12 text-right text-muted-foreground font-mono text-[11px]">
                  {count} ({percentage}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <div>
        <h3 className="font-heading text-lg font-bold text-navy mb-4">
          All Reviews ({totalReviews})
        </h3>

        {totalReviews === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <MessageSquare className="size-7" />
              </div>
              <h4 className="font-heading text-base font-bold text-navy">No Reviews Yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                When citizens complete consultations with you, they will be invited to leave a review and rating. Their genuine feedback will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => {
              const citizenName = r.citizen?.full_name || "Verified Client";
              const initials = citizenName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "CL";

              return (
                <Card key={r.id} className="border-border">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border border-border">
                          <AvatarImage src={r.citizen?.avatar_url || ""} alt={citizenName} />
                          <AvatarFallback className="bg-navy/10 text-navy font-bold text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-heading text-sm font-bold text-navy">{citizenName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString("en-PK", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`size-3.5 ${
                              star <= r.rating
                                ? "fill-gold text-gold"
                                : "fill-slate-100 text-slate-300"
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-xs font-bold text-slate-700 font-mono">
                          {r.rating}.0
                        </span>
                      </div>
                    </div>

                    {r.comment && (
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    )}

                    <ReviewResponseActions
                      reviewId={r.id}
                      initialResponse={r.lawyer_response}
                      initialFlagged={r.is_flagged}
                      initialFlagReason={r.flag_reason}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
