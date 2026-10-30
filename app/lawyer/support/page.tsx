import Link from "next/link";
import {
  HelpCircle,
  ShieldCheck,
  Video,
  Wallet,
  CalendarClock,
  Mail,
  Phone,
  FileQuestion,
  ExternalLink,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Scale,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata = {
  title: "Advocate Help & Support | Lawyer Portal",
  description: "Guidelines, regulatory compliance FAQs, and platform support for Pakistani advocates.",
};

export default function LawyerSupportPage() {
  const faqs = [
    {
      q: "How does the Bar Council verification process work?",
      a: "LegalEase verifies every enrolled advocate against official Bar Council registers (Sindh Bar Council, Punjab Bar Council, Islamabad Bar Council, Khyber Pakhtunkhwa Bar Council, Balochistan Bar Council, or Pakistan Bar Council). You must submit your active licence/enrolment number and an authentic scanned copy of your certificate or Bar card. Compliance review typically completes within 24 to 48 business hours.",
    },
    {
      q: "When do I appear in the public citizen directory?",
      a: "Advocates appear in public search and AI legal recommendation results once their verification status is 'verified', their chamber profile is published, and working hours have been configured under Availability. If your account is pending review or requires additional documents, discovery is temporarily paused to ensure platform integrity.",
    },
    {
      q: "How are video consultations conducted?",
      a: "LegalEase integrates secure, browser-based encrypted video rooms powered by Jitsi Meet. No client or lawyer software download is required. When a consultation is confirmed, both you and the client receive access to the room on your respective dashboards. Video rooms unlock 10 minutes prior to the scheduled start time.",
    },
    {
      q: "What is the cancellation and rescheduling policy?",
      a: "Under LegalEase Advocate Terms and Pakistan Bar Council standards, advocates may decline consultation requests before confirmation or cancel confirmed sessions in case of court emergencies (such as sudden cause list calls). When cancelling, you must provide a reason so the client is promptly notified via SMS/email and their slot is freed.",
    },
    {
      q: "How are consultation fees and settlements handled?",
      a: "You define your consultation rate (in PKR) for 30 or 60 minute sessions in your Chamber Profile. Citizens settle the consultation fee upon booking through secure digital payment rails (Easypaisa, JazzCash, 1Link bank transfer, or card). Settled earnings are disbursed directly to your designated bank account according to the platform payout schedule.",
    },
    {
      q: "How are confidential citizen documents protected?",
      a: "Client attachments, intake notes, and consultation materials are strictly confidential. They are stored in private Supabase Storage buckets with Row Level Security (RLS) enforcement. Only the appointed advocate and the client have authorized decryption access. Intake files are never made globally searchable or shared with other lawyers.",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Advocate Help & Support Center
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Guidance on bar verification, court scheduling, encrypted video rooms, and platform support.
        </p>
      </div>

      {/* Quick Action Assistance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border hover:border-teal/50 transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="size-10 rounded-xl bg-teal-soft flex items-center justify-center text-teal">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-navy">Licence Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Submit SBC, PBC or High Court licence details for verified badge.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="w-full text-xs text-teal hover:text-navy p-0 justify-start">
              <Link href="/lawyer/verification" className="flex items-center gap-1">
                <span>Check Status</span>
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border hover:border-teal/50 transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="size-10 rounded-xl bg-navy/10 flex items-center justify-center text-navy">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-navy">Chamber Hours</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Set weekly slots, court recesses, and temporary blocked dates.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="w-full text-xs text-teal hover:text-navy p-0 justify-start">
              <Link href="/lawyer/availability" className="flex items-center gap-1">
                <span>Configure Hours</span>
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border hover:border-teal/50 transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Video className="size-5" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-navy">Video Chamber</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Encrypted browser consultation rooms with screen sharing and chat.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="w-full text-xs text-teal hover:text-navy p-0 justify-start">
              <Link href="/lawyer/appointments" className="flex items-center gap-1">
                <span>Upcoming Sessions</span>
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border hover:border-teal/50 transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Wallet className="size-5" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-navy">Fees & Settlements</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Track client payments, platform commission, and bank transfers.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="w-full text-xs text-teal hover:text-navy p-0 justify-start">
              <Link href="/lawyer/earnings" className="flex items-center gap-1">
                <span>View Ledger</span>
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* FAQs Section */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileQuestion className="size-5 text-teal" />
            <CardTitle className="font-heading text-lg text-navy">
              Frequently Asked Questions by Advocates
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Operational details and standard procedures for practising advocates on LegalEase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-slate-200">
                <AccordionTrigger className="text-xs sm:text-sm font-semibold text-slate-800 hover:text-teal text-left py-3">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs leading-relaxed text-slate-600 pb-3">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Direct Contact Support Desk */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-teal/30 bg-teal-soft/10">
          <CardHeader>
            <CardTitle className="font-heading text-base text-navy flex items-center gap-2">
              <Scale className="size-4.5 text-teal" />
              Advocate Compliance & Liaison Desk
            </CardTitle>
            <CardDescription className="text-xs">
              Dedicated support line for Bar Council inquiries and platform technical assistance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700">
              <Mail className="size-4 text-teal shrink-0" />
              <span>Email: <strong>advocates@legalease.pk</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700">
              <Phone className="size-4 text-teal shrink-0" />
              <span>Helpline: <strong>+92 (21) 3587-9000</strong> (Mon–Fri, 9am–6pm PKT)</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-teal/20 leading-relaxed">
              For urgent hearing conflicts or booking emergency rescheduling, you can also notify administration via the helpline.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-base text-navy flex items-center gap-2">
              <BookOpen className="size-4.5 text-navy" />
              Professional Standards & Ethics
            </CardTitle>
            <CardDescription className="text-xs">
              Platform rules conform to Pakistan Bar Council Canons of Professional Conduct
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <p className="flex items-start gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>All consultations are confidential and protected by advocate-client privilege.</span>
            </p>
            <p className="flex items-start gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Advocates maintain complete professional independence; LegalEase does not direct legal advice.</span>
            </p>
            <p className="flex items-start gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Fair and transparent fixed consultation fees with no hidden citizen charges.</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
