import { NextResponse } from "next/server";
import { requireViewer } from "../../../../lib/auth";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../../lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase env is not configured." }, { status: 500 });
  }

  const auth = await requireViewer();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  if (auth.viewer.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: calls, error: callsError }, { data: tasks, error: tasksError }, { data: insights, error: insightsError }] = await Promise.all([
    supabase.from("calls").select("id,customer_id,staff_id,summary,created_at"),
    supabase.from("tasks").select("id,customer_id,assigned_to,status,due_date,task"),
    supabase.from("ai_insights").select("id,call_id,sentiment,urgency,category,suggested_action"),
  ]);

  const error = callsError || tasksError || insightsError;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const callsToday = (calls || []).filter((call) => call.created_at.slice(0, 10) === today).length;
  const highUrgency = (insights || []).filter((insight) => insight.urgency === "high").length;
  const openTasks = (tasks || []).filter((task) => task.status === "pending").length;
  const overdueTasks = (tasks || []).filter((task) => task.status === "pending" && new Date(task.due_date).getTime() < Date.now()).length;
  const callsByCategory = (insights || []).reduce((acc, insight) => {
    acc[insight.category] = (acc[insight.category] || 0) + 1;
    return acc;
  }, {});
  const alerts = (insights || []).filter((insight) => insight.sentiment === "negative" || insight.urgency === "high");

  return NextResponse.json({
    data: {
      callsToday,
      highUrgency,
      openTasks,
      overdueTasks,
      callsByCategory,
      alerts,
      recentCalls: (calls || []).slice(-8).reverse(),
    },
  });
}
