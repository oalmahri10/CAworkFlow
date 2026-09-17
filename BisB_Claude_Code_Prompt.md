# BUILD: BisB Credit Command — Complete Local Website

Act as a senior full-stack engineer, banking workflow architect, 3D interface developer, product designer and QA engineer. Build the complete website in this Visual Studio Code workspace, run it locally and verify it in the browser.

**Application name:** BisB Credit Command  
**Subtitle:** Credit Applications & Availment Tickets — Workflow Intelligence

Implement the application. Do not stop at a plan, scaffold, static mock-up or homepage. Deliver a working local website with persistent records, functioning workflows, interactive 3D scenes and all connected pages.

## 1. Non-negotiable requirements

- **CA = Credit Application. AT = Availment Ticket.** Use these meanings consistently in the interface, legends, forms, tooltips, code, schemas, exports, tests and documentation. Correct conflicting terminology in the images.
- Remove all demo/prototype framing, sample-data badges, simulated role selectors, guided demonstrations, fake outboxes and reset-demo controls.
- Run the website on localhost. Do not deploy, publish, expose it through a tunnel or require cloud hosting.
- The attached images are the visual specification, not loose inspiration. Reproduce their composition, proportions, colours, materials, lighting, depth, typography, spacing and component placement as faithfully as possible.
- Every 3D interaction must be practical, functional and connected to underlying application data. A decorative video or screenshot is not a working 3D interface.
- Every visible button, filter, tab, search field, chart drill-down and navigation item must work. Clearly disable genuinely unavailable actions with an explanation.
- Do not fabricate banking policies, approval thresholds, TAT settings, user identities, financial records, analytics or AI predictions.
- Keep banking decisions awaiting confirmation visibly TBC. This must not prevent building the configuration structure, forms, persistence or surrounding workflow.

## 2. Working approach

Inspect the workspace, existing project instructions and all attached images before implementation. Extend a suitable existing project without overwriting unrelated work; otherwise scaffold a new project.

Create a short implementation plan, then build immediately. Continue through implementation, browser verification and visual refinement. Ask only when an unresolved issue genuinely prevents progress.

Create a reference checklist mapping each image to its page and major components. If an attachment cannot be opened, identify the missing file and request it; do not invent its appearance or claim to have inspected it.

Keep a requirements register distinguishing confirmed workflow requirements, technical defaults, TBC banking decisions and future integrations. Keep technical notes out of routine operational screens unless users need them to act.

## 3. Visual fidelity to the attached images

Use the images as the controlling reference for appearance. This prompt controls terminology, data integrity, permissions and workflow. When they conflict, preserve the visual treatment while correcting the content or behaviour.

The four attachments show three principal screens, including two very similar Credit Intelligence variants. Use the later Intelligence variant as the baseline where they differ visually, while applying the terminology in this prompt to both.

### Executive Control Tower

Match the light dashboard reference:

- Full-height deep-purple left navigation rail, white line icons, highlighted selected item and subtle geometric pattern toward the bottom.
- White header with product name, page title, search, notification/account controls and the actual signed-in user's identity.
- Five horizontal KPI cards: Circulated, Active, CA, AT and Completed.
- Large central Credit Journey occupying the same dominant area as the reference.
- Bahrain skyline and waterfront atmosphere, architectural interior, restrained Islamic geometric screens, reflective floor and metallic/glass materials.
- Five rounded, illuminated station platforms: Corporate Finance, Credit Review, Approval Authority, CAD and Operations.
- Recognizable station models: buildings, document with magnifier, people, document/storage stack and gears.
- Purple CA cubes and teal/white AT triangular forms, readable labels, connected paths and query-return paths.
- Bottom cards for TAT Health, Bottleneck Radar and Executive Brief, followed by the wide command bar.

### Credit Passport

Match the light application-detail reference:

- Purple sidebar; top breadcrumb, search and account controls.
- Large Credit Passport heading, customer name, status badge and compact metadata strip.
- Wide exposure panel on the left and pre-flight/amendment panel on the right.
- Central translucent purple-and-teal Exposure Orb on a luminous circular base, with connected exposure callouts on both sides.
- Full-width journey timeline beneath the exposure section.
- Linked query-cycle rings on the lower left; Document Vault cards on the lower right.
- Bottom tabs for Overview, Workflow, Exposure, Documents and Audit History, matching the reference treatment.
- Subtle skyline artwork and soft background geometry.

### Credit Intelligence

Match the darker reference:

- Deep-purple sidebar and dark violet analytical workspace.
- Large white heading with skyline header, wide command/search bar and type, department and date filters.
- Bottleneck Radar on the left, the large 3D Application Flow & Bottlenecks scene in the centre and operational risk/forecast cards on the right.
- Five upright sculpted stations, flowing translucent paths, purple CA cubes, teal AT markers, metallic surfaces and restrained amber attention highlighting.
- Bottom row: Process Replay, Query Pattern Map, Executive Brief and Next Best Actions.
- Preserve the reference panel proportions, visual density and contrast between dark scene areas and light content cards.

### Exact-match rules

Reproduce the supplied design rather than substituting a generic dashboard or reducing the principal scenes to flat cards. Do not use an entire screenshot as a page background with invisible hotspots. Build real components, live text, chart data and 3D objects.

Use supplied artwork or locally stored background assets where suitable. Background scenery may be static; stations, request markers, exposure components and interactive graph nodes must be actual interactive elements. Do not leave asset URLs broken or rely on runtime remote fonts/assets.

Match the reference viewport first, then validate at common desktop widths such as 1440 and 1920 pixels. Preserve the visual hierarchy at smaller sizes instead of stretching the entire page as one image.

Retain the reference layout when removing sample-data badges. Replace fictional users and numbers with actual account information and computed values. Do not reproduce erroneous text, unsupported slogans, inconsistent counts or invented confidence percentages merely to match the image.

Create browser screenshots at the reference dimensions and compare them side by side. Refine layout, spacing, typography, scene camera, materials and lighting until remaining differences are minor. Report any unresolved visual differences honestly; do not claim pixel-perfect equivalence without verification.

### Design tokens

Use the reference palette: primary purple #552988, deep violet #55267E, teal #51C1AD, white #FFFFFF, charcoal #333333, pale lavender and light grey. Use amber for attention and red for errors/breaches, supported by labels and icons.

Define reusable typography, spacing, radii, elevation, motion, chart, badge and focus tokens. Use the supplied authentic logo when available; otherwise reproduce the text wordmark treatment without inventing an official logo.

## 4. Local architecture and persistence

Preferred stack: Next.js, TypeScript, Tailwind CSS, accessible reusable components, Lucide-style icons, an appropriate motion library, React Three Fiber/Three.js, a charting library, schema validation and automated tests. Adapt to a suitable existing stack when needed.

Use a local server-side SQLite database with migrations and a maintainable ORM or database layer. Keep documents in a private local directory accessed through authorized server endpoints. Persist applications, users, configuration, queries, document versions and audit events across refreshes and server restarts.

Separate UI, domain calculations, workflow transitions, authorization, storage and analytics. Use transactions for related writes. Protect against duplicate submissions and stale edits.

Provide actual local sign-in and session management, secure password hashing and a one-time administrator setup flow. Do not implement an unrestricted role dropdown as authentication. Administrators manage accounts and capabilities; configuration administration does not automatically grant access to credit documents.

Enforce authorization on the server for reads, writes, downloads, exports and analytics. Keep secrets server-side and use secure session handling appropriate to the local environment. Bind to the loopback interface by default.

Start the normal application with an empty business database. Provide useful empty states and working creation/import flows. Do not populate operational pages with fictional customer records. Isolated test fixtures may populate a separate test database for automated and visual verification; never silently insert them into the user's database.

Use local file-based assets. After dependencies are installed, core functionality must run without external credentials or network access. Provide database/document backup and restore instructions. Keep a service abstraction for possible future integrations without making those integrations prerequisites.

## 5. Pages and navigation

Implement connected pages for:

1. Executive Control Tower.
2. Applications, with search, filters, sorting and pagination.
3. Create/Edit Application.
4. Credit Passport.
5. My Work / Department Queue.
6. Credit Intelligence.
7. Audit Trail.
8. Configuration and user administration.
9. Help / Requirements and TBC Register.

Match the reference navigation style and make every visible destination real. Additional reference labels such as Customers, Reports or Document Hub may open meaningful filtered views of implemented data; do not create dead navigation links.

Prioritize desktop. Support tablet/mobile with readable stacked layouts and accessible 2D alternatives. Prepare components for future Arabic/RTL support.

## 6. Application data and exposure

Support exactly two primary request types: CA and AT, sharing one workflow.

Subtypes: Annual Review, Rescheduling, Restructuring, Waiver, Temporary Excess/Access and Other. Keep mappings configurable; unconfirmed restrictions remain TBC.

Capture internal application ID, CRO80 reference, customer name, customer type, sector, initiating RM, department, request type/subtype, total group exposure, related-party exposure, routing exposure, facility details and separate facility amounts, currency, submission timestamp, lifecycle status, stage/substage, pending-action owner, milestone dates, comments, document versions, queries, review cycles, approval-cycle records and movement history.

Support search by CRO80 reference and customer name.

**Approval-Routing Exposure = Total Group Exposure + Related-Party Exposure.**

Use safe decimal/minor-unit monetary arithmetic with currency-appropriate precision. Display the formula and both inputs clearly. Keep the individual facility amount separate. Never route solely on facility amount or silently combine currencies.

Reference uniqueness rules, currency conversion and cross-currency routing remain TBC. Provide validation and explicit handling rather than invented policy.

Build an editable, versioned approval-routing matrix. Until confirmed and configured, display **Approval authority TBC — routing matrix not configured**. Do not infer an authority from example amounts or allow an unresolved authority to be bypassed silently.

## 7. Shared CA and AT workflow

Implement a validated state machine or transition service:

1. RM/Corporate Finance creates and submits the request.
2. Credit Review/Risk receives it.
3. Risk may return it to the initiating RM with a mandatory query/reason.
4. RM responds, amends information or adds documents.
5. RM resubmits to Risk.
6. Risk clears it.
7. The request proceeds to the configured Approval Authority.
8. Approval Authority queries are coordinated through Risk with the RM.
9. Risk agrees the response with the RM and responds to the Approval Authority.
10. Final external approval is recorded with its supporting reference.
11. The request moves to CAD for documentation.
12. RM obtains customer signatures and required documents.
13. RM sends completed documentation to CAD.
14. CAD performs final review.
15. The request moves to Operations.
16. External execution is recorded with its supporting reference.
17. The request is completed.

Credit Review and Risk are the same function. Distinguish overall stage, substage, responsible department and current action owner. For example, the documentation phase can have an action pending with the RM.

Prevent unsupported stage skipping. CAD is not an approval authority. Risk queries return to the initiating RM; Approval Authority queries pass through Risk. Do not copy misleading return arrows from the images.

The website tracks and records external approval and execution milestones; it does not itself legally approve financing or execute banking transactions. Use precise action labels such as **Record external approval**.

Permissions for recording those milestones must be configurable and explicitly granted. Until configured, deny the action and explain the missing configuration. Rejection, withdrawal, cancellation, reopening, delegation and exception-routing rules remain TBC; do not invent them.

## 8. Query management and notifications

Queries must have an application, category where configured, reason, author, timestamp, cycle link, responses and relevant document references.

A Risk return must atomically change action ownership to the initiating RM, create an in-app notification, appear in the RM's queue and preserve previous submissions. RM responses and resubmission must work end to end.

Start a new applicable review/TAT cycle on resubmission. Preserve all previous cycles, elapsed time and total application age.

Keep Risk review cycles, query rounds and approval cycles distinct. The exact approval-cycle definition remains TBC; do not count each comment or Risk return as a new approval cycle.

Implement real in-app notification read/unread states. Email is optional and requires an explicitly configured provider. When unconfigured, show Email not configured; never show a fake sent email or a simulated outbox.

## 9. TAT and time accounting

Build a versioned TAT engine supporting stage, request type, cycle, working days/hours, holidays, timezone, warning thresholds, escalations and effective dates.

Do not seed unconfirmed banking settings. Without an applicable configuration, display **TAT not configured** and do not classify cases as compliant or breached.

Show total application age, current-stage age, current-cycle elapsed time, cumulative departmental time, measurable approval duration and completed-case turnaround separately.

Pause/resume rules, business calendars and approval-duration start/end definitions require confirmation. Clearly identify provisional metric definitions; never silently exclude query time. Store timestamps consistently and make the display timezone explicit.

Metric tooltips must explain formula, period, denominator and configuration version. Preserve historical configuration references. Do not silently recalculate old results under new rules. Define historical recalculation only after confirmation.

## 10. Roles and document access

Support capabilities for RM/Relationship Officer, Corporate Finance, Credit Review/Risk, Approval Authority, CAD, Operations, CRO, Chief of Corporate, Senior Management and Authorized Administrator.

Confirmed document visibility:

- Corporate Finance/RM: documents applicable to their work.
- Risk: full documentation for authorized applications.
- Approval Authority: documentation needed for authorized approvals.
- CAD: full application details/documents only after final approval.
- Other users: permitted tracking information without automatic restricted-document access.

Assignment scope, team visibility and Operations document access remain TBC. Implement configurable scopes with restrictive defaults pending confirmation.

Apply permissions to detail pages, direct API requests, searches, previews, downloads, comments, audit history, analytics, exports and intelligence summaries. A locked card alone is not security. Do not send unauthorized content to the browser and hide it with CSS.

Store document metadata and actual file contents locally. Support upload, download, allowed-file preview and immutable version history. Validate file type, size and paths; return clear errors for unsupported files.

## 11. Practical 3D behaviour

Build real geometry, scene lighting, camera controls and pointer interactions. Maintain readable HTML labels aligned to 3D objects where appropriate.

### Credit Journey / Application Flow

- Each station opens its actual filtered department queue.
- Each individual CA cube/AT marker opens that application's Credit Passport.
- Hover or keyboard focus reveals a permitted summary: reference, type, stage, action owner and stage age.
- A marker travels to another station only after a successful persisted workflow event, or during explicitly selected historical replay.
- Query-return animation follows the recorded valid return path.
- Markers rest at their current station; do not continuously circulate pending applications as if work is progressing.
- Aggregate large queues into selectable clusters with correct counts and drill-downs.
- Station counts, labels and highlighting update from actual records.
- Selecting a station smoothly focuses/highlights it; provide a reset-view control and constrained camera movement.

### Exposure Orb

- Render distinct group and related-party components with the calculated total in the centre.
- Selecting a component opens its numerical breakdown and relevant permitted details.
- Modest rotation or assembly animation may explain the parts; amounts remain stable and readable.
- Exposure edits update both the orb and the persisted values after validation.
- Never use misleading segment proportions if geometry is decorative; the numbers remain authoritative.

### Query Cycle Viewer and Pattern Map

- Each ring/event opens its query, response, timestamp and cycle history.
- Graph nodes and edges represent actual records or clearly defined aggregates.
- Selection opens the source records; filtering, zoom, bounded rotation and reset work.
- Provide a chronological list/table alternative. Do not fill the scene with random decorative nodes.

### Process Replay

- Support play, pause, scrub, speed selection, event selection and reset.
- Derive positions and labels from persisted historical events at the selected time.
- Clearly identify historical replay and allow return to the current view.
- Replay must never mutate application records or generate workflow events.

Every movement must support navigation, explain a state/change or replay history. Avoid constant spinning, distracting idle motion, uncontrolled camera movement and animation that blocks normal work.

Use instancing/level of detail when useful, cap device pixel ratio and pause inactive scenes. Target smooth interaction on ordinary office hardware. Respect reduced motion; handle WebGL failure/context loss with a functional 2D board/table. Both presentations use the same data and actions.

## 12. Dashboard and analytics

Compute all values from authorized persisted records under the current filters. Define Circulated, Active, CA, AT, Completed and Returned populations explicitly. Label CA/AT cards to make clear whether they count active or all circulated records, and reconcile the displayed totals.

Implement department distribution, aging bands, configured TAT health, separate CA/AT turnaround comparisons, repeat-query analysis, category patterns, recent movements and bottleneck indicators. Show freshness, observation period, sample size and missing-data limitations.

Every metric and chart must drill down to its supporting records. Use exact chart values and accessible tables; do not use 3D perspective to distort comparisons. Queue size alone is not proof of poor performance or causation.

Empty datasets must show zero or Not available as appropriate, with useful next actions. Preserve the reference's panel layout instead of fabricating values to fill it.

## 13. Intelligence without fabricated AI

Keep the reference intelligence panels and styling, but implement truthful local capabilities:

- **Pre-Flight Review:** validate required fields, exposure arithmetic and known consistency rules. Document completeness depends on a configured checklist; otherwise show Checklist TBC.
- **Amendment X-Ray:** compute field changes, exposure changes, document version changes and query-linked responses from stored versions.
- **Query Response Assistant:** organize actual queries and provide an editable response structure from permitted information. Never invent customer facts or automatically send/resolve responses.
- **Next Best Actions:** derive permitted next steps from workflow state and outstanding tasks.
- **Executive Brief:** generate a deterministic, source-linked narrative from computed metrics and records.
- **Command bar:** implement local parsing for commands such as Show active ATs, Show applications pending with Risk, Find [CRO80 reference] and Show requests returned more than once. Explain unsupported queries.

Label rule-based outputs as rule-based rather than AI-generated. Keep the reference's forecast panel footprint, but show a properly labelled rule-based attention list only where configured rules support it. If no rules or validated model exist, show Forecast unavailable with a concise reason. Never fabricate confidence percentages or predictions.

An optional future AI adapter must run server-side, remain disabled until configured and never be required for the local website. No external document transmission by default, credit decisions, automatic approvals/rejections, policy invention or autonomous changes to authoritative records.

## 14. Context panels and accessibility

Implement application quick view, Time Lens, exposure breakdown, query composer, amendment comparison, document preview, audit-event detail and external-milestone recording.

Use side drawers for rich detail and modals for focused confirmation. Support keyboard navigation, visible focus, correct dialog semantics, focus trapping/restoration, Escape-to-close and readable contrast.

Use short, purposeful transitions for selected cards, station focus, orb updates and timeline details. Do not steal focus or shift content while it is being read. Keep labels readable throughout motion.

## 15. Data integrity and audit

Define typed entities for applications, facilities, exposure snapshots, users/capabilities, assignments, workflow events, stage intervals, queries/responses, review cycles, approval cycles, external milestone records, document versions, comments, notifications, configuration versions and audit events.

Every material mutation creates an audit event with event ID, application ID where applicable, authenticated actor, timestamp, action, previous/new values, reason and cycle/configuration references.

Keep stage, ownership, history and notifications synchronized through transactions. The audit trail is append-only through application endpoints and UI. Do not describe a locally administered SQLite file as tamper-proof.

## 16. Configuration

Provide working validated screens for TAT profiles, calendars, warning/escalation rules, routing matrices, notification preferences, subtype mappings, document checklists, local accounts, capabilities and assignment scopes.

Version and audit changes. Show unconfirmed settings as TBC or Not configured, and distinguish saved draft settings from active settings. Do not activate invented policies automatically.

## 17. Implementation sequence

1. Inspect workspace and references; establish the visual checklist.
2. Set up local database, migrations, authentication and domain entities.
3. Implement authorization, workflow transitions, persistence and auditing.
4. Build the reference-matched shell, application forms and operational pages.
5. Complete query/resubmission flows, task queues and document handling.
6. Implement configuration, TAT calculations and reconciled analytics.
7. Build the Credit Passport and its functional exposure/query components.
8. Build the 3D Control Tower and Credit Intelligence scenes.
9. Connect every interaction, intelligence panel and replay control.
10. Run functional tests, inspect browser screenshots against each image and refine.

Maintain a working application throughout. Complete both the operational functionality and the reference-matched 3D design.

## 18. Acceptance tests

Verify and report:

- Local install/start/build works without cloud credentials.
- Normal startup contains no fabricated business records or sample-data badges.
- Accounts, records, files and configuration survive refresh and server restart.
- Login/logout, server authorization and direct endpoint access controls work.
- Creating/editing CA and AT requests works through the shared workflow.
- Exposure arithmetic and currency precision are correct.
- Missing routing/TAT/checklist configuration produces the appropriate explicit state.
- Queries require reasons, notify the initiating RM and populate the correct queue.
- Responding/resubmitting preserves history and opens the applicable new cycle.
- Approval Authority queries pass through Risk.
- CAD restricted content is inaccessible before approval, including through indirect routes.
- Invalid transitions, stale edits and duplicate submissions are handled.
- Authorized external milestones record supporting references and audit events.
- Documents upload/download/version correctly and respect permissions.
- Dashboard totals, chart drill-downs, station counts and 3D markers reconcile.
- Marker movement follows saved events; replay is read-only.
- Searches, filters, tabs, menus, drawers and graph controls work.
- Reduced motion, keyboard access and WebGL fallback work.
- The three signature screens have been screenshot-compared to the references.
- No clipped labels, broken assets, unusable overlays or runtime errors remain.
- Type checking, build and meaningful automated workflow/permission tests pass.

Use separate test fixtures to exercise all stages and visual states, including empty records, repeated queries, signatures pending with RM, completion and missing configuration. Keep test data isolated from the normal database. Report unverified items explicitly.

## 19. Final handover

Deliver the implemented local website, exact installation and start commands, verified localhost URL, concise README, first-run account setup instructions, database migrations, backup/restore instructions, operating walkthrough, architecture notes, requirements/TBC register, test results and remaining visual/functional limitations.

Include an environment example with placeholders only where needed. Explain how to reopen the workspace and start the website from Visual Studio Code. Keep it local; do not deploy or imply that local completion constitutes approval for use with confidential bank data.

Begin implementation now and continue until the complete local website has been built and verified against the attached images.
