import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile || profile.role !== "lawyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      professionalTitle,
      bio,
      primarySpecialization,
      specializations,
      yearsOfExperience,
      barCouncil,
      barLicenseNumber,
      city,
      area,
      officeName,
      officeAddress,
      postalCode,
      latitude,
      longitude,
      consultationFee,
      consultationDuration,
      offersInPerson,
      offersVideo,
      offersPhone,
      languages,
      education,
      avatarUrl,
    } = body;

    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    // 1. Update profiles table for basic details
    await supabase
      .from("profiles")
      .update({
        full_name: fullName?.trim() || profile.full_name,
        phone: phone?.trim() || null,
        city: city || null,
        area: area || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // 2. Update lawyer_profiles table (verification_status is protected and NOT editable by lawyer)
    const { data: updatedLawyer, error: lawyerErr } = await supabase
      .from("lawyer_profiles")
      .update({
        professional_title: professionalTitle?.trim() || "Advocate High Court",
        bio: bio?.trim() || null,
        primary_specialization: primarySpecialization || "Civil Law",
        specializations: specializations || [],
        years_of_experience: Number(yearsOfExperience) || 0,
        bar_council: barCouncil || null,
        bar_license_number: barLicenseNumber || null,
        city: city || "Karachi",
        area: area || null,
        office_name: officeName || null,
        office_address: officeAddress || null,
        postal_code: postalCode || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        consultation_fee: Number(consultationFee) || 3000,
        consultation_duration: Number(consultationDuration) || 30,
        offers_in_person: Boolean(offersInPerson),
        offers_video: Boolean(offersVideo),
        offers_phone: Boolean(offersPhone),
        languages: languages || ["English", "Urdu"],
        education: education || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("*")
      .single();

    if (lawyerErr) {
      return NextResponse.json({ error: lawyerErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, lawyer: updatedLawyer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
