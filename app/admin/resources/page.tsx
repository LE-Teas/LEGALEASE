import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  BookOpen,
  FileText,
  HelpCircle,
  FolderTree,
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resources as defaultResources } from "@/lib/data/resources";
import { faqs as defaultFaqs } from "@/lib/data/faqs";

export const metadata: Metadata = {
  title: "Legal Resources & Content Management | LegalEase Admin",
  description: "Manage educational legal guides, citizen document-generation templates, and platform FAQs.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminResourcesPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const activeTab = tab || "guides";
  const supabase = await createClient();

  let dbResources: any[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("legal_resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      dbResources = data;
    }
  }

  // Use database resources if loaded, otherwise fallback to static standard resources
  const displayResources = dbResources.length > 0
    ? dbResources.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        readingTime: r.reading_time || "5 min read",
        summary: r.summary,
        updated: r.updated_date || "2026",
        isDb: true,
      }))
    : defaultResources.map((r) => ({ ...r, isDb: false }));

  const templatesList = [
    {
      id: "legal_notice_recovery",
      name: "Legal Notice for Debt / Money Recovery",
      category: "Civil & Commercial",
      law: "Section 80 CPC & Negotiable Instruments Act",
      status: "Published",
      usageCount: 42,
    },
    {
      id: "tenancy_eviction_notice",
      name: "Tenancy Vacate & Eviction Notice",
      category: "Property & Rent",
      law: "Sindh Rented Premises Ordinance / Punjab Rented Premises Act",
      status: "Published",
      usageCount: 78,
    },
    {
      id: "consumer_grievance_notice",
      name: "Consumer Grievance Legal Notice",
      category: "Consumer Rights",
      law: "Sindh Consumer Protection Act / Islamabad Consumer Protection Act",
      status: "Published",
      usageCount: 29,
    },
    {
      id: "employment_resignation_notice",
      name: "Employment Legal Termination Response",
      category: "Labor & Employment",
      law: "Industrial and Commercial Employment Standing Orders",
      status: "Published",
      usageCount: 19,
    },
    {
      id: "general_power_of_attorney",
      name: "Special Power of Attorney (Drafting Template)",
      category: "Registration & Deeds",
      law: "Powers of Attorney Act, 1882",
      status: "Review Required",
      usageCount: 11,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A2843] flex items-center gap-2">
            <BookOpen className="size-6 text-[#0CA275]" />
            Legal Resources & Content Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Curate informational citizen legal guides, automated drafting templates, and public FAQs.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge className="bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30">
            {displayResources.length} Educational Guides
          </Badge>
          <Badge variant="outline" className="border-slate-300 text-slate-700">
            {templatesList.length} Active Templates
          </Badge>
        </div>
      </div>

      {/* Differentiating Banner */}
      <div className="rounded-lg bg-blue-50/70 border border-blue-200 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
        <Sparkles className="size-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-blue-950">Statutory Integrity Safeguard:</strong> Informational guides and document templates are strictly maintained separate from the authoritative RAG statutes knowledge base. Citations are reviewed for compliance with federal and provincial Pakistani legislation before public release.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Link
          href="/admin/resources?tab=guides"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "guides" ? "bg-[#0A2843] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Citizen Legal Guides ({displayResources.length})
        </Link>
        <Link
          href="/admin/resources?tab=templates"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "templates" ? "bg-[#0A2843] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Document Generation Templates ({templatesList.length})
        </Link>
        <Link
          href="/admin/resources?tab=faqs"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "faqs" ? "bg-[#0A2843] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Platform FAQs ({defaultFaqs.length})
        </Link>
      </div>

      {/* Tab 1: Legal Guides */}
      {activeTab === "guides" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayResources.map((res) => (
            <Card key={res.id} className="border-slate-200 bg-white flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                    {res.category}
                  </Badge>
                  <span className="text-[11px] text-slate-400">{res.readingTime}</span>
                </div>
                <CardTitle className="font-heading text-sm font-semibold text-[#0A2843] pt-1">
                  {res.title}
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 line-clamp-3">
                  {res.summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2">
                <span>{res.updated}</span>
                <span className="inline-flex items-center gap-1 text-[#0CA275] font-medium">
                  <CheckCircle2 className="size-3" /> Reviewed
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 2: Document Generation Templates */}
      {activeTab === "templates" && (
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base text-[#0A2843]">
              Standard Legal Notice & Agreement Templates
            </CardTitle>
            <CardDescription className="text-xs">
              Templates used by citizens in the automated document generator with statutory safeguards.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Template Name</th>
                  <th className="px-4 py-3">Legal Domain</th>
                  <th className="px-4 py-3">Governing Legislation</th>
                  <th className="px-4 py-3">Generated by Citizens</th>
                  <th className="px-4 py-3">Publication Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templatesList.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                      <FileCode className="size-4 text-[#0CA275]" />
                      {tpl.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{tpl.category}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{tpl.law}</td>
                    <td className="px-4 py-3 font-bold text-[#0A2843]">{tpl.usageCount} times</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          tpl.status === "Published"
                            ? "bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]"
                            : "bg-amber-50 text-amber-800 text-[10px]"
                        }
                      >
                        {tpl.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: FAQs */}
      {activeTab === "faqs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {defaultFaqs.flatMap((group) =>
            group.items.map((item, itemIdx) => (
              <Card key={`${group.category}-${itemIdx}`} className="border-slate-200 bg-white">
                <CardHeader className="pb-2">
                  <div className="text-[10px] uppercase font-semibold text-[#0CA275] tracking-wider mb-1">
                    {group.category}
                  </div>
                  <CardTitle className="font-heading text-sm font-semibold text-[#0A2843] flex items-start gap-2">
                    <HelpCircle className="size-4 text-[#0CA275] shrink-0 mt-0.5" />
                    <span>{item.question}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 leading-relaxed">
                  {item.answer}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
