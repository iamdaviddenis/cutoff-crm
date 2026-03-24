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
  let query = supabase
    .from("tasks")
    .select(`
      id, customer_id, interaction_id, assigned_to,
      title, description, due_date, status, priority, created_at,
      customers ( id, name, phone )
    `)
    .order("due_date", { ascending: true });

  if (auth.viewer.role !== "admin") {
    query = query.eq("assigned_to", auth.viewer.id);
  }

  const { data, error } = await query;
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

  const payload  = await request.json();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      customer_id:    payload.customer_id,
      interaction_id: payload.interaction_id || null,
      assigned_to:    payload.assigned_to    || auth.viewer.id,
      title:          payload.title,
      description:    payload.description    || null,
      due_date:       payload.due_date,
      status:         payload.status         || "pending",
      priority:       payload.priority       || "medium",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
