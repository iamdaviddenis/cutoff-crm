"use client";

import Link from "next/link";

export function SetupBanner({ message }) {
  return (
    <section className="setup-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Setup</p>
          <h1>Finish Supabase setup</h1>
          <p className="subtle">{message}</p>
        </div>
        <Link className="ghost-btn" href="/setup">Open setup guide</Link>
      </div>

      <div className="setup-grid">
        <div className="info-block">
          <span>Environment variables</span>
          <div className="code-list">
            <code>NEXT_PUBLIC_SUPABASE_URL</code>
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </div>
        </div>

        <div className="info-block">
          <span>Next steps</span>
          <ol className="simple-list ordered">
            <li>Add the two env vars in Vercel.</li>
            <li>Apply the SQL in <code>supabase/schema.sql</code>.</li>
            <li>Create a user in Supabase Auth and sign in.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}

export function AuthRequired() {
  return (
    <section className="notice">
      <strong>Sign in required.</strong>
      <span>Use Supabase Auth to continue, then return to this workspace.</span>
      <Link className="inline-link" href="/sign-in">Open sign in</Link>
    </section>
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
