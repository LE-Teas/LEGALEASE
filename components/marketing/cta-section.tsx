import Link from "next/link";
import { ArrowRight, MessageSquareText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-navy px-6 py-14 text-white sm:px-12 sm:py-16 lg:px-16">
        <div className="bg-grid-navy pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal">
            Get started with LegalEase
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Understand your rights and connect with the right advocate today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/80">
            Explore statutory Pakistani legal guidance, draft structured legal notices, or schedule an online video consultation with a verified lawyer.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full bg-teal text-white hover:bg-teal-hover sm:w-auto font-medium shadow-sm"
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
              className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto font-medium"
            >
              <Link href="/lawyers">
                <Users className="size-4" />
                Find a Lawyer
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}