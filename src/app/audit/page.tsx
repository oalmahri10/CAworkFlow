"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { useApi } from "@/lib/client/use-api";
import { formatDateTime } from "@/lib/client/format";

type AuditRow = {
  id: string;
  eventType: string;
  action: string;
  reason: string | null;
  previousJson: string | null;
  newJson: string | null;
  createdAt: string;
  actor: { name: string; email: string };
  application: { croReference: string; customerName: string } | null;
};

const EVENT_TYPES = ["WORKFLOW", "APPLICATION", "DOCUMENT", "QUERY", "CONFIG", "ADMIN", "COMMENT"];

function AuditContent() {
  const params = useSearchParams();
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState(1);
  const applicationId = params.get("applicationId") ?? "";

  const qs = new URLSearchParams();
  if (eventType) qs.set("eventType", eventType);
  if (applicationId) qs.set("applicationId", applicationId);
  qs.set("page", String(page));

  const { data, loading, error } = useApi<{ items: AuditRow[]; total: number; totalPages: number }>(
    `/api/audit?${qs.toString()}`,
    [eventType, applicationId, page]
  );

  return (
    <div className="p-6">
      <p className="mb-4 text-xs text-charcoal/50">
        Append-only record of every material mutation. This is a locally administered SQLite database, not a
        tamper-proof ledger — treat it as the system&apos;s authoritative activity record, not as cryptographic proof.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <select value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} className="rounded-lg border border-[#e3ddee] px-3 py-2 text-xs">
          <option value="">All event types</option>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {applicationId && <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Filtered to one application</span>}
      </div>

      {loading && <p className="text-sm text-charcoal/40">Loading…</p>}
      {error && <p className="text-sm text-[color:var(--color-danger)]">{error}</p>}

      {data && (
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-white card-elevation">
          <table className="w-full text-left text-xs">
            <thead className="bg-[color:var(--color-light-grey)] text-charcoal/60">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Application</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id} className="border-t border-black/5 align-top">
                  <td className="px-3 py-2 text-charcoal/50">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3 py-2"><span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{row.eventType}</span></td>
                  <td className="px-3 py-2 font-medium">{row.action.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">{row.application ? `${row.application.croReference}` : "—"}</td>
                  <td className="px-3 py-2">{row.actor.name}</td>
                  <td className="px-3 py-2 text-charcoal/50">{row.reason ?? "—"}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-charcoal/40">No audit events match these filters.</td></tr>
              )}
            </tbody>
          </table>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-black/5 px-3 py-2 text-[11px] text-charcoal/50">
              <span>Page {page} of {data.totalPages} · {data.total} total</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30">Previous</button>
                <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <AppShell title="Audit Trail">
      <Suspense>
        <AuditContent />
      </Suspense>
    </AppShell>
  );
}
