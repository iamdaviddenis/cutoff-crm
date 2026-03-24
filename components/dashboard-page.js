"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthRequired, EmptyPanel } from "./system-state";
import { useRealtimeRefresh } from "./use-realtime-refresh";

const CATEGORY_LABELS = { sales: "Sales", support: "Support", logistics: "Logistics", partnership: "Partnership" };

function WeeklyReportPanel({ onClose }) {
  const [report,  setReport]  = useState("");
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    fetch("/api/ai/report")
      .then((r) => r.json())
      .then((p) => { setReport(p.data?.report || "Failed to generate report."); setLoading(false); });
  }, []);

  function copy() {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer">
        <div className="section-head">
          <div>
            <p className="eyebrow">AI Report</p>
            <h2 style={{ margin: "0.2rem 0 0" }}>Weekly summary</h2>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {!loading && <button className="ghost-btn" onClick={copy} type="button">{copied ? "Copied!" : "Copy"}</button>}
            <button className="ghost-btn" onClick={onClose} type="button">Close</button>
          </div>
        </div>

        {loading ? (
          <p className="subtle">Generating report…</p>
        ) : (
          <pre style={{
            margin: 0,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "0.78rem",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            color: "#18211b",
          }}>
            {report}
          </pre>
        )}
      </aside>
    </div>
  );
}

export function DashboardPage() {
  const [viewer,      setViewer]      = useState(null);
  const [dashboard,   setDashboard]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [showReport,  setShowReport]  = useState(false);

  const load = useCallback(async () => {
    const me = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
    setViewer(me.viewer);
    if (!me.configured || !me.viewer) { setLoading(false); return; }

    const res = await fetch("/api/dashboard", { cache: "no-store" });
    if (res.status === 403) { setDashboard({ forbidden: true }); setLoading(false); return; }
    if (!res.ok)            { setLoading(false); return; }
    const payload = await res.json();
    setDashboard(payload.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh("dashboard", ["interactions", "tasks"], load);

  if (!viewer)              return <AuthRequired />;
  if (dashboard?.forbidden) return <EmptyPanel title="Admin access only" copy="This page is visible to admins only." />;
  if (loading || !dashboard) return <p className="subtle">Loading dashboard…</p>;

  const categories = Object.entries(dashboard.byCategory || {});

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {/* Metrics row */}
      <div className="metric-grid">
        <div className="metric-card">
          <span>Interactions today</span>
          <strong>{dashboard.interactionsToday}</strong>
        </div>
        <div className={`metric-card ${dashboard.highUrgency > 0 ? "alert" : ""}`}>
          <span>High urgency</span>
          <strong>{dashboard.highUrgency}</strong>
        </div>
        <div className="metric-card">
          <span>Open tasks</span>
          <strong>{dashboard.openTasks}</strong>
        </div>
        <div className={`metric-card ${dashboard.overdueTasks > 0 ? "alert" : ""}`}>
          <span>Overdue tasks</span>
          <strong>{dashboard.overdueTasks}</strong>
        </div>
      </div>

      {/* Pipeline + Due today */}
      <div className="grid-two">
        {/* Lead pipeline */}
        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Pipeline</p>
              <h2 style={{ margin: "0.2rem 0 0" }}>Lead scores</h2>
            </div>
            <Link href="/customers" className="ghost-btn" style={{ fontSize: "0.82rem", padding: "0.4rem 0.8rem" }}>
              View all →
            </Link>
          </div>
          <div className="stack">
            {[
              { label: "🔥 Hot",   key: "hot",  color: "#a6432d" },
              { label: "🟡 Warm",  key: "warm", color: "#9c4d15" },
              { label: "🔵 Cold",  key: "cold", color: "#5d6a60" },
            ].map(({ label, key, color }) => (
              <div className="list-card" key={key}>
                <span style={{ fontWeight: 600, color }}>{label}</span>
                <strong style={{ fontSize: "1.25rem" }}>{dashboard.pipeline?.[key] ?? 0}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* Due for follow-up today */}
        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Action required</p>
              <h2 style={{ margin: "0.2rem 0 0" }}>Due for follow-up</h2>
            </div>
            <span className={`pill ${(dashboard.dueToday?.length || 0) > 0 ? "danger" : ""}`}>
              {dashboard.dueToday?.length || 0}
            </span>
          </div>

          {(dashboard.dueToday || []).length === 0 ? (
            <p className="subtle">No follow-ups due today. 👍</p>
          ) : (
            <div className="stack">
              {dashboard.dueToday.slice(0, 6).map((c) => (
                <Link href={`/customers/${c.id}`} key={c.id} className="list-card" style={{ display: "flex" }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>{c.name}</strong>
                    {c.next_action_note && (
                      <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#5d6a60" }}>
                        {c.next_action_note}
                      </p>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <span className={`lead-score-badge ${c.lead_score}`}>{c.lead_score}</span>
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#9d3823" }}>
                      {new Date(c.next_action_date) < new Date() ? "Overdue" : "Today"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="page-grid">
        {/* Live feed */}
        <div style={{ display: "grid", gap: "1rem" }}>
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Live feed</p>
                <h2 style={{ margin: "0.2rem 0 0" }}>Recent interactions</h2>
              </div>
              <Link href="/interactions/new" className="icon-btn">+ Log interaction</Link>
            </div>

            {(dashboard.recentFeed || []).length === 0 ? (
              <EmptyPanel title="No interactions yet" copy="Log your first interaction to see activity here." />
            ) : (
              <div className="feed">
                {dashboard.recentFeed.map((item) => (
                  <div className="feed-item" key={item.id}>
                    <div className={`feed-dot ${item.urgency === "high" ? "high" : item.urgency === "medium" ? "medium" : ""}`} />
                    <div>
                      <p className="feed-text">{item.content.slice(0, 120)}{item.content.length > 120 ? "…" : ""}</p>
                      <p className="feed-meta">
                        {item.customer} · {item.channel} · {new Date(item.created_at).toLocaleString()}
                        {item.urgency === "high" && <span className="pill danger" style={{ marginLeft: "0.4rem" }}>Urgent</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {categories.length > 0 && (
            <section className="card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Breakdown</p>
                  <h2 style={{ margin: "0.2rem 0 0" }}>By category</h2>
                </div>
              </div>
              <div className="stack">
                {categories.map(([key, count]) => (
                  <div className="list-card" key={key}>
                    <span>{CATEGORY_LABELS[key] || key}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column */}
        <aside style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          {/* Alerts */}
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Alerts</p>
                <h2 style={{ margin: "0.2rem 0 0" }}>Needs attention</h2>
              </div>
            </div>

            {(dashboard.alerts || []).length === 0 ? (
              <p className="subtle">No alerts. All clear. ✓</p>
            ) : (
              <div className="stack">
                {dashboard.alerts.map((alert) => (
                  <div className="list-card danger-border" key={alert.id}>
                    <div>
                      <div className="chip-row" style={{ marginBottom: "0.4rem" }}>
                        <span className={`pill ${alert.urgency === "high" ? "danger" : "warn"}`}>{alert.urgency}</span>
                        <span className={`pill ${alert.sentiment === "negative" ? "danger" : ""}`}>{alert.sentiment}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.84rem" }}>{alert.suggested_action}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Weekly report */}
          <section className="card">
            <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>AI Report</p>
            <h2 style={{ margin: "0 0 0.5rem" }}>Weekly summary</h2>
            <p className="subtle" style={{ marginBottom: "1rem" }}>
              Generate a full report covering interactions, pipeline health, tasks, and recommendations.
            </p>
            <button className="primary-btn" style={{ width: "100%" }} onClick={() => setShowReport(true)} type="button">
              Generate weekly report
            </button>
          </section>
        </aside>
      </div>

      {showReport && <WeeklyReportPanel onClose={() => setShowReport(false)} />}
    </div>
  );
}
