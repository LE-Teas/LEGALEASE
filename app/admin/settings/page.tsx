import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Settings, Sliders } from "lucide-react";
import {
  PlatformFeeSettingsForm,
  PlatformAiSettingsForm,
  PlatformGeneralSettingsForm,
} from "@/components/admin/settings-forms";
import type { PlatformAiSetting } from "@/lib/types/legal";

export const metadata: Metadata = {
  title: "Platform Settings & AI Engine | LegalEase Admin",
  description: "Configure consultation fee policy, platform defaults, and legal AI/RAG parameters.",
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
    agreement_version: "v1.0",
    currency: "PKR",
  };

  let aiSettings: PlatformAiSetting | null = null;

  if (supabase) {
    // 1. Load platform settings
    const { data: feeRows } = await supabase.from("platform_settings").select("key, value");
    if (feeRows) {
      feeRows.forEach((r) => {
        settingsMap[r.key] = r.value;
      });
    }

    // 2. Load active AI settings
    const { data: aiRow } = await supabase
      .from("platform_ai_settings")
      .select("*")
      .eq("is_active", true)
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
          Platform Policies & AI Engine Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Centralized management for consultation fee structure, platform identity defaults, and RAG retrieval settings.
        </p>
      </div>

      <div className="space-y-6">
        <PlatformGeneralSettingsForm initialSettings={settingsMap} />
        <PlatformFeeSettingsForm initialSettings={settingsMap} />
        <PlatformAiSettingsForm initialAiSettings={aiSettings} />
      </div>
    </div>
  );
}
