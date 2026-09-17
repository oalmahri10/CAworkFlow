"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { apiPost, ApiError } from "@/lib/client/api";
import { useApi } from "@/lib/client/use-api";
import { formatDateTime } from "@/lib/client/format";
import type { ConfigType } from "@/lib/domain/enums";

type ConfigVersionRow = {
  id: string;
  version: number;
  status: "DRAFT" | "ACTIVE" | "SUPERSEDED";
  payloadJson: string;
  notes: string | null;
  createdAt: string;
};

export function ConfigPanel({
  configType,
  title,
  description,
  renderSummary,
  renderForm,
  canManage,
}: {
  configType: ConfigType;
  title: string;
  description: string;
  renderSummary: (payload: Record<string, unknown>) => React.ReactNode;
  renderForm: (submit: (payload: unknown, notes?: string) => Promise<void>, submitting: boolean) => React.ReactNode;
  canManage: boolean;
}) {
  const { data, loading, reload } = useApi<{ active: ConfigVersionRow | null; versions: ConfigVersionRow[] }>(
    `/api/config/${configType}`
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function submitDraft(payload: unknown, notes?: string) {
    setSubmitting(true);
    setError(null);
    try {
      await apiPost(`/api/config/${configType}`, { payload, notes });
      setShowForm(false);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? [err.message, ...(err.issues ?? [])].join(" — ") : "Failed to save draft.");
    } finally {
      setSubmitting(false);
    }
  }

  async function activate(id: string) {
    setError(null);
    try {
      await apiPost(`/api/config/${configType}/${id}/activate`);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to activate.");
    }
  }

  if (loading) return <p className="text-sm text-charcoal/40">Loading…</p>;

  const activePayload = data?.active ? (JSON.parse(data.active.payloadJson) as Record<string, unknown>) : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-charcoal">{title}</h3>
        <p className="text-xs text-charcoal/50">{description}</p>
      </div>

      <div className="rounded-lg bg-lavender p-3">
        {activePayload ? (
          <>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Active — version {data?.active?.version}
            </div>
            {renderSummary(activePayload)}
          </>
        ) : (
          <p className="text-sm font-semibold text-charcoal/60">Not configured — no active version.</p>
        )}
      </div>

      {data && data.versions.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-bold text-charcoal/60">Version history</div>
          <ul className="space-y-1">
            {data.versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between rounded-lg border border-black/5 px-3 py-2 text-xs">
                <span className="flex items-center gap-2">
                  {v.status === "ACTIVE" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal" />
                  ) : v.status === "DRAFT" ? (
                    <Clock className="h-3.5 w-3.5 text-amber" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-charcoal/30" />
                  )}
                  v{v.version} — {v.status} — {formatDateTime(v.createdAt)}
                  {v.notes && <span className="text-charcoal/40">({v.notes})</span>}
                </span>
                {v.status === "DRAFT" && canManage && (
                  <button onClick={() => activate(v.id)} className="focus-ring rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white">
                    Activate
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage && (
        <div>
          <button onClick={() => setShowForm((v) => !v)} className="focus-ring rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
            {showForm ? "Cancel" : "Create new draft version"}
          </button>
          {showForm && (
            <div className="mt-3 rounded-lg border border-black/5 p-4">
              {renderForm(submitDraft, submitting)}
              {error && <p className="mt-2 text-xs text-[color:var(--color-danger)]">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
