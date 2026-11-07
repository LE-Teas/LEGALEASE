"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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
import {
  upsertLegalResourceAction,
  deleteLegalResourceAction,
} from "@/app/actions/admin";

interface ResourceItem {
  id: string;
  title: string;
  category: string;
  readingTime?: string;
  summary: string;
  content?: string;
  jurisdiction?: string;
}

export function ResourceManagerDialog({
  resource,
}: {
  resource?: ResourceItem;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(resource?.title || "");
  const [category, setCategory] = useState(resource?.category || "Know Your Rights");
  const [readingTime, setReadingTime] = useState(
    resource?.readingTime || "6 min read"
  );
  const [jurisdiction, setJurisdiction] = useState(
    resource?.jurisdiction || "Federal & Provincial"
  );
  const [summary, setSummary] = useState(resource?.summary || "");
  const [content, setContent] = useState(
    resource?.content ||
      "## Statutory Overview\nProvide plain-language guidance grounded in Pakistani statutes."
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await upsertLegalResourceAction({
        id: resource?.id,
        title,
        category,
        reading_time: readingTime,
        summary,
        content,
        jurisdiction,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to save resource");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!resource?.id) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteLegalResourceAction(resource.id);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to delete resource");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {resource ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
            <Pencil className="size-3 text-slate-600" />
            Edit
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-[#0CA275] hover:bg-[#098862] text-white text-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            Add Legal Guide
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg text-[#0A2843]">
            {resource ? "Edit Legal Guide" : "Create Public Legal Resource Guide"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Published guides appear immediately in the Citizen Legal Resources center.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          {error && (
            <div className="rounded bg-rose-50 border border-rose-200 p-2 text-rose-800">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Guide Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="text-xs"
              placeholder="e.g. Tenant Rights Under Sindh Rented Premises Ordinance"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"
              >
                <option value="Know Your Rights">Know Your Rights</option>
                <option value="Guides">Guides</option>
                <option value="Templates">Templates</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reading Time</Label>
              <Input
                value={readingTime}
                onChange={(e) => setReadingTime(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Jurisdiction</Label>
              <Input
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Executive Summary</Label>
            <Textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">
              Full Article Content (Markdown)
            </Label>
            <Textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="text-xs font-mono"
            />
          </div>

          <DialogFooter className="flex items-center justify-between pt-2">
            {resource ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleDelete}
                className="text-xs gap-1"
              >
                {deleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Delete
              </Button>
            ) : (
              <span />
            )}

            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-[#0A2843] text-white text-xs"
            >
              {loading ? "Saving..." : "Save Resource Guide"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

