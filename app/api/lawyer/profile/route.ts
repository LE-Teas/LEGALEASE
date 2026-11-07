import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { getAuthState } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      bankName,
      bankAccountTitle,
      bankIban,
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
    const updatePayload: Record<string, unknown> = {
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
    };

    if (bankName !== undefined) updatePayload.bank_name = bankName?.trim() || null;
    if (bankAccountTitle !== undefined) updatePayload.bank_account_title = bankAccountTitle?.trim() || null;
    if (bankIban !== undefined) updatePayload.bank_iban = bankIban?.trim() || null;

    const { data: updatedLawyer, error: lawyerErr } = await supabase
      .from("lawyer_profiles")
      .update(updatePayload)
      .eq("id", user.id)
      .select("*")
      .single();

    if (lawyerErr) {
      return NextResponse.json({ error: lawyerErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, lawyer: updatedLawyer });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, profile } = await getAuthState();
    if (!user || !profile || profile.role !== "lawyer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const supabase = createAdminClient() ?? (await createClient());
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    // Fetch current lawyer profile to enforce verification gate on is_published
    const { data: existingLawyer } = await supabase
      .from("lawyer_profiles")
      .select("verification_status, is_published")
      .eq("id", user.id)
      .maybeSingle();

    const lawyerUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.offers_in_person === "boolean") {
      lawyerUpdates.offers_in_person = body.offers_in_person;
    }
    if (typeof body.offers_video === "boolean") {
      lawyerUpdates.offers_video = body.offers_video;
    }
    if (typeof body.offers_phone === "boolean") {
      lawyerUpdates.offers_phone = body.offers_phone;
    }
    if (typeof body.is_published === "boolean") {
      if (body.is_published && existingLawyer?.verification_status !== "verified") {
        return NextResponse.json(
          {
            error:
              "Your Bar Council credentials must be verified by an administrator before your profile can be published in the Citizen Directory.",
          },
          { status: 403 }
        );
      }
      lawyerUpdates.is_published = body.is_published;
    }
    if (body.bank_name !== undefined) {
      lawyerUpdates.bank_name = String(body.bank_name || "").trim() || null;
    }
    if (body.bank_account_title !== undefined) {
      lawyerUpdates.bank_account_title = String(body.bank_account_title || "").trim() || null;
    }
    if (body.bank_iban !== undefined) {
      lawyerUpdates.bank_iban = String(body.bank_iban || "").trim() || null;
    }

    if (Object.keys(lawyerUpdates).length > 1) {
      const { error: lawyerErr } = await supabase
        .from("lawyer_profiles")
        .update(lawyerUpdates)
        .eq("id", user.id);

      if (lawyerErr) {
        return NextResponse.json({ error: lawyerErr.message }, { status: 400 });
      }
    }

    if (body.notification_preferences && typeof body.notification_preferences === "object") {
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          notification_preferences: body.notification_preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profErr) {
        return NextResponse.json({ error: profErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
