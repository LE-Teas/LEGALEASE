/**
 * Application roles and profile types.
 *
 * Roles live in the `profiles` database table (never in the client). New
 * accounts may only register as `citizen` or `lawyer`; the `admin` role is
 * granted explicitly by operators (see set_profile_role).
 */
export const ROLES = ["citizen", "lawyer", "admin"] as const;

export type Role = (typeof ROLES)[number];

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  area?: string | null;
  avatar_url: string | null;
  is_active?: boolean;
  notification_preferences?: {
    email_appointments?: boolean;
    email_payments?: boolean;
    email_reviews?: boolean;
    email_system?: boolean;
    weekly_digest?: boolean;
    email_marketing?: boolean;
    in_app_all?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

export const DASHBOARD_PATH: Record<Role, string> = {
  citizen: "/citizen/dashboard",
  lawyer: "/lawyer/dashboard",
  admin: "/admin",
};
