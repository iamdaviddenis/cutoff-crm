"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthRequired, EmptyPanel } from "./system-state";
import { useRealtimeRefresh } from "./use-realtime-refresh";

function dashboardGreeting(viewer) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const name = viewer?.fullName?.trim()?.split(/\s+/)[0];
  return name ? `${part}, ${name}` : `${part}`;
}

const CATEGORY_LABELS = {
  sales: "Sales",
  support: "Support",
  logistics: "Logistics",
  partnership: "Partnership",
};

function WeeklyReportPanel({ onClose }) {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/ai/report")
      .then((r) => r.json())
      .then((p) => {
        setReport(p.data?.report || "Failed to generate report.");
        setLoading(false);
      });
  }, []);

  function copy() {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-slate-200/80 bg-white shadow-card-lg">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              AI report
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Weekly summary</h2>
          </div>
          <div className="flex shrink-0 gap-2">
            {!loading && (
              <button
                type="button"
                onClick={copy}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand-800"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-brand/40 hover:bg-brand/5"
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-sm text-slate-500">Generating report…</p>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-slate-800">
              {report}
            </pre>
          )}
        </div>
      </aside>
    </div>
  );
}

function MetricCard({ label, value, hint, alert }) {
  return (
    <div
      className={`group rounded-2xl border bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lg ${
        alert
          ? "border-rose-200/80 shadow-[0_1px_2px_rgba(244,63,94,0.06),0_4px_16px_rgba(244,63,94,0.06)] hover:border-rose-300/90"
          : "border-slate-200/80 shadow-card hover:border-brand/35 hover:shadow-[0_4px_24px_rgba(85,166,48,0.12)]"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p
        className={`mt-3 text-3xl font-semibold tabular-nums tracking-tight ${
          alert ? "text-rose-600" : "text-slate-900 group-hover:text-brand-800"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p>
    </div>
  );
}

export function DashboardPage() {
  const [viewer, setViewer] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  const load = useCallback(async () => {
    const me = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
    setViewer(me.viewer);
    if (!me.configured || !me.viewer) {
      setLoading(false);
      return;
    }

    const res = await fetch("/api/dashboard", { cache: "no-store" });
    if (res.status === 403) {
      setDashboard({ forbidden: true });
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const payload = await res.json();
    setDashboard(payload.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtimeRefresh("dashboard", ["interactions", "tasks"], load);

  if (loading) return null;
  if (!viewer) return <AuthRequired />;
  if (dashboard?.forbidden) {
    return <EmptyPanel title="Admin access only" copy="This page is visible to admins only." />;
  }
  if (!dashboard) return null;

  const categories = Object.entries(dashboard.byCategory || {});

  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const roleLabel = viewer?.role === "admin" ? "Admin" : "Staff";
  const openTaskCount = dashboard.openTasks ?? 0;
  const dueCount = dashboard.dueToday?.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-[#f3f8ef] p-7 shadow-card sm:p-9">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/[0.09] blur-3xl"
          aria-hidden
        />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-slate-200/30 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/90">
              <Image
                src="/cutoff-logo.png"
                alt="CutOff CRM"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>

            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-800 ring-1 ring-brand/20">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-40" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                  </span>
                  Live
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 ring-1 ring-slate-200/80">
                  {roleLabel}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${
                    openTaskCount > 0
                      ? "bg-amber-50 text-amber-900 ring-amber-200/80"
                      : "bg-emerald-50 text-emerald-900 ring-emerald-200/70"
                  }`}
                >
                  {openTaskCount} open task{openTaskCount === 1 ? "" : "s"}
                </span>
                {dueCount > 0 && (
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-800 ring-1 ring-rose-200/80">
                    {dueCount} follow-up{dueCount === 1 ? "" : "s"} due
                  </span>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Overview</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {dashboardGreeting(viewer)}
                </h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
                  Pipeline health, live interactions, and priorities — in one place.
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 text-sm shadow-sm backdrop-blur-sm sm:items-end">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Today</p>
            <p className="max-w-[14rem] text-right text-sm font-semibold leading-snug text-slate-800 sm:max-w-none">
              {dateLine}
            </p>
          </div>
        </div>
      </section>

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Interactions today"
          value={dashboard.interactionsToday}
          hint="All logged customer touchpoints"
        />
        <MetricCard
          label="High urgency"
          value={dashboard.highUrgency}
          hint="Immediate attention needed"
          alert={dashboard.highUrgency > 0}
        />
        <MetricCard
          label="Open tasks"
          value={dashboard.openTasks}
          hint="Pending and in progress"
        />
        <MetricCard
          label="Overdue tasks"
          value={dashboard.overdueTasks}
          hint="Past due date, unresolved"
          alert={dashboard.overdueTasks > 0}
        />
      </section>

      {/* Pipeline + follow-ups */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Pipeline</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">Lead scores</h2>
            </div>
            <Link
              href="/customers"
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand-800"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Hot", key: "hot", bar: "bg-rose-500" },
              { label: "Warm", key: "warm", bar: "bg-amber-400" },
              { label: "Cold", key: "cold", bar: "bg-brand" },
            ].map(({ label, key, bar }) => {
              const count = dashboard.pipeline?.[key] ?? 0;
              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:bg-white hover:shadow-md"
                >
                  <div className={`mx-auto mb-3 h-1 w-8 rounded-full ${bar}`} aria-hidden />
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{count}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Action required</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">Due for follow-up</h2>
            </div>
            <span
              className={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                (dashboard.dueToday?.length || 0) > 0
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {dashboard.dueToday?.length || 0}
            </span>
          </div>

          {(dashboard.dueToday || []).length === 0 ? (
            <p className="text-sm text-slate-500">No follow-ups due today.</p>
          ) : (
            <ul className="space-y-2">
              {dashboard.dueToday.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/customers/${c.id}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-all duration-200 hover:border-brand/30 hover:bg-white hover:shadow-md"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                      {c.next_action_note && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{c.next_action_note}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          c.lead_score === "hot"
                            ? "bg-rose-100 text-rose-800"
                            : c.lead_score === "warm"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-200/80 text-slate-700"
                        }`}
                      >
                        {c.lead_score}
                      </span>
                      <p className="mt-1 text-[10px] font-medium text-rose-600">
                        {new Date(c.next_action_date) < new Date() ? "Overdue" : "Today"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Feed + sidebar */}
      <section className="grid gap-8 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Live feed</p>
                <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">Recent interactions</h2>
              </div>
              <Link
                href="/interactions/new"
                className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-700 hover:shadow-md active:scale-[0.98]"
              >
                Log interaction
              </Link>
            </div>

            {(dashboard.recentFeed || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                <p className="text-sm font-medium text-slate-800">No interactions yet</p>
                <p className="mt-1 text-sm text-slate-500">Log your first interaction to see activity here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {dashboard.recentFeed.map((item) => (
                  <li
                    key={item.id}
                    className="group flex gap-4 rounded-xl py-3 pl-2 pr-2 transition-colors duration-200 first:pt-1 last:pb-1 hover:bg-slate-50/90"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.urgency === "high"
                          ? "bg-rose-500"
                          : item.urgency === "medium"
                            ? "bg-amber-400"
                            : "bg-brand"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed text-slate-800">
                        {item.content.slice(0, 120)}
                        {item.content.length > 120 ? "…" : ""}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>{item.customer}</span>
                        <span className="text-slate-300">·</span>
                        <span>{item.channel}</span>
                        <span className="text-slate-300">·</span>
                        <span className="tabular-nums">{new Date(item.created_at).toLocaleString()}</span>
                        {item.urgency === "high" ? (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 ring-1 ring-rose-100">
                            Urgent
                          </span>
                        ) : (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800 ring-1 ring-brand/15">
                            {item.urgency === "medium" ? "Medium" : "On track"}
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {categories.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Breakdown</p>
                <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">By category</h2>
              </div>
              <div className="space-y-2">
                {categories.map(([key, count]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-800">{(CATEGORY_LABELS[key] || key)}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Alerts</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">Needs attention</h2>
            </div>

            {(dashboard.alerts || []).length === 0 ? (
              <p className="text-sm text-slate-500">No alerts. You&apos;re all caught up.</p>
            ) : (
              <ul className="space-y-3">
                {dashboard.alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 shadow-sm ring-1 ring-rose-100/60"
                  >
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          alert.urgency === "high" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {alert.urgency}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          alert.sentiment === "negative" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {alert.sentiment}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-800">{alert.suggested_action}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">AI report</p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">Weekly summary</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Full report covering interactions, pipeline health, tasks, and recommendations.
            </p>
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="mt-5 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-700 hover:shadow-md active:scale-[0.99]"
            >
              Generate weekly report
            </button>
          </div>
        </aside>
      </section>

      {showReport && <WeeklyReportPanel onClose={() => setShowReport(false)} />}
    </div>
  );
}
