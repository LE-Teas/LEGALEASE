import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  Handshake,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CtaSection } from "@/components/marketing/cta-section";
import { SectionHeading } from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "About us",
  description:
    "LegalEase exists to make legal help feel human — plain-language guidance, verified lawyers, and technology that removes the runaround.",
};

const values = [
  {
    icon: Eye,
    title: "Clarity first",
    description:
      "Every explanation, price, and process on LegalEase is written to be understood by someone who isn't a lawyer.",
  },
  {
    icon: ShieldCheck,
    title: "Verification, not vanity",
    description:
      "Lawyers are vetted against bar records before they appear. Trust is earned, published, and maintained.",
  },
  {
    icon: Handshake,
    title: "Radical transparency",
    description:
      "Rates, scope, and next steps are agreed before you commit. No surprise invoices, no opaque billing.",
  },
  {
    icon: TriangleAlert,
    title: "Humility about AI",
    description:
      "The assistant is a guide, never a substitute for professional advice. We say so — everywhere.",
  },
];

const milestones = [
  {
    year: "The problem",
    title: "Legal help is intimidating",
    description:
      "Most people avoid lawyers because they can't decode the process, the fees, or even the language used to describe their own dispute.",
  },
  {
    year: "The idea",
    title: "Technology should lower the barrier",
    description:
      "We imagined a platform where someone could understand their rights, find a verified professional, and know the cost before committing.",
  },
  {
    year: "The build",
    title: "Founded on trust mechanics",
    description:
      "LegalEase began as a student project focused on the parts of legaltech that matter most: verification, clarity, and accessibility.",
  },
  {
    year: "Today",
    title: "A development preview that works",
    description:
      "This first milestone ships the public website — directory, resources, and an AI preview — built on Supabase and ready to grow.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <Badge className="border-teal/30 bg-teal-soft text-teal">
              About LegalEase
            </Badge>
            <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              Legal help should feel as human as the people who need it.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              LegalEase is a student-led legaltech platform with a simple
              conviction: people don&apos;t avoid lawyers because they
              don&apos;t have problems. They avoid lawyers because the system
              keeps them at
              arm&apos;s length.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              We bring verified lawyers, plain-language resources, and an AI
              assistant into one experience — so the hardest part of getting
              legal help is never understanding it.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="What we believe"
          title="Four commitments behind everything we build"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="gap-4">
              <CardContent className="space-y-4 p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-teal-soft text-teal">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-heading text-lg font-bold text-navy">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our story"
            title="From a student project to a platform"
            description="A short timeline of how LegalEase went from a frustration with legaltech to a working product idea."
          />
          <ol className="relative mx-auto mt-14 max-w-3xl space-y-10 border-l border-border pl-8">
            {milestones.map((milestone) => (
              <li key={milestone.title} className="relative">
                <span className="absolute -left-[41px] grid size-6 place-items-center rounded-full border-4 border-white bg-navy ring-1 ring-border" />
                <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                  {milestone.year}
                </p>
                <h3 className="mt-1.5 font-heading text-xl font-bold text-navy">
                  {milestone.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {milestone.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gold-soft text-gold">
            <Sparkles className="size-6" />
          </span>
          <h2 className="mt-6 font-heading text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            This is milestone one. There is more on the way.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Accounts, consultations, and the full AI assistant are being built
            on Supabase next. Explore what ships today and tell us what you
            want to see.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/contact">
                Get in touch
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="text-navy">
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}