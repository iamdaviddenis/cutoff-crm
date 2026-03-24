"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/config";

export function useRealtimeRefresh(channelName, tables, onChange) {
  useEffect(() => {
    if (!isSupabaseConfigured || typeof onChange !== "function") return undefined;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onChange(),
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, tables, onChange]);
}
