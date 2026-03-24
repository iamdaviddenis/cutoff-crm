import { createSupabaseServerClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";

export async function getViewer() {
  if (!isSupabaseConfigured) return null;

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let profile = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  } catch {
    // profiles table may not exist yet — fall back to user_metadata
  }

  return {
    id: user.id,
    email: user.email,
    role: profile?.role || user.user_metadata?.role || "staff",
    fullName: profile?.full_name || user.user_metadata?.full_name || user.email || "User",
    avatarUrl: profile?.avatar_url || null,
  };
}

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) {
    return { error: { status: 401, message: "Not authenticated" } };
  }
  return { viewer };
}
