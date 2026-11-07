"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import {
  Loader2,
  Save,
  Sparkles,
  DollarSign,
  CheckCircle2,
  Mail,
  Send,
  RefreshCw,
  CreditCard,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updatePlatformSettingAction,
  updatePlatformSettingsBatchAction,
  updatePlatformAiSettingsAction,
} from "@/app/actions/admin";
import type { PlatformAiSetting } from "@/lib/types/legal";

export function PlatformFeeSettingsForm({
  initialSettings,
}: {
  initialSettings: Record<string, string>;
}) {
  const [feeType, setFeeType] = useState(
    initialSettings["platform_fee_type"] || "percentage"
  );
  const [feeValue, setFeeValue] = useState(
    initialSettings["platform_fee_value"] || "10"
  );
  const [taxPercentage, setTaxPercentage] = useState(
    initialSettings["tax_percentage"] || "0"
  );
  const [agreementVersion, setAgreementVersion] = useState(
    initialSettings["consultation_agreement_version"] ||
      initialSettings["agreement_version"] ||
      "1.0"
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
      await updatePlatformSettingsBatchAction({
        platform_fee_type: feeType,
        platform_fee_value: feeValue,
        tax_percentage: taxPercentage,
        consultation_agreement_version: agreementVersion,
        agreement_version: agreementVersion,
        currency,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to update platform settings.");
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
            <CardTitle className="font-heading text-lg text-navy">
              Platform Fee Policy
            </CardTitle>
            <CardDescription className="text-xs">
              Configure monetization parameters and consultation service charges applied
              to bookings.
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
                placeholder="1.0"
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

export function PlatformSmtpSettingsForm({
  initialSettings,
}: {
  initialSettings: Record<string, string>;
}) {
  const [smtpEnabled, setSmtpEnabled] = useState(
    initialSettings["smtp_enabled"] === "true"
  );
  const [smtpHost, setSmtpHost] = useState(
    initialSettings["smtp_host"] || "smtp.gmail.com"
  );
  const [smtpPort, setSmtpPort] = useState(initialSettings["smtp_port"] || "587");
  const [smtpSecure, setSmtpSecure] = useState(
    initialSettings["smtp_secure"] === "true"
  );
  const [smtpUser, setSmtpUser] = useState(initialSettings["smtp_user"] || "");
  const [smtpPass, setSmtpPass] = useState(initialSettings["smtp_pass"] || "");
  const [smtpFromEmail, setSmtpFromEmail] = useState(
    initialSettings["smtp_from_email"] || "notifications@legalease.pk"
  );
  const [smtpFromName, setSmtpFromName] = useState(
    initialSettings["smtp_from_name"] || "LegalEase Notifications"
  );

  const [imapEnabled, setImapEnabled] = useState(
    initialSettings["imap_enabled"] === "true"
  );
  const [imapHost, setImapHost] = useState(
    initialSettings["imap_host"] || "imap.gmail.com"
  );
  const [imapPort, setImapPort] = useState(initialSettings["imap_port"] || "993");
  const [imapUser, setImapUser] = useState(initialSettings["imap_user"] || "");
  const [imapPass, setImapPass] = useState(initialSettings["imap_pass"] || "");

  const [testRecipient, setTestRecipient] = useState(
    initialSettings["support_email"] || "admin@legalease.pk"
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingImap, setSyncingImap] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMessage(null);
    setError(null);
    try {
      await updatePlatformSettingsBatchAction({
        smtp_enabled: smtpEnabled ? "true" : "false",
        smtp_host: smtpHost.trim(),
        smtp_port: smtpPort.trim(),
        smtp_secure: smtpSecure ? "true" : "false",
        smtp_user: smtpUser.trim(),
        smtp_pass: smtpPass,
        smtp_from_email: smtpFromEmail.trim(),
        smtp_from_name: smtpFromName.trim(),
        imap_enabled: imapEnabled ? "true" : "false",
        imap_host: imapHost.trim(),
        imap_port: imapPort.trim(),
        imap_user: imapUser.trim(),
        imap_pass: imapPass,
      });
      setSavedMessage("SMTP & Inbound IMAP settings saved successfully.");
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to save SMTP settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setTesting(true);
    setSavedMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_test",
          toEmail: testRecipient,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Test email failed");
      }
      setSavedMessage(data.message);
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to send test email");
    } finally {
      setTesting(false);
    }
  };

  const handleSyncImap = async () => {
    setSyncingImap(true);
    setSavedMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_imap" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "IMAP sync failed");
      }
      if (data.success) {
        setSavedMessage(data.message);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to sync IMAP");
    } finally {
      setSyncingImap(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[#0CA275]/10 p-2 text-[#0CA275]">
            <Mail className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-lg text-[#0A2843]">
              SMTP Outbound & Inbound Email Notification Gateway
            </CardTitle>
            <CardDescription className="text-xs">
              Configure SMTP server credentials to send notification emails and IMAP /
              Webhook settings to receive inbound emails in the Admin Notification Center.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}
          {savedMessage && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{savedMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between border rounded-lg p-3 bg-slate-50/60">
            <div>
              <Label htmlFor="smtpEnabled" className="text-xs font-semibold cursor-pointer">
                Enable Outbound SMTP Email Notifications
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Automatically send emails on booking requests, confirmations, Stripe
                Sandbox receipts, verification updates, and announcements.
              </p>
            </div>
            <Switch
              id="smtpEnabled"
              checked={smtpEnabled}
              onCheckedChange={setSmtpEnabled}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">SMTP Host</Label>
              <Input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                SMTP Port (587 STARTTLS / 465 SSL)
              </Label>
              <Input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-white">
                <Label htmlFor="smtpSecure" className="text-xs font-medium">
                  Direct SSL (Port 465)
                </Label>
                <Switch
                  id="smtpSecure"
                  checked={smtpSecure}
                  onCheckedChange={setSmtpSecure}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">SMTP Username / Email</Label>
              <Input
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="notifications@legalease.pk"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">SMTP App Password</Label>
              <Input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••••••••••"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Sender Display Name</Label>
              <Input
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder="LegalEase Notifications"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label className="text-xs font-semibold">From Email Address</Label>
              <Input
                type="email"
                value={smtpFromEmail}
                onChange={(e) => setSmtpFromEmail(e.target.value)}
                placeholder="notifications@legalease.pk"
                className="text-xs"
              />
            </div>
          </div>

          {/* Inbound IMAP & Webhook Section */}
          <div className="border-t border-slate-200 pt-4 space-y-4">
            <div className="flex items-center justify-between border rounded-lg p-3 bg-slate-50/60">
              <div>
                <Label
                  htmlFor="imapEnabled"
                  className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <Inbox className="size-3.5 text-[#0CA275]" />
                  Enable Inbound Email Fetching (IMAP + Inbound Webhook)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Receive replies and support emails directly into Admin Notifications (or
                  via POST <code className="font-mono">/api/webhooks/email-inbound</code>).
                </p>
              </div>
              <Switch
                id="imapEnabled"
                checked={imapEnabled}
                onCheckedChange={setImapEnabled}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">IMAP Host</Label>
                <Input
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  placeholder="imap.gmail.com"
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">IMAP SSL Port</Label>
                <Input
                  type="number"
                  value={imapPort}
                  onChange={(e) => setImapPort(e.target.value)}
                  placeholder="993"
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">IMAP Username</Label>
                <Input
                  value={imapUser}
                  onChange={(e) => setImapUser(e.target.value)}
                  placeholder="support@legalease.pk"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">IMAP Password</Label>
                <Input
                  type="password"
                  value={imapPass}
                  onChange={(e) => setImapPass(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Test & Save Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="Test recipient email..."
                className="text-xs h-8 w-56"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={testing}
                onClick={handleSendTestEmail}
                className="text-xs h-8"
              >
                {testing ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="size-3.5 mr-1.5 text-[#0CA275]" />
                )}
                Send Test Email
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={syncingImap}
                onClick={handleSyncImap}
                className="text-xs h-8"
              >
                {syncingImap ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5 mr-1.5 text-navy" />
                )}
                Test / Sync IMAP Inbox
              </Button>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving SMTP...
                </>
              ) : (
                <>
                  <Save className="size-3.5 mr-1.5" />
                  Save SMTP & IMAP Config
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PlatformStripeSettingsForm({
  initialSettings,
}: {
  initialSettings: Record<string, string>;
}) {
  const [enabled, setEnabled] = useState(
    initialSettings["stripe_enabled"] !== "false"
  );
  const [sandboxMode, setSandboxMode] = useState(
    initialSettings["stripe_sandbox_mode"] !== "false"
  );
  const [publishableKey, setPublishableKey] = useState(
    initialSettings["stripe_publishable_key"] || ""
  );
  const [secretKey, setSecretKey] = useState(
    initialSettings["stripe_secret_key"] || ""
  );
  const [webhookSecret, setWebhookSecret] = useState(
    initialSettings["stripe_webhook_secret"] || ""
  );
  const [currency, setCurrency] = useState(
    initialSettings["stripe_currency"] || "pkr"
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
      await updatePlatformSettingsBatchAction({
        stripe_enabled: enabled ? "true" : "false",
        stripe_sandbox_mode: sandboxMode ? "true" : "false",
        stripe_publishable_key: publishableKey.trim(),
        stripe_secret_key: secretKey.trim(),
        stripe_webhook_secret: webhookSecret.trim(),
        stripe_currency: currency.trim().toLowerCase() || "pkr",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to save Stripe Sandbox settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600">
            <CreditCard className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-lg text-[#0A2843]">
              Stripe Sandbox Payment Gateway & Webhook Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Configure Stripe Sandbox (Test Mode) Publishable Key, Secret Key, Currency, and
              Stripe-Signature HMAC-SHA256 Webhook Signing Secret for consultation escrow payments.
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
              <CheckCircle2 className="size-4" /> Stripe Sandbox gateway configuration
              updated!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between border rounded-lg p-3 bg-slate-50/50">
              <div>
                <Label htmlFor="stripeEnabled" className="text-xs font-semibold">
                  Enable Stripe Sandbox Escrow Gateway
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Collect consultation fees before unlocking video chambers.
                </p>
              </div>
              <Switch id="stripeEnabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3 bg-slate-50/50">
              <div>
                <Label htmlFor="stripeSandboxMode" className="text-xs font-semibold">
                  Stripe Sandbox (Test Mode)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Use Stripe test keys (pk_test_ / sk_test_) & signed webhook verification.
                </p>
              </div>
              <Switch
                id="stripeSandboxMode"
                checked={sandboxMode}
                onCheckedChange={setSandboxMode}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Stripe Publishable Key (Sandbox)
              </Label>
              <Input
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder="pk_test_51..."
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Stripe Secret Key (Sandbox)
              </Label>
              <Input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="sk_test_51..."
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Webhook Signing Secret (Stripe-Signature HMAC-SHA256)
              </Label>
              <Input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="whsec_..."
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Settlement Currency (ISO)
              </Label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="pkr"
                className="text-xs font-mono uppercase"
              />
            </div>

            <div className="md:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Webhook Endpoint URL:</span>{" "}
              <code className="font-mono text-[#0A2843] bg-white px-2 py-0.5 rounded border">
                POST /api/webhooks/stripe
              </code>{" "}
              — Subscribe to <code className="font-mono">checkout.session.completed</code>,{" "}
              <code className="font-mono">payment_intent.succeeded</code>, and{" "}
              <code className="font-mono">charge.refunded</code> events in your Stripe
              Developers Workbench (Sandbox).
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
                  Save Stripe Sandbox Settings
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
  const [provider, setProvider] = useState(
    initialAiSettings?.provider || "gemini"
  );
  const [model, setModel] = useState(
    initialAiSettings?.generation_model ||
      initialAiSettings?.model ||
      "gemini-3.5-flash"
  );
  const [embeddingModel, setEmbeddingModel] = useState(
    initialAiSettings?.embedding_model || "text-embedding-004"
  );
  const [temperature, setTemperature] = useState(
    initialAiSettings?.temperature?.toString() || "0.2"
  );
  const [maxTokens, setMaxTokens] = useState(
    initialAiSettings?.max_tokens?.toString() || "2048"
  );
  const [ragEnabled, setRagEnabled] = useState(
    initialAiSettings?.rag_enabled !== undefined
      ? initialAiSettings.rag_enabled
      : true
  );
  const [similarityThreshold, setSimilarityThreshold] = useState(
    initialAiSettings?.similarity_threshold?.toString() || "0.35"
  );
  const [matchCount, setMatchCount] = useState(
    (
      initialAiSettings?.retrieval_top_k ??
      initialAiSettings?.match_count ??
      8
    ).toString()
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    initialAiSettings?.maintenance_mode ?? false
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
        embedding_model: embeddingModel,
        temperature: parseFloat(temperature),
        max_tokens: parseInt(maxTokens, 10),
        rag_enabled: ragEnabled,
        similarity_threshold: parseFloat(similarityThreshold),
        match_count: parseInt(matchCount, 10),
        maintenance_mode: maintenanceMode,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to update AI settings.");
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
            <CardTitle className="font-heading text-lg text-navy">
              Legal AI & RAG Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Tune parameters, retrieval threshold, and generation models for the Legal
              Assistant.
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
              <Label htmlFor="model" className="text-xs font-semibold">
                Generation Model Identifier
              </Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="text-xs font-mono"
                placeholder="openai/gpt-4o-mini"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="embeddingModel" className="text-xs font-semibold">
                Embedding Model Identifier
              </Label>
              <Input
                id="embeddingModel"
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                className="text-xs font-mono"
                placeholder="text-embedding-3-small"
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

            <div className="space-y-1.5 flex items-center justify-between border rounded-lg p-3 bg-slate-50/50">
              <div>
                <Label htmlFor="ragToggle" className="text-xs font-semibold cursor-pointer">
                  Enable Retrieval-Augmented Generation (RAG)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Ground answers in verified Pakistani statutes & uploaded citizen docs.
                </p>
              </div>
              <Switch
                id="ragToggle"
                checked={ragEnabled}
                onCheckedChange={setRagEnabled}
              />
            </div>

            <div className="space-y-1.5 flex items-center justify-between border rounded-lg p-3 bg-slate-50/50">
              <div>
                <Label
                  htmlFor="maintenanceToggle"
                  className="text-xs font-semibold cursor-pointer"
                >
                  AI Maintenance Mode
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Temporarily pause AI chat completions during corpus re-indexing.
                </p>
              </div>
              <Switch
                id="maintenanceToggle"
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
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
  const [platformName, setPlatformName] = useState(
    initialSettings["platform_name"] || "LegalEase"
  );
  const [supportEmail, setSupportEmail] = useState(
    initialSettings["support_email"] || "support@legalease.pk"
  );
  const [bookingAdvanceDays, setBookingAdvanceDays] = useState(
    initialSettings["booking_advance_days"] || "60"
  );
  const [cancellationHours, setCancellationHours] = useState(
    initialSettings["cancellation_cutoff_hours"] || "24"
  );
  const [jitsiDomain, setJitsiDomain] = useState(
    initialSettings["jitsi_domain"] || "meet.jit.si"
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
      await updatePlatformSettingAction("platform_name", platformName);
      await updatePlatformSettingAction("support_email", supportEmail);
      await updatePlatformSettingAction("booking_advance_days", bookingAdvanceDays);
      await updatePlatformSettingAction(
        "cancellation_cutoff_hours",
        cancellationHours
      );
      await updatePlatformSettingAction("jitsi_domain", jitsiDomain);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to update general settings.");
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
              Configure brand identity, support contact, and citizen booking advance
              constraints.
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
