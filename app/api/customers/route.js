import { NextResponse } from "next/server";
import { requireViewer } from "../../../lib/auth";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const auth = await requireViewer();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, region, type, source, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const auth = await requireViewer();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const payload = await request.json();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name:   payload.name,
      phone:  payload.phone  || null,
      region: payload.region || null,
      type:   payload.type   || "lead",
      source: payload.source || "manual",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
