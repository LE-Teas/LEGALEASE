import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { LawyerDirectory } from "@/components/marketing/lawyer-directory";
import { CtaSection } from "@/components/marketing/cta-section";
import { searchLawyers } from "@/lib/services/lawyers";

export const metadata: Metadata = {
  title: "Find a lawyer",
  description:
    "Browse verified lawyers by practice area, city, and budget. Transparent rates and real reviews before you book.",
};

export const dynamic = "force-dynamic";

export default async function LawyersPage() {
  const dynamicLawyers = await searchLawyers({ sort: "recommended" });

  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <Badge className="border-teal/30 bg-mint text-teal font-semibold">
              Verified Advocate Directory
            </Badge>
            <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              Find a lawyer who fits your situation
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate">
              Search verified legal practitioners by practice area and city, compare
              transparent rates and Bar Council credentials, then book a secure consultation.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <LawyerDirectory initialLawyers={dynamicLawyers} />
      </section>

      <CtaSection />
    </>
  );
}