"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  Compass,
  Filter,
  Loader2,
  LocateFixed,
  MapPin,
  Phone,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  Video,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPECIALIZATIONS, CITIES, PAKISTAN_CITIES } from "@/lib/constants/legal";
import { formatRate } from "@/lib/data/lawyers";
import type { LawyerWithProfile } from "@/lib/types/legal";

interface LawyerSearchViewProps {
  initialLawyers: LawyerWithProfile[];
}

export function LawyerSearchView({ initialLawyers }: LawyerSearchViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [lawyers, setLawyers] = useState<LawyerWithProfile[]>(initialLawyers);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filters state from URL or defaults
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [specialization, setSpecialization] = useState(searchParams.get("specialization") || "all");
  const [city, setCity] = useState(searchParams.get("city") || "all");
  const [area, setArea] = useState(searchParams.get("area") || "all");
  const [sort, setSort] = useState(searchParams.get("sort") || "recommended");
  const [minExp, setMinExp] = useState(searchParams.get("minExperience") || "all");
  const [maxFee, setMaxFee] = useState(searchParams.get("maxFee") || "all");

  // Geolocation
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState("25");
  const [locationError, setLocationError] = useState<string | null>(null);

  const cityAreas = city !== "all" && PAKISTAN_CITIES[city] ? PAKISTAN_CITIES[city] : [];

  const performSearch = useCallback(
    async (overrideCoords?: { lat: number; lng: number } | null) => {
      setLoading(true);
      const params = new URLSearchParams();

      if (query.trim()) params.set("query", query.trim());
      if (specialization !== "all") params.set("specialization", specialization);
      if (city !== "all") params.set("city", city);
      if (area !== "all") params.set("area", area);
      if (sort !== "recommended") params.set("sort", sort);
      if (minExp !== "all") params.set("minExperience", minExp);
      if (maxFee !== "all") params.set("maxFee", maxFee);

      const activeCoords = overrideCoords !== undefined ? overrideCoords : userCoords;
      if (activeCoords) {
        params.set("lat", String(activeCoords.lat));
        params.set("lng", String(activeCoords.lng));
        params.set("radius", radiusKm);
      }

      // Update URL query string
      const currentUrl = `?${params.toString()}`;
      window.history.replaceState(null, "", currentUrl);

      try {
        const res = await fetch(`/api/lawyers/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLawyers(data.lawyers || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [query, specialization, city, area, sort, minExp, maxFee, userCoords, radiusKm]
  );

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserCoords(coords);
        setLocating(false);
        setSort("nearest");
        performSearch(coords);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location permission denied. Please choose your city and area manually below.");
        } else {
          setLocationError("Unable to retrieve your location. Please select manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleClearLocation = () => {
    setUserCoords(null);
    setLocationError(null);
    performSearch(null);
  };

  const handleResetFilters = () => {
    setQuery("");
    setSpecialization("all");
    setCity("all");
    setArea("all");
    setSort("recommended");
    setMinExp("all");
    setMaxFee("all");
    setUserCoords(null);
    setLocationError(null);
    window.history.replaceState(null, "", window.location.pathname);
    setLawyers(initialLawyers);
  };

  const initials = (name: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "LE";

  return (
    <div className="space-y-6">
      {/* Search Bar & Geolocation Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && performSearch()}
              placeholder="Search by lawyer name, title, or law subject..."
              className="pl-10 h-11 text-sm bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            {!userCoords ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleUseLocation}
                disabled={locating}
                className="h-11 border-teal/40 bg-teal-soft/30 text-teal hover:bg-teal-soft/60"
              >
                {locating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <LocateFixed className="mr-2 size-4 text-teal" />
                )}
                Use My Location
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal-soft/40 px-3 py-2 text-xs font-medium text-teal">
                <LocateFixed className="size-4 shrink-0" />
                <span>Nearby Mode</span>
                <Select value={radiusKm} onValueChange={(val) => { setRadiusKm(val); performSearch(); }}>
                  <SelectTrigger className="h-7 w-20 text-xs bg-white border-teal/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 km</SelectItem>
                    <SelectItem value="10">10 km</SelectItem>
                    <SelectItem value="25">25 km</SelectItem>
                    <SelectItem value="50">50 km</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-teal hover:bg-teal/10"
                  onClick={handleClearLocation}
                  title="Clear location filter"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}

            <Button
              type="button"
              onClick={() => performSearch()}
              disabled={loading}
              className="h-11 bg-navy text-white hover:bg-navy/90"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        </div>

        {locationError && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
            {locationError}
          </div>
        )}

        {/* Filter Controls Row */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 border-t border-slate-100 pt-4">
          {/* Specialization */}
          <div>
            <Label className="text-[11px] text-muted-foreground">Practice Area</Label>
            <Select value={specialization} onValueChange={(v) => { setSpecialization(v); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Practice Areas</SelectItem>
                {SPECIALIZATIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div>
            <Label className="text-[11px] text-muted-foreground">City</Label>
            <Select
              value={city}
              onValueChange={(v) => {
                setCity(v);
                setArea("all");
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Area */}
          <div>
            <Label className="text-[11px] text-muted-foreground">Area / Locality</Label>
            <Select
              value={area}
              onValueChange={setArea}
              disabled={cityAreas.length === 0}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={cityAreas.length ? "All areas" : "Select city first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {cityAreas.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Experience */}
          <div>
            <Label className="text-[11px] text-muted-foreground">Experience</Label>
            <Select value={minExp} onValueChange={setMinExp}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Any experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Experience</SelectItem>
                <SelectItem value="3">3+ Years</SelectItem>
                <SelectItem value="5">5+ Years</SelectItem>
                <SelectItem value="10">10+ Years</SelectItem>
                <SelectItem value="15">15+ Years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Fee */}
          <div>
            <Label className="text-[11px] text-muted-foreground">Max Fee (PKR)</Label>
            <Select value={maxFee} onValueChange={setMaxFee}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Any fee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Fee</SelectItem>
                <SelectItem value="3000">Up to Rs. 3,000</SelectItem>
                <SelectItem value="5000">Up to Rs. 5,000</SelectItem>
                <SelectItem value="8000">Up to Rs. 8,000</SelectItem>
                <SelectItem value="12000">Up to Rs. 12,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Label className="text-[11px] text-muted-foreground">Sort By</Label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                {userCoords && <SelectItem value="nearest">Nearest First</SelectItem>}
                <SelectItem value="highest_rated">Highest Rated</SelectItem>
                <SelectItem value="experience">Most Experienced</SelectItem>
                <SelectItem value="fee_low">Fee: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-navy">{lawyers.length}</span> verified advocate{lawyers.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-muted-foreground hover:text-navy"
            >
              Reset Filters
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => performSearch()}
              className="bg-navy text-white hover:bg-navy/90 text-xs"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Lawyers Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="size-8 animate-spin text-teal" />
          <p className="mt-3 font-heading text-sm font-semibold text-navy">
            Searching database...
          </p>
        </div>
      ) : lawyers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Users className="size-7" />
          </div>
          <h3 className="mt-4 font-heading text-lg font-bold text-navy">
            No advocates found matching your criteria
          </h3>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            Try adjusting your search keywords, expanding your radius, or clearing specialization and fee filters.
          </p>
          <Button
            onClick={handleResetFilters}
            variant="outline"
            className="mt-5 border-navy/20 text-navy hover:bg-navy/5 text-xs"
          >
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lawyers.map((lawyer) => {
            const specs = lawyer.specializations && lawyer.specializations.length > 0
              ? lawyer.specializations
              : [lawyer.primary_specialization || "General Practice"];

            return (
              <Card
                key={lawyer.id}
                className="group flex flex-col justify-between overflow-hidden border-border/80 transition-all duration-200 hover:-translate-y-1 hover:border-navy/30 hover:shadow-lg hover:shadow-navy/5"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-12 border border-slate-200">
                        {lawyer.avatar_url && (
                          <AvatarImage src={lawyer.avatar_url} alt={lawyer.full_name} />
                        )}
                        <AvatarFallback className="bg-navy font-heading text-sm font-bold text-gold">
                          {initials(lawyer.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-heading text-base font-bold text-navy">
                          {lawyer.full_name}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {lawyer.professional_title || "Advocate High Court"}
                        </p>
                      </div>
                    </div>
                    {lawyer.verification_status === "verified" && (
                      <Badge variant="secondary" className="gap-1 bg-teal-soft text-teal shrink-0 text-[10px]">
                        <BadgeCheck className="size-3 text-teal" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3.5 p-5 pt-0">
                  {/* Specializations Badges */}
                  <div className="flex flex-wrap gap-1">
                    {specs.slice(0, 3).map((spec) => (
                      <Badge
                        key={spec}
                        variant="outline"
                        className="border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-700"
                      >
                        {spec}
                      </Badge>
                    ))}
                    {specs.length > 3 && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        +{specs.length - 3} more
                      </Badge>
                    )}
                  </div>

                  {/* Bio snippet */}
                  {lawyer.bio && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {lawyer.bio}
                    </p>
                  )}

                  {/* Meta: Location, Exp, Rating */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-slate-400" />
                      {lawyer.city}
                      {lawyer.area ? `, ${lawyer.area}` : ""}
                    </span>

                    {typeof lawyer.distance_km === "number" && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-900 text-[10px] font-semibold">
                        {lawyer.distance_km} km away
                      </Badge>
                    )}

                    <span className="flex items-center gap-1 font-medium text-slate-800">
                      <Star className="size-3.5 fill-gold text-gold" />
                      {Number(lawyer.rating || 0).toFixed(1)}
                      <span className="font-normal text-muted-foreground">
                        ({lawyer.review_count || 0})
                      </span>
                    </span>

                    <span>{lawyer.years_of_experience || 1} yrs exp.</span>
                  </div>

                  {/* Consultation options icons */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="text-[11px] text-muted-foreground">Offers:</span>
                    {lawyer.offers_in_person && (
                      <span className="flex items-center gap-1" title="In-person office visit">
                        <Building2 className="size-3.5 text-teal" /> Office
                      </span>
                    )}
                    {lawyer.offers_video && (
                      <span className="flex items-center gap-1" title="Video consultation">
                        <Video className="size-3.5 text-teal" /> Video
                      </span>
                    )}
                    {lawyer.offers_phone && (
                      <span className="flex items-center gap-1" title="Phone consultation">
                        <Phone className="size-3.5 text-teal" /> Phone
                      </span>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 p-4">
                  <div>
                    <span className="font-heading font-bold text-navy text-sm">
                      {formatRate(lawyer.consultation_fee || 3000)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {" "}/ {lawyer.consultation_duration || 30}m
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                      <Link href={`/citizen/lawyers/${lawyer.id}`}>Profile</Link>
                    </Button>
                    <Button asChild size="sm" className="h-8 bg-navy text-white hover:bg-navy/90 text-xs">
                      <Link href={`/citizen/lawyers/${lawyer.id}?book=true`}>
                        <CalendarClock className="mr-1 size-3.5" />
                        Book
                      </Link>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
