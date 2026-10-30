"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyAuthError } from "@/lib/auth/errors";
import {
  dashboardPathForRole,
  getRoleForUser,
} from "@/lib/auth/profile";
import { isRole, type Role } from "@/lib/auth/types";
import {
  isValidCity,
  isValidEmail,
  isValidFullName,
  isValidPassword,
  isValidPhone,
} from "@/lib/auth/validation";

export interface AuthActionResult {
  ok: boolean;
  message?: string;
  error?: string;
}

const NOT_CONFIGURED: AuthActionResult = {
  ok: false,
  error:
    "Supabase isn't configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable accounts.",
};

async function serverOrigin(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Shared client-side field validation for sign-up. */
function validateSignupFields(role: Role, formData: FormData): AuthActionResult | null {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();

  if (!isValidFullName(fullName)) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!isValidPhone(phone)) {
    return { ok: false, error: "Please enter a valid phone number (e.g. +92 300 1234567)." };
  }
  if (!isValidPassword(password)) {
    return {
      ok: false,
      error: "Password must be at least 8 characters and include both letters and numbers.",
    };
  }

  if (role === "lawyer") {
    if (!isValidCity(city)) {
      return { ok: false, error: "Please enter your city." };
    }
  }

  return null;
}

export async function signUp(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const roleParam = String(formData.get("role") ?? "");
  if (!isRole(roleParam)) {
    return {
      ok: false,
      error: "Please choose whether you're joining as a Citizen or a Lawyer.",
    };
  }

  const role: Role = roleParam;
  const validationError = validateSignupFields(role, formData);
  if (validationError) return validationError;

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await serverOrigin()}/auth/callback`,
      data: { role, full_name: fullName, phone, city },
    },
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error) };
  }

  // Email verification is OFF for this project: the session exists immediately.
  if (data.session) {
    redirect(dashboardPathForRole(role));
  }

  // Email verification is ON: show the "check your email" screen.
  return {
    ok: true,
    message: `We sent a confirmation link to ${email}. Check your inbox (and spam folder), then click the link to activate your account.`,
  };
}

export async function signIn(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(email) || !password) {
    return { ok: false, error: "Please enter your email and password." };
  }

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error) };
  }

  const role = await getRoleForUser(supabase, data.user);
  if (!role) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error:
        "Your account is missing a profile, so we can't determine your access level. Contact support for help.",
    };
  }

  redirect(dashboardPathForRole(role));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordReset(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await serverOrigin()}/auth/callback`,
  });

  if (error) {
    return { ok: false, error: friendlyAuthError(error) };
  }

  // Always return the same generic message whether or not the account exists.
  return {
    ok: true,
    message:
      "If an account exists for that email, we've sent a secure link to reset your password. Check your inbox (and spam folder).",
  };
}

export async function updatePassword(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const password = String(formData.get("password") ?? "");

  if (!isValidPassword(password)) {
    return {
      ok: false,
      error: "Password must be at least 8 characters and include both letters and numbers.",
    };
  }

  const supabase = await createClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, error: friendlyAuthError(error) };
  }

  // Force a clean re-login with the new password.
  await supabase.auth.signOut();

  return {
    ok: true,
    message: "Your password has been updated. Log in with your new password.",
  };
}