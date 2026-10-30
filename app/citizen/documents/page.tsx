import Link from "next/link";
import { FilePlus2, FileText, Printer, Trash2 } from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { getCitizenDocuments } from "@/lib/services/documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "My Documents | Citizen Portal",
  description: "View, edit, and print your drafted legal notices, affidavits, and agreements.",
};

export default async function CitizenDocumentsPage() {
  const { user } = await getAuthState();
  if (!user) return null;

  const documents = await getCitizenDocuments(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
            Legal Documents
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your generated legal drafts, notices, and statutory affidavits.
          </p>
        </div>
        <Button asChild className="bg-navy text-white hover:bg-navy/90">
          <Link href="/citizen/documents/generate">
            <FilePlus2 className="mr-2 size-4" />
            Generate New Document
          </Link>
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FileText className="size-7" />
          </div>
          <h3 className="mt-4 font-heading text-lg font-bold text-navy">
            No legal documents created yet
          </h3>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            Generate formal recovery notices, sworn affidavits, undertakings, or authorization letters tailored to Pakistani legal standards.
          </p>
          <Button asChild className="mt-5 bg-navy text-white hover:bg-navy/90 text-xs">
            <Link href="/citizen/documents/generate">
              <FilePlus2 className="mr-1.5 size-3.5" />
              Create Your First Document
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="flex flex-col justify-between border-border/80 hover:shadow-sm transition-all">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {doc.template_type.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant={doc.status === "finalized" ? "default" : "secondary"}
                    className={
                      doc.status === "finalized"
                        ? "bg-emerald-600 text-white text-[10px]"
                        : "bg-slate-100 text-slate-700 text-[10px]"
                    }
                  >
                    {doc.status}
                  </Badge>
                </div>
                <CardTitle className="font-heading text-base text-navy mt-2 line-clamp-2">
                  {doc.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <p className="text-xs text-muted-foreground line-clamp-3 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {doc.generated_content.slice(0, 150)}...
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Created:{" "}
                    {new Date(doc.created_at).toLocaleDateString("en-PK", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-teal hover:text-navy">
                    <Link href="/citizen/documents/generate">Open in Generator</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
