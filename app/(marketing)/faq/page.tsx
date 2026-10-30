import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CtaSection } from "@/components/marketing/cta-section";
import { faqs } from "@/lib/data/faqs";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about finding a lawyer, the AI assistant, accounts, privacy, and payments on LegalEase.",
};

export default function FaqPage() {
  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <Badge className="border-teal/30 bg-teal-soft text-teal">
              FAQ
            </Badge>
            <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              Frequently asked questions
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Everything about finding a lawyer, the assistant, accounts, and
              privacy — answered in plain language.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="space-y-12">
          {faqs.map((group) => (
            <div key={group.category}>
              <h2 className="font-heading text-xl font-bold text-navy">
                {group.category}
              </h2>
              <Accordion
                type="single"
                collapsible
                className="mt-4 rounded-2xl border border-border bg-white px-4"
              >
                {group.items.map((item, index) => (
                  <AccordionItem
                    key={item.question}
                    value={`${group.category}-${index}`}
                  >
                    <AccordionTrigger className="text-left font-heading text-sm font-bold text-navy">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-white p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-teal-soft text-teal">
            <MessageCircleQuestion className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-2xl font-bold text-navy">
            Still have a question?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Ask the AI assistant for an instant pointer, or send us a message
            and we&apos;ll get back to you.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/contact">Contact us</Link>
            </Button>
            <Button asChild variant="outline" className="text-navy">
              <Link href="/ai-assistant">Try the assistant</Link>
            </Button>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}