import { redirect } from "next/navigation";
import {
  FileQuestion,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SupportTicketsClient } from "@/components/dashboard/support-tickets-client";
import type { SupportTicket } from "@/lib/types/legal";

export const metadata = {
  title: "Citizen Help & Support Center | LegalEase",
  description: "Submit support tickets, view legal consultation FAQs, and access emergency helplines.",
};

const CITIZEN_FAQS = [
  {
    q: "How do I book an in-person or video consultation with a verified advocate?",
    a: "Navigate to 'Find Lawyers', filter by practice area or city, and click 'Book Consultation' on any Bar-verified advocate profile. Physical (in-person) chamber consultations are free to book on LegalEase, whereas video consultations use Stripe Sandbox Escrow protection.",
  },
  {
    q: "How does Stripe Sandbox Escrow payment protect my video consultation?",
    a: "When an advocate accepts your video consultation request, you complete payment via Stripe Sandbox. Your payment is held in escrow until the session is completed. If the consultation is cancelled within the allowed cutoff window, your payment is automatically refunded.",
  },
  {
    q: "Are my uploaded documents in 'My Files' confidential?",
    a: "Yes. Every document uploaded to your Private Legal File Vault is isolated by Row-Level Security (citizen_id = auth.uid()). No other user or external search engine can access your private files.",
  },
  {
    q: "Why am I asked to submit a mandatory rating after a completed consultation?",
    a: "To preserve trust and quality across our Bar-verified advocate directory, citizens must rate their completed consultations (1 to 5 stars). Only verified completed consultations can leave reviews.",
  },
];

export default async function CitizenSupportPage() {
  const { user } = await getAuthState();
  if (!user) redirect("/login");

  const supabase = createAdminClient() ?? (await createClient());
  let tickets: SupportTicket[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) tickets = data as SupportTicket[];
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-[#0d2b43]">
          Citizen Help & Support Center
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a support ticket for booking or escrow assistance, browse platform FAQs, or view emergency legal helplines in Pakistan.
        </p>
      </div>

      {/* Emergency Helplines Banner */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="size-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-heading font-bold text-rose-950">Police Emergency & Rescue</p>
              <p className="text-rose-800 mt-0.5">Dial <strong>15</strong> (Police) or <strong>1122</strong> (Rescue)</p>
              <p className="text-[11px] text-rose-700 mt-1">For immediate physical danger or active crime reporting.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal/30 bg-emerald-50/40">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="size-5 text-[#0fa176] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-heading font-bold text-[#0d2b43]">Human Rights & Women Helpline</p>
              <p className="text-slate-700 mt-0.5">Dial <strong>1099</strong> (MoHR Free Legal Aid)</p>
              <p className="text-[11px] text-slate-500 mt-1">Ministry of Human Rights & Sindh Legal Advisory Call Center.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-start gap-3">
            <Mail className="size-5 text-[#0d2b43] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-heading font-bold text-[#0d2b43]">LegalEase Support Desk</p>
              <p className="text-slate-700 mt-0.5"><strong>support@legalease.pk</strong></p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Phone className="size-3" /> +92 (21) 3587-9000 (9am–6pm PKT)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Support Ticket System */}
      <SupportTicketsClient initialTickets={tickets} roleLabel="Citizen" />

      {/* Citizen FAQs */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-[#0d2b43] flex items-center gap-2">
            <FileQuestion className="size-5 text-[#0fa176]" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription className="text-xs">
            Answers to common questions about consultations, Stripe Sandbox escrow payments, and AI legal tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {CITIZEN_FAQS.map((faq, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="border-slate-200">
                <AccordionTrigger className="text-xs sm:text-sm font-semibold text-slate-800 hover:text-[#0fa176] text-left py-3">
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
    </div>
  );
}

