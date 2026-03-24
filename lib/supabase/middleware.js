import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./config";

export function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  supabase.auth.getUser();
  return response;
}
