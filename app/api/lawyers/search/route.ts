import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { searchLawyers } from "@/lib/services/lawyers";

const SORT_OPTIONS = ["recommended", "nearest", "highest_rated", "experience", "fee_low"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || undefined;
    const specialization = searchParams.get("specialization") || undefined;
    const city = searchParams.get("city") || undefined;
    const area = searchParams.get("area") || undefined;
    const sortParam = searchParams.get("sort");
    const sort: SortOption = SORT_OPTIONS.includes(sortParam as SortOption)
      ? (sortParam as SortOption)
      : "recommended";
    const minExperience = searchParams.get("minExperience")
      ? Number(searchParams.get("minExperience"))
      : undefined;
    const maxFee = searchParams.get("maxFee")
      ? Number(searchParams.get("maxFee"))
      : undefined;
    const minRating = searchParams.get("minRating")
      ? Number(searchParams.get("minRating"))
      : undefined;

    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const radiusStr = searchParams.get("radius");

    const latitude = latStr ? parseFloat(latStr) : undefined;
    const longitude = lngStr ? parseFloat(lngStr) : undefined;
    const radiusKm = radiusStr ? parseFloat(radiusStr) : 50;

    const lawyers = await searchLawyers({
      query,
      specialization,
      city,
      area,
      sort,
      minExperience,
      maxFee,
      minRating,
      latitude,
      longitude,
      radiusKm,
    });

    return NextResponse.json({ lawyers });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err), lawyers: [] }, { status: 500 });
  }
}
