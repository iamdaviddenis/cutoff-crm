import { NextResponse } from "next/server";
import { getViewer } from "../../../lib/auth";
import { isSupabaseConfigured } from "../../../lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { configured: false, viewer: null, message: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY." },
      { status: 200 },
    );
  }

  const viewer = await getViewer();
  return NextResponse.json({ configured: true, viewer });
}
