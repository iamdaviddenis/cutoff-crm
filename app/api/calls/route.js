import { NextResponse } from "next/server";
import { analyzeCall } from "../../../lib/call-intelligence";
import { requireViewer } from "../../../lib/auth";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase env is not configured." }, { status: 500 });
  }

  const auth = await requireViewer();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("calls")
    .select(`
      id,
      customer_id,
      staff_id,
      type,
      purpose,
      summary,
      outcome,
      duration,
      created_at,
      customers ( id, name, phone ),
      ai_insights ( sentiment, urgency, category, suggested_action )
    `)
    .order("created_at", { ascending: false });

  if (auth.viewer.role !== "admin") {
    query = query.eq("staff_id", auth.viewer.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase env is not configured." }, { status: 500 });
  }

  const auth = await requireViewer();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const payload = await request.json();
  const supabase = createSupabaseServerClient();

  let customerId = payload.customer_id;

  if (!customerId && payload.customer_name) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: payload.customer_name,
        phone: payload.customer_phone || null,
        region: payload.customer_region || null,
        source: payload.customer_source || "manual",
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

  const callPayload = {
    customer_id: customerId,
    staff_id: auth.viewer.id,
    type: payload.type,
    purpose: payload.purpose,
    summary: payload.summary,
    outcome: payload.outcome,
    duration: payload.duration ? Number(payload.duration) : null,
  };

  const { data: call, error: callError } = await supabase
    .from("calls")
    .insert(callPayload)
    .select("id,customer_id,staff_id,type,purpose,summary,outcome,duration,created_at")
    .single();

  if (callError) {
    return NextResponse.json({ error: callError.message }, { status: 500 });
  }

  const insightPayload = {
    call_id: call.id,
    ...analyzeCall(call.summary),
  };

  const { error: insightError } = await supabase.from("ai_insights").insert(insightPayload);
  if (insightError) {
    return NextResponse.json({ error: insightError.message }, { status: 500 });
  }

  let task = null;
  if (call.outcome === "follow_up") {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (insightPayload.urgency === "high" ? 1 : 2));

    const taskPayload = {
      customer_id: call.customer_id,
      related_call_id: call.id,
      assigned_to: auth.viewer.id,
      task: insightPayload.suggested_action,
      due_date: dueDate.toISOString(),
      status: "pending",
    };

    const { data: createdTask, error: taskError } = await supabase
      .from("tasks")
      .insert(taskPayload)
      .select("*")
      .single();

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    task = createdTask;
  }

  return NextResponse.json({ data: { call, insight: insightPayload, task } }, { status: 201 });
}
