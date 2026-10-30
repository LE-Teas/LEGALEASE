"use client";

import { useState } from "react";
import { User, Shield, AlertTriangle, CheckCircle2, MoreVertical, Ban, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toggleUserStatusAction } from "@/app/actions/admin";

interface UserProfileRecord {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
  city?: string | null;
  area?: string | null;
  is_active: boolean;
  created_at: string;
}

export function UserStatusDialog({ user }: { user: UserProfileRecord }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (newStatus: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await toggleUserStatusAction(user.id, newStatus, reason);
      setOpen(false);
      setReason("");
    } catch (err: any) {
      setError(err?.message || "Action failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs border-slate-200">
          Manage Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="font-heading text-base text-[#0A2843]">
              User Account Management
            </DialogTitle>
            <Badge
              variant="outline"
              className={user.is_active ? "bg-[#ECFDF5] text-[#0CA275] border-[#0CA275]/30 text-[10px]" : "bg-rose-50 text-rose-700 border-rose-200 text-[10px]"}
            >
              {user.is_active ? "Active" : "Suspended"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Inspect profile metadata and manage security restrictions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="rounded-md bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Full Name</span>
              <span className="font-semibold text-slate-800">{user.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-800">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phone</span>
              <span className="font-medium text-slate-800">{user.phone || "Not provided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Location</span>
              <span className="font-medium text-slate-800">
                {user.city ? `${user.city}${user.area ? `, ${user.area}` : ""}` : "Pakistan"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account Role</span>
              <span className="font-semibold capitalize text-[#0A2843]">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Registration Date</span>
              <span className="text-slate-700">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-700">
              Administrative Reason (Required for Suspension / Logged to Audit Trail)
            </label>
            <Textarea
              placeholder="Provide reason for account status update or suspension..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs h-20"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between items-center gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading} className="text-xs">
            Cancel
          </Button>

          {user.is_active ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={loading || !reason.trim()}
              onClick={() => handleToggle(false)}
              className="text-xs gap-1.5"
            >
              <Ban className="size-3.5" />
              {loading ? "Suspending..." : "Suspend Account"}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={loading}
              onClick={() => handleToggle(true)}
              className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs gap-1.5"
            >
              <RefreshCcw className="size-3.5" />
              {loading ? "Reactivating..." : "Reactivate Account"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
