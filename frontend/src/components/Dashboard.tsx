"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CATEGORIES, PRIORITIES, STATUSES, label, type Stats, type Submission } from "@/lib/types";

const initials = (n?: string) => (n ?? "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
const timeAgo = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

const PRIORITY_RANK: Record<string, string> = { urgent: "p-urgent", high: "p-high", medium: "p-medium", low: "p-low" };

export default function Dashboard() {
  const [items, setItems] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filters, setFilters] = useState({ category: "", priority: "", status: "", q: "" });
  const [selected, setSelected] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
      const [list, s] = await Promise.all([api.list(qs), api.stats()]);
      setItems(list.items);
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, filters.q]);

  const update = (s: Submission) => {
    setItems((prev) => prev.map((i) => (i._id === s._id ? s : i)));
    setSelected(s);
  };

  const setFilter = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <main className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">F</div>
          <div>
            <h1>FounderDesk</h1>
            <p className="tagline">AI-triaged feedback and applications</p>
          </div>
        </div>
        <button className="primary" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
      </header>

      <section className="stats">
        <Stat title="Total" value={stats?.total ?? 0} />
        <Stat title="New" value={stats?.byStatus.new ?? 0} accent="p-new" />
        <Stat title="Urgent" value={stats?.byPriority.urgent ?? 0} accent="p-urgent" />
        <Stat title="High" value={stats?.byPriority.high ?? 0} accent="p-high" />
      </section>

      {stats && stats.total > 0 && (
        <section className="panel">
          <h3>By category</h3>
          <div className="bars">
            {CATEGORIES.filter((c) => stats.byCategory[c]).map((c) => (
              <button
                key={c}
                className={`bar ${filters.category === c ? "on" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, category: f.category === c ? "" : c }))}
              >
                <span>{label(c)}</span>
                <span className="track"><span className="fill" style={{ width: `${(stats.byCategory[c]! / stats.total) * 100}%` }} /></span>
                <span className="n">{stats.byCategory[c]}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="filters">
        <input placeholder="Search…" value={filters.q} onChange={setFilter("q")} />
        <select value={filters.category} onChange={setFilter("category")}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
        </select>
        <select value={filters.priority} onChange={setFilter("priority")}>
          <option value="">All priorities</option>
          {PRIORITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.status} onChange={setFilter("status")}>
          <option value="">All statuses</option>
          {STATUSES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
        </select>
      </section>

      {error && <p className="error">{error}</p>}
      <div className="layout">
        <ul className="list">
          {loading && !items.length && [0, 1, 2].map((i) => <li key={i} className="skeleton" />)}
          {!loading && !items.length && !error && <li className="empty">No submissions match your filters.</li>}
          {items.map((s) => (
            <li key={s._id} className={`row ${PRIORITY_RANK[s.triage?.priority ?? "low"]} ${selected?._id === s._id ? "active" : ""}`} onClick={() => setSelected(s)}>
              <div className="rowtop">
                <span className={`badge ${PRIORITY_RANK[s.triage?.priority ?? "low"]}`}>{s.triage?.priority ?? "untriaged"}</span>
                <span className="badge cat">{label(s.triage?.category ?? "pending")}</span>
                <span className="muted small time">{timeAgo(s.createdAt)}</span>
              </div>
              <p className="summary">{s.triage?.summary ?? s.message.slice(0, 140)}</p>
              <span className="who muted small">
                <span className="avatar">{initials(s.name)}</span>
                {s.name || "Anonymous"}{s.company ? ` · ${s.company}` : ""}
              </span>
            </li>
          ))}
        </ul>

        <aside className="detail">
          {selected ? <Detail s={selected} onChange={update} /> : <p className="empty">Select a submission to see the AI summary.</p>}
        </aside>
      </div>
    </main>
  );
}

function Stat({ title, value, accent }: { title: string; value: number; accent?: string }) {
  return (
    <div className={`stat ${accent ?? ""}`}>
      <span className="muted small">{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({ s, onChange }: { s: Submission; onChange: (s: Submission) => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<Submission>) => {
    setBusy(true);
    try { onChange(await fn()); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="head">
        <span className="avatar">{initials(s.name)}</span>
        <div>
          <h2>{s.name || "Anonymous"}</h2>
          <p className="muted small" style={{ margin: 0 }}>{[s.email, s.company, s.source].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {s.triage ? (
        <div className="ai">
          <div className="label">✦ AI triage · {s.triage.model}</div>
          <div className="rowtop">
            <span className={`badge ${PRIORITY_RANK[s.triage.priority]}`}>{s.triage.priority}</span>
            <span className="badge cat">{label(s.triage.category)}</span>
            <span className="badge">{s.triage.sentiment}</span>
          </div>
          <p><strong>Summary:</strong> {s.triage.summary}</p>
          <p><strong>Next step:</strong> {s.triage.suggestedAction}</p>
          <div className="tags">{s.triage.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>
        </div>
      ) : (
        <p className="error">Not triaged{s.triageError ? `: ${s.triageError}` : ""}</p>
      )}
      <h3>Original message</h3>
      <p className="msg">{s.message}</p>
      <div className="actions">
        <select value={s.status} disabled={busy} onChange={(e) => run(() => api.setStatus(s._id, e.target.value))}>
          {STATUSES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
        </select>
        <button disabled={busy} onClick={() => run(() => api.retriage(s._id))}>Re-run AI triage</button>
      </div>
    </div>
  );
}
