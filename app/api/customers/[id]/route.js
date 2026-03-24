import { NextResponse } from "next/server";
import { requireViewer } from "../../../../lib/auth";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../../lib/supabase/config";

export async function GET(request, { params }) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const auth = await requireViewer();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase  = createSupabaseServerClient();
  const { id }    = params;

  const [{ data: customer }, { data: interactions }, { data: tasks }] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("interactions")
      .select(`
        id, channel, direction, content, outcome, duration, created_at, staff_id,
        ai_insights ( sentiment, urgency, category, intent, suggested_action )
      `)
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, description, status, priority, due_date, assigned_to, created_at")
      .eq("customer_id", id)
      .order("due_date", { ascending: true }),
  ]);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  return NextResponse.json({
    data: { customer, interactions: interactions || [], tasks: tasks || [] },
  });
}
