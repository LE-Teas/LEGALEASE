import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the LegalEase team about finding a lawyer, the platform, or partnering with us.",
};

const contactChannels = [
  {
    icon: Mail,
    title: "Email us",
    lines: ["hello@legalease.com", "support@legalease.com"],
  },
  {
    icon: Phone,
    title: "Call or WhatsApp",
    lines: ["+92 300 000 0000", "Mon–Sat, 9am–7pm PKT"],
  },
  {
    icon: MapPin,
    title: "Visit us",
    lines: ["Clifton, Karachi", "Pakistan"],
  },
  {
    icon: Clock,
    title: "Response time",
    lines: ["Within 1 business day", "For most enquiries"],
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <Badge className="border-teal/30 bg-teal-soft text-teal">
              Contact
            </Badge>
            <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              We&apos;d love to hear from you.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Questions about the platform, feedback on the preview, or interest
              in joining the directory — reach out and we&apos;ll get back to
              you.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {contactChannels.map(({ icon: Icon, title, lines }) => (
                <Card key={title} className="gap-3">
                  <CardContent className="flex items-start gap-4 p-5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-teal-soft text-teal">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-heading text-sm font-bold text-navy">
                        {title}
                      </h2>
                      {lines.map((line) => (
                        <p
                          key={line}
                          className="mt-0.5 text-sm text-muted-foreground"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="rounded-2xl border border-gold/30 bg-gold-soft/50 p-6">
              <h2 className="font-heading text-sm font-bold text-navy">
                A lawyer on the directory?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We&apos;re onboarding verified professionals for the next
                milestone. Write to us with your bar details and practice
                areas.
              </p>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  );
}