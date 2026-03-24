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

  const supabase = createSupabaseServerClient();
  const today    = new Date().toISOString().slice(0, 10);

  const [
    { data: interactions },
    { data: tasks },
    { data: insights },
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
  ]);

  const interactionsToday = (interactions || []).filter(
    (i) => i.created_at.slice(0, 10) === today,
  ).length;

  const highUrgency  = (insights || []).filter((i) => i.urgency === "high").length;
  const openTasks    = (tasks    || []).filter((t) => t.status !== "completed").length;
  const overdueTasks = (tasks    || []).filter(
    (t) => t.status !== "completed" && new Date(t.due_date) < new Date(),
  ).length;

  const byCategory = (insights || []).reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});

  const alerts = (insights || [])
    .filter((i) => i.sentiment === "negative" || i.urgency === "high")
    .slice(0, 8);

  // Enrich recent feed with customer names
  const insightMap = Object.fromEntries((insights || []).map((i) => [i.interaction_id, i]));
  const recentFeed = (interactions || []).slice(0, 12).map((i) => ({
    id:           i.id,
    content:      i.content,
    channel:      i.channel,
    outcome:      i.outcome,
    created_at:   i.created_at,
    customer:     i.customers?.name || "Unknown",
    urgency:      insightMap[i.id]?.urgency  || "low",
    sentiment:    insightMap[i.id]?.sentiment || "neutral",
  }));

  // Team performance: tasks completed & interactions per staff member
  const staffTasks = (tasks || []).reduce((acc, t) => {
    if (!acc[t.assigned_to]) acc[t.assigned_to] = { completed: 0, open: 0 };
    if (t.status === "completed") acc[t.assigned_to].completed++;
    else acc[t.assigned_to].open++;
    return acc;
  }, {});

  return NextResponse.json({
    data: {
      interactionsToday,
      highUrgency,
      openTasks,
      overdueTasks,
      byCategory,
      alerts,
      recentFeed,
      staffTasks,
    },
  });
}
