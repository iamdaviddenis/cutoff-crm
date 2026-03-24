import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "../lib/supabase/config";

export default function HomePage() {
  redirect(isSupabaseConfigured ? "/admin" : "/setup");
}
