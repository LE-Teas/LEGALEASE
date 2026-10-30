import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  FileText,
  Lightbulb,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CtaSection } from "@/components/marketing/cta-section";
import { SectionHeading } from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Understand, match, and consult — the three steps LegalEase uses to turn a confusing legal problem into a clear plan.",
};

const phases = [
  {
    icon: Lightbulb,
    step: "Phase 1",
    title: "Understand your situation",
    description:
      "Describe what happened in your own words. The AI assistant translates it into a clear picture: which laws likely apply, what evidence matters, and how urgent the next step is.",
    bullets: [
      "Plain-language explanation of your rights",
      "Suggested documents and evidence to gather",
      "Clear guidance on when you need a lawyer",
    ],
  },
  {
    icon: Search,
    step: "Phase 2",
    title: "Match with a verified lawyer",
    description:
      "Search the directory by practice area, city, and budget. Every profile shows verified credentials, transparent rates, and genuine reviews.",
    bullets: [
      "Bar-verified profiles only",
      "Transparent hourly or fixed-fee pricing",
      "Compare reviews and experience side by side",
    ],
  },
  {
    icon: CalendarClock,
    step: "Phase 3",
    title: "Consult with confidence",
    description:
      "Book a consultation, agree on scope and fees in writing before it starts, and leave with a clear next step — even if that step isn't a lawsuit.",
    bullets: [
      "Fixed fees agreed before work begins",
      "Summary of your case after each session",
      "No pressure to litigate unnecessarily",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <Badge className="border-teal/30 bg-teal-soft text-teal">
              How it works
            </Badge>
            <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              A legal process you can actually follow.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Three deliberate phases take you from an unclear situation to a
              clear plan — with a verified professional beside you at each
              step.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {phases.map(({ icon: Icon, step, title, description, bullets }) => (
            <Card key={title} className="gap-0">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-navy text-white">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-gold">
                    {step}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold text-navy">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
                <ul className="mt-auto space-y-2.5 pt-2">
                  {bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2.5 text-sm text-foreground/80"
                    >
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-teal" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Trust mechanics"
              title="How lawyers are verified"
              description="Verification is the foundation of the directory. Every profile must pass the same checks before it's published."
            />
          </div>
          <Card className="gap-0">
            <CardContent className="space-y-5 p-6 sm:p-8">
              {[
                {
                  icon: ShieldCheck,
                  title: "Bar enrollment confirmed",
                  description:
                    "Registration and standing are checked directly against official bar records.",
                },
                {
                  icon: FileText,
                  title: "Practice history reviewed",
                  description:
                    "Years of practice, specialisation, and disciplinary history are verified.",
                },
                {
                  icon: BadgeCheck,
                  title: "Identity and contact validated",
                  description:
                    "Lawyers confirm identity, office address, and availability before appearing.",
                },
              ].map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-teal-soft text-teal">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-navy">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Ready to try the process?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Start by exploring lawyers or opening the AI assistant preview.
            Browsing is free and needs no account.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/lawyers">
                Find a lawyer
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-[#0d2b43]/20 text-[#0d2b43] hover:bg-[#0d2b43]/5">
              <Link href="/ai-assistant">Ask AI Assistant</Link>
            </Button>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}