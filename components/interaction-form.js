"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthRequired } from "./system-state";
import { CHANNELS, DIRECTIONS, OUTCOMES, CHANNEL_LABELS, OUTCOME_LABELS } from "../lib/ai";

export function InteractionFormPage() {
  const [viewer,    setViewer]    = useState(null);
  const [customers, setCustomers] = useState([]);
  const [query,     setQuery]     = useState("");
  const [newCustomer, setNewCustomer] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [notice,    setNotice]    = useState({ text: "", type: "" });
  const router = useRouter();

  const [form, setForm] = useState({
    customer_id:    "",
    customer_name:  "",
    customer_phone: "",
    channel:        "call",
    direction:      "outgoing",
    content:        "",
    outcome:        "follow_up",
    duration:       "",
  });

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    async function load() {
      const me = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
      setViewer(me.viewer);
      if (!me.configured || !me.viewer) return;
      const res = await fetch("/api/customers", { cache: "no-store" });
      if (res.ok) {
        const payload = await res.json();
        const list = payload.data || [];
        setCustomers(list);
        if (list[0]?.id) set("customer_id", list[0].id);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.name} ${c.phone || ""} ${c.region || ""}`.toLowerCase().includes(q),
    );
  }, [customers, query]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setNotice({ text: "", type: "" });

    const body = newCustomer
      ? { ...form, customer_id: undefined }
      : form;

    const res     = await fetch("/api/interactions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const payload = await res.json();

    if (!res.ok) {
      setNotice({ text: payload.error || "Failed to save.", type: "error" });
      setSaving(false);
      return;
    }

    const taskCreated = !!payload.data?.task;
    setNotice({
      text: taskCreated
        ? "Logged. Follow-up task created automatically."
        : "Interaction logged successfully.",
      type: "success",
    });

    // Reset content fields, keep customer selection
    setForm((f) => ({ ...f, content: "", duration: "", customer_name: "", customer_phone: "" }));
    setSaving(false);

    setTimeout(() => router.push("/interactions"), 1200);
  }

  if (!viewer && !customers.length) return null;
  if (!viewer) return <AuthRequired />;

  return (
    <div className="page-grid">
      <section className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Interactions</p>
            <h1 style={{ margin: "0.2rem 0 0" }}>Log interaction</h1>
            <p className="subtle">Fast entry — fill in and submit.</p>
          </div>
        </div>

        <form className="form-stack" onSubmit={submit}>
          {/* Customer */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span className="field span" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#5d6a60", fontWeight: 600 }}>Customer</span>
              <button
                type="button"
                className="ghost-btn"
                style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem" }}
                onClick={() => setNewCustomer((v) => !v)}
              >
                {newCustomer ? "← Select existing" : "+ New customer"}
              </button>
            </div>

            {newCustomer ? (
              <div className="grid-two" style={{ gap: "0.75rem" }}>
                <label className="field">
                  <span>Name *</span>
                  <input
                    value={form.customer_name}
                    onChange={(e) => set("customer_name", e.target.value)}
                    placeholder="Customer name"
                    required={newCustomer}
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    value={form.customer_phone}
                    onChange={(e) => set("customer_phone", e.target.value)}
                    placeholder="+254…"
                  />
                </label>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <input
                  className="field input"
                  style={{ borderRadius: "0.75rem", border: "1px solid rgba(24,33,27,0.14)", padding: "0.75rem 0.9rem", background: "rgba(255,255,255,0.9)" }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customer…"
                />
                <select
                  style={{ borderRadius: "0.75rem", border: "1px solid rgba(24,33,27,0.14)", padding: "0.75rem 0.9rem", background: "rgba(255,255,255,0.9)", width: "100%" }}
                  value={form.customer_id}
                  onChange={(e) => set("customer_id", e.target.value)}
                >
                  {filtered.length === 0 && <option value="">No customers found</option>}
                  {filtered.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.phone ? ` · ${c.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Channel & Direction */}
          <div className="grid-two">
            <label className="field">
              <span>Channel</span>
              <select value={form.channel} onChange={(e) => set("channel", e.target.value)}>
                {CHANNELS.map((v) => <option key={v} value={v}>{CHANNEL_LABELS[v]}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Direction</span>
              <select value={form.direction} onChange={(e) => set("direction", e.target.value)}>
                {DIRECTIONS.map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
              </select>
            </label>
          </div>

          {/* Summary */}
          <label className="field">
            <span>Summary *</span>
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="What happened in this interaction?"
              required
            />
          </label>

          {/* Outcome */}
          <div>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#5d6a60", fontWeight: 600 }}>Outcome</p>
            <div className="outcome-grid">
              {OUTCOMES.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`outcome-btn ${form.outcome === v ? "selected" : ""}`}
                  onClick={() => set("outcome", v)}
                >
                  {OUTCOME_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Duration (call only) */}
          {form.channel === "call" && (
            <label className="field">
              <span>Duration (minutes)</span>
              <input
                type="number"
                min="0"
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
                placeholder="e.g. 5"
              />
            </label>
          )}

          <button className="primary-btn" disabled={saving} type="submit">
            {saving ? "Saving…" : "Log interaction"}
          </button>

          {notice.text && (
            <p style={{ margin: 0, fontSize: "0.84rem", color: notice.type === "error" ? "#9d3823" : "#245745" }}>
              {notice.text}
            </p>
          )}
        </form>
      </section>

      <aside className="card side-card">
        <p className="eyebrow">How it works</p>
        <h2 style={{ margin: "0.2rem 0 0.75rem" }}>What happens next</h2>
        <div className="stack">
          <div className="info-block">
            <span>1. Interaction logged</span>
            <p className="subtle">Stored with channel, direction, and summary.</p>
          </div>
          <div className="info-block">
            <span>2. AI analysis</span>
            <p className="subtle">Sentiment, urgency, category, and suggested action are generated.</p>
          </div>
          <div className="info-block">
            <span>3. Auto task</span>
            <p className="subtle">If outcome is Follow Up or urgency is High, a task is created automatically.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
