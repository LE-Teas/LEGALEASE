import { Scale, ShieldAlert, CreditCard, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Terms of Service | LegalEase Pakistan",
  description:
    "Terms governing the use of LegalEase AI assistance, lawyer discovery, and Lemon Squeezy SaaS subscriptions.",
};

export default function TermsPage() {
  return (
    <div className="bg-background min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge className="border-teal/30 bg-mint text-teal font-semibold">
            Legal Terms & Disclaimers
          </Badge>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-navy sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-slate">
            Effective Date: October 2026 · Governing Law: Laws of the Islamic Republic of Pakistan
          </p>
        </div>

        <Card className="mt-10 border-border bg-white p-8 shadow-sm space-y-8 text-sm leading-relaxed text-slate">
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <Scale className="size-4 text-teal" /> 1. Nature of the Platform & Essential Legal Disclaimer
            </h2>
            <div className="rounded-lg border border-teal/30 bg-mint/40 p-4 text-navy">
              <strong>Crucial Notice:</strong> LegalEase is a legal technology platform and informational intermediary. LegalEase is NOT a law firm and does not provide formal legal representation, legal opinions, or legal advice. Using the AI Assistant, document templates, or navigator does NOT establish an attorney-client privilege.
            </div>
            <p>
              Formal attorney-client relationships are formed strictly and exclusively when a citizen engages an independent, verified advocate through a confirmed consultation. All legal practitioners listed on LegalEase are independent professionals subject to the Legal Practitioners and Bar Councils Act 1973 and Sindh Bar Council rules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <CreditCard className="size-4 text-teal" /> 2. SaaS Subscriptions & Merchant of Record
            </h2>
            <p>
              Digital subscription billing on LegalEase is handled by <strong>Lemon Squeezy</strong>, which serves as Merchant of Record for all transactions. As MoR, Lemon Squeezy is the authorized reseller and legal merchant, handling invoicing, applicable sales taxes, and payment settlements. Subscriptions renew automatically each month unless cancelled prior to the renewal date via the Customer Billing Portal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <CheckCircle2 className="size-4 text-teal" /> 3. Advocate Verification & Directory Placement
            </h2>
            <p>
              While LegalEase mandates physical and administrative verification of Sindh Bar Council credentials before directory activation, we do not warrant the outcome of any judicial proceedings. Advocates retain full independent responsibility for their professional counsel and court advocacy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <ShieldAlert className="size-4 text-teal" /> 4. Acceptable Use & Prohibited Conduct
            </h2>
            <p>Users of LegalEase agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Submit fraudulent, forged, or altered statutory documents or SBC certificates.</li>
              <li>Attempt SQL injection, prompt injection, or extraction of private case records.</li>
              <li>Enumerate CNICs or scrape lawyer directories using automated scripts.</li>
              <li>Use the platform for money laundering or unlawful financial transactions.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy flex items-center gap-2">
              <Scale className="size-4 text-teal" /> 5. Dispute Resolution & Jurisdiction
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the Islamic Republic of Pakistan. Any legal proceedings arising from platform use shall be subject to the exclusive jurisdiction of the competent courts of Karachi, Sindh.
            </p>
          </section>
        </Card>
      </div>
    </div>
  );
}
