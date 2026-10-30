"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpDown,
  BadgeCheck,
  CalendarClock,
  Loader2,
  MapPin,
  Search,
  Star,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPECIALIZATIONS, CITIES } from "@/lib/constants/legal";
import { formatRate } from "@/lib/data/lawyers";
import type { LawyerWithProfile } from "@/lib/types/legal";

interface LawyerDirectoryProps {
  initialLawyers?: LawyerWithProfile[];
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function LawyerDirectory({ initialLawyers = [] }: LawyerDirectoryProps) {
  const [lawyers, setLawyers] = useState<LawyerWithProfile[]>(initialLawyers);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [area, setArea] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [sort, setSort] = useState<string>("recommended");

  // Dynamic live search against Supabase API
  useEffect(() => {
    let active = true;
    const fetchLawyers = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (area !== "all") params.set("specialization", area);
      if (city !== "all") params.set("city", city);
      if (sort !== "recommended") params.set("sort", sort);

      try {
        const res = await fetch(`/api/lawyers/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setLawyers(data.lawyers || []);
          }
        }
      } catch (err) {
        console.error("Failed to query lawyers:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchLawyers();
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, area, city, sort]);

  return (
    <div>
      {/* Search & Filter Bar */}
      <div className="grid gap-4 rounded-2xl border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 lg:p-5 shadow-sm">
        <div className="sm:col-span-2">
          <Label htmlFor="search" className="sr-only">
            Search lawyers
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate" />
            <Input
              id="search"
              type="search"
              placeholder="Search by advocate name, chamber, or keyword…"
              className="pl-9 bg-background border-border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="area" className="sr-only">
            Practice area
          </Label>
          <Select value={area} onValueChange={(val) => setArea(val)}>
            <SelectTrigger id="area" className="w-full bg-background border-border text-navy">
              <SelectValue placeholder="All practice areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All practice areas</SelectItem>
              {SPECIALIZATIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city" className="sr-only">
            City
          </Label>
          <Select value={city} onValueChange={(val) => setCity(val)}>
            <SelectTrigger id="city" className="w-full bg-background border-border text-navy">
              <SelectValue placeholder="All cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {CITIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results header & sort */}
      <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-navy">
            {lawyers.length} verified {lawyers.length === 1 ? "advocate" : "advocates"} found
          </p>
          {loading && <Loader2 className="size-4 animate-spin text-teal" />}
        </div>
        <Select value={sort} onValueChange={(val) => setSort(val)}>
          <SelectTrigger id="sort" aria-label="Sort lawyers" className="w-full sm:w-56 bg-white border-border">
            <ArrowUpDown className="size-3.5 text-slate" />
            <SelectValue placeholder="Sort order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">Recommended</SelectItem>
            <SelectItem value="highest_rated">Highest rated</SelectItem>
            <SelectItem value="fee_low">Lowest consultation fee</SelectItem>
            <SelectItem value="experience">Most experienced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lawyer Cards Grid */}
      {lawyers.length > 0 ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lawyers.map((lawyer) => (
            <Card
              key={lawyer.id}
              className="flex flex-col justify-between border-border bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-navy/5"
            >
              <CardContent className="space-y-4 p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11 bg-navy text-white">
                      <AvatarFallback className="bg-navy font-heading text-xs font-bold text-white">
                        {initials(lawyer.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-heading text-base font-bold text-navy">
                        {lawyer.full_name}
                      </h3>
                      <p className="text-xs text-slate">
                        {lawyer.professional_title || "Advocate High Court"}
                      </p>
                    </div>
                  </div>
                  {lawyer.verification_status === "verified" && (
                    <Badge className="bg-mint text-teal gap-1 text-[11px] font-semibold border-0">
                      <BadgeCheck className="size-3" />
                      Verified
                    </Badge>
                  )}
                </div>

                {/* Specializations */}
                <div className="flex flex-wrap gap-1.5">
                  {(lawyer.specializations || [lawyer.primary_specialization]).map((spec) => (
                    <Badge
                      key={spec}
                      variant="outline"
                      className="border-border text-navy bg-background text-[11px]"
                    >
                      {spec}
                    </Badge>
                  ))}
                </div>

                {/* City & Experience */}
                <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs text-slate">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <MapPin className="size-3.5 text-teal" />
                    {lawyer.city}
                    {lawyer.area ? `, ${lawyer.area}` : ""}
                  </span>
                  <span>{lawyer.years_of_experience} yrs experience</span>
                </div>

                {/* Bar enrollment */}
                {lawyer.bar_license_number && (
                  <p className="text-[11px] text-slate bg-background p-2 rounded border border-border/60">
                    License: <strong className="text-navy">{lawyer.bar_license_number}</strong>
                    {lawyer.bar_council ? ` (${lawyer.bar_council})` : ""}
                  </p>
                )}

                {/* Footer with rate and action */}
                <div className="flex items-center justify-between border-t border-border/70 pt-4">
                  <div>
                    <span className="font-heading text-base font-bold text-navy">
                      {formatRate(lawyer.consultation_fee)}
                    </span>
                    <span className="text-xs text-slate"> / session</span>
                  </div>
                  <Button asChild size="sm" className="bg-teal text-white hover:bg-teal-hover font-medium">
                    <Link href={`/lawyers/${lawyer.id}`}>
                      Book consultation
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Users className="mx-auto size-10 text-slate/50" />
          <p className="mt-3 font-heading text-lg font-bold text-navy">
            No lawyers match those filters
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate">
            Try selecting &quot;All practice areas&quot; or &quot;All cities&quot; to expand your search.
          </p>
          <Button
            variant="outline"
            className="mt-5 text-navy border-border"
            onClick={() => {
              setQuery("");
              setArea("all");
              setCity("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}