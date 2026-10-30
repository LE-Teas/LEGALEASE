"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Landmark, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { LegalResourceItem } from "@/lib/types/legal";

const CATEGORIES = ["All", "Know Your Rights", "Guides", "Templates"];

interface ResourcesViewProps {
  initialResources: LegalResourceItem[];
}

export function ResourcesView({ initialResources }: ResourcesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = initialResources.filter((r) => {
    const matchesCat = selectedCategory === "All" || r.category === selectedCategory;
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
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Resources */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-muted-foreground">
          No resources found matching &ldquo;{search}&rdquo;. Try another topic.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Link key={item.id} href={`/citizen/resources/${item.slug}`} className="group">
              <Card className="h-full flex flex-col justify-between border-border/80 transition-all hover:-translate-y-1 hover:border-navy/30 hover:shadow-md">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-teal/30 bg-teal-soft/30 text-teal text-[10px]">
                      {item.category}
                    </Badge>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="size-3" />
                      {item.reading_time}
                    </span>
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
          ))}
        </div>
      )}
    </div>
  );
}
