"use client";

import Link from "next/link";
import { ArrowRight, Award, Briefcase, CalendarCheck, CheckCircle2, MapPin, Scale, Star } from "lucide-react";
import type { UiRecommendedLawyer } from "@/lib/legal-ai/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackLawyerRecommendationClickAction } from "@/app/actions/recommendation-analytics";

interface RecommendedLawyersProps {
  lawyers: UiRecommendedLawyer[];
  legalCategory?: string;
}

export function RecommendedLawyersSection({ lawyers, legalCategory }: RecommendedLawyersProps) {
  if (!lawyers || lawyers.length === 0) return null;

  const handleClick = (lawyerId: string, eventType: "profile_click" | "booking_click", score: number) => {
    trackLawyerRecommendationClickAction(lawyerId, eventType, legalCategory || null, score);
  };

  const moreCategoryUrl = legalCategory
    ? `/citizen/lawyers?specialization=${encodeURIComponent(legalCategory.replace(/_/g, " "))}`
    : "/citizen/lawyers";

  return (
    <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-gold/15 p-1.5 text-navy">
            <Scale className="size-4 text-gold-dark" />
          </div>
          <div>
            <h4 className="font-heading text-xs font-bold text-navy flex items-center gap-1.5">
              Recommended Lawyers for Your Matter
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px] font-normal py-0 h-4 border-emerald-200">
                Verified Only
              </Badge>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Ranked deterministically by verified specialization, authentic reviews & jurisdiction
            </p>
          </div>
        </div>

        <Button asChild variant="ghost" size="sm" className="text-xs text-navy hover:text-teal font-medium h-7 hidden sm:inline-flex">
          <Link href={moreCategoryUrl}>
            View All <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {lawyers.map((lawyer) => (
          <div
            key={lawyer.id}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-3.5 shadow-xs hover:border-gold/50 hover:shadow-sm transition-all"
          >
            <div>
              {/* Header: Avatar, Name & Title */}
              <div className="flex items-start gap-3">
                {lawyer.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lawyer.avatarUrl}
                    alt={lawyer.fullName}
                    className="size-11 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="size-11 rounded-full bg-navy/10 text-navy flex items-center justify-center font-heading font-bold text-sm shrink-0">
                    {lawyer.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h5 className="font-heading text-xs font-bold text-navy truncate">
                      {lawyer.fullName}
                    </h5>
                    <span title="Verified Lawyer">
                      <CheckCircle2 className="size-3.5 text-teal shrink-0" />
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {lawyer.professionalTitle}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-700">
                    <span className="flex items-center text-amber-500 font-semibold">
                      <Star className="size-3 fill-amber-400 text-amber-400 mr-0.5" />
                      {lawyer.rating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">({lawyer.totalReviews} reviews)</span>
                  </div>
                </div>
              </div>

              {/* Specialization & Experience */}
              <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                <Badge variant="secondary" className="bg-navy/5 text-navy text-[10px] py-0 px-2 font-medium">
                  {lawyer.primarySpecialization}
                </Badge>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <Briefcase className="size-3 text-slate-400" />
                  {lawyer.yearsOfExperience}y exp
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="size-3 text-slate-400" />
                  {lawyer.city}
                </span>
              </div>

              {/* Why Recommended Callout */}
              <div className="mt-2.5 rounded-lg bg-teal-soft/40 border border-teal/15 p-2 text-[11px] text-slate-700 leading-snug">
                <span className="font-semibold text-teal-dark flex items-center gap-1">
                  <Award className="size-3 text-teal" /> Why recommended:
                </span>
                <p className="mt-0.5 text-slate-600 line-clamp-2">
                  {lawyer.whyRecommended}
                </p>
              </div>
            </div>

            {/* Bottom: Fee & Actions */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Consultation</span>
                <p className="text-xs font-bold text-navy">
                  PKR {lawyer.consultationFee > 0 ? lawyer.consultationFee.toLocaleString() : "Free Initial"}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5 border-slate-200"
                  onClick={() => handleClick(lawyer.id, "profile_click", lawyer.compositeScore)}
                >
                  <Link href={`/citizen/lawyers/${lawyer.id}`}>
                    View Profile
                  </Link>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="h-7 text-[11px] px-2.5 bg-navy text-white hover:bg-navy-dark"
                  onClick={() => handleClick(lawyer.id, "booking_click", lawyer.compositeScore)}
                >
                  <Link href={`/citizen/lawyers/${lawyer.id}?book=true`}>
                    <CalendarCheck className="size-3 mr-1" /> Book
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-1 text-center sm:hidden">
        <Button asChild variant="outline" size="sm" className="w-full text-xs text-navy">
          <Link href={moreCategoryUrl}>
            View All Verified Lawyers <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
