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
  if (auth.viewer.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase  = createSupabaseServerClient();
  const today     = new Date().toISOString().slice(0, 10);
  const todayEnd  = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const [
    { data: interactions },
    { data: tasks },
    { data: insights },
    { data: customers },
  ] = await Promise.all([
    supabase
      .from("interactions")
      .select("id, staff_id, content, outcome, channel, created_at, customers(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, assigned_to, status, due_date, title, priority"),
    supabase
      .from("ai_insights")
      .select("id, interaction_id, sentiment, urgency, category, suggested_action"),
    supabase
      .from("customers")
      .select("id, name, phone, type, lead_score, next_action_date, next_action_note"),
  ]);

  const interactionsToday = (interactions || []).filter(
    (i) => i.created_at.slice(0, 10) === today,
  ).length;

  const highUrgency  = (insights  || []).filter((i) => i.urgency === "high").length;
  const openTasks    = (tasks     || []).filter((t) => t.status !== "completed").length;
  const overdueTasks = (tasks     || []).filter(
    (t) => t.status !== "completed" && new Date(t.due_date) < new Date(),
  ).length;

  const byCategory = (insights || []).reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});

  const alerts = (insights || [])
    .filter((i) => i.sentiment === "negative" || i.urgency === "high")
    .slice(0, 8);

  // Enrich recent feed with urgency
  const insightMap  = Object.fromEntries((insights || []).map((i) => [i.interaction_id, i]));
  const recentFeed  = (interactions || []).slice(0, 12).map((i) => ({
    id:         i.id,
    content:    i.content,
    channel:    i.channel,
    outcome:    i.outcome,
    created_at: i.created_at,
    customer:   i.customers?.name || "Unknown",
    urgency:    insightMap[i.id]?.urgency   || "low",
    sentiment:  insightMap[i.id]?.sentiment || "neutral",
  }));

  // Customers due for follow-up today or overdue
  const dueToday = (customers || []).filter((c) => {
    if (!c.next_action_date) return false;
    const d = new Date(c.next_action_date);
    return d <= todayEnd;
  });

  // Lead pipeline counts
  const pipeline = {
    hot:  (customers || []).filter((c) => c.lead_score === "hot").length,
    warm: (customers || []).filter((c) => c.lead_score === "warm").length,
    cold: (customers || []).filter((c) => c.lead_score === "cold").length,
  };

  return NextResponse.json({
    data: {
      interactionsToday,
      highUrgency,
      openTasks,
      overdueTasks,
      byCategory,
      alerts,
      recentFeed,
      dueToday,
      pipeline,
    },
  });
}
