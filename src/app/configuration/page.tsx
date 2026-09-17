"use client";

import { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { useSession } from "@/components/providers/session-provider";
import { ConfigPanel } from "@/components/configuration/config-panel";
import {
  AssignmentScopeForm,
  CalendarForm,
  DocumentChecklistForm,
  NotificationPrefsForm,
  RoutingMatrixForm,
  SubtypeMappingForm,
  TatProfileForm,
} from "@/components/configuration/forms";
import { UsersAdmin } from "@/components/configuration/users-admin";
import type { ConfigType } from "@/lib/domain/enums";
import { DEPARTMENT_LABELS } from "@/lib/domain/enums";

const TABS: { key: ConfigType | "USERS"; label: string }[] = [
  { key: "ROUTING_MATRIX", label: "Routing Matrix" },
  { key: "TAT_PROFILE", label: "TAT Profiles" },
  { key: "CALENDAR", label: "Calendars" },
  { key: "SUBTYPE_MAPPING", label: "Subtype Mapping" },
  { key: "DOCUMENT_CHECKLIST", label: "Document Checklists" },
  { key: "NOTIFICATION_PREFS", label: "Notifications" },
  { key: "ASSIGNMENT_SCOPE", label: "Assignment Scope" },
  { key: "USERS", label: "Users & Capabilities" },
];

function ConfigurationContent() {
  const { user } = useSession();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("ROUTING_MATRIX");
  const canManage = !!user?.capabilities.includes("MANAGE_CONFIG");
  const canManageUsers = !!user?.capabilities.includes("MANAGE_USERS");

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`focus-ring rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === t.key ? "bg-primary text-white" : "bg-white text-charcoal/60 hover:bg-primary/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!canManage && tab !== "USERS" && (
        <p className="mb-3 rounded-lg bg-amber/10 px-3 py-2 text-xs text-[#8a5a13]">
          You can view configuration status but do not hold the MANAGE_CONFIG capability required to create or activate versions.
        </p>
      )}

      <div className="rounded-[var(--radius-card)] bg-white p-5 card-elevation">
        {tab === "ROUTING_MATRIX" && (
          <ConfigPanel
            configType="ROUTING_MATRIX"
            title="Approval-Routing Matrix"
            description="Maps Approval-Routing Exposure (Total Group + Related-Party) to an approval-authority tier. Until an active version exists, applications show 'Approval authority TBC'."
            canManage={canManage}
            renderForm={(submit, submitting) => <RoutingMatrixForm onSubmit={submit} submitting={submitting} />}
            renderSummary={(p) => (
              <ul className="mt-1 space-y-1 text-xs text-charcoal/70">
                {(p.tiers as { label: string; minMinor: string; maxMinor: string | null; approvalAuthorityLabel: string }[]).map((t, i) => (
                  <li key={i}>{t.label}: {p.currency as string} {t.minMinor} – {t.maxMinor ?? "∞"} → {t.approvalAuthorityLabel}</li>
                ))}
              </ul>
            )}
          />
        )}
        {tab === "TAT_PROFILE" && (
          <ConfigPanel
            configType="TAT_PROFILE"
            title="TAT Profiles"
            description="Working-hours thresholds per stage and request type. Without an applicable active profile, that stage shows 'TAT not configured' rather than a guessed compliance state."
            canManage={canManage}
            renderForm={(submit, submitting) => <TatProfileForm onSubmit={submit} submitting={submitting} />}
            renderSummary={(p) => (
              <p className="text-xs text-charcoal/70">
                {String(p.requestType)} · {DEPARTMENT_LABELS[p.stage as keyof typeof DEPARTMENT_LABELS] ?? String(p.stage)} — warning at {String(p.warningThresholdHours)}h, escalation at {String(p.escalationThresholdHours)}h ({String(p.timezone)})
              </p>
            )}
          />
        )}
        {tab === "CALENDAR" && (
          <ConfigPanel
            configType="CALENDAR"
            title="Business Calendar"
            description="Weekend days and holidays used by the TAT engine's working-hours calculation."
            canManage={canManage}
            renderForm={(submit, submitting) => <CalendarForm onSubmit={submit} submitting={submitting} />}
            renderSummary={(p) => (
              <p className="text-xs text-charcoal/70">{String(p.name)} ({String(p.timezone)}) — {(p.holidays as string[]).length} holiday(s) configured.</p>
            )}
          />
        )}
        {tab === "SUBTYPE_MAPPING" && (
          <ConfigPanel
            configType="SUBTYPE_MAPPING"
            title="Subtype Mapping"
            description="Which departments a given request type / subtype combination may be routed through."
            canManage={canManage}
            renderForm={(submit, submitting) => <SubtypeMappingForm onSubmit={submit} submitting={submitting} />}
            renderSummary={(p) => (
              <ul className="space-y-1 text-xs text-charcoal/70">
                {(p.mappings as { requestType: string; subtype: string; allowedDepartments: string[] }[]).map((m, i) => (
                  <li key={i}>{m.requestType} / {m.subtype}: {m.allowedDepartments.join(", ")}</li>
                ))}
              </ul>
            )}
          />
        )}
        {tab === "DOCUMENT_CHECKLIST" && (
          <ConfigPanel
            configType="DOCUMENT_CHECKLIST"
            title="Document Checklists"
            description="Required document items used by Pre-Flight Review completeness checks. Without an active checklist, completeness shows 'Checklist TBC'."
            canManage={canManage}
            renderForm={(submit, submitting) => <DocumentChecklistForm onSubmit={submit} submitting={submitting} />}
            renderSummary={(p) => (
              <ul className="space-y-1 text-xs text-charcoal/70">
                {(p.requiredItems as { category: string; description: string }[]).map((it, i) => (
                  <li key={i}>{it.category}: {it.description}</li>
                ))}
              </ul>
            )}
          />
        )}
        {tab === "NOTIFICATION_PREFS" && (
          <ConfigPanel
            configType="NOTIFICATION_PREFS"
            title="Notification Preferences"
            description="Administrator intent for notification channels. Email additionally requires a server-side provider to be configured via environment variables."
            canManage={canManage}
            renderForm={(submit, submitting) => <NotificationPrefsForm onSubmit={submit} submitting={submitting} />}
            renderSummary={(p) => (
              <p className="text-xs text-charcoal/70">In-app: {p.inAppEnabled ? "enabled" : "disabled"} · Email requested: {p.emailRequested ? "yes" : "no"}</p>
            )}
          />
        )}
        {tab === "ASSIGNMENT_SCOPE" && (
          <ConfigPanel
            configType="ASSIGNMENT_SCOPE"
            title="Assignment Scope"
            description="Controls how broadly each role can see applications beyond their own department queue. Defaults to the most restrictive (Own) until configured."
            canManage={canManage}
            renderForm={(submit, submitting) => <AssignmentScopeForm onSubmit={submit} submitting={submitting} />}
            renderSummary={(p) => (
              <ul className="grid grid-cols-2 gap-x-4 text-xs text-charcoal/70">
                {Object.entries(p.scopesByRole as Record<string, string>).map(([role, scope]) => (
                  <li key={role}>{role}: {scope}</li>
                ))}
              </ul>
            )}
          />
        )}
        {tab === "USERS" && <UsersAdmin canManage={canManageUsers} />}
      </div>
    </div>
  );
}

export default function ConfigurationPage() {
  return (
    <AppShell title="Configuration">
      <ConfigurationContent />
    </AppShell>
  );
}
