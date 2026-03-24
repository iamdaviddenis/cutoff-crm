"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthRequired, EmptyPanel } from "./system-state";
import { useRealtimeRefresh } from "./use-realtime-refresh";

const COLUMNS = [
  { key: "pending",     label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed" },
];

const PRIORITY_COLORS = { high: "danger", medium: "warn", low: "" };

function isOverdue(task) {
  return task.status !== "completed" && new Date(task.due_date) < new Date();
}

export function TasksBoardPage() {
  const [viewer,  setViewer]  = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [filter,  setFilter]  = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const me = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
    setViewer(me.viewer);
    if (!me.configured || !me.viewer) { setLoading(false); return; }

    const res = await fetch("/api/tasks", { cache: "no-store" });
    if (res.ok) {
      const payload = await res.json();
      setTasks(payload.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh("tasks-board", ["tasks"], load);

  async function move(id, status) {
    await fetch(`/api/tasks/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    load();
  }

  if (loading) return null;
  if (!viewer) return <AuthRequired />;

  const filtered = filter === "all"
    ? tasks
    : tasks.filter((t) => t.priority === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <p className="eyebrow">Tasks</p>
          <h1 style={{ margin: "0.2rem 0 0" }}>Task board</h1>
        </div>
        <select
          className="compact-select"
          style={{ width: "auto", borderRadius: "0.75rem", border: "1px solid rgba(24,33,27,0.14)", padding: "0.5rem 0.85rem", background: "white" }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All priorities</option>
          <option value="high">High priority</option>
          <option value="medium">Medium priority</option>
          <option value="low">Low priority</option>
        </select>
      </div>

      {loading && <p className="subtle">Loading…</p>}

      {!loading && tasks.length === 0 && (
        <EmptyPanel
          title="No tasks yet"
          copy="Tasks are created automatically when an interaction has a follow-up outcome or high urgency."
        />
      )}

      {!loading && tasks.length > 0 && (
        <div className="kanban">
          {COLUMNS.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-head">
                  <span>{col.label}</span>
                  <span className="kanban-count">{colTasks.length}</span>
                </div>

                <div className="kanban-cards">
                  {colTasks.length === 0 && (
                    <p className="subtle" style={{ fontSize: "0.8rem", margin: 0 }}>No tasks</p>
                  )}
                  {colTasks.map((task) => (
                    <div key={task.id} className={`task-card ${isOverdue(task) ? "danger-border" : ""}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.4rem" }}>
                        <h4>{task.title}</h4>
                        <span className={`pill ${PRIORITY_COLORS[task.priority]}`} style={{ flexShrink: 0, fontSize: "0.7rem" }}>
                          {task.priority}
                        </span>
                      </div>

                      {task.customers?.name && (
                        <p>{task.customers.name}</p>
                      )}

                      <p style={{ color: isOverdue(task) ? "#9d3823" : "#5d6a60" }}>
                        Due {new Date(task.due_date).toLocaleDateString()}
                        {isOverdue(task) && " · Overdue"}
                      </p>

                      <div className="task-actions">
                        {col.key !== "pending" && (
                          <button className="move-btn" onClick={() => move(task.id, "pending")} type="button">
                            ← Pending
                          </button>
                        )}
                        {col.key !== "in_progress" && (
                          <button className="move-btn" onClick={() => move(task.id, "in_progress")} type="button">
                            In Progress
                          </button>
                        )}
                        {col.key !== "completed" && (
                          <button
                            className="move-btn"
                            style={{ color: "#245745", borderColor: "rgba(59,138,112,0.3)" }}
                            onClick={() => move(task.id, "completed")}
                            type="button"
                          >
                            ✓ Done
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
