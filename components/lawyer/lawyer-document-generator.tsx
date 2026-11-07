"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Printer, Save, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";

interface LawyerDocumentGeneratorProps {
  defaultTemplate?: string;
  triggerLabel?: string;
  advocateName?: string;
}

const TEMPLATE_PRESETS: Record<string, { title: string; content: string }> = {
  recovery_notice: {
    title: "Legal Notice for Recovery of Outstanding Dues",
    content: `LEGAL NOTICE UNDER THE CONTRACT ACT 1872 & NEGOTIABLE INSTRUMENTS ACT 1881

THROUGH REGISTERED POST A/D & COURIER

To:
[Recipient Name & Address]

Subject: FORMAL LEGAL NOTICE FOR IMMEDIATE PAYMENT OF OUTSTANDING DUES

Dear Sir/Madam,

Under instructions from and on behalf of my client, [Client Name], resident of [Client City], I hereby serve upon you the following Legal Notice:

1. That my client entered into a lawful obligation with you whereby an amount of PKR [Amount] remains due and payable.
2. That despite repeated verbal and written reminders, you have failed and neglected to clear the outstanding liability.
3. That through this Legal Notice, you are called upon to pay the sum of PKR [Amount] within fourteen (14) days of receipt hereof, failing which my client has instructed me to initiate appropriate civil recovery proceedings under Order XXXVII CPC and/or criminal proceedings under Section 489-F of the Pakistan Penal Code at your sole risk as to costs and consequences.

A copy of this Legal Notice is retained in my chamber for record and further court proceedings.

Yours faithfully,

___________________________
Advocate High Court`,
  },
  affidavit: {
    title: "Sworn General Affidavit (Oaths Act 1873)",
    content: `BEFORE THE OATH COMMISSIONER / NOTARY PUBLIC AT KARACHI

AFFIDAVIT

I, [Deponent Name] S/o, D/o, W/o [Father/Husband Name], Muslim, Adult, holding CNIC No. [00000-0000000-0], resident of [Address], do hereby solemnly affirm and declare on oath as under:

1. That I am the deponent above-named and am fully conversant with the facts stated herein.
2. That the contents of the accompanying application/statement are true and correct to the best of my knowledge and belief.
3. That nothing material has been concealed or misstated therein.
4. That whatever is stated above is true and correct to the best of my knowledge and belief.

Karachi
Dated: ${new Date().toISOString().slice(0, 10)}

___________________________
DEPONENT`,
  },
  eviction_notice: {
    title: "Statutory Tenancy Default & Eviction Notice (SRPO 1979)",
    content: `STATUTORY NOTICE UNDER SECTION 15 OF THE SINDH RENTED PREMISES ORDINANCE, 1979

To:
[Tenant Name]
[Demised Premises Address]

Subject: STATUTORY NOTICE FOR ARREARS OF RENT AND VACATION OF PREMISES

Under instructions from my client, [Landlord Name], owner/landlord of the demised premises, you are hereby served with this statutory notice:

1. That you are occupying the premises as a monthly tenant at a monthly rent of PKR [Monthly Rent].
2. That you have willfully defaulted in payment of monthly rent since [Default Month/Year].
3. You are hereby called upon to clear all accumulated arrears and hand over vacant and peaceful possession of the demised premises within thirty (30) days, failing which an ejectment application under Section 15 of the SRPO 1979 shall be instituted before the Learned Rent Controller.`,
  },
  power_of_attorney: {
    title: "Wakalatnama / Special Power of Attorney",
    content: `IN THE COURT OF LEARNED ___________________________

SUIT / CASE NO. _________ OF 2026

[Plaintiff / Petitioner Name]  ......................... Plaintiff / Petitioner
VERSUS
[Defendant / Respondent Name]  ......................... Defendant / Respondent

WAKALATNAMA

I/We, the undersigned, do hereby appoint and retain [Advocate Name], Advocate High Court, to appear, plead, and act for me/us in the above-titled matter, to file plaints, written statements, applications, compromises, and appeals, and to take all lawful steps necessary for the prosecution or defence of the case.

Executed on this ${new Date().toISOString().slice(0, 10)}.

___________________________                ___________________________
Signature of Client                        Accepted by Advocate`,
  },
};

export function LawyerDocumentGenerator({
  defaultTemplate = "recovery_notice",
  triggerLabel = "Draft Legal Notice / Affidavit",
  advocateName = "Advocate High Court",
}: LawyerDocumentGeneratorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templateType, setTemplateType] = useState(defaultTemplate);
  const preset = TEMPLATE_PRESETS[defaultTemplate] || TEMPLATE_PRESETS.recovery_notice;
  const [title, setTitle] = useState(preset.title);
  const [content, setContent] = useState(preset.content.replace("[Advocate Name]", advocateName));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateChange = (nextType: string) => {
    setTemplateType(nextType);
    const nextPreset = TEMPLATE_PRESETS[nextType] || TEMPLATE_PRESETS.recovery_notice;
    setTitle(nextPreset.title);
    setContent(nextPreset.content.replace("[Advocate Name]", advocateName));
  };

  const handleSave = async (status: "draft" | "finalized") => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Chamber Legal Draft",
          template_type: templateType,
          inputs: { drafted_by: advocateName },
          generated_content: content,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save chamber draft.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=850,height=900");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Georgia, serif; padding: 48px; line-height: 1.65; color: #111; }
            h1 { font-size: 18px; text-transform: uppercase; border-bottom: 2px solid #0d2b43; padding-bottom: 8px; }
            pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <pre>${content}</pre>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-navy text-white hover:bg-navy/90 text-xs">
          <FilePlus2 className="mr-1.5 size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg text-[#0d2b43] flex items-center gap-2">
            <Sparkles className="size-5 text-[#0fa176]" />
            Advocate Chamber Document & Notice Generator
          </DialogTitle>
          <DialogDescription className="text-xs">
            Draft, customize, save, and print statutory legal notices, affidavits, and Wakalatnamas directly in your Lawyer Portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Statutory Precedent Template</Label>
              <select
                value={templateType}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="recovery_notice">Legal Notice for Recovery of Dues (NIA 1881)</option>
                <option value="affidavit">Sworn General Affidavit (Oaths Act 1873)</option>
                <option value="eviction_notice">Tenancy Eviction / Default Notice (SRPO 1979)</option>
                <option value="power_of_attorney">Special Power of Attorney / Wakalatnama</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Document Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Draft Pleading / Notice Text</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="font-mono text-xs leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="text-xs">
            <Printer className="mr-1.5 size-3.5" />
            Print / Export PDF
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => handleSave("draft")}
              className="text-xs"
            >
              <Save className="mr-1.5 size-3.5" />
              Save as Draft
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => handleSave("finalized")}
              className="bg-[#0d2b43] text-white hover:bg-[#0d2b43]/90 text-xs"
            >
              Finalize Work Product
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

