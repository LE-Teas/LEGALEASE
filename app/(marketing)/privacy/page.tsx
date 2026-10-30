import { ShieldCheck, Lock, EyeOff, Server, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Privacy Policy | LegalEase Pakistan",
  description:
    "How LegalEase protects citizen confidentiality, CNIC anonymization, document privacy, and payment data.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-background min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge className="border-teal/30 bg-mint text-teal font-semibold">
            Privacy & Trust
          </Badge>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-navy sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate">
            Last Updated: October 2026 · Jurisdiction: Karachi, Sindh, Pakistan
          </p>
        </div>

        <Card className="mt-10 border-border bg-white p-8 shadow-sm space-y-8 text-sm leading-relaxed text-slate">
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <Lock className="size-4 text-teal" /> 1. Overview & Commitment to Legal Confidentiality
            </h2>
            <p>
              LegalEase (&quot;we,&quot; &quot;our,&quot; or &quot;the Platform&quot;) operates an AI-assisted legal intelligence and verified advocate discovery platform in Pakistan. We understand the acute sensitivity of legal consultations, personal disputes, and statutory inquiries. This Privacy Policy details our data minimization, cryptographic hashing, and access isolation protocols.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <EyeOff className="size-4 text-teal" /> 2. CNIC Anonymization & FBR Tax Lookup Invariants
            </h2>
            <p>
              Our tax filer lookup engine enforces strict zero-knowledge principles:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Never Transmitted to AI:</strong> Your raw Computerized National Identity Card (CNIC) number is NEVER sent to OpenRouter, NVIDIA, OpenAI, or any LLM inference endpoint.
              </li>
              <li>
                <strong>HMAC-SHA256 Keyed Matching:</strong> CNIC lookups against official Active Taxpayer List (ATL) snapshots are evaluated exclusively server-side using secure keyed matching.
              </li>
              <li>
                <strong>Rate Limiting & Enumeration Defense:</strong> Lookups are rate-limited to prevent automated harvesting or enumeration.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <Server className="size-4 text-teal" /> 3. Merchant of Record (Lemon Squeezy) Payments
            </h2>
            <p>
              All subscription payments (Advocate Pro, Citizen Premium, Enterprise Chambers) are processed through <strong>Lemon Squeezy</strong> acting as Merchant of Record (MoR). Lemon Squeezy handles payment authorization, global sales tax/VAT collection, and fraud prevention. LegalEase servers never store or process raw debit/credit card numbers or CVV codes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <ShieldCheck className="size-4 text-teal" /> 4. Document Isolation & Row-Level Security (RLS)
            </h2>
            <p>
              All documents, consultation records, and generated legal notices stored in Supabase PostgreSQL are strictly isolated via Row-Level Security (RLS) policies. Private user files uploaded for individual case analysis are isolated to the specific user account and never ingested into the public legal knowledge base or cross-referenced across users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <FileText className="size-4 text-teal" /> 5. Data Retention & Deletion Rights
            </h2>
            <p>
              Citizens may request full erasure of their chat histories, generated document drafts, and account profiles at any time through their Citizen Dashboard Settings. Verified lawyer audit records mandated by the Sindh Bar Council or tax authorities are retained strictly in accordance with statutory Pakistani record-keeping obligations.
            </p>
          </section>
        </Card>
      </div>
    </div>
  );
}
