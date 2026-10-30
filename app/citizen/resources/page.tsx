import { getLegalResources } from "@/lib/services/resources";
import { ResourcesView } from "@/components/citizen/resources-view";

export const metadata = {
  title: "Legal Resources | Citizen Portal",
  description: "Plain-language guides and statutory breakdowns of Pakistani law, police procedures, tenant rights, and civil remedies.",
};

export default async function CitizenResourcesPage() {
  const resources = await getLegalResources();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Legal Knowledge & Guides
        </h2>
        <p className="text-sm text-muted-foreground">
          Practical, plain-language legal overviews covering fundamental rights, court systems, and statutory processes in Pakistan.
        </p>
      </div>

      <ResourcesView initialResources={resources} />
    </div>
  );
}
