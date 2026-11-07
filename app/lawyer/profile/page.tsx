import Link from "next/link";
import { getAuthState } from "@/lib/auth/profile";
import { getOrCreateLawyerProfile, calculateProfileCompletion } from "@/lib/services/lawyer-portal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatRate } from "@/lib/data/lawyers";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Compass,
  Edit,
  ExternalLink,
  GraduationCap,
  Languages,
  MapPin,
  Phone,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";

export const metadata = {
  title: "My Chamber Profile | Lawyer Portal",
};

export default async function LawyerProfilePage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile) return null;

  const lawyer = await getOrCreateLawyerProfile(user.id);
  if (!lawyer) return null;

  const { percentage: completion, missingFields } = calculateProfileCompletion(lawyer, profile);

  const isVerified = lawyer.verification_status === "verified";
  const isPublished = lawyer.is_published ?? true;
  const isActive = profile.is_active ?? true;
  const isEligibleForDiscovery = isVerified && isPublished && isActive;

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "LE";

  const specs =
    lawyer.specializations && lawyer.specializations.length > 0
      ? lawyer.specializations
      : [lawyer.primary_specialization || "Civil Law"];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
            Chamber Profile
          </h2>
          <p className="text-sm text-muted-foreground">
            This is how your profile and credentials appear to citizens discovering legal counsel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="text-xs">
            <Link href={`/citizen/lawyers/${lawyer.id}`} target="_blank">
              <ExternalLink className="mr-1.5 size-3.5" />
              Preview as Citizen
            </Link>
          </Button>
          <Button asChild className="bg-navy text-white hover:bg-navy/90 text-xs">
            <Link href="/lawyer/profile/edit">
              <Edit className="mr-1.5 size-3.5" />
              Edit Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Profile Discovery & Visibility Panel */}
      <Card className={`border ${isEligibleForDiscovery ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}`}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Compass className={`size-5 ${isEligibleForDiscovery ? "text-emerald-600" : "text-amber-600"}`} />
              <div>
                <CardTitle className="font-heading text-base font-bold text-navy">
                  Citizen Discovery & Platform Visibility Status
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time status in LegalEase lawyer directory and AI recommendations
                </CardDescription>
              </div>
            </div>
            <Badge
              className={`text-xs px-2.5 py-1 ${
                isEligibleForDiscovery
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-100 text-amber-900 border-amber-300"
              }`}
            >
              {isEligibleForDiscovery ? "Live in Search Results" : "Discovery Paused"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg bg-white p-3 border border-slate-200/80">
              <span className="text-[11px] text-muted-foreground block">Bar Verification</span>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-800">
                {isVerified ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Verified Advocate</span>
                  </>
                ) : (
                  <>
                    <Clock className="size-4 text-amber-600" />
                    <span className="capitalize">{lawyer.verification_status.replace("_", " ")}</span>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-white p-3 border border-slate-200/80">
              <span className="text-[11px] text-muted-foreground block">Profile Completion</span>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-800">
                <span className="font-heading text-teal">{completion}%</span>
                <span className="text-muted-foreground font-normal">
                  ({missingFields.length === 0 ? "Complete" : `${missingFields.length} recommended`})
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-white p-3 border border-slate-200/80">
              <span className="text-[11px] text-muted-foreground block">Visible Rate & City</span>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-navy">
                <span>{formatRate(lawyer.consultation_fee)}</span>
                <span className="text-slate-400">•</span>
                <span>{lawyer.city}</span>
              </div>
            </div>
          </div>

          {!isEligibleForDiscovery && (
            <div className="rounded-lg bg-white/80 p-3 border border-amber-200 text-slate-700 space-y-1">
              <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="size-4 text-amber-600" />
                Action required to activate public search discovery:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
                {!isVerified && (
                  <li>
                    Your Bar Council enrolment is {lawyer.verification_status === "not_submitted" ? "not yet submitted" : "under administrator review"}.{" "}
                    <Link href="/lawyer/verification" className="text-teal font-semibold underline">
                      Manage verification here
                    </Link>
                  </li>
                )}
                {missingFields.length > 0 && (
                  <li>
                    Complete recommended profile fields: {missingFields.join(", ")}
                  </li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <Avatar className="size-20 sm:size-24 border-2 border-slate-200 shadow-sm bg-slate-50 shrink-0">
                {profile.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                )}
                <AvatarFallback className="bg-navy font-heading text-xl font-bold text-gold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {profile.full_name}
                  </h3>
                  {lawyer.verification_status === "verified" && (
                    <Badge variant="secondary" className="gap-1 bg-teal-soft text-teal text-[11px] font-medium border border-teal/20">
                      <BadgeCheck className="size-3.5 text-teal" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-700 font-medium mt-1">{lawyer.professional_title || "Advocate High Court"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-slate-400" />
                    {lawyer.city} {lawyer.area ? `(${lawyer.area})` : ""}
                  </span>
                  <span className="font-medium text-slate-600">{lawyer.years_of_experience} yrs experience</span>
                  <span className="flex items-center gap-1 text-slate-900 font-semibold">
                    <Star className="size-3.5 fill-gold text-gold" />
                    {Number(lawyer.rating || 0).toFixed(1)} ({lawyer.review_count || 0} reviews)
                  </span>
                </div>
              </div>
            </div>

            <Button asChild size="sm" variant="outline" className="text-xs shrink-0">
              <Link href={`/citizen/lawyers/${lawyer.id}`}>View Citizen Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Bio */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base text-navy">About & Practice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                {lawyer.bio || "No professional bio added yet. Click Edit Profile to introduce your practice."}
              </p>
            </CardContent>
          </Card>

          {/* Specializations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base text-navy">Practice Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {specs.map((s) => (
                  <Badge key={s} variant="outline" className="border-teal/30 bg-teal-soft/30 text-teal text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Credentials */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base text-navy">Bar Enrolment & Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Scale className="size-4 text-teal" />
                <span className="text-muted-foreground">Bar Council:</span>
                <span className="font-medium text-navy">{lawyer.bar_council || "Not set"}</span>
                {lawyer.bar_license_number && (
                  <span className="text-slate-500 font-mono">({lawyer.bar_license_number})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-teal" />
                <span className="text-muted-foreground">Degree:</span>
                <span className="font-medium text-navy">{lawyer.education || "Not specified"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Languages className="size-4 text-teal" />
                <span className="text-muted-foreground">Languages:</span>
                <span className="font-medium text-navy">{(lawyer.languages || ["English", "Urdu"]).join(", ")}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Office & Consultation */}
        <div className="space-y-6">
          <Card className="border-teal/20 bg-teal-soft/10">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base text-navy">Consultation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground">Rate:</span>
                <p className="font-heading font-bold text-navy text-lg">
                  {formatRate(lawyer.consultation_fee)}
                  <span className="text-xs font-normal text-muted-foreground"> / {lawyer.consultation_duration} mins</span>
                </p>
              </div>

              <div className="border-t border-teal/20 pt-2 space-y-1">
                <p className="font-semibold text-slate-700">Supported Channels:</p>
                {lawyer.offers_in_person && <p>• In-Person Chamber Visit</p>}
                {lawyer.offers_video && <p>• Video Conference</p>}
                {lawyer.offers_phone && <p>• Direct Phone Call</p>}
              </div>

              {lawyer.office_address && (
                <div className="border-t border-teal/20 pt-2">
                  <p className="font-semibold text-slate-700">Office Chamber:</p>
                  <p className="text-muted-foreground mt-0.5">{lawyer.office_address}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
