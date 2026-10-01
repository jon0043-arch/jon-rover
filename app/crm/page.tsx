"use client";

import "./crm.css";
import { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  last_seen_at: string;
  last_request?: string;
  desired_models?: string[];
  budget_max?: number;
};

const who = (lead: Lead) =>
  lead.name?.trim() || lead.phone?.trim() || lead.email?.trim() || "Anonymous shopper";

const ago = (date: string) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const interest = (lead: Lead) => {
  if (lead.desired_models?.length) return lead.desired_models.join(", ");
  return lead.last_request || "—";
};

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/crm", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not load leads.");
      return;
    }
    setLeads(data.leads || []);
    setError("");
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...leads]
      .sort(
        (a, b) =>
          new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
      )
      .filter((lead) => {
        if (!q) return true;
        return [
          lead.name,
          lead.phone,
          lead.email,
          lead.status,
          lead.last_request,
          ...(lead.desired_models || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [leads, query]);

  async function removeLead(lead: Lead) {
    if (!window.confirm(`Delete ${who(lead)}? This cannot be undone.`)) return;

    const response = await fetch(`/api/crm?id=${encodeURIComponent(lead.id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      window.alert(data.error || "Could not delete lead.");
      return;
    }

    setLeads((current) => current.filter((item) => item.id !== lead.id));
  }

  return (
    <main className="crmListPage">
      <header className="crmListHeader">
        <div>
          <a href="/" className="crmBrand">JON ROVER</a>
          <h1>CRM</h1>
          <p>{leads.length} {leads.length === 1 ? "lead" : "leads"}</p>
        </div>

        <input
          className="crmSearchInput"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search leads..."
          aria-label="Search leads"
        />
      </header>

      {error && <div className="crmError">{error}</div>}

      <section className="crmLeadList">
        <div className="crmLeadHead">
          <span>Name</span>
          <span>Phone</span>
          <span>Email</span>
          <span>Interest</span>
          <span>Last activity</span>
          <span>Status</span>
          <span />
        </div>

        {filtered.map((lead) => (
          <div className="crmLeadRow" key={lead.id}>
            <strong>{lead.name || "Name not captured"}</strong>

            <span>
              {lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : "—"}
            </span>

            <span className="crmEmail">
              {lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : "—"}
            </span>

            <span className="crmInterest">
              <b>{interest(lead)}</b>
              {lead.budget_max ? (
                <small>Up to ${lead.budget_max.toLocaleString()}</small>
              ) : null}
            </span>

            <span>{ago(lead.last_seen_at)}</span>

            <span className="crmStatus">{lead.status || "Lead"}</span>

            <button
              className="crmDelete"
              onClick={() => removeLead(lead)}
              aria-label={`Delete ${who(lead)}`}
            >
              Delete
            </button>
          </div>
        ))}

        {!filtered.length && !error && (
          <div className="crmEmpty">
            {query ? "No leads match that search." : "No leads yet."}
          </div>
        )}
      </section>
    </main>
  );
}
