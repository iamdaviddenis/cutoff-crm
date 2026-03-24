"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/config";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-card">
        <p className="eyebrow">Setup required</p>
        <h1 style={{ margin: "0.25rem 0 0.5rem" }}>Supabase not configured</h1>
        <p className="subtle">Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment variables.</p>
      </div>
    );
  }

  async function signIn(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="auth-card">
      <p className="eyebrow">CutOff CRM</p>
      <h1 style={{ margin: "0.3rem 0 0.2rem", fontSize: "1.5rem" }}>Sign in</h1>
      <p className="subtle" style={{ marginBottom: "1.5rem" }}>Customer Command Center</p>

      <form className="form-stack" onSubmit={signIn}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoFocus
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {error && (
          <p style={{ margin: 0, color: "#9d3823", fontSize: "0.84rem" }}>{error}</p>
        )}

        <button className="primary-btn" disabled={loading} type="submit">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
