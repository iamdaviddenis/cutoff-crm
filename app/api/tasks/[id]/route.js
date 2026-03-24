import { NextResponse } from "next/server";
import { requireViewer } from "../../../../lib/auth";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../../lib/supabase/config";

export async function PATCH(request, { params }) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase env is not configured." }, { status: 500 });
  }

  const auth = await requireViewer();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const payload = await request.json();
  const supabase = createSupabaseServerClient();

  if (auth.viewer.role !== "admin") {
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("id,assigned_to")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (task.assigned_to !== auth.viewer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: payload.status })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
