import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/profile";

export const metadata: Metadata = {
  title: "AI Legal Assistant",
  description:
    "Ask the LegalEase AI assistant about your rights and next steps in plain language.",
};

export default async function AiAssistantPage() {
  const { user } = await getAuthState();

  // Secure: If user is not logged in, redirect them to login with return URL
  if (!user) {
    redirect("/login?next=/citizen/ai-assistant");
  }

  // If already logged in, redirect directly to the interactive citizen AI Assistant
  redirect("/citizen/ai-assistant");
}
