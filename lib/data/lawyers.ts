import { SPECIALIZATIONS, CITIES as CITY_LIST } from "@/lib/constants/legal";
import type { LawyerWithProfile } from "@/lib/types/legal";

export const PRACTICE_AREAS = SPECIALIZATIONS;
export const CITIES = CITY_LIST;

export type PracticeArea = (typeof PRACTICE_AREAS)[number];
export type City = string;

export interface Lawyer {
  id: string;
  name: string;
  title: string;
  practiceAreas: string[];
  city: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  languages: string[];
  education: string;
  verified: boolean;
  availability: "Available" | "Booked 2 weeks" | "Accepting new clients";
  bio: string;
  approach: string;
  focus: string[];
  officeAddress?: string;
  phone?: string;
  distanceKm?: number;
}

/** Format currency rate to PKR */
export const formatRate = (ratePerHour: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(ratePerHour);

export function mapDbLawyerToLawyer(row: LawyerWithProfile): Lawyer {
  return {
    id: row.id,
    name: row.full_name,
    title: row.professional_title || "Advocate High Court",
    practiceAreas:
      row.specializations && row.specializations.length > 0
        ? row.specializations
        : [row.primary_specialization || "Civil Law"],
    city: row.city || "Karachi",
    experienceYears: row.years_of_experience || 1,
    rating: Number(row.rating) || 0,
    reviewCount: row.review_count || 0,
    hourlyRate: Number(row.consultation_fee) || 3000,
    languages: row.languages || ["English", "Urdu"],
    education: row.education || "LL.B. Honours",
    verified: row.verification_status === "verified",
    availability: "Available",
    bio: row.bio || "Dedicated legal professional licensed to practice before the courts in Pakistan.",
    approach: "Providing transparent legal advisory, procedural diligence, and client-centric representation.",
    focus: row.specializations || [row.primary_specialization || "Civil Law"],
    officeAddress: row.office_address || undefined,
    phone: row.phone || undefined,
    distanceKm: row.distance_km,
  };
}

/** Empty array for fallback - NO hardcoded demo records */
export const lawyers: Lawyer[] = [];