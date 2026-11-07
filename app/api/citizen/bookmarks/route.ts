import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient() ?? supabase;
    const { data, error } = await db
      .from("saved_resources")
      .select("resource_id")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      slugs: (data ?? []).map((r: { resource_id: string }) => r.resource_id),
    });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { slug?: string };
    const slug = String(body.slug || "").trim();
    if (!slug) {
      return NextResponse.json({ error: "Missing resource slug." }, { status: 400 });
    }

    const db = createAdminClient() ?? supabase;
    const { data: existing } = await db
      .from("saved_resources")
      .select("id")
      .eq("user_id", user.id)
      .eq("resource_id", slug)
      .maybeSingle();

    if (existing) {
      await db.from("saved_resources").delete().eq("id", existing.id);
      return NextResponse.json({ saved: false, slug });
    }

    await db.from("saved_resources").insert({
      user_id: user.id,
      resource_id: slug,
    });

    return NextResponse.json({ saved: true, slug });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
