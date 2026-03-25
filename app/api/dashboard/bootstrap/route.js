import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getViewer } from "../../../../lib/auth";
import { buildDashboardPayload } from "../../../../lib/dashboard-data";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../../lib/supabase/config";

/**
 * Single round-trip for the dashboard page: viewer + admin payload.
 * Avoids duplicate getViewer() work from separate /api/me + /api/dashboard calls.
 */
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({
      configured: false,
      viewer: null,
      dashboard: null,
      forbidden: false,
      message: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    });
  }

  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({
      configured: true,
      viewer: null,
      dashboard: null,
      forbidden: false,
    });
  }

  if (viewer.role !== "admin") {
    return NextResponse.json({
      configured: true,
      viewer,
      dashboard: null,
      forbidden: true,
    });
  }

  const supabase = createSupabaseServerClient();
  const dashboard = await buildDashboardPayload(supabase);

  return NextResponse.json({
    configured: true,
    viewer,
    dashboard,
    forbidden: false,
  });
}
