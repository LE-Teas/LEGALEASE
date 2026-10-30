"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { Check, KeyRound, Loader2, Lock, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Profile } from "@/lib/auth/types";

interface SettingsViewProps {
  profile: Profile;
}

export function SettingsView({ profile }: SettingsViewProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
      setCurrentPassword("");
    } catch (err) {
      setPasswordError(getErrorMessage(err) || "Failed to update password.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="security" className="text-xs">
            Password & Security
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
                <p className="font-bold text-navy">Confidential Consultations</p>
                <p>
                  Details of legal matters described during booking are encrypted and only accessible to you and your selected advocate.
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
