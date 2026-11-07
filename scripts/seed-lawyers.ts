import { createAdminClient } from "@/lib/supabase/admin";
import { loadEnv } from "@/scripts/lib/load-env";

loadEnv();

const LAWYERS = [
  {
    full_name: "Adv. Amara Rahman",
    email: "amara.rahman@legalease.pk",
    phone: "03001234567",
    city: "Karachi",
    area: "Clifton",
    professional_title: "Senior Partner, Family & Property Law",
    bar_council: "Sindh Bar Council",
    license_number: "SBC-2010-8472",
    primary_specialization: "Family Law",
    specializations: ["Family Law", "Estate Planning", "Property & Real Estate"],
    years_of_experience: 14,
    consultation_fee: 4500,
    consultation_duration: 60,
    office_address: "Suite 402, Executive Heights, Clifton Block 5",
    bio: "Amara has spent over a decade helping families navigate separation, custody, inheritance, and property settlements with empathy and clarity.",
    offers_video: true,
    offers_in_person: true,
    offers_phone: true,
    rating: 4.9,
    review_count: 187,
  },
  {
    full_name: "Adv. Danish Siddiqui",
    email: "danish.siddiqui@legalease.pk",
    phone: "03211234567",
    city: "Lahore",
    area: "Gulberg",
    professional_title: "Senior Associate, Employment & Corporate Law",
    bar_council: "Punjab Bar Council",
    license_number: "PBC-2015-3918",
    primary_specialization: "Employment Law",
    specializations: ["Employment Law", "Business & Contracts", "Consumer Rights"],
    years_of_experience: 9,
    consultation_fee: 3500,
    consultation_duration: 60,
    office_address: "Office 12, Liberty Square, Gulberg III",
    bio: "Danish advises employees and startups on contracts, terminations, and workplace disputes with deep expertise in labor litigation.",
    offers_video: true,
    offers_in_person: true,
    offers_phone: true,
    rating: 4.8,
    review_count: 142,
  },
  {
    full_name: "Adv. Fatima Naqvi",
    email: "fatima.naqvi@legalease.pk",
    phone: "03331234567",
    city: "Islamabad",
    area: "Blue Area",
    professional_title: "Founding Partner, Intellectual Property & Tech Law",
    bar_council: "Islamabad Bar Council",
    license_number: "IBC-2012-6120",
    primary_specialization: "Intellectual Property",
    specializations: ["Intellectual Property", "Business & Contracts", "Cyber Law"],
    years_of_experience: 12,
    consultation_fee: 5000,
    consultation_duration: 60,
    office_address: "Mezzanine Floor, State Life Building, Blue Area",
    bio: "Fatima protects brands, software innovations, and creative work. She has registered hundreds of trademarks and litigates IP infringement across Pakistan.",
    offers_video: true,
    offers_in_person: true,
    offers_phone: true,
    rating: 5.0,
    review_count: 96,
  },
  {
    full_name: "Adv. Usman Tariq",
    email: "usman.tariq@legalease.pk",
    phone: "03451234567",
    city: "Karachi",
    area: "Saddar",
    professional_title: "Advocate High Court, Criminal Defense",
    bar_council: "Sindh Bar Council",
    license_number: "SBC-2008-1092",
    primary_specialization: "Criminal Defense",
    specializations: ["Criminal Defense", "Bail & Constitutional Petitions", "Consumer Rights"],
    years_of_experience: 16,
    consultation_fee: 4000,
    consultation_duration: 60,
    office_address: "Chamber 208, City Courts Complex, Saddar",
    bio: "Usman has defended clients in high-stakes criminal matters for sixteen years with a focus on pre-arrest bail, fair trial rights, and appeals.",
    offers_video: true,
    offers_in_person: true,
    offers_phone: true,
    rating: 4.7,
    review_count: 231,
  },
  {
    full_name: "Adv. Zara Imran",
    email: "zara.imran@legalease.pk",
    phone: "03121234567",
    city: "Lahore",
    area: "DHA",
    professional_title: "Associate, Real Estate & Property Disputes",
    bar_council: "Punjab Bar Council",
    license_number: "PBC-2017-9104",
    primary_specialization: "Property & Real Estate",
    specializations: ["Property & Real Estate", "Rent Disputes & Eviction", "Civil Litigation"],
    years_of_experience: 7,
    consultation_fee: 3000,
    consultation_duration: 60,
    office_address: "Building 18-C, Commercial Broadway, DHA Phase 5",
    bio: "Zara specialises in title verification, possession disputes, and rent eviction proceedings across housing societies and urban centers.",
    offers_video: true,
    offers_in_person: true,
    offers_phone: true,
    rating: 4.8,
    review_count: 88,
  },
  {
    full_name: "Adv. Omer Sheikh",
    email: "omer.sheikh@legalease.pk",
    phone: "03011234567",
    city: "Islamabad",
    area: "F-7",
    professional_title: "Principal, Corporate, Banking & Commercial Contracts",
    bar_council: "Islamabad Bar Council",
    license_number: "IBC-2013-4481",
    primary_specialization: "Corporate & Commercial",
    specializations: ["Corporate & Commercial", "Banking & Finance", "Taxation & Filer Compliance"],
    years_of_experience: 11,
    consultation_fee: 6000,
    consultation_duration: 60,
    office_address: "Plot 14, College Road, Markaz F-7",
    bio: "Omer drafts and negotiates agreements for startups, SaaS products, and SMEs with practical risk minimization and compliance focus.",
    offers_video: true,
    offers_in_person: true,
    offers_phone: true,
    rating: 4.9,
    review_count: 174,
  },
];

async function seed() {
  console.log("Seeding verified lawyers into Supabase database...");
  const admin = createAdminClient();
  if (!admin) {
    console.error("Admin client unavailable");
    return;
  }

  for (const l of LAWYERS) {
    // 1. Create auth user first
    await admin.auth.admin.createUser({
      email: l.email,
      password: "Password123!",
      email_confirm: true,
      user_metadata: {
        full_name: l.full_name,
        role: "lawyer",
      },
    });

    // Fetch user id from auth
    const { data: usersData } = await admin.auth.admin.listUsers();
    const createdUser = usersData.users.find((u) => u.email === l.email);
    if (!createdUser) {
      console.error(`Could not find or create auth user for ${l.email}`);
      continue;
    }
    const userId = createdUser.id;

    // 2. Upsert profile
    const { error: pErr } = await admin.from("profiles").upsert(
      {
        id: userId,
        role: "lawyer",
        full_name: l.full_name,
        email: l.email,
        phone: l.phone,
        city: l.city,
        area: l.area,
        is_active: true,
      },
      { onConflict: "id" }
    );
    if (pErr) {
      console.error(`Profile error for ${l.full_name}:`, pErr);
      continue;
    }

    // 3. Upsert lawyer_profile
    const { error: lpErr } = await admin.from("lawyer_profiles").upsert(
      {
        id: userId,
        professional_title: l.professional_title,
        bar_council: l.bar_council,
        bar_license_number: l.license_number,
        primary_specialization: l.primary_specialization,
        specializations: l.specializations,
        years_of_experience: l.years_of_experience,
        consultation_fee: l.consultation_fee,
        consultation_duration: l.consultation_duration,
        office_address: l.office_address,
        bio: l.bio,
        verification_status: "verified",
        is_published: true,
        offers_video: l.offers_video,
        offers_in_person: l.offers_in_person,
        offers_phone: l.offers_phone,
        rating: l.rating,
        review_count: l.review_count,
      },
      { onConflict: "id" }
    );
    if (lpErr) {
      console.error(`Lawyer profile error for ${l.full_name}:`, lpErr);
      continue;
    }

    // 4. Upsert standard Monday-Saturday availability (09:00 - 18:00)
    for (let day = 1; day <= 6; day++) {
      await admin.from("lawyer_availability").upsert(
        {
          lawyer_id: userId,
          day_of_week: day,
          start_time: "09:00",
          end_time: "18:00",
          slot_duration: 60,
          is_active: true,
        },
        { onConflict: "lawyer_id,day_of_week" }
      );
    }

    console.log(`[ok] Seeded verified advocate: ${l.full_name} (${l.city})`);
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
