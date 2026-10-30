import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileCheck,
  FileText,
  Lock,
  MapPin,
  MessageSquareText,
  Scale,
  Search,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CtaSection } from "@/components/marketing/cta-section";
import { SectionHeading } from "@/components/marketing/section-heading";
import { searchLawyers } from "@/lib/services/lawyers";
import { getLegalResources } from "@/lib/services/resources";
import { formatRate } from "@/lib/data/lawyers";

export const dynamic = "force-dynamic";

// Fallback statutory topics if knowledge base is synchronizing
const fallbackTopics = [
  {
    title: "Tenancy & Rented Property",
    statute: "Sindh Rented Premises Ordinance, 1979",
    summary:
      "Statutory rent limits, eviction grounds before Rent Controllers, security deposits, and maintenance obligations.",
    category: "Tenancy Law",
    slug: "tenancy-agreement-checklist",
  },
  {
    title: "Family & Custody",
    statute: "Muslim Family Laws Ordinance, 1961",
    summary:
      "Nikahnama terms, Khula procedures, maintenance rights for spouses and children, and guardian court filings.",
    category: "Family Law",
    slug: "family-law-basics",
  },
  {
    title: "Labour & Employment",
    statute: "Sindh Payment of Wages Act, 2015",
    summary:
      "Notice periods, wrongful termination, statutory gratuity, unpaid wage recovery, and labour court appeals.",
    category: "Labour Law",
    slug: "understand-an-employment-contract",
  },
  {
    title: "Consumer Rights & Disputes",
    statute: "Sindh Consumer Protection Act, 2014",
    summary:
      "Product liability, unfair trade practices, defect remedies, statutory 15-day notices, and consumer court claims.",
    category: "Consumer Law",
    slug: "consumer-complaint-process",
  },
  {
    title: "Police Procedures & Detention",
    statute: "Code of Criminal Procedure (CrPC)",
    summary:
      "FIR registration, bail petitions, right to legal counsel, search warrant rules, and custody protections.",
    category: "Criminal Rights",
    slug: "know-your-rights-detention",
  },
  {
    title: "Understanding Bail",
    statute: "Pakistan Penal Code & CrPC",
    summary:
      "Pre-arrest bail (protective bail), post-arrest bail criteria, surety bounds, and high court writ remedies.",
    category: "Bail & Courts",
    slug: "bail-understanding-process",
  },
];

// Fallback verified advocates if newly provisioned database
const fallbackAdvocates = [
  {
    id: "lawyer-1",
    full_name: "Barrister Bilal Khan",
    professional_title: "Advocate High Court · Sindh Bar Council",
    city: "Karachi",
    specializations: ["Property Law", "Corporate Law", "Civil Litigation"],
    years_of_experience: 11,
    consultation_fee: 4000,
    bar_license_number: "SBC/HC-8814",
    bar_council: "Sindh Bar Council",
  },
  {
    id: "lawyer-2",
    full_name: "Amara Rahman",
    professional_title: "Advocate High Court · Sindh Bar Council",
    city: "Karachi",
    specializations: ["Family Law", "Guardianship", "Cybercrime"],
    years_of_experience: 9,
    consultation_fee: 3500,
    bar_license_number: "SBC/HC-11902",
    bar_council: "Sindh Bar Council",
  },
  {
    id: "lawyer-3",
    full_name: "Zainab Murtaza",
    professional_title: "Advocate District Courts · Karachi South",
    city: "Karachi",
    specializations: ["Labour & Employment", "Consumer Law", "Contract Law"],
    years_of_experience: 7,
    consultation_fee: 3000,
    bar_license_number: "SBC/DC-15431",
    bar_council: "Sindh Bar Council",
  },
];

const faqs = [
  {
    question: "Is the AI legal assistant a substitute for a licensed advocate?",
    answer:
      "No. The LegalEase AI assistant is an educational tool designed to demystify complex legal statutes and explain your rights under Pakistan Code and Sindh Code in plain language. It does not provide formal legal representation or create an advocate-client relationship. For specific court proceedings, formal legal notices, or representation before a tribunal, you should consult a verified lawyer through our directory.",
  },
  {
    question: "How does LegalEase verify lawyers on the platform?",
    answer:
      "Every legal practitioner on LegalEase undergoes credential verification. We confirm their provincial Bar Council enrollment number (e.g., Sindh Bar Council or Punjab Bar Council), court standing (District Courts or High Court), and national identity credentials before granting verified status on the platform.",
  },
  {
    question: "How do online video consultations work?",
    answer:
      "When you book an appointment, a secure, browser-based video consultation room is generated. Both you and your lawyer join at the scheduled time directly from your LegalEase dashboard via encrypted WebRTC. There is no software to install, and both parties confirm the consultation scope beforehand.",
  },
  {
    question: "What legal jurisdictions and provincial codes are covered?",
    answer:
      "LegalEase covers federal statutory laws under Pakistan Code (including the Pakistan Penal Code, Contract Act, Muslim Family Laws Ordinance, and Income Tax Ordinance) as well as provincial statutes, with deep statutory coverage for Sindh Code (such as the Sindh Rented Premises Ordinance and Sindh Consumer Protection Act).",
  },
  {
    question: "How is my personal information and document data protected?",
    answer:
      "LegalEase enforces strict database-level Row Level Security (RLS) on PostgreSQL. Your legal questions, consultation notes, and uploaded documents are isolated to your authenticated account and only shared with the lawyer you explicitly engage. We never sell your data or use private conversations to train public artificial intelligence models.",
  },
  {
    question: "How are consultation fees determined?",
    answer:
      "Each advocate sets their own transparent hourly consultation fee, which is displayed upfront on their profile. There are no hidden platform surcharges or surprise billing. You review the exact rate and agreed consultation duration before confirming any appointment.",
  },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default async function Home() {
  // Dynamic data queries from Supabase database
  const dynamicLawyers = await searchLawyers({ sort: "recommended" });
  const dynamicResources = await getLegalResources();

  const displayLawyers =
    dynamicLawyers && dynamicLawyers.length > 0
      ? dynamicLawyers.slice(0, 3)
      : fallbackAdvocates;

  const displayResources =
    dynamicResources && dynamicResources.length > 0
      ? dynamicResources.slice(0, 6)
      : fallbackTopics;

  return (
    <div className="bg-background text-foreground">
      {/* 1. Hero Section Explaining the Core Benefit */}
      <section className="relative overflow-hidden border-b border-border/80 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
            <div>
              {/* Trust pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-teal/20 bg-mint px-3.5 py-1.5 text-xs font-semibold text-teal">
                <ShieldCheck className="size-3.5 shrink-0" />
                <span>Verified LegalTech platform for Pakistan</span>
              </div>

              {/* Tagline */}
              <h1 className="mt-6 font-heading text-4xl font-extrabold tracking-tight text-navy sm:text-5xl lg:text-6xl">
                Understand the law.{" "}
                <span className="text-teal">Find the right lawyer.</span>
              </h1>

              {/* Core description */}
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate sm:text-lg">
                Legal questions can be confusing. LegalEase helps you explore Pakistani
                legal information, discover lawyers based on your needs, and access
                digital legal services in one place.
              </p>

              {/* Primary & secondary CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="bg-teal text-white hover:bg-teal-hover font-medium shadow-sm transition-all"
                >
                  <Link href="/ai-assistant">
                    <MessageSquareText className="size-4" />
                    Ask a Legal Question
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-navy/20 text-navy hover:bg-navy/5 font-medium"
                >
                  <Link href="/lawyers">
                    <Users className="size-4" />
                    Find a Lawyer
                  </Link>
                </Button>
              </div>

              {/* Feature highlights bar */}
              <div className="mt-10 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-mint text-teal">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <span className="text-xs font-medium text-navy">
                    Pakistan & Sindh Code statutory retrieval
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-mint text-teal">
                    <BadgeCheck className="size-4" />
                  </span>
                  <span className="text-xs font-medium text-navy">
                    Bar-verified advocates & clear rates
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-mint text-teal">
                    <Lock className="size-4" />
                  </span>
                  <span className="text-xs font-medium text-navy">
                    Encrypted consultations & private data
                  </span>
                </div>
              </div>
            </div>

            {/* Hero interactive visual: Real statutory breakdown preview */}
            <div className="relative">
              <Card className="border-border bg-white shadow-xl shadow-navy/5">
                <CardContent className="space-y-4 p-6 sm:p-7">
                  {/* Card header */}
                  <div className="flex items-center justify-between border-b border-border/70 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-lg bg-mint text-teal">
                        <Scale className="size-4" />
                      </span>
                      <div>
                        <p className="font-heading text-xs font-bold text-navy">
                          Statutory inquiry preview
                        </p>
                        <p className="text-[11px] text-slate">
                          Sindh Code & Pakistan Code verified
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-mint text-teal text-[11px] font-semibold">
                      Live database sources
                    </Badge>
                  </div>

                  {/* Citizen question */}
                  <div className="rounded-xl bg-[#F7FAFA] border border-border/60 p-3.5">
                    <p className="text-xs font-semibold text-slate uppercase tracking-wider">
                      Citizen question
                    </p>
                    <p className="mt-1 text-sm font-medium text-navy">
                      &quot;Can my landlord evict me without notice under Sindh law if my lease period has ended?&quot;
                    </p>
                  </div>

                  {/* Assistant source-backed answer */}
                  <div className="rounded-xl border border-teal/30 bg-mint/40 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal">
                        <BookOpen className="size-3.5" />
                        Sindh Rented Premises Ordinance, 1979 — Section 15
                      </span>
                      <span className="rounded bg-teal/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal">
                        Sec. 15(2)
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-navy">
                      No. Under Section 15 of SRPO 1979, the expiration of an agreement alone does not permit immediate eviction. A landlord must establish statutory grounds (such as default in rent or personal bona fide use) before the Rent Controller. Unilateral eviction without a court order is unlawful.
                    </p>
                    <div className="pt-2 border-t border-teal/20 flex items-center justify-between text-[11px]">
                      <span className="text-slate">Recommended next step:</span>
                      <Link href="/lawyers" className="font-semibold text-teal hover:underline inline-flex items-center gap-1">
                        Consult a tenancy lawyer
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Verified advocate mini-preview from database */}
                  <div className="flex items-center justify-between rounded-xl border border-border/80 bg-white p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                        {initials(displayLawyers[0]?.full_name || "Advocate")}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-navy">
                          {displayLawyers[0]?.full_name}
                        </p>
                        <p className="text-[11px] text-slate">
                          {displayLawyers[0]?.professional_title || "Advocate High Court"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-teal">
                        {formatRate(displayLawyers[0]?.consultation_fee || 3500)}
                      </p>
                      <p className="text-[10px] text-slate">Verified status</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 2. How LegalEase Works in Three Simple Steps */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionHeading
          eyebrow="Clear, transparent process"
          title="How LegalEase works in three simple steps"
          description="A structured path designed to eliminate legal uncertainty and connect you with qualified professional assistance."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {/* Step 1 */}
          <Card className="border-border bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <CardContent className="space-y-4 p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="font-heading text-3xl font-extrabold text-teal">
                  01
                </span>
                <span className="grid size-10 place-items-center rounded-xl bg-mint text-teal">
                  <MessageSquareText className="size-5" />
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold text-navy">
                Ask a legal question
              </h3>
              <p className="text-sm leading-relaxed text-slate">
                Describe your situation in everyday language. LegalEase searches official
                Pakistan Code and Sindh Code repositories to provide clear, statutory
                information before you spend a single rupee.
              </p>
              <div className="pt-2">
                <Link
                  href="/ai-assistant"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:text-navy transition-colors"
                >
                  Ask a question now
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card className="border-border bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <CardContent className="space-y-4 p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="font-heading text-3xl font-extrabold text-teal">
                  02
                </span>
                <span className="grid size-10 place-items-center rounded-xl bg-mint text-teal">
                  <Search className="size-5" />
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold text-navy">
                Discover verified lawyers
              </h3>
              <p className="text-sm leading-relaxed text-slate">
                Browse licensed advocates filtered by practice area, city, and transparent
                hourly rates. Compare verified Bar Council credentials and real client
                reviews side-by-side.
              </p>
              <div className="pt-2">
                <Link
                  href="/lawyers"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:text-navy transition-colors"
                >
                  Explore lawyer directory
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card className="border-border bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <CardContent className="space-y-4 p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="font-heading text-3xl font-extrabold text-teal">
                  03
                </span>
                <span className="grid size-10 place-items-center rounded-xl bg-mint text-teal">
                  <Video className="size-5" />
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold text-navy">
                Consult & resolve
              </h3>
              <p className="text-sm leading-relaxed text-slate">
                Schedule a consultation, agree on clear scope and fees in advance, and
                meet through an encrypted video session. Generate formal notices and track
                case progress in your dashboard.
              </p>
              <div className="pt-2">
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:text-navy transition-colors"
                >
                  Learn more about consultations
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. Explore Legal Topics and Source-Backed Answers (Dynamic from Database) */}
      <section className="border-y border-border/80 bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Statutory knowledge base"
            title="Explore legal topics and source-backed answers"
            description="Clear legal explanations grounded in federal Pakistan Code and provincial Sindh Code legislation."
          />

          {/* Dynamic database topics grid */}
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayResources.map((topic: any) => (
              <div
                key={topic.id || topic.slug || topic.title}
                className="group flex flex-col justify-between rounded-xl border border-border/80 bg-background p-5 transition-all duration-200 hover:-translate-y-1 hover:border-teal/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-mint px-2 py-0.5 text-[10px] font-semibold text-teal">
                      {topic.category || "Statutory Guide"}
                    </span>
                    <Scale className="size-3.5 text-slate group-hover:text-teal transition-colors" />
                  </div>
                  <h3 className="mt-3 font-heading text-base font-bold text-navy group-hover:text-teal transition-colors">
                    {topic.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate line-clamp-3">
                    {topic.summary}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate">
                    {topic.reading_time || "5 min read"}
                  </span>
                  <Link
                    href={`/ai-assistant`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:text-navy transition-colors"
                  >
                    Ask AI assistant
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Source-Backed Transparency Callout */}
          <div className="mt-12 rounded-2xl border border-border/80 bg-[#F7FAFA] p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal">
                  Verified statutory citations
                </p>
                <h3 className="mt-2 font-heading text-2xl font-bold text-navy">
                  Every explanation cites its legal authority
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate">
                  LegalEase answers never rely on vague generalizations. Every response identifies the applicable Act, Ordinance, section number, and judicial principles so you can verify facts with certainty.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-border text-navy bg-white">
                    Pakistan Penal Code, 1860
                  </Badge>
                  <Badge variant="outline" className="border-border text-navy bg-white">
                    Sindh Rented Premises Ordinance, 1979
                  </Badge>
                  <Badge variant="outline" className="border-border text-navy bg-white">
                    Muslim Family Laws Ordinance, 1961
                  </Badge>
                  <Badge variant="outline" className="border-border text-navy bg-white">
                    PECA, 2016
                  </Badge>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <span className="text-xs font-bold text-navy">
                    Statutory Source Example
                  </span>
                  <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold text-teal">
                    Verified citation
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate">
                  <p className="font-semibold text-navy">
                    Section 9, Muslim Family Laws Ordinance 1961 (Maintenance):
                  </p>
                  <p className="italic bg-[#F7FAFA] p-3 rounded-lg border border-border/50 text-[11px] text-navy">
                    &quot;If any husband fails to maintain his wife adequately, or where there are more wives than one, fails to maintain them equitably, the wife, or all or any of the wives, may in addition to seeking any other legal remedy available apply to the Chairman who shall constitute an Arbitration Council to specify the amount...&quot;
                  </p>
                  <p className="pt-1 text-[11px] text-slate">
                    Plain-language takeaway: A wife has an immediate right to apply for maintenance before the Arbitration Council or Family Court without waiting for divorce proceedings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Discover Lawyers by Specialization, Location, and Fees (Dynamic from Database) */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal">
              Licensed Advocates Directory
            </p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Discover lawyers by specialization, location, and fees
            </h2>
            <p className="mt-3 max-w-2xl text-base text-slate">
              Search vetted legal practitioners with transparent hourly rates, verified Bar Council standing, and clear practice profiles.
            </p>
          </div>
          <Button asChild className="bg-teal text-white hover:bg-teal-hover font-medium">
            <Link href="/lawyers">
              View all advocates
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Practice areas quick filter bar */}
        <div className="mt-8 flex flex-wrap gap-2">
          {["All Areas", "Family Law", "Property Law", "Corporate & Tax", "Labour Law", "Criminal Defense", "Cybercrime"].map((filter, i) => (
            <Link
              key={filter}
              href={`/lawyers?specialization=${encodeURIComponent(filter === "All Areas" ? "all" : filter)}`}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                i === 0
                  ? "bg-navy text-white"
                  : "bg-white border border-border text-slate hover:bg-mint hover:text-teal"
              }`}
            >
              {filter}
            </Link>
          ))}
        </div>

        {/* Dynamic Lawyer Cards Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayLawyers.map((advocate: any) => (
            <Card
              key={advocate.id}
              className="border-border bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-navy/5 flex flex-col justify-between"
            >
              <CardContent className="space-y-4 p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-navy font-heading text-sm font-bold text-white">
                      {initials(advocate.full_name || advocate.name || "Advocate")}
                    </span>
                    <div>
                      <h3 className="font-heading text-base font-bold text-navy">
                        {advocate.full_name || advocate.name}
                      </h3>
                      <p className="text-xs text-slate">
                        {advocate.professional_title || advocate.title || "Advocate High Court"}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-mint text-teal gap-1 text-[11px] font-semibold border-0">
                    <BadgeCheck className="size-3" />
                    Verified
                  </Badge>
                </div>

                {/* Specializations */}
                <div className="flex flex-wrap gap-1.5">
                  {(advocate.specializations || [advocate.primary_specialization || "Civil Law"]).map((spec: string) => (
                    <Badge
                      key={spec}
                      variant="outline"
                      className="border-border text-navy bg-[#F7FAFA] text-[11px]"
                    >
                      {spec}
                    </Badge>
                  ))}
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs text-slate">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5 text-teal" />
                    {advocate.city || "Karachi"}
                    {advocate.area ? `, ${advocate.area}` : ""}
                  </span>
                  <span>{advocate.years_of_experience || advocate.experienceYears || 5} years experience</span>
                </div>

                {/* Bar enrollment confirmation */}
                {(advocate.bar_license_number || advocate.barEnrollment) && (
                  <p className="text-[11px] text-slate bg-[#F7FAFA] p-2 rounded border border-border/50">
                    Enrolled: <strong className="text-navy">{advocate.bar_license_number || advocate.barEnrollment}</strong>
                    {advocate.bar_council ? ` (${advocate.bar_council})` : ""}
                  </p>
                )}

                {/* Footer with rate and action */}
                <div className="flex items-center justify-between border-t border-border/70 pt-4">
                  <div>
                    <span className="font-heading text-base font-bold text-navy">
                      {formatRate(advocate.consultation_fee || advocate.hourlyRate || 3000)}
                    </span>
                    <span className="text-xs text-slate"> / session</span>
                  </div>
                  <Link
                    href={`/lawyers/${advocate.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:text-navy transition-colors"
                  >
                    View profile & book
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. Online Consultations and Appointment Management */}
      <section className="border-y border-border/80 bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Direct digital consultation"
            title="Online consultations and appointment management"
            description="Connect with qualified advocates remotely through high-definition browser video, calendar booking, and transparent scope agreements."
          />

          <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            {/* 4 Feature Pillars */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-teal">
                  <Calendar className="size-5" />
                </span>
                <div>
                  <h3 className="font-heading text-base font-bold text-navy">
                    Real-time calendar scheduling
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate">
                    Book consultations directly from a lawyer&apos;s published availability calendar. Automated slot management prevents scheduling conflicts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-teal">
                  <Video className="size-5" />
                </span>
                <div>
                  <h3 className="font-heading text-base font-bold text-navy">
                    Encrypted browser-based video meetings
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate">
                    Join private consultation rooms directly in your browser powered by WebRTC. Zero third-party downloads, zero software installation required.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-teal">
                  <FileCheck className="size-5" />
                </span>
                <div>
                  <h3 className="font-heading text-base font-bold text-navy">
                    Upfront scope & fee agreement
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate">
                    Both parties confirm the consultation scope and fee upfront before the call begins, ensuring transparent expectations and zero hidden charges.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-teal">
                  <FileText className="size-5" />
                </span>
                <div>
                  <h3 className="font-heading text-base font-bold text-navy">
                    Centralized consultation workspace
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate">
                    Upload case documents, view notes from your consultation, and download follow-up summaries all within your private citizen portal.
                  </p>
                </div>
              </div>
            </div>

            {/* Appointment UI Mockup Card */}
            <div className="rounded-2xl border border-border bg-[#F7FAFA] p-6 sm:p-8">
              <div className="rounded-xl border border-border bg-white p-6 shadow-md space-y-5">
                <div className="flex items-center justify-between border-b border-border/70 pb-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
                      Appointment #LA-2026-081
                    </span>
                    <h4 className="font-heading text-base font-bold text-navy mt-0.5">
                      Upcoming Consultation
                    </h4>
                  </div>
                  <Badge className="bg-mint text-teal border-0 font-semibold text-xs">
                    Confirmed
                  </Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-slate">Advocate:</span>
                    <span className="font-bold text-navy">
                      {displayLawyers[0]?.full_name || "Advocate"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-slate">Date & Time:</span>
                    <span className="font-bold text-navy">Tomorrow · 3:30 PM PKT (45 min)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-slate">Meeting Format:</span>
                    <span className="font-medium text-teal inline-flex items-center gap-1">
                      <Video className="size-3.5" />
                      Encrypted Video Room
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate">Agreed Scope:</span>
                    <span className="font-medium text-navy text-right">
                      Commercial lease review & breach notice
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2.5 sm:flex-row">
                  <Button
                    size="sm"
                    className="w-full bg-teal text-white hover:bg-teal-hover font-medium sm:w-auto flex-1"
                  >
                    <Video className="size-3.5" />
                    Join Video Consultation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-border text-navy hover:bg-slate-50 sm:w-auto"
                  >
                    View Documents
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Document Tools, Privacy Information, and Frequently Asked Questions */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionHeading
          eyebrow="Complete digital services"
          title="Document tools, privacy information, and FAQs"
          description="Everything you need to draft legal notices, safeguard your confidential information, and make informed legal decisions."
        />

        {/* Document Tools & Privacy 2-Column Overview */}
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* Document Tools */}
          <Card className="border-border bg-white">
            <CardContent className="space-y-4 p-6 sm:p-7">
              <span className="grid size-10 place-items-center rounded-xl bg-mint text-teal">
                <FileText className="size-5" />
              </span>
              <h3 className="font-heading text-lg font-bold text-navy">
                Digital legal document tools
              </h3>
              <p className="text-sm leading-relaxed text-slate">
                Generate structured, legally consistent draft documents based on recognized statutory templates under Pakistani provincial laws:
              </p>
              <ul className="space-y-2.5 text-xs text-navy">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-teal shrink-0" />
                  <span><strong>Legal Notice Generator:</strong> Demand letters for unpaid salaries, tenancy defaults, and contract breaches.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-teal shrink-0" />
                  <span><strong>Rent Agreement Checklists:</strong> Verify essential protective clauses under the Sindh Rented Premises Ordinance.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-teal shrink-0" />
                  <span><strong>Consumer Court Notice:</strong> Format formal 15-day defect notices compliant with the Sindh Consumer Protection Act.</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link
                  href="/citizen/documents"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:text-navy transition-colors"
                >
                  Explore document tools
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Confidentiality Guarantee */}
          <Card className="border-border bg-white">
            <CardContent className="space-y-4 p-6 sm:p-7">
              <span className="grid size-10 place-items-center rounded-xl bg-mint text-teal">
                <Lock className="size-5" />
              </span>
              <h3 className="font-heading text-lg font-bold text-navy">
                Privacy & confidentiality guarantee
              </h3>
              <p className="text-sm leading-relaxed text-slate">
                Your legal queries and uploaded documents are treated with strict advocate-client confidentiality standards:
              </p>
              <ul className="space-y-2.5 text-xs text-navy">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-teal shrink-0" />
                  <span><strong>Row Level Security (RLS):</strong> Database-enforced isolation ensures your documents are only accessible to you and your lawyer.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-teal shrink-0" />
                  <span><strong>Zero Public AI Training:</strong> Your legal questions and uploaded files are never used to train public machine learning models.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-teal shrink-0" />
                  <span><strong>Verified Advocate Identities:</strong> No anonymous profiles; credentials and CNICs are verified prior to platform onboarding.</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:text-navy transition-colors"
                >
                  Read privacy policy
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Frequently Asked Questions */}
        <div className="mt-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal">
              Have questions?
            </p>
            <h3 className="mt-2 font-heading text-2xl font-bold text-navy sm:text-3xl">
              Frequently asked questions
            </h3>
            <p className="mt-2 text-sm text-slate">
              Clear answers about our AI assistant, advocate verification, video consultations, and privacy.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-3xl">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="rounded-xl border border-border bg-white px-5 py-1"
                >
                  <AccordionTrigger className="text-left font-heading text-sm font-bold text-navy hover:text-teal hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs leading-relaxed text-slate pt-1 pb-3">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Bottom Call to Action */}
      <CtaSection />
    </div>
  );
}