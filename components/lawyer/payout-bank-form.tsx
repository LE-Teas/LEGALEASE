"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";

interface PayoutBankFormProps {
  initialBankName: string;
  initialAccountTitle: string;
  initialIban: string;
}

export function PayoutBankForm({
  initialBankName,
  initialAccountTitle,
  initialIban,
}: PayoutBankFormProps) {
  const router = useRouter();
  const [bankName, setBankName] = useState(initialBankName);
  const [accountTitle, setAccountTitle] = useState(initialAccountTitle);
  const [iban, setIban] = useState(initialIban);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/lawyer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: bankName.trim(),
          bank_account_title: accountTitle.trim(),
          bank_iban: iban.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save bank account details.");
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="font-heading text-base text-[#0d2b43] flex items-center gap-2">
          <Building2 className="size-4.5 text-[#0fa176]" />
          Designated Settlement Bank Account (1Link / IBAN)
        </CardTitle>
        <CardDescription className="text-xs">
          Settled 90% net advocate consultation fees are disbursed to this Pakistani bank account
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Bank Name</Label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g., Meezan Bank / HBL"
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Account Title</Label>
            <Input
              value={accountTitle}
              onChange={(e) => setAccountTitle(e.target.value)}
              placeholder="Advocate Full Name / Chamber"
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">24-Digit PK IBAN</Label>
            <Input
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="PK00MEZN0000000000000000"
              className="text-xs font-mono"
            />
          </div>
          <div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#0d2b43] hover:bg-[#0d2b43]/90 text-white text-xs h-9"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="mr-1.5 size-3.5 text-[#0fa176]" />
                  Saved
                </>
              ) : (
                "Update Payout IBAN"
              )}
            </Button>
          </div>
        </form>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

