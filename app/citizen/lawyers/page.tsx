import { searchLawyers } from "@/lib/services/lawyers";
import { LawyerSearchView } from "@/components/citizen/lawyer-search-view";

export const metadata = {
  title: "Find a Lawyer | Citizen Portal",
  description: "Discover verified advocates across Pakistan by practice area, nearby location, and transparent fees.",
};

export default async function CitizenLawyersPage() {
  const initialLawyers = await searchLawyers({ sort: "recommended" });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Find a Verified Lawyer
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect with bar-certified legal professionals across Pakistan for legal advice, representation, and document vetting.
        </p>
      </div>

      <LawyerSearchView initialLawyers={initialLawyers} />
    </div>
  );
}
