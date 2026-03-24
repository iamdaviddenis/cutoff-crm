"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthRequired } from "./system-state";
import { CHANNEL_LABELS, OUTCOME_LABELS } from "../lib/ai";

const PRIORITY_COLORS = { high: "danger", medium: "warn", low: "" };

export function Customer360Page({ customerId }) {
  const [viewer, setViewer] = useState(null);
  const [data,   setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const me = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
      setViewer(me.viewer);
      if (!me.configured || !me.viewer) { setLoading(false); return; }

      const res = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
      if (res.ok) {
        const payload = await res.json();
        setData(payload.data);
      }
      setLoading(false);
    }
    load();
  }, [customerId]);

  if (!viewer)  return <AuthRequired />;
  if (loading)  return <p className="subtle">Loading…</p>;
  if (!data)    return <p className="subtle">Customer not found.</p>;

  const { customer, interactions, tasks } = data;

  const openTasks     = tasks.filter((t) => t.status !== "completed");
  const lastInteraction = interactions[0];
  const hasHighRisk = interactions.some((i) => i.ai_insights?.[0]?.urgency === "high")
    || interactions.some((i) => i.ai_insights?.[0]?.sentiment === "negative");

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link href="/customers" style={{ color: "#5d6a60", fontSize: "0.84rem" }}>← Customers</Link>
          </div>
          <h1 style={{ margin: "0.4rem 0 0.2rem" }}>{customer.name}</h1>
          <div className="chip-row">
            <span className={`customer-type ${customer.type}`}>{customer.type}</span>
            {customer.phone && <span className="subtle">{customer.phone}</span>}
            {customer.region && <span className="subtle">{customer.region}</span>}
            {hasHighRisk && <span className="pill danger">At risk</span>}
          </div>
        </div>
        <Link href={`/interactions/new`} className="icon-btn">+ Log interaction</Link>
      </div>

      <div className="page-grid">
        {/* Timeline */}
        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">History</p>
              <h2 style={{ margin: "0.2rem 0 0" }}>Interaction timeline</h2>
            </div>
            <span className="subtle" style={{ fontSize: "0.82rem" }}>{interactions.length} total</span>
          </div>

          {interactions.length === 0 ? (
            <p className="subtle">No interactions recorded yet.</p>
          ) : (
            <div className="timeline">
              {interactions.map((item, idx) => {
                const insight = item.ai_insights?.[0];
                return (
                  <div key={item.id} className="timeline-item">
                    <div>
                      <div
                        className={`timeline-dot ${insight?.urgency === "high" ? "high" : insight?.sentiment === "negative" ? "negative" : ""}`}
                      />
                      {idx < interactions.length - 1 && <div className="timeline-line" />}
                    </div>
                    <div style={{ paddingBottom: idx < interactions.length - 1 ? "0.5rem" : 0 }}>
                      <div className="chip-row" style={{ marginBottom: "0.35rem" }}>
                        <span className="pill" style={{ fontSize: "0.72rem" }}>{CHANNEL_LABELS[item.channel]}</span>
                        <span className="pill" style={{ fontSize: "0.72rem" }}>{item.direction}</span>
                        {item.outcome && <span className="pill" style={{ fontSize: "0.72rem" }}>{OUTCOME_LABELS[item.outcome]}</span>}
                        {insight?.urgency === "high" && <span className="pill danger" style={{ fontSize: "0.72rem" }}>Urgent</span>}
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.55, fontSize: "0.875rem" }}>{item.content}</p>
                      {insight?.suggested_action && (
                        <p style={{ margin: "0.3rem 0 0", color: "#5d6a60", fontSize: "0.78rem" }}>
                          AI: {insight.suggested_action}
                        </p>
                      )}
                      <p style={{ margin: "0.3rem 0 0", color: "#5d6a60", fontSize: "0.75rem" }}>
                        {new Date(item.created_at).toLocaleString()}
                        {item.duration ? ` · ${item.duration} min` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Side panel */}
        <aside style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          {/* Open tasks */}
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Tasks</p>
                <h2 style={{ margin: "0.2rem 0 0" }}>Open tasks</h2>
              </div>
              <span className="pill">{openTasks.length}</span>
            </div>
            {openTasks.length === 0 ? (
              <p className="subtle">No open tasks.</p>
            ) : (
              <div className="stack">
                {openTasks.map((t) => (
                  <div key={t.id} className={`list-card ${t.status !== "completed" && new Date(t.due_date) < new Date() ? "danger-border" : ""}`}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.84rem" }}>{t.title}</h4>
                      <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#5d6a60" }}>
                        Due {new Date(t.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`pill ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick stats */}
          <section className="card">
            <p className="eyebrow" style={{ marginBottom: "0.75rem" }}>Summary</p>
            <div className="stack">
              <div className="info-block">
                <span>Total interactions</span>
                <strong style={{ fontSize: "1.5rem" }}>{interactions.length}</strong>
              </div>
              {lastInteraction && (
                <div className="info-block">
                  <span>Last interaction</span>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.84rem" }}>
                    {new Date(lastInteraction.created_at).toLocaleDateString()}
                    {" via "}
                    {CHANNEL_LABELS[lastInteraction.channel]}
                  </p>
                </div>
              )}
              <div className="info-block">
                <span>Customer since</span>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.84rem" }}>
                  {new Date(customer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
