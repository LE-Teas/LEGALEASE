import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Settings } from "lucide-react";
import {
  PlatformFeeSettingsForm,
  PlatformAiSettingsForm,
  PlatformGeneralSettingsForm,
  PlatformSmtpSettingsForm,
  PlatformStripeSettingsForm,
} from "@/components/admin/settings-forms";
import type { PlatformAiSetting } from "@/lib/types/legal";

export const metadata: Metadata = {
  title: "Platform Settings, SMTP & Stripe Sandbox | LegalEase Admin",
  description:
    "Configure consultation fee policy, SMTP/IMAP email notifications, Stripe Sandbox payment gateway, and legal AI/RAG parameters.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const settingsMap: Record<string, string> = {
    platform_name: "LegalEase",
    support_email: "support@legalease.pk",
    booking_advance_days: "60",
    cancellation_cutoff_hours: "24",
    jitsi_domain: "meet.jit.si",
    platform_fee_type: "percentage",
    platform_fee_value: "10",
    tax_percentage: "0",
    consultation_agreement_version: "1.0",
    currency: "PKR",
    smtp_enabled: "false",
    smtp_host: process.env.SMTP_HOST || "smtp.gmail.com",
    smtp_port: process.env.SMTP_PORT || "587",
    smtp_secure: "false",
    smtp_user: process.env.SMTP_USER || "",
    smtp_pass: process.env.SMTP_PASS || "",
    smtp_from_email: process.env.SMTP_FROM_EMAIL || "notifications@legalease.pk",
    smtp_from_name: process.env.SMTP_FROM_NAME || "LegalEase Notifications",
    imap_enabled: "false",
    imap_host: process.env.IMAP_HOST || "imap.gmail.com",
    imap_port: process.env.IMAP_PORT || "993",
    imap_user: process.env.IMAP_USER || "",
    imap_pass: process.env.IMAP_PASS || "",
    stripe_enabled: "true",
    stripe_sandbox_mode: "true",
    stripe_publishable_key:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      process.env.STRIPE_PUBLISHABLE_KEY ||
      "",
    stripe_secret_key: process.env.STRIPE_SECRET_KEY || "",
    stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || "",
    stripe_currency: process.env.STRIPE_CURRENCY || "pkr",
  };

  let aiSettings: PlatformAiSetting | null = null;

  if (supabase) {
    const { data: feeRows } = await supabase
      .from("platform_settings")
      .select("key, value");
    if (feeRows) {
      feeRows.forEach((r) => {
        if (r.value !== "") {
          settingsMap[r.key] = r.value;
        }
      });
    }

    const { data: aiRow } = await supabase
      .from("platform_ai_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (aiRow) {
      aiSettings = aiRow as PlatformAiSetting;
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
          <Settings className="size-6 text-[#0CA275]" />
          Platform Policies, SMTP Notifications, Stripe Sandbox & AI Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Centralized management for consultation fee structure, outbound SMTP & inbound
          IMAP email notifications, Stripe Sandbox escrow checkout, and RAG retrieval
          settings.
        </p>
      </div>

      <div className="space-y-6">
        <PlatformSmtpSettingsForm initialSettings={settingsMap} />
        <PlatformStripeSettingsForm initialSettings={settingsMap} />
        <PlatformGeneralSettingsForm initialSettings={settingsMap} />
        <PlatformFeeSettingsForm initialSettings={settingsMap} />
        <PlatformAiSettingsForm initialAiSettings={aiSettings} />
      </div>
    </div>
  );
}
