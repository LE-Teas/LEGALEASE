"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import Link from "next/link";
import {
  Check,
  Loader2,
  Lock,
  Shield,
  User,
  Sliders,
  Bell,
  Scale,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Profile } from "@/lib/auth/types";
import type { LawyerProfileRecord } from "@/lib/types/legal";
import { formatRate } from "@/lib/data/lawyers";

interface LawyerSettingsViewProps {
  profile: Profile;
  lawyerProfile: LawyerProfileRecord | null;
}

export function LawyerSettingsView({ profile, lawyerProfile }: LawyerSettingsViewProps) {
  // Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Professional Preferences State
  const [offersInPerson, setOffersInPerson] = useState(lawyerProfile?.offers_in_person ?? true);
  const [offersVideo, setOffersVideo] = useState(lawyerProfile?.offers_video ?? true);
  const [offersPhone, setOffersPhone] = useState(lawyerProfile?.offers_phone ?? false);
  const [isPublished, setIsPublished] = useState(lawyerProfile?.is_published ?? false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Notification Preferences State (persisted to profiles.notification_preferences)
  const initialNotifs = profile.notification_preferences ?? {};
  const [notifAppointments, setNotifAppointments] = useState(initialNotifs.email_appointments ?? true);
  const [notifReviews, setNotifReviews] = useState(initialNotifs.email_reviews ?? true);
  const [notifVerification, setNotifVerification] = useState(initialNotifs.email_system ?? true);
  const [notifDigest, setNotifDigest] = useState(initialNotifs.weekly_digest ?? false);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

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

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    setPrefsSuccess(false);
    setPrefsError(null);

    try {
      const res = await fetch("/api/lawyer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offers_in_person: offersInPerson,
          offers_video: offersVideo,
          offers_phone: offersPhone,
          is_published: isPublished,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update preferences");
      }

      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 4000);
    } catch (err) {
      setPrefsError(getErrorMessage(err) || "An error occurred while saving.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSaveNotificationPrefs = async () => {
    setSavingNotifs(true);
    setNotifSaved(false);
    try {
      const res = await fetch("/api/lawyer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_preferences: {
            email_appointments: notifAppointments,
            email_payments: true,
            email_reviews: notifReviews,
            email_system: notifVerification,
            weekly_digest: notifDigest,
          },
        }),
      });
      if (res.ok) {
        setNotifSaved(true);
        setTimeout(() => setNotifSaved(false), 3000);
      }
    } finally {
      setSavingNotifs(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="account" className="text-xs">
            <User className="mr-1.5 size-3.5" />
            Account
          </TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs">
            <Sliders className="mr-1.5 size-3.5" />
            Professional Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">
            <Bell className="mr-1.5 size-3.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs">
            <Shield className="mr-1.5 size-3.5" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs">
            <Lock className="mr-1.5 size-3.5" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* 1. Account Section */}
        <TabsContent value="account">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">
                Account Information
              </CardTitle>
              <CardDescription className="text-xs">
                Your registered advocate account credentials and identity status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input value={profile.full_name} disabled className="bg-slate-50 text-slate-700" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Registered Email</Label>
                <Input value={profile.email} disabled className="bg-slate-50 text-slate-700" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bar Council</Label>
                  <Input
                    value={lawyerProfile?.bar_council || "Not Specified"}
                    disabled
                    className="bg-slate-50 text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">License / Enrollment No.</Label>
                  <Input
                    value={lawyerProfile?.bar_license_number || "Not Specified"}
                    disabled
                    className="bg-slate-50 text-slate-700 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Verification Standing</Label>
                <div className="pt-1">
                  <Badge
                    variant="outline"
                    className={`capitalize text-xs px-2.5 py-1 ${
                      lawyerProfile?.verification_status === "verified"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : lawyerProfile?.verification_status === "pending"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}
                  >
                    {lawyerProfile?.verification_status?.replace("_", " ") || "Not Submitted"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <Label className="text-xs text-muted-foreground">Account User ID</Label>
                <Input
                  value={profile.id}
                  disabled
                  className="bg-slate-50 text-slate-400 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2">
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link href="/lawyer/profile/edit">
                    Edit Detailed Profile
                    <ExternalLink className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Professional Preferences Section */}
        <TabsContent value="preferences">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">
                Professional Preferences
              </CardTitle>
              <CardDescription className="text-xs">
                Configure your consultation formats and public visibility.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-lg">
              {prefsError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{prefsError}</AlertDescription>
                </Alert>
              )}

              {prefsSuccess && (
                <Alert className="border-emerald-500/30 bg-emerald-50 text-emerald-800">
                  <Check className="size-4 text-emerald-600" />
                  <AlertDescription className="text-xs">
                    Preferences successfully updated.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-navy">Consultation Formats Offered</Label>
                <p className="text-xs text-muted-foreground">
                  Specify how citizens are permitted to schedule consultations with you.
                </p>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="video"
                      checked={offersVideo}
                      onCheckedChange={(checked) => setOffersVideo(Boolean(checked))}
                    />
                    <label
                      htmlFor="video"
                      className="text-xs font-medium text-slate-700 leading-none cursor-pointer"
                    >
                      Video Consultation (Online via LegalEase Secure Meet)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="in_person"
                      checked={offersInPerson}
                      onCheckedChange={(checked) => setOffersInPerson(Boolean(checked))}
                    />
                    <label
                      htmlFor="in_person"
                      className="text-xs font-medium text-slate-700 leading-none cursor-pointer"
                    >
                      In-Person Consultation (At registered chambers/office)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="phone"
                      checked={offersPhone}
                      onCheckedChange={(checked) => setOffersPhone(Boolean(checked))}
                    />
                    <label
                      htmlFor="phone"
                      className="text-xs font-medium text-slate-700 leading-none cursor-pointer"
                    >
                      Phone Consultation
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <Label className="text-sm font-semibold text-navy">Directory Visibility</Label>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="published"
                    checked={isPublished}
                    onCheckedChange={(checked) => setIsPublished(Boolean(checked))}
                  />
                  <div className="grid gap-1 leading-none">
                    <label
                      htmlFor="published"
                      className="text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      Publish my profile in Citizen Find a Lawyer directory
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Requires verified Bar Council status. Unchecking this temporarily hides your profile from citizen searches.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200/60 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Base Fee:</span>
                  <span className="font-bold text-navy">
                    {formatRate(lawyerProfile?.consultation_fee ?? 3000)} / session
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Default Duration:</span>
                  <span className="font-bold text-navy">
                    {lawyerProfile?.consultation_duration ?? 30} minutes
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  To adjust your fee schedule, practice areas, or bio, visit the{" "}
                  <Link href="/lawyer/profile/edit" className="text-teal underline font-medium">
                    Profile Editor
                  </Link>
                  .
                </p>
              </div>

              <Button
                onClick={handleSavePreferences}
                disabled={savingPrefs}
                className="bg-navy text-white hover:bg-navy/90 text-xs"
              >
                {savingPrefs ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Notifications Section */}
        <TabsContent value="notifications">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">
                Notification Preferences (SMTP Email & Portal)
              </CardTitle>
              <CardDescription className="text-xs">
                Choose what alerts and reminders you receive via email ({profile.email}) and portal banners.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              {notifSaved && (
                <Alert className="border-emerald-500/30 bg-emerald-50 text-emerald-800">
                  <Check className="size-4 text-emerald-600" />
                  <AlertDescription className="text-xs">
                    Notification preferences saved to database.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="notif_appts"
                    checked={notifAppointments}
                    onCheckedChange={(c) => setNotifAppointments(Boolean(c))}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label htmlFor="notif_appts" className="text-xs font-medium text-slate-700 cursor-pointer">
                      New Consultation Requests & Client Messages
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Immediate SMTP email & portal alert when a citizen books a slot or sends a message
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="notif_rev"
                    checked={notifReviews}
                    onCheckedChange={(c) => setNotifReviews(Boolean(c))}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label htmlFor="notif_rev" className="text-xs font-medium text-slate-700 cursor-pointer">
                      Client Feedback & Reviews
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Alerts when a client submits a rating after a completed consultation
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="notif_ver"
                    checked={notifVerification}
                    onCheckedChange={(c) => setNotifVerification(Boolean(c))}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label htmlFor="notif_ver" className="text-xs font-medium text-slate-700 cursor-pointer">
                      Bar Council Verification & Admin Updates
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Notices regarding license verification, support tickets, and compliance checks
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="notif_dig"
                    checked={notifDigest}
                    onCheckedChange={(c) => setNotifDigest(Boolean(c))}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label htmlFor="notif_dig" className="text-xs font-medium text-slate-700 cursor-pointer">
                      Weekly Consultation Digest
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      A weekly overview of completed sessions and client inquiries
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveNotificationPrefs}
                  disabled={savingNotifs}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {savingNotifs ? "Saving..." : "Save Notification Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Privacy Section */}
        <TabsContent value="privacy">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">
                Privacy & Professional Confidentiality
              </CardTitle>
              <CardDescription className="text-xs">
                Standards protecting your practice data and client interactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-slate-700 leading-relaxed max-w-2xl">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <p className="font-bold text-navy flex items-center gap-1.5">
                  <Scale className="size-4 text-gold" />
                  Advocate-Client Privilege
                </p>
                <p>
                  All appointment subjects, matter briefs, and consultation records between you and citizens are strictly confidential under legal ethics guidelines and Row-Level Security (RLS) policies. Only you and the respective client have read permissions.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <p className="font-bold text-navy flex items-center gap-1.5">
                  <Shield className="size-4 text-teal" />
                  Bar License Verification Privacy
                </p>
                <p>
                  Documents submitted for Bar Council verification (CNIC, Bar Council ID card, Enrollment Certificates) are accessible only to verified LegalEase administrative compliance auditors and are never published to public profiles.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Security Section */}
        <TabsContent value="security">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-navy">
                Change Password
              </CardTitle>
              <CardDescription className="text-xs">
                Ensure your advocate account is protected with a secure, strong password.
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
                  <Label htmlFor="lawyerNewPassword">New Password</Label>
                  <Input
                    id="lawyerNewPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lawyerConfirmPassword">Confirm New Password</Label>
                  <Input
                    id="lawyerConfirmPassword"
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
      </Tabs>
    </div>
  );
}
