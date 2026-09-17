"use client";

import { AppShell } from "@/components/shell/app-shell";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-5 card-elevation">
      <h2 className="mb-3 text-sm font-bold text-primary">{title}</h2>
      <div className="space-y-2 text-sm text-charcoal/75">{children}</div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <AppShell title="Help & TBC Register">
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Section title="What CA and AT mean">
          <p><strong>CA</strong> = Credit Application. <strong>AT</strong> = Availment Ticket. Both share one workflow across five stations: Corporate Finance, Credit Review, Approval Authority, CAD and Operations.</p>
        </Section>

        <Section title="Confirmed workflow requirements">
          <ul className="list-disc space-y-1 pl-5">
            <li>RM/Corporate Finance creates and immediately submits a request to Credit Review.</li>
            <li>Risk may return a request to the initiating RM with a mandatory query/reason; the RM responds and resubmits, opening a new review cycle while every prior cycle is preserved.</li>
            <li>Once cleared, the request proceeds to the configured Approval Authority. Approval Authority queries are always coordinated through Risk — never sent directly to the RM.</li>
            <li>Final external approval and final external execution are <em>recorded</em> with a supporting reference — the system tracks these real-world milestones; it does not itself approve financing or execute transactions.</li>
            <li>After approval, the RM obtains signatures and sends documentation to CAD; CAD performs final review before the request moves to Operations.</li>
            <li>Document visibility: Corporate Finance/RM see their own work; Risk sees full documentation once an application reaches Credit Review; Approval Authority sees documentation once an application reaches their queue; CAD sees full documents only after final approval is recorded.</li>
          </ul>
        </Section>

        <Section title="Technical defaults applied">
          <ul className="list-disc space-y-1 pl-5">
            <li>Approval-Routing Exposure = Total Group Exposure + Related-Party Exposure, computed in integer minor units per currency (e.g. 3 decimal places for BHD) — never as floating point.</li>
            <li>Assignment scope beyond the department queue defaults to <strong>Own</strong> (most restrictive) until an administrator configures otherwise in Configuration → Assignment Scope.</li>
            <li>Operations&apos; document access is not separately confirmed and defaults to no access beyond tracking information, unless VIEW_RESTRICTED_DOCUMENTS is explicitly granted.</li>
            <li>CRO80 references are entered by the RM at creation (optionally pre-filled with a locally suggested next number) — there is no live core-banking reference integration in this local deployment.</li>
          </ul>
        </Section>

        <Section title="TBC — banking decisions awaiting confirmation">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Approval-routing matrix.</strong> Until an administrator activates a Routing Matrix configuration, every application shows &quot;Approval authority TBC — routing matrix not configured&quot; instead of an inferred authority.</li>
            <li><strong>TAT thresholds and business calendar.</strong> Until an active TAT Profile (and calendar) exists for a stage/request type, that stage shows &quot;TAT not configured&quot; rather than a compliance verdict. Pause/resume rules during queries and the exact start/end of &quot;approval duration&quot; are not yet defined.</li>
            <li><strong>Document checklists.</strong> Pre-Flight completeness shows &quot;Checklist TBC&quot; until a Document Checklist configuration is active for that request type/subtype.</li>
            <li><strong>Reference uniqueness rules, currency conversion and cross-currency routing</strong> are not implemented — the system refuses to combine exposures across currencies rather than guessing an exchange rate.</li>
            <li><strong>Rejection, withdrawal, cancellation, reopening, delegation and exception-routing</strong> are not implemented as workflow actions.</li>
            <li><strong>Recording external approval/execution</strong> requires the RECORD_EXTERNAL_APPROVAL / RECORD_EXTERNAL_EXECUTION capability to be explicitly granted by an administrator; it is denied by default.</li>
          </ul>
        </Section>

        <Section title="Future integrations (not prerequisites for local use)">
          <ul className="list-disc space-y-1 pl-5">
            <li>Email notifications — requires an EMAIL_PROVIDER to be configured via environment variables; shows &quot;Email not configured&quot; otherwise. In-app notifications work fully without it.</li>
            <li>An optional server-side AI adapter for the intelligence panels — disabled by default, never required, never given unsupervised authority over credit decisions or records.</li>
            <li>Core-banking reference integration for CRO80 numbering.</li>
          </ul>
        </Section>

        <Section title="Noted 3D scope">
          <p>
            The Credit Journey (Executive Control Tower) and Application Flow (Credit Intelligence) scenes, and the
            Exposure Orb (Credit Passport), are fully interactive 3D scenes wired to live data. The smaller Query
            Cycle Viewer and Query Pattern Map widgets are implemented as interactive 2D visualizations rather than
            3D scenes, to keep the overall build reliable — every 3D scene also has a functional 2D/table fallback,
            reachable on demand or automatically if WebGL is unavailable.
          </p>
        </Section>
      </div>
    </AppShell>
  );
}
