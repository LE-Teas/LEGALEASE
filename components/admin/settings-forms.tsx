"use client";

import { useState } from "react";
import { Loader2, Save, Sparkles, DollarSign, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePlatformSettingAction, updatePlatformAiSettingsAction } from "@/app/actions/admin";
import type { PlatformSetting, PlatformAiSetting } from "@/lib/types/legal";

interface SettingsFormsProps {
  initialSettings: Record<string, string>;
  initialAiSettings: PlatformAiSetting | null;
}

export function PlatformFeeSettingsForm({
  initialSettings,
}: {
  initialSettings: Record<string, string>;
}) {
  const [feeType, setFeeType] = useState(initialSettings["platform_fee_type"] || "percentage");
  const [feeValue, setFeeValue] = useState(initialSettings["platform_fee_value"] || "10");
  const [taxPercentage, setTaxPercentage] = useState(initialSettings["tax_percentage"] || "0");
  const [agreementVersion, setAgreementVersion] = useState(
    initialSettings["agreement_version"] || "v1.0"
  );
  const [currency, setCurrency] = useState(initialSettings["currency"] || "PKR");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await updatePlatformSettingAction("platform_fee_type", feeType);
      await updatePlatformSettingAction("platform_fee_value", feeValue);
      await updatePlatformSettingAction("tax_percentage", taxPercentage);
      await updatePlatformSettingAction("agreement_version", agreementVersion);
      await updatePlatformSettingAction("currency", currency);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update platform settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-navy/10 p-2 text-navy">
            <DollarSign className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-lg text-navy">Platform Fee Policy</CardTitle>
            <CardDescription className="text-xs">
              Configure monetization parameters and consultation service charges applied to bookings.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="size-4" /> Settings updated successfully!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="feeType" className="text-xs font-semibold">
                Fee Calculation Model
              </Label>
              <select
                id="feeType"
                value={feeType}
                onChange={(e) => setFeeType(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="percentage">Percentage of Lawyer Fee (%)</option>
                <option value="fixed">Fixed Flat Rate (PKR)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feeValue" className="text-xs font-semibold">
                Fee Value ({feeType === "percentage" ? "%" : "PKR"})
              </Label>
              <Input
                id="feeValue"
                type="number"
                step="any"
                value={feeValue}
                onChange={(e) => setFeeValue(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taxPercentage" className="text-xs font-semibold">
                Sales Tax / PRA / SRB (%)
              </Label>
              <Input
                id="taxPercentage"
                type="number"
                step="any"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-xs font-semibold">
                Billing Currency
              </Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="text-xs uppercase"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="agreementVersion" className="text-xs font-semibold">
                Active Agreement Version Identifier
              </Label>
              <Input
                id="agreementVersion"
                value={agreementVersion}
                onChange={(e) => setAgreementVersion(e.target.value)}
                className="text-xs"
                placeholder="v1.0"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-navy text-white hover:bg-navy/90 text-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5 mr-1.5" />
                  Save Platform Fees
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PlatformAiSettingsForm({
  initialAiSettings,
}: {
  initialAiSettings: PlatformAiSetting | null;
}) {
  const [provider, setProvider] = useState(initialAiSettings?.provider || "gemini");
  const [model, setModel] = useState(initialAiSettings?.model || "gemini-2.5-flash");
  const [temperature, setTemperature] = useState(
    initialAiSettings?.temperature?.toString() || "0.2"
  );
  const [maxTokens, setMaxTokens] = useState(
    initialAiSettings?.max_tokens?.toString() || "2048"
  );
  const [ragEnabled, setRagEnabled] = useState(
    initialAiSettings?.rag_enabled !== undefined ? initialAiSettings.rag_enabled : true
  );
  const [similarityThreshold, setSimilarityThreshold] = useState(
    initialAiSettings?.similarity_threshold?.toString() || "0.65"
  );
  const [matchCount, setMatchCount] = useState(
    initialAiSettings?.match_count?.toString() || "5"
  );
  const [systemPromptOverride, setSystemPromptOverride] = useState(
    initialAiSettings?.system_prompt_override || ""
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await updatePlatformAiSettingsAction({
        provider,
        model,
        temperature: parseFloat(temperature),
        max_tokens: parseInt(maxTokens, 10),
        rag_enabled: ragEnabled,
        similarity_threshold: parseFloat(similarityThreshold),
        match_count: parseInt(matchCount, 10),
        system_prompt_override: systemPromptOverride.trim() || null,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update AI settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-teal/10 p-2 text-teal">
            <Sparkles className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-lg text-navy">Legal AI & RAG Configuration</CardTitle>
            <CardDescription className="text-xs">
              Tune parameters, retrieval threshold, and system instructions for the Legal Assistant.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="size-4" /> AI configuration saved!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="provider" className="text-xs font-semibold">
                AI Provider
              </Label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="openrouter">OpenRouter AI Gateway (Recommended)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="model" className="text-xs font-semibold">
                Model Identifier
              </Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="text-xs"
                placeholder="gemini-2.5-flash"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="temperature" className="text-xs font-semibold">
                Temperature (0.0 to 1.0)
              </Label>
              <Input
                id="temperature"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxTokens" className="text-xs font-semibold">
                Max Output Tokens
              </Label>
              <Input
                id="maxTokens"
                type="number"
                step="128"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="similarityThreshold" className="text-xs font-semibold">
                RAG Cosine Similarity Threshold (0.0 - 1.0)
              </Label>
              <Input
                id="similarityThreshold"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="matchCount" className="text-xs font-semibold">
                RAG Top-K Chunk Matches
              </Label>
              <Input
                id="matchCount"
                type="number"
                min="1"
                max="20"
                value={matchCount}
                onChange={(e) => setMatchCount(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-2 flex items-center justify-between border rounded-lg p-3 bg-slate-50/50">
              <div>
                <Label htmlFor="ragToggle" className="text-xs font-semibold cursor-pointer">
                  Enable Retrieval-Augmented Generation (RAG)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When enabled, queries will search Pakistan legal documents & statutory statutes.
                </p>
              </div>
              <Switch
                id="ragToggle"
                checked={ragEnabled}
                onCheckedChange={setRagEnabled}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="systemPrompt" className="text-xs font-semibold">
                System Prompt Override (Optional)
              </Label>
              <Textarea
                id="systemPrompt"
                rows={3}
                value={systemPromptOverride}
                onChange={(e) => setSystemPromptOverride(e.target.value)}
                className="text-xs"
                placeholder="Leave blank to use the default specialized Pakistani Legal Assistant system instruction..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-navy text-white hover:bg-navy/90 text-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5 mr-1.5" />
                  Save AI Configuration
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PlatformGeneralSettingsForm({
  initialSettings,
}: {
  initialSettings: Record<string, string>;
}) {
  const [platformName, setPlatformName] = useState(initialSettings["platform_name"] || "LegalEase");
  const [supportEmail, setSupportEmail] = useState(initialSettings["support_email"] || "support@legalease.pk");
  const [bookingAdvanceDays, setBookingAdvanceDays] = useState(initialSettings["booking_advance_days"] || "60");
  const [cancellationHours, setCancellationHours] = useState(initialSettings["cancellation_cutoff_hours"] || "24");
  const [jitsiDomain, setJitsiDomain] = useState(initialSettings["jitsi_domain"] || "meet.jit.si");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await updatePlatformSettingAction("platform_name", platformName);
      await updatePlatformSettingAction("support_email", supportEmail);
      await updatePlatformSettingAction("booking_advance_days", bookingAdvanceDays);
      await updatePlatformSettingAction("cancellation_cutoff_hours", cancellationHours);
      await updatePlatformSettingAction("jitsi_domain", jitsiDomain);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update general settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[#0CA275]/10 p-2 text-[#0CA275]">
            <Save className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-lg text-[#0A2843]">
              Platform Identity & Consultation Rules
            </CardTitle>
            <CardDescription className="text-xs">
              Configure brand identity, support contact, and citizen booking advance constraints.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="size-4" /> Platform settings saved and active!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="platformName" className="text-xs font-semibold">
                Platform Name & Wordmark
              </Label>
              <Input
                id="platformName"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supportEmail" className="text-xs font-semibold">
                Official Support Email
              </Label>
              <Input
                id="supportEmail"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bookingAdvanceDays" className="text-xs font-semibold">
                Max Advance Booking (Days)
              </Label>
              <Input
                id="bookingAdvanceDays"
                type="number"
                min={1}
                max={365}
                value={bookingAdvanceDays}
                onChange={(e) => setBookingAdvanceDays(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cancellationHours" className="text-xs font-semibold">
                Cancellation Cutoff Notice (Hours)
              </Label>
              <Input
                id="cancellationHours"
                type="number"
                min={0}
                max={168}
                value={cancellationHours}
                onChange={(e) => setCancellationHours(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="jitsiDomain" className="text-xs font-semibold">
                Video Consultation Gateway Domain (Jitsi Meet)
              </Label>
              <Input
                id="jitsiDomain"
                value={jitsiDomain}
                onChange={(e) => setJitsiDomain(e.target.value)}
                placeholder="meet.jit.si"
                className="text-xs h-9 bg-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5 mr-1.5" />
                  Save Platform Defaults
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

