"use client";

import { useState } from "react";
import { apiPost, ApiError } from "@/lib/client/api";
import type { AuthenticatedUser } from "@/lib/auth";

type ActionDef = {
  action: string;
  label: string;
  needsReason?: boolean;
  needsReference?: boolean;
  needsNotes?: boolean;
  requiredCapability?: string;
  requiredRole?: string;
  onlyInitiatingRm?: boolean;
};

const ACTIONS_BY_SUBSTAGE: Record<string, ActionDef[]> = {
  SUBMITTED: [
    { action: "RISK_RETURN_QUERY", label: "Return to RM with query", needsReason: true, requiredCapability: "RISK_REVIEW_ACTIONS" },
    { action: "RISK_CLEAR", label: "Clear & forward to Approval Authority", requiredCapability: "RISK_REVIEW_ACTIONS" },
  ],
  RESUBMITTED: [
    { action: "RISK_RETURN_QUERY", label: "Return to RM with query", needsReason: true, requiredCapability: "RISK_REVIEW_ACTIONS" },
    { action: "RISK_CLEAR", label: "Clear & forward to Approval Authority", requiredCapability: "RISK_REVIEW_ACTIONS" },
  ],
  QUERY_RETURNED_TO_RM: [
    { action: "RM_RESUBMIT", label: "Resubmit to Credit Review", onlyInitiatingRm: true },
  ],
  PENDING_APPROVAL: [
    { action: "APPROVAL_QUERY", label: "Raise query (via Risk)", needsReason: true, requiredCapability: "APPROVAL_AUTHORITY_ACTIONS" },
    { action: "RECORD_EXTERNAL_APPROVAL", label: "Record external approval", needsReference: true, requiredCapability: "RECORD_EXTERNAL_APPROVAL" },
  ],
  APPROVAL_QUERY_VIA_RISK: [
    { action: "RISK_RESPOND_TO_APPROVAL", label: "Send agreed response to Approval Authority", needsNotes: true, requiredCapability: "RISK_REVIEW_ACTIONS" },
  ],
  AWAITING_SIGNATURES: [
    { action: "SEND_TO_CAD", label: "Send completed documentation to CAD", onlyInitiatingRm: true },
  ],
  CAD_REVIEW: [
    { action: "CAD_CLEAR", label: "Complete CAD review & forward to Operations", requiredCapability: "CAD_ACTIONS" },
  ],
  SENT_TO_OPERATIONS: [
    { action: "RECORD_EXTERNAL_EXECUTION", label: "Record external execution", needsReference: true, requiredCapability: "RECORD_EXTERNAL_EXECUTION" },
  ],
  EXTERNAL_EXECUTION_RECORDED: [
    { action: "COMPLETE", label: "Mark completed", requiredCapability: "OPERATIONS_ACTIONS" },
  ],
};

export function WorkflowActions({
  applicationId,
  substage,
  version,
  initiatingRmId,
  user,
  onDone,
}: {
  applicationId: string;
  substage: string;
  version: number;
  initiatingRmId: string;
  user: AuthenticatedUser;
  onDone: () => void;
}) {
  const [active, setActive] = useState<ActionDef | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const candidates = ACTIONS_BY_SUBSTAGE[substage] ?? [];
  const visible = candidates.filter((a) => {
    if (a.onlyInitiatingRm && user.id !== initiatingRmId) return false;
    if (a.requiredCapability && !user.capabilities.includes(a.requiredCapability as never)) return false;
    return true;
  });

  if (visible.length === 0) return null;

  async function run(a: ActionDef, payload: Record<string, string>) {
    setSubmitting(true);
    setError(null);
    try {
      await apiPost(`/api/applications/${applicationId}/actions?action=${a.action}`, {
        expectedVersion: version,
        ...payload,
      });
      setActive(null);
      setText("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((a) => (
        <button
          key={a.action}
          onClick={() => {
            if (a.needsReason || a.needsReference || a.needsNotes) setActive(a);
            else run(a, {});
          }}
          disabled={submitting}
          className="focus-ring rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-[color:var(--color-primary-hover)] disabled:opacity-50"
        >
          {a.label}
        </button>
      ))}

      {active && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <h3 className="mb-2 text-sm font-bold text-charcoal">{active.label}</h3>
            <label className="mb-1 block text-xs font-medium text-charcoal/60">
              {active.needsReason ? "Reason (mandatory)" : active.needsReference ? "Supporting reference (mandatory)" : "Response to Approval Authority"}
            </label>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={active.needsReference ? 1 : 3}
              className="w-full rounded-lg border border-[#e3ddee] p-2 text-sm outline-none focus:border-primary"
            />
            {error && <p className="mt-2 text-xs text-[color:var(--color-danger)]">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setActive(null); setError(null); }} className="focus-ring rounded-lg border border-[#e3ddee] px-3 py-1.5 text-xs font-semibold text-charcoal/60">
                Cancel
              </button>
              <button
                onClick={() =>
                  run(active, active.needsReason ? { reason: text } : active.needsReference ? { supportingReference: text } : { notes: text })
                }
                disabled={!text.trim() || submitting}
                className="focus-ring rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
