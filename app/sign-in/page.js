"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import { SetupBanner } from "../../components/system-state";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e) {
    e.preventDefault();
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setMessage(error ? error.message : "Magic link sent. Check your email.");
    setLoading(false);
  }

  if (!isSupabaseConfigured) {
    return <SetupBanner message="Add Supabase env vars before using auth." />;
  }

  return (
    <section className="card auth-card">
      <p className="eyebrow">Auth</p>
      <h1>Sign in</h1>
      <p className="subtle">Use Supabase magic-link auth. Add `role: admin` or `role: staff` in user metadata.</p>

      <form className="form-stack" onSubmit={signIn}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button className="primary-btn" disabled={loading} type="submit">
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>

      {message && <p className="subtle">{message}</p>}
    </section>
  );
}
