"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { signUp, type AuthActionResult } from "@/app/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import type { Role } from "@/lib/auth/types";

const initialState: AuthActionResult = { ok: true };

interface SignupFormProps {
  role: Role;
  onBack: () => void;
}

export function SignupForm({ role, onBack }: SignupFormProps) {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [clientError, setClientError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Account created but waiting on email confirmation.
  if (state.ok && state.message) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-teal/30 bg-teal-soft/60 px-6 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-teal text-white">
          <MailCheck className="size-6" />
        </span>
        <h2 className="mt-5 font-heading text-lg font-bold text-navy">
          Check your email
        </h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {state.message}
        </p>
        <Button asChild variant="outline" className="mt-5 text-navy">
          <Link href="/login">Go to log in</Link>
        </Button>
      </div>
    );
  }

  const isLawyer = role === "lawyer";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = formData.get("password") as string | null;
    const confirm = formData.get("confirm_password") as string | null;

    if (password !== confirm) {
      event.preventDefault();
      setClientError("Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      event.preventDefault();
      setClientError("Please accept the Terms of Service to continue.");
      return;
    }
    setClientError(null);
  };

  const error = clientError ?? state.error;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-navy"
      >
        <ArrowLeft className="size-3.5" />
        {isLawyer ? "Join as a different role" : "Choose a different role"}
      </button>

      <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
        <input type="hidden" name="role" value={role} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            placeholder={isLawyer ? "e.g. Sarim Ahmed" : "Aliya Khan"}
            autoComplete="name"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+92 300 1234567"
            autoComplete="tel"
            required
          />
        </div>

        {isLawyer && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              placeholder="e.g. Karachi"
              autoComplete="address-level2"
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <span className="text-xs text-muted-foreground">
              Min. 8 characters, letters + numbers
            </span>
          </div>
          <PasswordInput
            id="password"
            name="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm_password">Confirm password</Label>
          <PasswordInput
            id="confirm_password"
            name="confirm_password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="terms"
            name="terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => {
              setAcceptedTerms(Boolean(checked));
              if (checked) setClientError(null);
            }}
            className="mt-0.5"
          />
          <Label
            htmlFor="terms"
            className="text-xs font-normal leading-relaxed cursor-pointer"
          >
            I agree to the Terms of Service and Privacy Policy, and I understand
            the AI assistant is not a substitute for legal advice.
          </Label>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Account creation failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {isLawyer ? "Create lawyer account" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal hover:text-navy">
          Log in
        </Link>
      </p>
    </div>
  );
}