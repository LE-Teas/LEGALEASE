import Link from "next/link";
import {
  FileText,
  FilePlus2,
  Printer,
  Download,
  AlertTriangle,
  FolderOpen,
  Eye,
  ShieldCheck,
  Clock,
  Sparkles,
  FileCheck,
  Search,
} from "lucide-react";
import { getAuthState } from "@/lib/auth/profile";
import { getCitizenDocuments } from "@/lib/services/documents";
import { getLawyerAppointments } from "@/lib/services/appointments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = {
  title: "Documents & Work Product | Lawyer Portal",
  description: "Manage client consultation attachments, generated legal drafts, and chamber work product.",
};

export default async function LawyerDocumentsPage() {
  const { user } = await getAuthState();
  if (!user) return null;

  const [appointments, citizenDocs] = await Promise.all([
    getLawyerAppointments(user.id),
    getCitizenDocuments(user.id),
  ]);

  // Appointments with client matter notes or attachments
  const consultationMatters = appointments.filter(
    (a) => a.citizen_notes || a.description || a.subject
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-navy">
            Documents & Chamber Work Product
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage legal drafts, consultation case materials, affidavits, and formal legal notices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild className="bg-navy text-white hover:bg-navy/90 text-xs">
            <Link href="/citizen/documents/generate">
              <FilePlus2 className="mr-1.5 size-4" />
              Draft Legal Notice / Affidavit
            </Link>
          </Button>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900">
        <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-950">
            Professional Responsibility & Court Filing Advisory
          </p>
          <p className="text-amber-900/90 leading-relaxed">
            LegalEase provides assisted document generation and client-shared intake records. All drafts are working templates that require independent verification, fact-checking, and execution under Pakistan Bar Council Rules 1976. LegalEase does not automatically serve notices or file pleadings in court.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Case Consultations</p>
              <p className="font-heading text-2xl font-bold text-navy mt-1">
                {consultationMatters.length}
              </p>
            </div>
            <div className="size-10 rounded-full bg-navy/10 flex items-center justify-center text-navy">
              <FolderOpen className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Generated Drafts</p>
              <p className="font-heading text-2xl font-bold text-teal mt-1">
                {citizenDocs.length}
              </p>
            </div>
            <div className="size-10 rounded-full bg-teal-soft flex items-center justify-center text-teal">
              <Sparkles className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Drafts Requiring Review</p>
              <p className="font-heading text-2xl font-bold text-amber-600 mt-1">
                {citizenDocs.filter((d) => d.status === "draft").length}
              </p>
            </div>
            <div className="size-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Documents Workspace */}
      <Tabs defaultValue="consultations" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="consultations" className="text-xs font-medium">
            Client Consultation Files ({consultationMatters.length})
          </TabsTrigger>
          <TabsTrigger value="drafts" className="text-xs font-medium">
            Chamber Drafts & Notices ({citizenDocs.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs font-medium">
            Statutory Templates (Pakistan Law)
          </TabsTrigger>
        </TabsList>

        {/* 1. Client Consultation Files */}
        <TabsContent value="consultations" className="space-y-4">
          {consultationMatters.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                  <FileText className="size-7" />
                </div>
                <h3 className="font-heading text-lg font-bold text-navy">No Client Case Files Yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mt-1">
                  When citizens schedule consultations and share legal issue summaries or intake documents, their case briefs will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {consultationMatters.map((appt) => (
                <Card key={appt.id} className="border-border hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="outline" className="text-[10px] mb-1.5 uppercase font-semibold text-teal border-teal/30 bg-teal-soft/30">
                          {appt.legal_category || "General Matter"}
                        </Badge>
                        <CardTitle className="font-heading text-base font-bold text-navy">
                          {appt.subject || "Legal Consultation Brief"}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Client: <span className="font-semibold text-slate-800">{appt.citizen?.full_name || "Citizen Client"}</span> • Date: {appt.appointment_date}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {appt.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {appt.description && (
                      <div className="rounded-lg bg-slate-50 p-3 text-slate-700 leading-relaxed line-clamp-3">
                        {appt.description}
                      </div>
                    )}
                    {appt.citizen_notes && (
                      <div className="text-[11px] text-muted-foreground">
                        <strong className="text-slate-700">Client Intake Notes:</strong> {appt.citizen_notes}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-muted-foreground">
                        Confidential Client Communication
                      </span>
                      <Button asChild size="sm" variant="outline" className="text-xs h-8">
                        <Link href={`/lawyer/appointments/${appt.id}`}>
                          <Eye className="mr-1.5 size-3.5" />
                          View Consultation Workspace
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 2. Chamber Drafts & Notices */}
        <TabsContent value="drafts" className="space-y-4">
          {citizenDocs.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                  <Sparkles className="size-7" />
                </div>
                <h3 className="font-heading text-lg font-bold text-navy">No Legal Drafts Created</h3>
                <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6">
                  Generate recovery notices under the Negotiable Instruments Act 1881, sworn affidavits, landlord-tenant undertakings, or general authorizations.
                </p>
                <Button asChild className="bg-navy text-white hover:bg-navy/90 text-xs">
                  <Link href="/citizen/documents/generate">
                    <FilePlus2 className="mr-1.5 size-3.5" />
                    Create New Draft
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {citizenDocs.map((doc) => (
                <Card key={doc.id} className="flex flex-col justify-between border-border hover:shadow-sm transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] font-semibold text-navy">
                        {doc.template_type.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] capitalize font-medium ${
                          doc.status === "finalized"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {doc.status === "draft" ? "Draft — Review Required" : doc.status}
                      </Badge>
                    </div>
                    <CardTitle className="font-heading text-base font-bold text-navy mt-2">
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Updated {new Date(doc.updated_at).toLocaleDateString("en-PK", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 line-clamp-3 font-mono">
                      {doc.generated_content.slice(0, 150)}...
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                      <Button asChild size="sm" variant="outline" className="text-xs h-8">
                        <Link href={`/citizen/documents/generate?id=${doc.id}`}>
                          Review & Edit
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="text-xs h-8">
                        <Link href={`/citizen/documents/generate?id=${doc.id}`}>
                          <Printer className="mr-1 size-3.5" />
                          View & Print
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. Statutory Templates (Pakistan Law) */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Legal Notice for Recovery of Dues",
                law: "Negotiable Instruments Act 1881 / Contract Act 1872",
                desc: "Formal statutory demand notice sent prior to initiating civil recovery suit or Section 489-F PPC proceedings.",
                type: "recovery_notice",
              },
              {
                title: "General Sworn Affidavit",
                law: "Oaths Act 1873 / Civil Procedure Code 1908",
                desc: "Deposition on oath before an Oath Commissioner / Notary Public for verification of facts or declaration of status.",
                type: "affidavit",
              },
              {
                title: "Tenancy Eviction / Default Notice",
                law: "Sindh Rented Premises Ordinance 1979 / Punjab Rented Premises Act",
                desc: "Statutory 14-day or 30-day notice demanding payment of accumulated arrears or vacation of rented premises.",
                type: "eviction_notice",
              },
              {
                title: "Special Power of Attorney (Wakalatnama)",
                law: "Powers of Attorney Act 1882 / Legal Practitioners & Bar Councils Act",
                desc: "Authorization appointing an Advocate to represent, plead, and act before courts, tribunals, and authorities.",
                type: "power_of_attorney",
              },
              {
                title: "Consumer Court Dispute Notice",
                law: "Sindh Consumer Protection Act 2014",
                desc: "Mandatory statutory 15-day pre-litigation legal notice served upon manufacturer/vendor before filing complaint.",
                type: "consumer_notice",
              },
              {
                title: "Employee Termination / Grievance Notice",
                law: "Industrial & Commercial Employment (Standing Orders) Ordinance 1968",
                desc: "Formal reply to show-cause notice or statutory grievance petition before the Labour Court.",
                type: "labour_notice",
              },
            ].map((tmpl) => (
              <Card key={tmpl.title} className="border-border flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <Badge variant="outline" className="text-[10px] w-fit font-semibold text-teal border-teal/30 bg-teal-soft/30">
                    Standard Precedent
                  </Badge>
                  <CardTitle className="font-heading text-sm font-bold text-navy mt-1.5">
                    {tmpl.title}
                  </CardTitle>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Governing Law: {tmpl.law}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {tmpl.desc}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button asChild size="sm" className="w-full bg-navy text-white hover:bg-navy/90 text-xs">
                    <Link href={`/citizen/documents/generate?template=${tmpl.type}`}>
                      <FilePlus2 className="mr-1.5 size-3.5" />
                      Create Working Draft
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
