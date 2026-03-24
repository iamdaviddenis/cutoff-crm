"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

export default function UserMenu({ viewer }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!viewer) return null;

  const initials = viewer.fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="user-menu">
      <button
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div className="user-avatar">{initials}</div>
        <span className="user-name">{viewer.fullName}</span>
        <span className="role-badge">{viewer.role}</span>
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
          <div className="user-menu-dropdown">
            <button className="user-menu-item danger" onClick={signOut} type="button">
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
