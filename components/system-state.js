"use client";

import Link from "next/link";

export function SetupBanner({ message }) {
  return (
    <div className="notice warning">
      <strong>Supabase setup needed.</strong>
      <span>{message}</span>
    </div>
  );
}

export function AuthRequired() {
  return (
    <div className="notice">
      <strong>Sign in required.</strong>
      <span>Use Supabase Auth to continue.</span>
      <Link className="inline-link" href="/sign-in">Open sign in</Link>
    </div>
  );
}

export function EmptyPanel({ title, copy }) {
  return (
    <div className="empty-panel">
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  );
}
