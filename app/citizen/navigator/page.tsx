import { getAuthState } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { LegalActionNavigator } from "@/components/citizen/legal-action-navigator";

export const metadata = {
  title: "Legal Action Navigator | LegalEase",
  description:
    "Form-driven step-by-step decision tree providing structured next steps, required document checklists, risk classification, and verified lawyer matching for Karachi & Sindh.",
};

export default async function LegalActionNavigatorPage() {
  const { user, profile } = await getAuthState();
  if (!user || !profile) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Legal Action Navigator
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          A structured decision tree designed for Pakistani jurisdiction. Identify your rights, procedural steps, document checklists, and urgency level before taking action.
        </p>
      </div>

      <LegalActionNavigator userId={user.id} />
    </div>
  );
}
