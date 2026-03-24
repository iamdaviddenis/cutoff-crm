import { NextResponse } from "next/server";
import { analyzeInteraction } from "../../../lib/ai";
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
    .from("interactions")
    .select(`
      id, customer_id, staff_id, channel, direction,
      content, outcome, duration, created_at,
      customers ( id, name, phone, type ),
      ai_insights ( sentiment, urgency, category, intent, suggested_action )
    `)
    .order("created_at", { ascending: false });

  if (auth.viewer.role !== "admin") {
    query = query.eq("staff_id", auth.viewer.id);
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

  const payload = await request.json();
  const supabase = createSupabaseServerClient();

  // Auto-create customer if name provided instead of id
  let customerId = payload.customer_id;
  if (!customerId && payload.customer_name) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: payload.customer_name,
        phone: payload.customer_phone || null,
        type: payload.customer_type || "lead",
        source: "manual",
      })
      .select("id")
      .single();

    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }
    customerId = customer.id;
  }

  if (!customerId) {
    return NextResponse.json({ error: "customer_id or customer_name is required." }, { status: 400 });
  }

  // Insert interaction
  const { data: interaction, error: interactionError } = await supabase
    .from("interactions")
    .insert({
      customer_id: customerId,
      staff_id:    auth.viewer.id,
      channel:     payload.channel   || "call",
      direction:   payload.direction || "outgoing",
      content:     payload.content,
      outcome:     payload.outcome   || null,
      duration:    payload.duration  ? Number(payload.duration) : null,
    })
    .select("id, customer_id, staff_id, channel, direction, content, outcome, duration, created_at")
    .single();

  if (interactionError) {
    return NextResponse.json({ error: interactionError.message }, { status: 500 });
  }

  // AI analysis
  const insight = analyzeInteraction(interaction.content);
  const { error: insightError } = await supabase.from("ai_insights").insert({
    interaction_id:   interaction.id,
    ...insight,
  });

  if (insightError) {
    return NextResponse.json({ error: insightError.message }, { status: 500 });
  }

  // Auto-create task on follow_up outcome or high urgency
  let task = null;
  if (interaction.outcome === "follow_up" || insight.urgency === "high") {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (insight.urgency === "high" ? 1 : 2));

    const { data: createdTask, error: taskError } = await supabase
      .from("tasks")
      .insert({
        customer_id:    interaction.customer_id,
        interaction_id: interaction.id,
        assigned_to:    auth.viewer.id,
        title:          insight.suggested_action,
        description:    `Follow-up from ${interaction.channel} interaction.`,
        due_date:       dueDate.toISOString(),
        status:         "pending",
        priority:       insight.urgency,
      })
      .select("*")
      .single();

    if (!taskError) task = createdTask;
  }

  return NextResponse.json({ data: { interaction, insight, task } }, { status: 201 });
}
