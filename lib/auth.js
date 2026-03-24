import { createSupabaseServerClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";

export async function getViewer() {
  if (!isSupabaseConfigured) return null;

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role || "staff",
    fullName: user.user_metadata?.full_name || user.email || "User",
  };
}

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) {
    return { error: { status: 401, message: "Not authenticated" } };
  }
  return { viewer };
}
