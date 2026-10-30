import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentGenerator } from "@/components/citizen/document-generator";

export const metadata = {
  title: "Generate Legal Document | Citizen Portal",
  description: "Create standard Pakistani legal notices, affidavits, undertakings, and authorization letters.",
};

export default function CitizenDocumentGeneratePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-navy">
          <Link href="/citizen/documents">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Documents
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
          Generate Legal Document
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a Pakistani statutory template, populate the required facts, and export or print your formatted legal draft.
        </p>
      </div>

      <DocumentGenerator />
    </div>
  );
}
