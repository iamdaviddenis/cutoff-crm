"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthRequired, EmptyPanel } from "./system-state";

const TYPE_LABELS = { farmer: "Farmer", distributor: "Distributor", lead: "Lead" };

export function CustomersListPage() {
  const [viewer,   setViewer]   = useState(null);
  const [customers, setCustomers] = useState([]);
  const [query,    setQuery]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [newForm,  setNewForm]  = useState({ name: "", phone: "", region: "", type: "lead" });

  const load = useCallback(async () => {
    const me = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json());
    setViewer(me.viewer);
    if (!me.configured || !me.viewer) { setLoading(false); return; }

    const res = await fetch("/api/customers", { cache: "no-store" });
    if (res.ok) {
      const payload = await res.json();
      setCustomers(payload.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCustomer(e) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/customers", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(newForm),
    });
    if (res.ok) {
      setNewForm({ name: "", phone: "", region: "", type: "lead" });
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  if (!viewer) return <AuthRequired />;

  const filtered = customers.filter((c) => {
    const q = query.trim().toLowerCase();
    return !q || `${c.name} ${c.phone || ""} ${c.region || ""}`.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="eyebrow">Customers</p>
          <h1 style={{ margin: "0.2rem 0 0" }}>All customers</h1>
        </div>
        <button className="icon-btn" type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add customer"}
        </button>
      </div>

      {showForm && (
        <section className="card">
          <h2 style={{ margin: "0 0 1rem" }}>New customer</h2>
          <form className="form-stack" onSubmit={createCustomer}>
            <div className="grid-two">
              <label className="field">
                <span>Name *</span>
                <input
                  value={newForm.name}
                  onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Full name"
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  value={newForm.phone}
                  onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+254…"
                />
              </label>
            </div>
            <div className="grid-two">
              <label className="field">
                <span>Region</span>
                <input
                  value={newForm.region}
                  onChange={(e) => setNewForm((f) => ({ ...f, region: e.target.value }))}
                  placeholder="e.g. Nairobi"
                />
              </label>
              <label className="field">
                <span>Type</span>
                <select value={newForm.type} onChange={(e) => setNewForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="lead">Lead</option>
                  <option value="farmer">Farmer</option>
                  <option value="distributor">Distributor</option>
                </select>
              </label>
            </div>
            <button className="primary-btn" disabled={saving} type="submit" style={{ justifySelf: "start" }}>
              {saving ? "Saving…" : "Add customer"}
            </button>
          </form>
        </section>
      )}

      <section className="card">
        <div style={{ marginBottom: "1rem" }}>
          <input
            style={{ borderRadius: "0.75rem", border: "1px solid rgba(24,33,27,0.14)", padding: "0.65rem 0.9rem", width: "100%", background: "rgba(255,255,255,0.9)" }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, or region…"
          />
        </div>

        {loading && <p className="subtle">Loading…</p>}

        {!loading && filtered.length === 0 && (
          <EmptyPanel
            title="No customers found"
            copy={query ? "Try a different search term." : "Add your first customer above."}
          />
        )}

        {filtered.length > 0 && (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Region</th>
                  <th>Type</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.phone || "—"}</td>
                    <td>{c.region || "—"}</td>
                    <td>
                      <span className={`customer-type ${c.type}`}>{TYPE_LABELS[c.type] || c.type}</span>
                    </td>
                    <td style={{ color: "#5d6a60" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link href={`/customers/${c.id}`} className="ghost-btn" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
