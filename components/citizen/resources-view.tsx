"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { LegalResourceItem } from "@/lib/types/legal";

const CATEGORIES = ["All", "Saved Guides", "Know Your Rights", "Guides", "Templates"];

interface ResourcesViewProps {
  initialResources: LegalResourceItem[];
  initialSavedSlugs?: string[];
}

export function ResourcesView({
  initialResources,
  initialSavedSlugs = [],
}: ResourcesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [savedSlugs, setSavedSlugs] = useState<string[]>(initialSavedSlugs);

  const toggleBookmark = async (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();

    const wasSaved = savedSlugs.includes(slug);
    setSavedSlugs((prev) =>
      wasSaved ? prev.filter((s) => s !== slug) : [...prev, slug]
    );

    try {
      await fetch("/api/citizen/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
    } catch {
      /* revert on failure */
      setSavedSlugs((prev) =>
        wasSaved ? [...prev, slug] : prev.filter((s) => s !== slug)
      );
    }
  };

  const filtered = initialResources.filter((r) => {
    const matchesCat =
      selectedCategory === "All"
        ? true
        : selectedCategory === "Saved Guides"
        ? savedSlugs.includes(r.slug)
        : r.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.summary.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search and Category Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guides (e.g. bail, tenancy, khula, employment)..."
            className="pl-9 h-10 text-xs bg-slate-50"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 transition-colors ${
                selectedCategory === cat
                  ? "bg-navy text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat === "Saved Guides" ? `Saved (${savedSlugs.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Resources */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-muted-foreground">
          {selectedCategory === "Saved Guides"
            ? "You have not bookmarked any legal guides yet. Click the bookmark icon on any guide to save it for quick reference."
            : `No resources found matching "${search}". Try another topic.`}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const isSaved = savedSlugs.includes(item.slug);
            return (
              <Link key={item.id} href={`/citizen/resources/${item.slug}`} className="group">
                <Card className="h-full flex flex-col justify-between border-border/80 transition-all hover:-translate-y-1 hover:border-navy/30 hover:shadow-md">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="border-teal/30 bg-teal-soft/30 text-teal text-[10px]">
                        {item.category}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="size-3" />
                          {item.reading_time}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => toggleBookmark(e, item.slug)}
                          className={`rounded-md p-1 transition-colors ${
                            isSaved
                              ? "text-[#0fa176] bg-emerald-50"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          }`}
                          title={isSaved ? "Remove bookmark" : "Bookmark guide"}
                        >
                          <Bookmark className={`size-3.5 ${isSaved ? "fill-[#0fa176]" : ""}`} />
                        </button>
                      </div>
                    </div>
                    <CardTitle className="font-heading text-base text-navy mt-2.5 group-hover:text-teal transition-colors">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 flex-1">
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {item.summary}
                    </p>
                  </CardContent>
                  <CardFooter className="border-t border-slate-100 p-4 pt-3 text-xs text-teal font-medium flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{item.jurisdiction}</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Read guide
                      <ArrowRight className="size-3.5" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
