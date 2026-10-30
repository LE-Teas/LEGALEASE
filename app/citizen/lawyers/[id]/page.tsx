import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  GraduationCap,
  Languages,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";
import { getLawyerDetails } from "@/lib/services/lawyers";
import { getLawyerReviews } from "@/lib/services/reviews";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingDialog } from "@/components/citizen/booking-dialog";
import { formatRate } from "@/lib/data/lawyers";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ book?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const lawyer = await getLawyerDetails(id);
  if (!lawyer) return { title: "Lawyer Not Found" };
  return {
    title: `${lawyer.full_name} | Lawyer Profile`,
    description: lawyer.bio || `${lawyer.full_name} is an advocate practicing in ${lawyer.city}, Pakistan.`,
  };
}

export default async function CitizenLawyerDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { book } = await searchParams;

  const [lawyer, reviews] = await Promise.all([
    getLawyerDetails(id),
    getLawyerReviews(id),
  ]);

  if (!lawyer) {
    notFound();
  }

  const initials = lawyer.full_name
    ? lawyer.full_name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "LE";

  const specs =
    lawyer.specializations && lawyer.specializations.length > 0
      ? lawyer.specializations
      : [lawyer.primary_specialization || "General Practice"];

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-navy">
          <Link href="/citizen/lawyers">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Lawyer Directory
          </Link>
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card className="overflow-hidden border-border bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-navy to-navy-dark" />
        <CardContent className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-16">
            <div className="flex items-end gap-4">
              <Avatar className="size-24 sm:size-28 border-4 border-white shadow-md bg-white">
                {lawyer.avatar_url && (
                  <AvatarImage src={lawyer.avatar_url} alt={lawyer.full_name} />
                )}
                <AvatarFallback className="bg-navy font-heading text-xl font-bold text-gold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-navy">
                    {lawyer.full_name}
                  </h2>
                  {lawyer.verification_status === "verified" && (
                    <Badge variant="secondary" className="gap-1 bg-teal-soft text-teal text-[11px]">
                      <BadgeCheck className="size-3.5 text-teal" />
                      Verified Advocate
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {lawyer.professional_title || "Advocate High Court"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-slate-400" />
                    {lawyer.city} {lawyer.area ? `(${lawyer.area})` : ""}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-800">
                    <Star className="size-3.5 fill-gold text-gold" />
                    {Number(lawyer.rating || 0).toFixed(1)} ({lawyer.review_count || 0} reviews)
                  </span>
                  <span>{lawyer.years_of_experience || 1} years active practice</span>
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="sm:mb-2">
              <BookingDialog lawyer={lawyer} initialOpen={book === "true"} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Details & Consultation Options */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* About / Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">Professional Bio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {lawyer.bio ||
                  `${lawyer.full_name} is an advocate practicing before the courts in Pakistan, offering advice, legal drafting, dispute resolution, and court representation.`}
              </p>
            </CardContent>
          </Card>

          {/* Specializations */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">Areas of Practice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {specs.map((spec) => (
                  <Badge
                    key={spec}
                    variant="outline"
                    className="border-teal/30 bg-teal-soft/30 px-3 py-1.5 text-xs font-semibold text-teal"
                  >
                    {spec}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Education & Qualifications */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">
                Education & Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <GraduationCap className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Education & Degrees
                  </p>
                  <p className="text-sm font-medium text-navy mt-0.5">
                    {lawyer.education || "Bachelor of Laws (LL.B.)"}
                  </p>
                </div>
              </div>

              {lawyer.bar_council && (
                <div className="flex items-start gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-teal-soft text-teal">
                    <Scale className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Bar Enrolment
                    </p>
                    <p className="text-sm font-medium text-navy mt-0.5">
                      Enrolled Advocate with {lawyer.bar_council}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Languages className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Languages
                  </p>
                  <p className="text-sm font-medium text-navy mt-0.5">
                    {(lawyer.languages || ["English", "Urdu"]).join(", ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Reviews */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 pb-4">
              <div>
                <CardTitle className="font-heading text-lg text-navy">
                  Verified Client Reviews
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Reviews are submitted exclusively by citizens with completed consultations
                </p>
              </div>
              <Badge variant="outline" className="font-semibold text-navy">
                {reviews.length} total
              </Badge>
            </CardHeader>
            <CardContent className="p-5">
              {reviews.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No reviews submitted yet for this advocate.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="border-b border-slate-100 pb-4 last:border-0 last:pb-0 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-navy">
                          {rev.citizen?.full_name || "Verified Citizen"}
                        </p>
                        <div className="flex items-center text-gold">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="size-3 fill-gold" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(rev.created_at).toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Office & Consultation Booking (1 Col) */}
        <div className="space-y-6">
          {/* Consultation Summary Card */}
          <Card className="border-teal/30 bg-teal-soft/10">
            <CardHeader>
              <CardTitle className="font-heading text-base text-navy">
                Consultation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-xs text-muted-foreground">Advisory Fee</span>
                <p className="font-heading text-2xl font-bold text-navy">
                  {formatRate(lawyer.consultation_fee)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}/ {lawyer.consultation_duration || 30} mins
                  </span>
                </p>
              </div>

              <div className="space-y-2 border-t border-teal/20 pt-3">
                <p className="text-xs font-semibold text-slate-700">Available Channels:</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  {lawyer.offers_in_person && (
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-teal" />
                      <span>In-Person Chamber / Office</span>
                    </div>
                  )}
                  {lawyer.offers_video && (
                    <div className="flex items-center gap-2">
                      <Video className="size-4 text-teal" />
                      <span>Secure Video Conference</span>
                    </div>
                  )}
                  {lawyer.offers_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-teal" />
                      <span>Direct Phone Consultation</span>
                    </div>
                  )}
                </div>
              </div>

              {lawyer.office_address && (
                <div className="border-t border-teal/20 pt-3">
                  <p className="text-xs font-semibold text-slate-700">Office Chamber:</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {lawyer.office_name ? `${lawyer.office_name}, ` : ""}
                    {lawyer.office_address}, {lawyer.city}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <BookingDialog lawyer={lawyer} initialOpen={book === "true"} />
              </div>
            </CardContent>
          </Card>

          {/* Platform Trust & Protection */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-navy">
                <ShieldCheck className="size-4 text-teal" />
                LegalEase Verified Protection
              </div>
              <p className="text-[11px] leading-relaxed">
                Consultations are governed by the LegalEase terms of service. You will receive an appointment confirmation directly from the advocate.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
