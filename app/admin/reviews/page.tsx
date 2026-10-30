import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Star, ShieldAlert, CheckCircle2, Search, Filter, MessageSquare, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReviewModerationDialog } from "@/components/admin/review-moderation-dialog";

export const metadata: Metadata = {
  title: "Reviews & Feedback Moderation | LegalEase Admin",
  description: "Investigate consultation feedback, enforce review guidelines, and protect platform ratings integrity.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; rating?: string }>;
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const { status, search, rating } = await searchParams;
  const supabase = await createClient();

  let reviews: any[] = [];
  let visibleCount = 0;
  let hiddenCount = 0;
  let totalRatingSum = 0;

  if (supabase) {
    let query = supabase
      .from("reviews")
      .select(`
        id,
        rating,
        comment,
        is_visible,
        moderated_at,
        created_at,
        citizen:profiles!reviews_citizen_id_fkey(full_name, email),
        lawyer:profiles!reviews_lawyer_id_fkey(full_name, city)
      `)
      .order("created_at", { ascending: false });

    if (status === "visible") {
      query = query.eq("is_visible", true);
    } else if (status === "hidden") {
      query = query.eq("is_visible", false);
    }

    if (rating) {
      query = query.eq("rating", Number(rating));
    }

    const { data } = await query;
    if (data) {
      reviews = data;
      data.forEach((r) => {
        if (r.is_visible) visibleCount++;
        else hiddenCount++;
        totalRatingSum += Number(r.rating) || 0;
      });

      if (search && search.trim()) {
        const q = search.toLowerCase();
        reviews = reviews.filter(
          (r) =>
            r.comment?.toLowerCase().includes(q) ||
            r.citizen?.full_name?.toLowerCase().includes(q) ||
            r.lawyer?.full_name?.toLowerCase().includes(q)
        );
      }
    }
  }

  const avgRating = reviews.length > 0 ? (totalRatingSum / reviews.length).toFixed(1) : "5.0";
  const activeTab = status || "all";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <Star className="size-6 text-[#0CA275] fill-[#0CA275]" />
            Reviews & Ratings Moderation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ensure authentic client feedback after completed consultations. Inappropriate content may be hidden with traceable reasons.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-lg bg-[#ECFDF5] border border-[#0CA275]/30 px-3 py-1 font-semibold text-[#0CA275]">
            ★ {avgRating} Platform Average
          </span>
          <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            {reviews.length} Total Reviews
          </span>
        </div>
      </div>

      {/* Moderation Policy Notice */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
        <ShieldAlert className="size-4 text-[#0CA275] shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-slate-900">Ratings Integrity Protocol:</strong> Reviews can only be submitted by verified citizens following completed consultations. Administrators cannot edit ratings directly or fabricate testimonials; moderation actions are permanently logged in the audit trail.
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 sm:border-0 sm:pb-0">
          <Link
            href="/admin/reviews?status=all"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "all" ? "bg-[#0A2843] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Feedback ({visibleCount + hiddenCount})
          </Link>
          <Link
            href="/admin/reviews?status=visible"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "visible" ? "bg-[#0CA275] text-white shadow-xs" : "bg-[#ECFDF5] text-[#0CA275] hover:bg-emerald-100"
            }`}
          >
            Published ({visibleCount})
          </Link>
          <Link
            href="/admin/reviews?status=hidden"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "hidden" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            Moderated / Hidden ({hiddenCount})
          </Link>
        </div>

        <form method="GET" action="/admin/reviews" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <Input
              name="search"
              defaultValue={search || ""}
              placeholder="Search feedback text, citizen, advocate..."
              className="pl-8 text-xs h-9 bg-white"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-9 text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Reviews Table */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Advocate & Client</th>
                  <th className="px-4 py-3">Feedback Commentary</th>
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                      No client reviews found matching this filter.
                    </td>
                  </tr>
                ) : (
                  reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3 ${
                                i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold ml-0.5">{r.rating} of 5</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{r.lawyer?.full_name || "Advocate"}</div>
                        <div className="text-[11px] text-slate-500">By {r.citizen?.full_name || "Citizen"}</div>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <p className="text-slate-700 italic line-clamp-2 leading-relaxed">
                          &ldquo;{r.comment}&rdquo;
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {r.is_visible ? (
                          <Badge variant="outline" className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                            Hidden by Admin
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ReviewModerationDialog review={r} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
