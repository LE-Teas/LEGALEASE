"use client";

import { useState } from "react";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedDemoUsersAction } from "@/app/actions/admin";

export function LoadDemoUsersButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await seedDemoUsersAction();
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <Button
        onClick={handleSeed}
        disabled={loading}
        size="sm"
        className="bg-navy hover:bg-navy/90 text-white font-medium text-xs shadow-xs"
      >
        {loading ? (
          <>
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            Loading Demo Users...
          </>
        ) : (
          <>
            <UserPlus className="mr-1.5 size-3.5 text-teal" />
            Load Demo Users
          </>
        )}
      </Button>

      {result && (
        <span
          className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1 font-medium ${
            result.success
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {result.success && <CheckCircle2 className="size-3.5 text-emerald-600" />}
          {result.message}
        </span>
      )}
    </div>
  );
}

