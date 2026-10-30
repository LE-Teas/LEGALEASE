import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AiAssistantPreview } from "@/components/marketing/ai-assistant-preview";
import { CtaSection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "AI Legal Assistant",
  description:
    "Ask the LegalEase AI assistant about your rights and next steps in plain language. Preview only — powered by sample responses.",
};

const capabilities = [
  {
    icon: Sparkles,
    title: "Plain-language explanations",
    description:
      "Ask about situations — deposits, employment, property — and get a readable breakdown of where you stand.",
  },
  {
    icon: ShieldCheck,
    title: "Honest about limits",
    description:
      "The assistant tells you when something is case-specific and routes you to a verified lawyer instead of guessing.",
  },
  {
    icon: TriangleAlert,
    title: "Balanced guidance",
    description:
      "Explains both what you can do and what the other side may argue, so decisions are informed rather than one-sided.",
  },
];

export default function AiAssistantPage() {
  return (
    <>
      <section className="border-b border-border bg-gradient-to-br from-navy via-navy-dark to-teal">
        <div className="bg-grid-navy pointer-events-none absolute inset-0" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="border-white/15 bg-white/10 text-white">
              <Sparkles className="!size-3 text-gold" />
              AI Legal Assistant · Preview
            </Badge>
            <h1 className="mt-6 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Ask. Understand. Act.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
              Describe your situation and get a plain-language read on your
              rights and next steps — or a confident push toward the right
              lawyer when you really need one.
            </p>
          </div>
        </div>
        <div className="relative mx-auto -mb-16 w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          <AiAssistantPreview />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge className="border-teal/30 bg-mint text-teal font-semibold">
            Statutory AI Intelligence
          </Badge>
          <p className="mt-5 text-base leading-relaxed text-slate">
            Grounded in official Pakistan Code and Sindh Code statutory databases.
            Get instant plain-language summaries with exact section citations, or log in to save conversations and generate case notices.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, description }) => (
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
        <div className="mt-10 text-center">
          <Button
            asChild
            size="lg"
            className="bg-[#0d2b43] hover:bg-[#0fa176] text-white font-sans font-medium px-6 py-3 rounded-xl transition-all shadow-md shadow-[#0d2b43]/15"
          >
            <Link href="/lawyers">
              Talk to a verified lawyer
              <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </section>

      <CtaSection />
    </>
  );
}