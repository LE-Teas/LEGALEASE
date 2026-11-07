"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { Bell, Check, Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import type { Profile } from "@/lib/auth/types";

interface SettingsViewProps {
  profile: Profile;
}

export function SettingsView({ profile }: SettingsViewProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const prefs = profile.notification_preferences ?? {};
  const [emailAppointments, setEmailAppointments] = useState(prefs.email_appointments ?? true);
  const [emailPayments, setEmailPayments] = useState(prefs.email_payments ?? true);
  const [emailSystem, setEmailSystem] = useState(prefs.email_system ?? true);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase client unavailable");

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(getErrorMessage(err) || "Failed to update password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveNotifPrefs = async () => {
    setSavingNotifs(true);
    setNotifError(null);
    setNotifSuccess(false);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Database client unavailable");

      const { error } = await supabase
        .from("profiles")
        .update({
          notification_preferences: {
            email_appointments: emailAppointments,
            email_payments: emailPayments,
            email_reviews: true,
            email_system: emailSystem,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 3500);
    } catch (err) {
      setNotifError(getErrorMessage(err));
    } finally {
      setSavingNotifs(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="security" className="text-xs">
            Password & Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">
            Email & Notification Preferences
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs">
            Account Details
          </TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs">
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">
                Change Password
              </CardTitle>
              <CardDescription className="text-xs">
                Ensure your account is using a strong, unique password to safeguard your records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                {passwordError && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">{passwordError}</AlertDescription>
                  </Alert>
                )}

                {passwordSuccess && (
                  <Alert className="border-emerald-500/30 bg-emerald-50 text-emerald-800">
                    <Check className="size-4 text-emerald-600" />
                    <AlertDescription className="text-xs">
                      Your password has been successfully updated.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={changingPassword}
                  className="bg-navy text-white hover:bg-navy/90 text-xs"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 size-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy flex items-center gap-2">
                <Bell className="size-4.5 text-teal" />
                SMTP Email & In-App Notification Preferences
              </CardTitle>
              <CardDescription className="text-xs">
                Control which consultation, payment, and platform updates are dispatched to {profile.email}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              {notifError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{notifError}</AlertDescription>
                </Alert>
              )}
              {notifSuccess && (
                <Alert className="border-emerald-500/30 bg-emerald-50 text-emerald-800">
                  <Check className="size-4 text-emerald-600" />
                  <AlertDescription className="text-xs">
                    Notification preferences saved to your profile.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="cit_notif_appts"
                    checked={emailAppointments}
                    onCheckedChange={(c) => setEmailAppointments(Boolean(c))}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label htmlFor="cit_notif_appts" className="text-xs font-medium text-slate-700 cursor-pointer">
                      Consultation Booking & Status Alerts
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Receive SMTP emails when an advocate confirms, completes, or messages on your consultation
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="cit_notif_pay"
                    checked={emailPayments}
                    onCheckedChange={(c) => setEmailPayments(Boolean(c))}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label htmlFor="cit_notif_pay" className="text-xs font-medium text-slate-700 cursor-pointer">
                      Stripe Sandbox Escrow Receipts & Refunds
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Receive payment confirmation receipts and automatic refund notifications
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="cit_notif_sys"
                    checked={emailSystem}
                    onCheckedChange={(c) => setEmailSystem(Boolean(c))}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label htmlFor="cit_notif_sys" className="text-xs font-medium text-slate-700 cursor-pointer">
                      Support Desk Replies & Platform Announcements
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Receive email alerts when LegalEase Support responds to your tickets
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSaveNotifPrefs}
                disabled={savingNotifs}
                className="bg-navy text-white hover:bg-navy/90 text-xs"
              >
                {savingNotifs ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Notification Preferences"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">
                Account Information
              </CardTitle>
              <CardDescription className="text-xs">
                Your primary LegalEase authentication credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Account Email</Label>
                <Input value={profile.email} disabled className="bg-slate-50 text-slate-600" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Account Role</Label>
                <Input value={profile.role.toUpperCase()} disabled className="bg-slate-50 text-slate-600 capitalize font-mono text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">User ID</Label>
                <Input value={profile.id} disabled className="bg-slate-50 text-slate-400 font-mono text-[11px]" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">
                Privacy & Data Retention
              </CardTitle>
              <CardDescription className="text-xs">
                How your information is protected across LegalEase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <p className="font-bold text-navy">Confidential Consultations & File Vault</p>
                <p>
                  Details of legal matters described during booking and documents uploaded to your Private File Vault are protected by Row-Level Security (`citizen_id = auth.uid()`) and are never shared with other users.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <p className="font-bold text-navy">Geographic Location</p>
                <p>
                  Location coordinates captured via &ldquo;Use My Location&rdquo; are transiently processed by PostGIS for nearby advocate calculation and are never permanently tracked or shared.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
