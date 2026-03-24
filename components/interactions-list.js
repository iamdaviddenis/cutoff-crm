"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthRequired, EmptyPanel } from "./system-state";
import { useRealtimeRefresh } from "./use-realtime-refresh";
import { CHANNEL_LABELS, OUTCOME_LABELS } from "../lib/ai";

function InteractionDrawer({ item, onClose }) {
  if (!item) return null;
  const insight = item.ai_insights?.[0];

  return (
    <div className="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer">
        <div className="section-head">
          <div>
            <p className="eyebrow">Interaction</p>
            <h2 style={{ margin: "0.2rem 0 0" }}>{item.customers?.name || "Customer"}</h2>
            <p className="subtle">{CHANNEL_LABELS[item.channel]} · {item.direction}</p>
          </div>
          <button className="ghost-btn" onClick={onClose} type="button">Close</button>
        </div>

        <div className="info-block">
          <span>Summary</span>
          <p style={{ margin: "0.25rem 0 0", lineHeight: 1.6 }}>{item.content}</p>
        </div>

        {item.outcome && (
          <div className="info-block">
            <span>Outcome</span>
            <p style={{ margin: "0.25rem 0 0" }}>{OUTCOME_LABELS[item.outcome] || item.outcome}</p>
          </div>
        )}

        {insight && (
          <>
            <div className="chip-row">
              <span className={`pill ${insight.urgency === "high" ? "danger" : insight.urgency === "medium" ? "warn" : ""}`}>
                {insight.urgency} urgency
              </span>
              <span className={`pill ${insight.sentiment === "negative" ? "danger" : insight.sentiment === "positive" ? "success" : ""}`}>
                {insight.sentiment}
              </span>
              <span className="pill">{insight.category}</span>
            </div>

            <div className="info-block">
              <span>AI insight</span>
              <p style={{ margin: "0.25rem 0 0", lineHeight: 1.6 }}>{insight.suggested_action}</p>
            </div>

            {insight.intent && (
              <div className="info-block">
                <span>Intent</span>
                <p style={{ margin: "0.25rem 0 0" }}>{insight.intent}</p>
              </div>
            )}
          </>
        )}

        <div className="info-block">
          <span>Logged</span>
          <p style={{ margin: "0.25rem 0 0", color: "#5d6a60", fontSize: "0.84rem" }}>
            {new Date(item.created_at).toLocaleString()}
            {item.duration ? ` · ${item.duration} min` : ""}
          </p>
        </div>

        <Link
          href={`/customers/${item.customer_id}`}
          className="ghost-btn"
          style={{ textAlign: "center" }}
        >
          View customer 360 →
        </Link>
      </aside>
    </div>
  );
}

export function InteractionsListPage() {
  const [viewer,   setViewer]   = useState(null);
  const [items,    setItems]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    const me = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
    setViewer(me.viewer);
    if (!me.configured || !me.viewer) { setLoading(false); return; }

    const res = await fetch("/api/interactions", { cache: "no-store" });
    if (res.ok) {
      const payload = await res.json();
      setItems(payload.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh("interactions-list", ["interactions"], load);

  if (!viewer) return <AuthRequired />;

  return (
    <>
      <section className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Interactions</p>
            <h1 style={{ margin: "0.2rem 0 0" }}>All interactions</h1>
            <p className="subtle">Click a row to see AI insights and details.</p>
          </div>
          <Link href="/interactions/new" className="icon-btn">+ Log interaction</Link>
        </div>

        {loading && <p className="subtle">Loading…</p>}

        {!loading && items.length === 0 && (
          <EmptyPanel
            title="No interactions yet"
            copy="Start by logging your first interaction."
            action={<Link href="/interactions/new" className="ghost-btn" style={{ marginTop: "0.5rem", display: "inline-block" }}>Log first interaction →</Link>}
          />
        )}

        {items.length > 0 && (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Channel</th>
                  <th>Summary</th>
                  <th>Outcome</th>
                  <th>Urgency</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const insight = item.ai_insights?.[0];
                  const isAlert = insight?.urgency === "high" || insight?.sentiment === "negative";
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className={isAlert ? "row-alert" : ""}
                    >
                      <td><strong>{item.customers?.name || "Unknown"}</strong></td>
                      <td>{CHANNEL_LABELS[item.channel] || item.channel}</td>
                      <td style={{ maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.content}
                      </td>
                      <td>{item.outcome ? (OUTCOME_LABELS[item.outcome] || item.outcome) : "—"}</td>
                      <td>
                        {insight?.urgency && (
                          <span className={`pill ${insight.urgency === "high" ? "danger" : insight.urgency === "medium" ? "warn" : ""}`}>
                            {insight.urgency}
                          </span>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "#5d6a60" }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InteractionDrawer item={selected} onClose={() => setSelected(null)} />
    </>
  );
}
