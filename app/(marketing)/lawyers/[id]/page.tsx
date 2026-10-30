import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  CalendarClock,
  GraduationCap,
  Languages,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LawyerCard } from "@/components/marketing/lawyer-card";
import { formatRate } from "@/lib/data/lawyers";
import { getLawyerById, getLawyersFromDb } from "@/lib/services/lawyers";

export const dynamic = "force-dynamic";

interface LawyerProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: LawyerProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const lawyer = await getLawyerById(id);
  if (!lawyer) return { title: "Lawyer not found" };
  return {
    title: lawyer.name,
    description: `${lawyer.title} · ${lawyer.practiceAreas.join(", ")} · Rated ${lawyer.rating.toFixed(1)} by ${lawyer.reviewCount} clients.`,
  };
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

export default async function LawyerProfilePage({
  params,
}: LawyerProfilePageProps) {
  const { id } = await params;
  const lawyer = await getLawyerById(id);

  if (!lawyer) notFound();

  const allLawyers = await getLawyersFromDb();
  const related = allLawyers
    .filter(
      (item) =>
        item.id !== lawyer.id &&
        item.practiceAreas.some((area: string) => lawyer.practiceAreas.includes(area))
    )
    .slice(0, 3);

  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Link
            href="/lawyers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-navy"
          >
            <ArrowLeft className="size-4" />
            Back to all lawyers
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
            {/* Main profile */}
            <div className="min-w-0">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <Avatar
                  size="lg"
                  className="size-20 bg-gradient-to-br from-navy to-teal"
                >
                  <AvatarFallback className="bg-transparent font-heading text-xl font-bold text-white">
                    {initials(lawyer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                      {lawyer.name}
                    </h1>
                    {lawyer.verified && (
                      <Badge className="gap-1 bg-teal-soft text-teal">
                        <BadgeCheck className="!size-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground">{lawyer.title}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span className="inline-flex items-center gap-1 font-semibold text-navy">
                      <Star className="size-4 fill-gold text-gold" />
                      {lawyer.rating.toFixed(1)}
                      <span className="font-normal text-muted-foreground">
                        ({lawyer.reviewCount} reviews)
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="size-4" />
                      {lawyer.city}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Award className="size-4" />
                      {lawyer.experienceYears} years experience
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {lawyer.practiceAreas.map((area) => (
                      <Badge key={area} variant="outline" className="text-navy">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="my-10" />

              <section className="space-y-10">
                <div>
                  <h2 className="font-heading text-xl font-bold text-navy">
                    About
                  </h2>
                  <p className="mt-3 leading-relaxed text-foreground/80">
                    {lawyer.bio}
                  </p>
                </div>

                <div>
                  <h2 className="font-heading text-xl font-bold text-navy">
                    Approach
                  </h2>
                  <p className="mt-3 leading-relaxed text-foreground/80">
                    {lawyer.approach}
                  </p>
                </div>

                <div>
                  <h2 className="font-heading text-xl font-bold text-navy">
                    Focus areas
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {lawyer.focus.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 rounded-xl border border-border bg-background px-4 py-3 text-sm"
                      >
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-gold" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="gap-3">
                    <CardHeader className="flex-row items-center gap-3 space-y-0">
                      <GraduationCap className="size-5 text-teal" />
                      <CardTitle className="font-heading text-sm font-bold">
                        Education
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm leading-relaxed text-muted-foreground">
                      {lawyer.education}
                    </CardContent>
                  </Card>
                  <Card className="gap-3">
                    <CardHeader className="flex-row items-center gap-3 space-y-0">
                      <Languages className="size-5 text-teal" />
                      <CardTitle className="font-heading text-sm font-bold">
                        Languages
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm leading-relaxed text-muted-foreground">
                      {lawyer.languages.join(" · ")}
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>

            {/* Booking sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Card className="gap-5">
                <CardHeader>
                  <CardDescription className="text-sm">
                    Consultation rate
                  </CardDescription>
                  <CardTitle className="font-heading text-3xl font-bold text-navy">
                    {formatRate(lawyer.hourlyRate)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / hour
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-3 rounded-xl bg-muted/70 px-4 py-3 text-sm">
                    <CalendarClock className="size-4 shrink-0 text-teal" />
                    <span className="text-muted-foreground">Availability:</span>
                    <span className="ml-auto font-medium text-foreground">
                      {lawyer.availability}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-muted/70 px-4 py-3 text-sm">
                    <Languages className="size-4 shrink-0 text-teal" />
                    <span className="text-muted-foreground">Languages:</span>
                    <span className="ml-auto font-medium text-foreground">
                      {lawyer.languages.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-4 shrink-0 text-teal" />
                    Identity, bar membership, and practice history verified.
                  </div>
                  <Button asChild className="w-full">
                    <Link href="/signup">Book a consultation</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full text-navy">
                    <Link href="/ai-assistant">Ask the AI assistant first</Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Booking will go live with authentication in the next
                    milestone.
                  </p>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
            Similar lawyers
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {related.map((item) => (
              <LawyerCard key={item.id} lawyer={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}