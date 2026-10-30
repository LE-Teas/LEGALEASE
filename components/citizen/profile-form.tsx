"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, Save, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CITIES, PAKISTAN_CITIES } from "@/lib/constants/legal";
import type { Profile } from "@/lib/auth/types";

interface ProfileFormProps {
  initialProfile: Profile;
}

export function CitizenProfileForm({ initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [fullName, setFullName] = useState(initialProfile.full_name || "");
  const [phone, setPhone] = useState(initialProfile.phone || "");
  const [city, setCity] = useState(initialProfile.city || "Karachi");
  const [area, setArea] = useState((initialProfile as any).area || "");
  // preferred_language is always "English" — no selector shown
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cityAreas = PAKISTAN_CITIES[city] || [];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Database client not available");

      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      setError(err?.message || "Failed to upload avatar image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Database client not available");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          city: city || null,
          area: area.trim() || null,
          preferred_language: "English",
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName
    ? fullName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "LE";

  return (
    <Card className="max-w-2xl border-border bg-white shadow-sm">
      <CardHeader className="border-b border-border/70 pb-6">
        <CardTitle className="font-heading text-xl text-navy">Personal Profile</CardTitle>
        <CardDescription>
          Keep your contact information updated so advocates can confirm consultations.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-emerald-500/30 bg-emerald-50 text-emerald-800">
              <Check className="size-4 text-emerald-600" />
              <AlertDescription>Your profile was successfully updated.</AlertDescription>
            </Alert>
          )}

          {/* Avatar Upload */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="size-20 border-2 border-slate-200">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                <AvatarFallback className="bg-navy font-heading text-lg font-bold text-gold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-input"
                className="absolute bottom-0 right-0 flex size-7 cursor-pointer items-center justify-center rounded-full bg-navy text-white shadow hover:bg-navy/80"
                title="Change photo"
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <div>
              <p className="text-sm font-semibold text-navy">Profile Picture</p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG or WebP. Max 2MB. Stored securely.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="e.g. Tariq Mehmood"
              />
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={profile.email} disabled className="bg-slate-50 text-slate-500" />
              <p className="text-[11px] text-muted-foreground">Managed by Supabase Auth</p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger id="city">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area */}
            <div className="space-y-2">
              <Label htmlFor="area">Area / Locality</Label>
              {cityAreas.length > 0 ? (
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger id="area">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {cityAreas.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Clifton, DHA"
                />
              )}
            </div>

            {/* Preferred language is fixed to English */}
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving} className="bg-navy text-white hover:bg-navy/90">
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save Profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
