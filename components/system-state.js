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
          <ol className="simple-list">
            <li>Add the two env vars in Vercel.</li>
            <li>Apply <code>supabase/schema-v2.sql</code> in Supabase.</li>
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
      <span>You need to be signed in to access this page.</span>
      <Link className="inline-link" href="/login">Go to sign in →</Link>
    </section>
  );
}

export function EmptyPanel({ title, copy, action }) {
  return (
    <div className="empty-panel">
      <strong>{title}</strong>
      {copy && <span className="subtle">{copy}</span>}
      {action}
    </div>
  );
}
