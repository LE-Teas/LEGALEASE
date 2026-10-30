"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  ShieldAlert,
  Scale,
  Download,
  Building2,
  Briefcase,
  Users,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface LegalDomainConfig {
  id: string;
  title: string;
  icon: React.ElementType;
  law: string;
  court: string;
  subIssues: {
    id: string;
    label: string;
    urgency: "critical" | "high" | "medium";
    steps: { period: string; title: string; desc: string }[];
    docs: string[];
    timeline: string;
    practiceArea: string;
  }[];
}

const DOMAINS: LegalDomainConfig[] = [
  {
    id: "tenancy",
    title: "Tenancy & Rent Disputes",
    icon: Building2,
    law: "Sindh Rented Premises Ordinance, 1979",
    court: "Rent Controller Court (Karachi)",
    subIssues: [
      {
        id: "eviction_no_notice",
        label: "Landlord attempting eviction without valid court order or statutory notice",
        urgency: "high",
        steps: [
          {
            period: "Day 1 – 3",
            title: "Document Possession & Notice",
            desc: "Gather lease agreement, utility bills in your name, and bank rent deposit receipts. Landlords cannot dispossess without an order from the Rent Controller.",
          },
          {
            period: "Day 4 – 7",
            title: "Issue Written Formal Reply",
            desc: "Send a formal written reply through registered AD or courier asserting protection under Section 15 of SRPO 1979.",
          },
          {
            period: "Court Stage",
            title: "File Injunction / Reply to Eviction Application",
            desc: "Appear before the Rent Controller of your district (e.g. East, South, Central). File written statement within statutory summons period.",
          },
        ],
        docs: [
          "Registered or Unregistered Tenancy Agreement",
          "Rent Payment Receipts / Bank Statement entries",
          "Written Notice or WhatsApp communication from Landlord",
          "CNIC of Tenant and Landlord",
        ],
        timeline: "3 to 6 months before the Rent Controller",
        practiceArea: "Property Law",
      },
      {
        id: "security_deposit",
        label: "Landlord withholding security deposit after peaceful handover",
        urgency: "medium",
        steps: [
          {
            period: "Day 1 – 7",
            title: "Formal Legal Notice for Refund",
            desc: "Serve a 14-day statutory legal notice demanding refund of the unadjusted security deposit with handover proof.",
          },
          {
            period: "Week 2 – 4",
            title: "File Recovery Suit / Consumer Complaint",
            desc: "If unpaid, file a summary suit for recovery under Order XXXVII CPC or application before the Rent Controller.",
          },
        ],
        docs: [
          "Handover inspection sheet or utility clearance bills",
          "Original security deposit receipt",
          "Courier tracking for Legal Demand Notice",
        ],
        timeline: "2 to 4 months",
        practiceArea: "Civil Law",
      },
    ],
  },
  {
    id: "cheque_bounce",
    title: "Cheque Dishonor & Recovery",
    icon: Scale,
    law: "Section 489-F PPC & Negotiable Instruments Act, 1881",
    court: "Judicial Magistrate / Civil Court",
    subIssues: [
      {
        id: "cheque_dishonor_489f",
        label: "A business or personal cheque was dishonored due to insufficient funds",
        urgency: "high",
        steps: [
          {
            period: "Day 1 – 2",
            title: "Collect Bank Dishonor Memo",
            desc: "Ensure the paying bank returns the original cheque with an official bank return memo stating 'Insufficient Funds'.",
          },
          {
            period: "Within 30 Days",
            title: "Serve Mandatory Legal Notice",
            desc: "Issue a 14-day statutory demand notice under Section 30 of Negotiable Instruments Act via registered post.",
          },
          {
            period: "Day 15 onward",
            title: "Lodge Application under Section 489-F PPC",
            desc: "Approach the relevant Police Station or submit application under Section 22-A CrPC before the Justice of Peace for FIR registration.",
          },
        ],
        docs: [
          "Original Cheque and Official Bank Return Slip / Memo",
          "Underlying Contract, Invoice, or Promissory Note",
          "Dispatch slips and courier receipts of Statutory Demand Notice",
        ],
        timeline: "FIR Registration: 1–3 weeks; Trial: 6–12 months",
        practiceArea: "Criminal Law",
      },
    ],
  },
  {
    id: "employment",
    title: "Employment & Unpaid Wages",
    icon: Briefcase,
    law: "Sindh Terms of Employment (Standing Orders) Act, 2015",
    court: "Sindh Labour Court (Karachi)",
    subIssues: [
      {
        id: "unlawful_termination",
        label: "Termination without 1-month notice or written grounds; withheld final settlement",
        urgency: "medium",
        steps: [
          {
            period: "Within 90 Days",
            title: "Serve Grievance Notice",
            desc: "Under Section 33 of Sindh Industrial Relations Act, serve a formal grievance notice in writing to the employer within 3 months.",
          },
          {
            period: "Next 15 Days",
            title: "Awaiting Employer Resolution",
            desc: "Employer has 15 days to communicate redressal. If unsatisfied, prepare petition for Labour Court.",
          },
          {
            period: "Within 60 Days",
            title: "File Grievance Petition before Labour Court",
            desc: "File petition before the relevant Sindh Labour Court (e.g. Court No. 1, 2, 3 or 4 in Karachi).",
          },
        ],
        docs: [
          "Appointment Letter / Employment Contract",
          "Termination Letter (if issued) or Email correspondence",
          "Salary Slips & Bank Account Statements showing non-payment",
          "Copy of Sent Grievance Notice & Postal AD Slips",
        ],
        timeline: "3 to 8 months in Labour Court",
        practiceArea: "Labour & Employment Law",
      },
    ],
  },
  {
    id: "consumer",
    title: "Consumer Rights & Defective Services",
    icon: Compass,
    law: "Sindh Consumer Protection Act, 2014",
    court: "District Consumer Court (Karachi)",
    subIssues: [
      {
        id: "defective_product_service",
        label: "Unfair trade practice, misleading claim, or defective goods without replacement",
        urgency: "medium",
        steps: [
          {
            period: "Within 30 Days",
            title: "Serve 15-Day Consumer Notice",
            desc: "Mandatory requirement under Sindh Consumer Protection Act: Send a written 15-day notice detailing defect and relief claimed.",
          },
          {
            period: "Day 16 – 30",
            title: "Lodge Consumer Court Complaint",
            desc: "File formal claim before the District Consumer Protection Court (South, East, Central, Malir, or West Karachi). No heavy court fee required.",
          },
        ],
        docs: [
          "Purchase Receipt / Tax Invoice / Warranty Card",
          "Photographs or Video evidence of defect",
          "Copy of 15-day Legal Notice with Courier Receipts",
        ],
        timeline: "1 to 3 months (Expedited under Consumer Law)",
        practiceArea: "Consumer Law",
      },
    ],
  },
  {
    id: "family",
    title: "Family Law & Khula / Maintenance",
    icon: Users,
    law: "Family Courts Act, 1964 & Muslim Family Laws Ordinance, 1961",
    court: "Family Court of Sindh",
    subIssues: [
      {
        id: "khula_maintenance",
        label: "Seeking dissolution of marriage (Khula), recovery of dower (Mehr) or child maintenance",
        urgency: "high",
        steps: [
          {
            period: "Stage 1",
            title: "Plaint Preparation & Filing",
            desc: "File consolidated plaint for Khula, interim child maintenance, recovery of dowry articles, and dower before the local Family Court.",
          },
          {
            period: "Stage 2",
            title: "Pre-Trial Reconciliation Hearing",
            desc: "Court conducts statutory reconciliation. If reconciliation fails, decree for Khula is passed immediately.",
          },
          {
            period: "Stage 3",
            title: "Union Council Arbitration & Nadra Certificate",
            desc: "Family Court decree is forwarded to Union Council for 90-day statutory notice and issuance of computerised NADRA certificate.",
          },
        ],
        docs: [
          "Nikahnama (Certified Copy from Union Council)",
          "Birth Certificates / B-Form of Children (if claiming maintenance)",
          "List of Dowry Articles with receipts/photos",
          "CNIC copies",
        ],
        timeline: "Khula Decree: 1–2 months; Maintenance & Dowry Trial: 4–8 months",
        practiceArea: "Family Law",
      },
    ],
  },
];

export function LegalActionNavigator({ userId: _userId }: { userId?: string }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDomain, setSelectedDomain] = useState<string>("tenancy");
  const [selectedIssue, setSelectedIssue] = useState<string>("eviction_no_notice");
  const [hasUrgentThreat, setHasUrgentThreat] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  const currentDomain = DOMAINS.find((d) => d.id === selectedDomain) || DOMAINS[0];
  const currentIssue =
    currentDomain.subIssues.find((i) => i.id === selectedIssue) ||
    currentDomain.subIssues[0];

  const toggleDoc = (doc: string) => {
    setCheckedDocs((prev) => ({ ...prev, [doc]: !prev[doc] }));
  };

  return (
    <div className="space-y-6">
      {/* Progress tracker */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
              step >= 1 ? "bg-teal text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            1
          </div>
          <span className="text-xs font-semibold text-navy">Domain & Matter</span>
          <span className="text-muted-foreground">/</span>
          <div
            className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
              step >= 2 ? "bg-teal text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </div>
          <span className="text-xs font-semibold text-navy">Specific Issue</span>
          <span className="text-muted-foreground">/</span>
          <div
            className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
              step >= 3 ? "bg-teal text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            3
          </div>
          <span className="text-xs font-semibold text-navy">Personalized Action Plan</span>
        </div>

        {step > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : 1))}
            className="text-xs text-muted-foreground hover:text-navy"
          >
            <ArrowLeft className="mr-1 size-3" /> Back
          </Button>
        )}
      </div>

      {/* STEP 1: Select Domain */}
      {step === 1 && (
        <Card className="border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-navy">
              Step 1: What legal matter do you need guidance on?
            </CardTitle>
            <CardDescription className="text-xs">
              Select the governing legal area under Sindh or Federal law.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DOMAINS.map((domain) => {
              const Icon = domain.icon;
              const isSelected = selectedDomain === domain.id;
              return (
                <div
                  key={domain.id}
                  onClick={() => {
                    setSelectedDomain(domain.id);
                    setSelectedIssue(domain.subIssues[0].id);
                  }}
                  className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-teal bg-mint/30 shadow-sm ring-1 ring-teal"
                      : "border-border hover:border-slate/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`grid size-9 place-items-center rounded-lg ${
                        isSelected ? "bg-teal text-white" : "bg-muted text-navy"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    {isSelected && <CheckCircle2 className="size-4 text-teal" />}
                  </div>
                  <div className="mt-4">
                    <h4 className="font-heading text-sm font-bold text-navy">{domain.title}</h4>
                    <p className="mt-1 text-[11px] text-muted-foreground">{domain.law}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="flex justify-end border-t border-border pt-4">
            <Button
              onClick={() => setStep(2)}
              className="bg-teal hover:bg-teal-hover text-white text-xs"
            >
              Next: Select Specific Issue
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: Select Specific Issue & Urgency */}
      {step === 2 && (
        <Card className="border-border bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-navy text-white text-[10px]">{currentDomain.title}</Badge>
              <span className="text-xs text-muted-foreground">Governing: {currentDomain.law}</span>
            </div>
            <CardTitle className="mt-2 font-heading text-lg text-navy">
              Step 2: Choose your specific dispute context
            </CardTitle>
            <CardDescription className="text-xs">
              This tailors statutory timeframes, mandatory notice requirements, and evidence checklists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={selectedIssue}
              onValueChange={setSelectedIssue}
              className="space-y-3"
            >
              {currentDomain.subIssues.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => setSelectedIssue(sub.id)}
                  className={`flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition ${
                    selectedIssue === sub.id
                      ? "border-teal bg-mint/20 ring-1 ring-teal"
                      : "border-border hover:bg-muted/20"
                  }`}
                >
                  <RadioGroupItem value={sub.id} id={sub.id} className="mt-0.5" />
                  <div className="space-y-1">
                    <Label htmlFor={sub.id} className="cursor-pointer font-medium text-xs text-navy leading-normal">
                      {sub.label}
                    </Label>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>Forum: {currentDomain.court}</span>
                      <span>·</span>
                      <span>Estimated Timeline: {sub.timeline}</span>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-900">
                    Urgent Factor Check (Imminent Legal Danger)
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="threat"
                      checked={hasUrgentThreat}
                      onCheckedChange={(c) => setHasUrgentThreat(!!c)}
                    />
                    <label
                      htmlFor="threat"
                      className="text-xs text-amber-800 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I have already received court summons, police call, or notice with a deadline within 7 days.
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs">
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="bg-teal hover:bg-teal-hover text-white text-xs"
            >
              Generate Action Plan
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: Generated Action Plan */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Urgency & Risk Header Card */}
          <Card className="border-border bg-white shadow-sm overflow-hidden">
            <div
              className={`p-4 text-white flex items-center justify-between ${
                hasUrgentThreat || currentIssue.urgency === "critical"
                  ? "bg-destructive"
                  : currentIssue.urgency === "high"
                  ? "bg-amber-600"
                  : "bg-teal"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5" />
                <span className="font-heading font-bold text-sm uppercase tracking-wider">
                  Risk Classification:{" "}
                  {hasUrgentThreat
                    ? "CRITICAL / IMMINENT DEADLINE"
                    : currentIssue.urgency.toUpperCase()}
                </span>
              </div>
              <Badge className="bg-white/20 text-white text-[10px]">
                {currentDomain.law}
              </Badge>
            </div>
            <CardContent className="p-6">
              <h3 className="font-heading text-lg font-bold text-navy">
                {currentIssue.label}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Official Judicial Forum: <span className="font-semibold text-navy">{currentDomain.court}</span>
              </p>
            </CardContent>
          </Card>

          {/* Procedural Next Steps */}
          <Card className="border-border bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-teal" />
                <CardTitle className="font-heading text-base text-navy">
                  Recommended Statutory Action Steps
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Follow these chronological phases to safeguard your legal standing under Pakistani law.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentIssue.steps.map((s, idx) => (
                <div key={idx} className="flex items-start gap-4 rounded-lg bg-background p-4 border border-border">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-teal text-white text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] text-teal border-teal/30">
                        {s.period}
                      </Badge>
                      <h4 className="font-heading text-xs font-bold text-navy">{s.title}</h4>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate">{s.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Interactive Document Checklist */}
          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="font-heading text-base text-navy flex items-center gap-2">
                  <FileText className="size-4 text-teal" />
                  Mandatory Evidence & Document Checklist
                </CardTitle>
                <CardDescription className="text-xs">
                  Check off the documents you currently hold in original or photocopy.
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline" className="text-xs border-teal text-teal hover:bg-mint">
                <Link href="/citizen/documents/generate">
                  <Download className="mr-1.5 size-3" />
                  Generate Templates
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {currentIssue.docs.map((doc, idx) => {
                  const isChecked = !!checkedDocs[doc];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleDoc(doc)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition ${
                        isChecked ? "border-teal bg-mint/30" : "border-border hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox checked={isChecked} onCheckedChange={() => toggleDoc(doc)} />
                        <span className={`text-xs ${isChecked ? "line-through text-muted-foreground" : "text-navy font-medium"}`}>
                          {doc}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Required
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Verified Lawyer Match CTA */}
          <div className="rounded-xl border border-teal/40 bg-mint/50 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <Badge className="bg-teal text-white">Recommended Advocate Match</Badge>
              <h4 className="mt-2 font-heading text-base font-bold text-navy">
                Consult a Verified {currentIssue.practiceArea} Advocate in Karachi
              </h4>
              <p className="mt-1 text-xs text-slate">
                Filter verified Sindh Bar Council practitioners specialized in {currentDomain.court} cases.
              </p>
            </div>
            <Button asChild className="bg-teal hover:bg-teal-hover text-white shadow-sm shrink-0">
              <Link href={`/citizen/lawyers?practice=${encodeURIComponent(currentIssue.practiceArea)}`}>
                <Search className="mr-1.5 size-3.5" />
                Find {currentIssue.practiceArea} Lawyers
              </Link>
            </Button>
          </div>

          <div className="flex justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              className="text-xs"
            >
              <ArrowLeft className="mr-1 size-3" /> Start Over with Different Issue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
