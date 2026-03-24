import { NextResponse } from "next/server";
import { requireViewer } from "../../../../lib/auth";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../../lib/supabase/config";
import { generateWhatsAppMessage } from "../../../../lib/ai";

export async function POST(request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const auth = await requireViewer();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const { customer_id } = await request.json();
  if (!customer_id) {
    return NextResponse.json({ error: "customer_id is required." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // Fetch customer + last interaction + its insight
  const [{ data: customer }, { data: interactions }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", customer_id).single(),
    supabase
      .from("interactions")
      .select("*, ai_insights(sentiment, urgency, category, intent, suggested_action)")
      .eq("customer_id", customer_id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const lastInteraction = interactions?.[0] || null;
  const insight         = lastInteraction?.ai_insights?.[0] || null;

  const message = generateWhatsAppMessage({ customer, lastInteraction, insight });

  return NextResponse.json({ data: { message } });
}
