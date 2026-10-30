import { NextResponse } from "next/server";
import { getAvailableSlotsForDate } from "@/lib/services/availability";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const durationStr = searchParams.get("duration");
    const durationMinutes = durationStr ? Number(durationStr) : undefined;

    if (!dateStr) {
      return NextResponse.json({ error: "Date parameter required" }, { status: 400 });
    }

    const slots = await getAvailableSlotsForDate(id, dateStr, durationMinutes);
    return NextResponse.json({ slots });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, slots: [] }, { status: 500 });
  }
}
