"use client";

import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  CheckCircle2,
  Loader2,
  LocateFixed,
  Save,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  SPECIALIZATIONS,
  BAR_COUNCILS,
  CITIES,
  PAKISTAN_CITIES,
} from "@/lib/constants/legal";
import type { LawyerProfileRecord } from "@/lib/types/legal";
import type { Profile } from "@/lib/auth/types";

interface ProfileEditorProps {
  lawyer: LawyerProfileRecord;
  profile: Profile;
}

export function LawyerProfileEditor({ lawyer, profile }: ProfileEditorProps) {
  const router = useRouter();

  // Personal
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Professional
  const [professionalTitle, setProfessionalTitle] = useState(lawyer.professional_title || "Advocate High Court");
  const [bio, setBio] = useState(lawyer.bio || "");
  const [primarySpec, setPrimarySpec] = useState(lawyer.primary_specialization || "Civil Law");
  const [specializations, setSpecializations] = useState<string[]>(lawyer.specializations || ["Civil Law"]);
  const [experience, setExperience] = useState(String(lawyer.years_of_experience || 1));
  const [education, setEducation] = useState(lawyer.education || "");
  const [barCouncil, setBarCouncil] = useState(lawyer.bar_council || BAR_COUNCILS[0]);
  const [barLicenseNumber, setBarLicenseNumber] = useState(lawyer.bar_license_number || "");

  // Office & Location
  const [city, setCity] = useState(lawyer.city || "Karachi");
  const [area, setArea] = useState(lawyer.area || "");
  const [officeName, setOfficeName] = useState(lawyer.office_name || "");
  const [officeAddress, setOfficeAddress] = useState(lawyer.office_address || "");
  const [postalCode, setPostalCode] = useState(lawyer.postal_code || "");
  const [latitude, setLatitude] = useState(lawyer.latitude ? String(lawyer.latitude) : "");
  const [longitude, setLongitude] = useState(lawyer.longitude ? String(lawyer.longitude) : "");
  const [locatingOffice, setLocatingOffice] = useState(false);

  // Consultation Settings
  const [consultationFee, setConsultationFee] = useState(String(lawyer.consultation_fee || 3000));
  const [duration, setDuration] = useState(String(lawyer.consultation_duration || 30));
  const [offersInPerson, setOffersInPerson] = useState(lawyer.offers_in_person ?? true);
  const [offersVideo, setOffersVideo] = useState(lawyer.offers_video ?? true);
  const [offersPhone, setOffersPhone] = useState(lawyer.offers_phone ?? true);

  // Status & Feedback
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const cityAreas = PAKISTAN_CITIES[city] || [];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase unavailable");

      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCaptureOfficeLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocatingOffice(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocatingOffice(false);
      },
      () => {
        setLocatingOffice(false);
        setError("Could not capture office coordinates. You can enter them manually.");
      }
    );
  };

  const toggleSpecialization = (spec: string) => {
    setSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/lawyer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          professionalTitle,
          bio,
          primarySpecialization: primarySpec,
          specializations,
          yearsOfExperience: experience,
          barCouncil,
          barLicenseNumber,
          city,
          area,
          officeName,
          officeAddress,
          postalCode,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          consultationFee: consultationFee,
          consultationDuration: duration,
          offersInPerson,
          offersVideo,
          offersPhone,
          education,
          avatarUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-emerald-500/30 bg-emerald-50 text-emerald-800">
          <Check className="size-4 text-emerald-600" />
          <AlertDescription>Your chamber profile has been updated successfully.</AlertDescription>
        </Alert>
      )}

      {/* 1. Identity & Photo */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-navy">Personal & Chamber Identity</CardTitle>
          <CardDescription className="text-xs">
            Public-facing identification for verified citizens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="size-20 border-2 border-slate-200">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                <AvatarFallback className="bg-navy font-heading text-lg font-bold text-gold">
                  {fullName.slice(0, 2).toUpperCase()}
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
              <p className="text-sm font-semibold text-navy">Professional Chamber Photo</p>
              <p className="text-xs text-muted-foreground">
                High-resolution headshot in court / formal attire builds trust.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="professionalTitle">Professional Title</Label>
              <Input
                id="professionalTitle"
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
                placeholder="e.g. Advocate High Court / Senior Partner"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="education">Education & Degrees</Label>
              <Input
                id="education"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. LL.B. (Hons) University of Karachi, LL.M. London"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Professional Bio & Approach</Label>
            <Textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your background, years in litigation or corporate advisory, court representation, and client philosophy..."
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Practice Areas & Specializations */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-navy">Specializations & Bar Credentials</CardTitle>
          <CardDescription className="text-xs">
            Configure your primary legal domain and secondary focus areas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="primarySpec">Primary Specialization</Label>
              <Select value={primarySpec} onValueChange={setPrimarySpec}>
                <SelectTrigger id="primarySpec">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALIZATIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                max="60"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="barCouncil">Bar Council</Label>
              <Select value={barCouncil} onValueChange={setBarCouncil}>
                <SelectTrigger id="barCouncil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BAR_COUNCILS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="barLicenseNumber">Bar License / Enrolment Number</Label>
            <Input
              id="barLicenseNumber"
              value={barLicenseNumber}
              onChange={(e) => setBarLicenseNumber(e.target.value)}
              placeholder="e.g. SBC/HC-14285"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              Secondary Practice Areas (Citizens can discover you by any of these)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {SPECIALIZATIONS.map((spec) => {
                const checked = specializations.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialization(spec)}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs text-left transition-colors ${
                      checked
                        ? "border-teal bg-teal-soft/40 text-teal font-semibold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`size-4 rounded flex items-center justify-center border ${
                        checked ? "bg-teal border-teal text-white" : "border-slate-300"
                      }`}
                    >
                      {checked && <Check className="size-3" />}
                    </div>
                    <span>{spec}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Office & Location */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-navy">Chamber & Physical Office Location</CardTitle>
          <CardDescription className="text-xs">
            Used by citizens for in-person consultations and nearest-lawyer PostGIS search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Select value={city} onValueChange={(c) => { setCity(c); setArea(""); }}>
                <SelectTrigger id="city">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="area">Area / Locality</Label>
              {cityAreas.length > 0 ? (
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger id="area">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {cityAreas.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
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

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="officeName">Office / Chamber Name (Optional)</Label>
              <Input
                id="officeName"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="e.g. Tariq & Associates Chambers"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="officeAddress">Complete Office Address</Label>
              <Input
                id="officeAddress"
                value={officeAddress}
                onChange={(e) => setOfficeAddress(e.target.value)}
                placeholder="e.g. Suite 402, Business Center, Main Clifton Road, Karachi"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="latitude">Latitude (PostGIS Coordinates)</Label>
              <Input
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 24.8607"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="longitude">Longitude (PostGIS Coordinates)</Label>
              <Input
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 67.0011"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCaptureOfficeLocation}
              disabled={locatingOffice}
              className="text-xs text-teal border-teal/30 hover:bg-teal-soft/40"
            >
              {locatingOffice ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <LocateFixed className="mr-1.5 size-3.5" />
              )}
              Capture Current Chamber GPS Coordinates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. Consultation Settings & Pricing */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-navy">Consultation Settings & Fees</CardTitle>
          <CardDescription className="text-xs">
            Set your consultation duration, advisory fee, and communication channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="consultationFee">Consultation Fee (PKR)</Label>
              <Input
                id="consultationFee"
                type="number"
                min="0"
                step="500"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration">Session Duration (Minutes)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 Minutes</SelectItem>
                  <SelectItem value="30">30 Minutes</SelectItem>
                  <SelectItem value="45">45 Minutes</SelectItem>
                  <SelectItem value="60">60 Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <Label className="text-xs font-semibold text-slate-700">Offered Consultation Modes</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <Checkbox
                  checked={offersInPerson}
                  onCheckedChange={(c) => setOffersInPerson(Boolean(c))}
                />
                <span>In-Person Chamber Visit</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <Checkbox
                  checked={offersVideo}
                  onCheckedChange={(c) => setOffersVideo(Boolean(c))}
                />
                <span>Video Conference</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <Checkbox
                  checked={offersPhone}
                  onCheckedChange={(c) => setOffersPhone(Boolean(c))}
                />
                <span>Phone Consultation</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/lawyer/profile")}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="bg-navy text-white hover:bg-navy/90"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving Profile...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              Save Chamber Profile
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
