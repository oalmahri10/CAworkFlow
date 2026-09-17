"use client";

import { use, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { useApi } from "@/lib/client/use-api";
import { useSession } from "@/components/providers/session-provider";
import { apiPost, ApiError } from "@/lib/client/api";
import { formatCurrencyMinor, formatDateTime, formatHoursDuration } from "@/lib/client/format";
import { DepartmentBadge, RequestTypeBadge, SubstageBadge, TatBadge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { SceneFrame } from "@/components/three/scene-frame";
import { ExposureOrbScene } from "@/components/three/exposure-orb-scene";
import { JourneyTimeline, type StageIntervalLite } from "@/components/credit-passport/journey-timeline";
import { QueryCycleViewer, type QueryLite } from "@/components/credit-passport/query-cycle-viewer";
import { DocumentVault, type DocumentWithAccess } from "@/components/credit-passport/document-vault";
import { WorkflowActions } from "@/components/credit-passport/workflow-actions";
import { SUBTYPE_LABELS, type Subtype } from "@/lib/domain/enums";
import { CheckCircle2, ChevronRight, History } from "lucide-react";

type ApplicationDetail = {
  application: {
    id: string;
    croReference: string;
    customerName: string;
    customerType: string;
    sector: string | null;
    subtype: string;
    requestType: string;
    currentDepartment: string;
    substage: string;
    version: number;
    currency: string;
    totalGroupExposureMinor: string;
    relatedPartyExposureMinor: string;
    approvalRoutingExposureMinor: string;
    submissionAt: string | null;
    initiatingRmId: string;
    initiatingRm: { id: string; name: string };
    actionOwner: { id: string; name: string } | null;
    actionOwnerDept: string | null;
    stageIntervals: StageIntervalLite[];
    queries: QueryLite[];
    workflowEvents: { id: string; action: string; toDept: string; toSubstage: string; createdAt: string; actor: { name: string }; reason: string | null }[];
    externalMilestones: { id: string; type: string; supportingReference: string; recordedAt: string; recordedBy: { name: string } }[];
    comments: { id: string; body: string; createdAt: string; author: { name: string } }[];
  };
  documentsWithAccess: DocumentWithAccess[];
  tat: { status: "NOT_CONFIGURED" | "OK" | "WARNING" | "BREACHED"; message: string };
  routing: { configured: true; approvalAuthorityLabel: string; tierLabel: string } | { configured: false; message: string };
  ages: { totalApplicationAgeMs: number; currentStageAgeMs: number; currentCycleElapsedMs: number };
};

const TABS = ["Overview", "Workflow", "Exposure", "Documents", "Audit History"] as const;

function CreditPassportContent({ id }: { id: string }) {
  const { user } = useSession();
  const { data, loading, error, reload } = useApi<ApplicationDetail>(`/api/applications/${id}`);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [comment, setComment] = useState("");
  const [respondText, setRespondText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <div className="p-6 text-sm text-charcoal/50">Loading Credit Passport…</div>;
  if (error) return <div className="p-6 text-sm text-[color:var(--color-danger)]">{error}</div>;
  if (!data || !user) return null;

  const app = data.application;
  const hasOpenQuery = app.actionOwnerDept !== null && app.actionOwnerDept !== app.currentDepartment;
  const openQuery = app.queries.find((q) => q.status === "OPEN");
  const canRespond = openQuery && user.id === app.initiatingRmId && openQuery.responses.length === 0;

  async function submitComment() {
    if (!comment.trim()) return;
    await apiPost(`/api/applications/${id}/comments`, { body: comment });
    setComment("");
    reload();
  }

  async function submitResponse() {
    if (!openQuery || !respondText.trim()) return;
    try {
      await apiPost(`/api/applications/${id}/queries/${openQuery.id}/responses`, { message: respondText });
      setRespondText("");
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to submit response.");
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="rounded-[var(--radius-card)] bg-white p-5 card-elevation">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-charcoal/45">Applications / {app.croReference}</div>
            <h1 className="mt-1 text-2xl font-extrabold text-primary">Credit Passport</h1>
            <div className="mt-0.5 flex items-center gap-2 text-lg font-semibold text-charcoal">
              {app.customerName}
              <RequestTypeBadge type={app.requestType} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <SubstageBadge substage={app.substage} />
            <TatBadge status={data.tat.status} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-black/5 pt-4 text-sm md:grid-cols-5">
          <Meta label="Application No." value={app.croReference} />
          <Meta label="Customer Type" value={app.customerType.replace(/_/g, " ")} />
          <Meta label="Sector" value={app.sector ?? "—"} />
          <Meta label="Relationship Manager" value={app.initiatingRm.name} />
          <Meta label="Submission Date" value={app.submissionAt ? formatDateTime(app.submissionAt) : "—"} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title="Exposure Orb">
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_1.4fr_1fr]">
            <ExposureCard label="Group Exposure" value={formatCurrencyMinor(app.totalGroupExposureMinor, app.currency)} tone="teal" />
            <SceneFrame
              height={280}
              label="the Exposure Orb"
              cameraPosition={[0, 0.4, 4]}
              fov={45}
              fallback={
                <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl bg-[color:var(--color-light-grey)]">
                  <span className="text-xs text-charcoal/50">Approval-Routing Exposure</span>
                  <span className="text-2xl font-extrabold text-primary">{formatCurrencyMinor(app.approvalRoutingExposureMinor, app.currency)}</span>
                </div>
              }
            >
              <ExposureOrbScene totalLabel="Approval-Routing Exposure" formattedTotal={formatCurrencyMinor(app.approvalRoutingExposureMinor, app.currency)} />
            </SceneFrame>
            <ExposureCard label="Related-Party Exposure" value={formatCurrencyMinor(app.relatedPartyExposureMinor, app.currency)} tone="primary" />
          </div>
          <p className="mt-2 text-center text-[11px] text-charcoal/40">
            Approval-Routing Exposure = Total Group Exposure + Related-Party Exposure
          </p>
        </Panel>

        <Panel title="Routing &amp; Pre-Flight">
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-lavender p-3">
              <div className="text-xs font-bold text-primary">Approval Authority</div>
              {data.routing.configured ? (
                <p className="mt-1 text-charcoal/75">{data.routing.approvalAuthorityLabel} <span className="text-charcoal/45">({data.routing.tierLabel})</span></p>
              ) : (
                <p className="mt-1 text-charcoal/60">{data.routing.message}</p>
              )}
            </div>
            <div className="rounded-lg bg-[color:var(--color-light-grey)] p-3 text-xs text-charcoal/60">
              <div>Total application age: {formatHoursDuration(data.ages.totalApplicationAgeMs / 3.6e6)}</div>
              <div>Current stage age: {formatHoursDuration(data.ages.currentStageAgeMs / 3.6e6)}</div>
              <div>Current cycle elapsed: {formatHoursDuration(data.ages.currentCycleElapsedMs / 3.6e6)}</div>
            </div>
            <p className="text-[11px] text-charcoal/40">{data.tat.message}</p>
          </div>

          {canRespond && (
            <div className="mt-4 border-t border-black/5 pt-3">
              <div className="mb-1 text-xs font-bold text-charcoal">Respond to open query</div>
              <textarea value={respondText} onChange={(e) => setRespondText(e.target.value)} rows={3} className="w-full rounded-lg border border-[#e3ddee] p-2 text-xs outline-none focus:border-primary" placeholder="Your response…" />
              {actionError && <p className="mt-1 text-[11px] text-[color:var(--color-danger)]">{actionError}</p>}
              <button onClick={submitResponse} disabled={!respondText.trim()} className="focus-ring mt-2 w-full rounded-lg bg-primary py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                Submit response
              </button>
            </div>
          )}

          <div className="mt-4 border-t border-black/5 pt-3">
            <WorkflowActions
              applicationId={app.id}
              substage={app.substage}
              version={app.version}
              initiatingRmId={app.initiatingRmId}
              user={user}
              onDone={reload}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Journey">
        <JourneyTimeline intervals={app.stageIntervals} currentDepartment={app.currentDepartment} hasOpenQuery={hasOpenQuery} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Query Cycle">
          <QueryCycleViewer queries={app.queries} />
        </Panel>
        <Panel title="Document Vault">
          <DocumentVault applicationId={app.id} documents={data.documentsWithAccess} onUploaded={reload} />
        </Panel>
      </div>

      <Panel>
        <div className="flex gap-1 border-b border-black/5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`focus-ring -mb-px border-b-2 px-3 py-2 text-xs font-semibold ${
                tab === t ? "border-primary text-primary" : "border-transparent text-charcoal/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="pt-4">
          {tab === "Overview" && (
            <div className="space-y-3">
              <p className="text-sm text-charcoal/70">
                {SUBTYPE_LABELS[app.subtype as Subtype] ?? app.subtype} · Current action owner: {app.actionOwner?.name ?? (app.actionOwnerDept ? `${app.actionOwnerDept} queue` : "None (completed)")}
              </p>
              <div>
                <div className="mb-2 text-xs font-bold text-charcoal">Comments</div>
                <div className="space-y-2">
                  {app.comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-[color:var(--color-light-grey)] p-2 text-xs">
                      <span className="font-semibold">{c.author.name}</span> <span className="text-charcoal/40">{formatDateTime(c.createdAt)}</span>
                      <p className="mt-0.5 text-charcoal/75">{c.body}</p>
                    </div>
                  ))}
                  {app.comments.length === 0 && <p className="text-xs text-charcoal/40">No comments yet.</p>}
                </div>
                <div className="mt-2 flex gap-2">
                  <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="flex-1 rounded-lg border border-[#e3ddee] px-3 py-1.5 text-xs outline-none focus:border-primary" />
                  <button onClick={submitComment} className="focus-ring rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">Post</button>
                </div>
              </div>
            </div>
          )}

          {tab === "Workflow" && (
            <ol className="space-y-2">
              {app.workflowEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                  <span className="font-semibold text-charcoal">{e.action.replace(/_/g, " ")}</span>
                  <ChevronRight className="h-3 w-3 text-charcoal/30" />
                  <DepartmentBadge department={e.toDept} />
                  <span className="text-charcoal/40">{formatDateTime(e.createdAt)} · {e.actor.name}</span>
                  {e.reason && <span className="text-charcoal/50">— {e.reason}</span>}
                </li>
              ))}
            </ol>
          )}

          {tab === "Exposure" && (
            <div className="space-y-2 text-sm">
              <p>Group: {formatCurrencyMinor(app.totalGroupExposureMinor, app.currency)}</p>
              <p>Related-Party: {formatCurrencyMinor(app.relatedPartyExposureMinor, app.currency)}</p>
              <p className="font-bold">Approval-Routing: {formatCurrencyMinor(app.approvalRoutingExposureMinor, app.currency)}</p>
              {app.externalMilestones.map((m) => (
                <div key={m.id} className="rounded-lg bg-[color:var(--color-light-grey)] p-2 text-xs">
                  {m.type === "EXTERNAL_APPROVAL" ? "External approval" : "External execution"} recorded by {m.recordedBy.name} on {formatDateTime(m.recordedAt)} — ref {m.supportingReference}
                </div>
              ))}
            </div>
          )}

          {tab === "Documents" && <DocumentVault applicationId={app.id} documents={data.documentsWithAccess} onUploaded={reload} />}

          {tab === "Audit History" && (
            <a href={`/audit?applicationId=${app.id}`} className="focus-ring flex items-center gap-2 text-sm font-semibold text-primary">
              <History className="h-4 w-4" /> View full audit trail for this application
            </a>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-charcoal/40">{label}</div>
      <div className="font-semibold text-charcoal">{value}</div>
    </div>
  );
}

function ExposureCard({ label, value, tone }: { label: string; value: string; tone: "teal" | "primary" }) {
  return (
    <div className={`rounded-xl p-4 ${tone === "teal" ? "bg-teal/10" : "bg-primary/10"}`}>
      <div className={`text-xs font-semibold ${tone === "teal" ? "text-[#1c7d6c]" : "text-primary"}`}>{label}</div>
      <div className="mt-1 text-lg font-extrabold text-charcoal">{value}</div>
    </div>
  );
}

export default function CreditPassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppShell title="Credit Passport">
      <CreditPassportContent id={id} />
    </AppShell>
  );
}
