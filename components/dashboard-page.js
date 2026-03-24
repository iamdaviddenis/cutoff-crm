"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthRequired, EmptyPanel } from "./system-state";
import { useRealtimeRefresh } from "./use-realtime-refresh";

const CATEGORY_LABELS = { sales: "Sales", support: "Support", logistics: "Logistics", partnership: "Partnership" };

export function DashboardPage() {
  const [viewer,    setViewer]    = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading,   setLoading]   = useState(true);

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

  if (!viewer)                 return <AuthRequired />;
  if (dashboard?.forbidden)    return <EmptyPanel title="Admin access only" copy="This page is visible to admins only." />;
  if (loading || !dashboard)   return <p className="subtle">Loading dashboard…</p>;

  const categories = Object.entries(dashboard.byCategory || {});

  return (
    <div>
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

          {/* By category */}
          {categories.length > 0 && (
            <section className="card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Breakdown</p>
                  <h2 style={{ margin: "0.2rem 0 0" }}>Calls by category</h2>
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

        {/* Alerts panel */}
        <aside>
          <section className="card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Alerts</p>
                <h2 style={{ margin: "0.2rem 0 0" }}>Needs attention</h2>
              </div>
            </div>

            {(dashboard.alerts || []).length === 0 ? (
              <p className="subtle">No alerts. All clear.</p>
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
        </aside>
      </div>
    </div>
  );
}
