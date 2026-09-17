# BisB Credit Command

Credit Applications & Availment Tickets — Workflow Intelligence.

A local-only web application for tracking **CA** (Credit Application) and **AT** (Availment Ticket)
requests through a shared five-department workflow — Corporate Finance, Credit Review, Approval
Authority, CAD and Operations — with a persistent SQLite database, real authentication and
authorization, an auditable workflow engine, and three interactive 3D scenes (Credit Journey,
Exposure Orb, Application Flow & Bottlenecks) backed by live data.

This application runs entirely on your machine. It does not deploy, does not call out to any
cloud service, and does not require internet access once dependencies are installed.

## 1. Quick start

```bash
npm install
npm run db:migrate      # creates prisma/dev.db and applies the schema (first run only)
npm run dev
```

Open **http://localhost:3000**. Because no accounts exist yet, you will land on `/setup` to create
the first **Authorized Administrator** account. From there, sign in and use
**Configuration → Users & Capabilities** to create the rest of your users (RM, Risk, Approval
Authority, CAD, Operations, executives) and grant each one the specific roles/capabilities they
need — there is no role-switcher or demo login; every account is a real, password-protected user.

The server binds to `localhost` only (the loopback interface) — it is not reachable from other
machines on your network by default.

### Seeing every workflow state at once

The empty database above is intentional — a normal first run has no fabricated business records.
To explore every stage/substage, repeated-query cycles, and the "not configured" TBC states
without touching your real database, run:

```bash
npm run seed:test
```

This creates a **separate** file, `prisma/fixtures.db`, with six users (one per department, plus
an administrator) and nine applications spanning every stage of the workflow. It never writes to
`prisma/dev.db`. To use it, point `DATABASE_URL` at it temporarily:

```bash
DATABASE_URL="file:./fixtures.db" npm run dev
```

(on Windows PowerShell: `$env:DATABASE_URL="file:./fixtures.db"; npm run dev`)

All fixture accounts share the password `Fixture-Pass-123!` — see the script's console output for
the exact list of emails. Re-running `npm run seed:test` always resets `fixtures.db` from scratch.

## 2. Requirements

- Node.js 20+ (tested on Node 24)
- No external database, credentials, or network access needed for core functionality

## 3. Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local dev server at `http://localhost:3000` |
| `npm run build` | Production build (also used to verify the app compiles cleanly) |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Runs the automated test suite (Vitest) against an isolated, disposable test database |
| `npm run db:migrate` | Create/update `prisma/dev.db` from `prisma/schema.prisma` |
| `npm run db:studio` | Opens Prisma Studio, a local GUI for inspecting `prisma/dev.db` |
| `npm run seed:test` | Populates `prisma/fixtures.db` with fixtures covering every workflow stage |

## 4. Reopening this workspace in VS Code

1. Open the `CAworkFlow` folder in VS Code.
2. Open a terminal (`` Ctrl+` ``) and run `npm install` if `node_modules` isn't present.
3. Run `npm run dev`.
4. Open `http://localhost:3000` in your browser (VS Code will usually also show a "port forwarded"
   notification with an Open Browser button).

## 5. Architecture

```
src/
  app/                     Next.js App Router pages and API routes
    api/                   Server-only route handlers (auth, applications, workflow
                            actions, documents, config, admin, analytics, audit)
    dashboard/             Executive Control Tower (KPI cards + Credit Journey 3D scene)
    applications/          List, create, and Credit Passport (application detail) pages
    my-work/               Department queue / "My Work"
    intelligence/          Credit Intelligence (dark theme, Application Flow 3D scene)
    audit/                 Global audit trail
    configuration/         Versioned configuration screens + user/capability admin
    help/                  Requirements & TBC register (human-readable)
  components/
    shell/                 Sidebar, header, authenticated app shell
    three/                 Shared 3D scene infrastructure (SceneFrame, WebGL fallback,
                            reduced-motion handling) plus the Credit Journey and
                            Exposure Orb scenes
    credit-passport/       Journey timeline, query cycle viewer, document vault,
                            workflow action buttons
    intelligence/          Process Replay and Query Pattern Map widgets
    configuration/         Generic versioned-config panel + one form per config type
    ui/                    Small shared primitives (badges, KPI cards, command input)
  lib/
    domain/enums.ts        The single source of truth for every fixed vocabulary
                            (departments, substages, roles, capabilities, …)
    prisma.ts              Prisma client singleton
    auth.ts, authz.ts       Session/password handling; document & application
                            visibility rules
    workflow.ts             The state machine — one function per legal transition,
                            each fully transactional and audited
    applications.ts         Application creation and exposure amendment
    money.ts                Currency-precision-aware integer minor-unit arithmetic
    tat.ts, routing.ts       TAT evaluation and approval-routing resolution, both with
                            explicit "not configured" states
    analytics.ts, executive-brief.ts, next-best-actions.ts, command-bar.ts
                            Dashboard/Intelligence data, all computed from persisted
                            records, plus the rule-based command parser
    documents.ts            Local, checksum-versioned file storage
    config.ts                Versioned configuration (draft → active → superseded)
    audit.ts                 The single writer for the append-only audit trail
prisma/
  schema.prisma            Full data model (SQLite)
  migrations/               Migration history
  seed-test.ts              Isolated test-fixture generator (see above)
tests/
  *.test.ts                 Vitest unit + integration tests (money arithmetic, the
                            rule-based command parser, and the full 17-step workflow
                            lifecycle against a real, disposable SQLite database)
var/
  documents/                 Private document storage for prisma/dev.db (never served
                            statically — only through the authorized download route)
  test-documents/            Same, for fixtures.db / the test suite
```

### Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 5 + SQLite · React Three Fiber /
Three.js (3D scenes) · Recharts (charts) · Zod (validation) · bcryptjs (password hashing) ·
Vitest (tests).

Next.js was deliberately pinned to the stable 15.x line rather than the 16.x preview that
`create-next-app` initially resolved, and Prisma to 5.x rather to an unreleased 8.0 release
candidate, since both had undocumented breaking changes unsuitable for a project this size.
Recharts and vitest were likewise pinned to their latest stable major (v2 and v2 respectively)
over newer majors with unfamiliar APIs. These are ordinary "adapt to a suitable stack" engineering
calls, not scope reductions.

### Data model highlights

- **Money** is stored as integer minor units (`BigInt`) with an explicit currency code — never as
  floating point, and never combined across currencies (`src/lib/money.ts`). **Approval-Routing
  Exposure = Total Group Exposure + Related-Party Exposure** is implemented in exactly one place.
- **Workflow** state is `(currentDepartment, substage, actionOwnerId, actionOwnerDept)`, plus a
  `version` column used for optimistic concurrency — every mutating request must supply the
  version it read, or it is rejected as a stale edit rather than silently applied.
- **Every transition** (`src/lib/workflow.ts`) runs inside one Prisma transaction that updates the
  application, closes/opens `StageInterval` rows (used for stage-age and departmental-time
  metrics), creates/closes `ReviewCycle`/`ApprovalCycle`/`Query` rows as applicable, writes exactly
  one `WorkflowEvent` and one `AuditEvent`, and creates any required `Notification`.
- **Configuration** (`ConfigVersion`) is generic and versioned: a new version always starts as
  `DRAFT`; only an explicit "Activate" (requiring the `MANAGE_CONFIG` capability) promotes it to
  `ACTIVE` and supersedes whatever was active before. Nothing is auto-activated.
- **Authorization** is enforced in `src/lib/authz.ts` and re-checked on every API route — including
  direct document downloads — not just hidden in the UI. Document visibility rules match the
  confirmed requirements exactly (RM sees their own submission; Risk gets full documentation once
  routed to them; Approval Authority likewise; CAD only after final approval is recorded); anything
  the requirements mark as TBC defaults to the most restrictive interpretation.

## 6. First-run account setup

1. Visit the app; you'll be redirected to `/setup` because no users exist yet.
2. Create the Authorized Administrator account (name, email, password ≥ 10 characters).
3. Sign in, then go to **Configuration → Users & Capabilities** to create every other account and
   grant roles/capabilities. Note that the administrator does **not** automatically receive
   `VIEW_APPLICATIONS` or document access — configuration administration and credit-document access
   are deliberately separate, per the product requirements. Grant yourself `VIEW_APPLICATIONS` /
   `VIEW_ANALYTICS` explicitly if you want the administrator account to also browse records.

## 7. Backup and restore

The entire application state lives in two places:

- **Database**: `prisma/dev.db` (a single SQLite file).
- **Documents**: the `var/documents/` directory.

**Backup**: stop the server, then copy both `prisma/dev.db` and `var/documents/` somewhere safe.

**Restore**: stop the server, replace `prisma/dev.db` and `var/documents/` with your backup copies,
then `npm run dev` again.

There is no automatic backup schedule — this is a local development/evaluation deployment, not a
production banking system (see §10).

## 8. Requirements register

### Confirmed workflow requirements (implemented)

- CA = Credit Application, AT = Availment Ticket, sharing one workflow across five departments.
- RM/Corporate Finance creates and immediately submits; Risk may return a query to the RM
  (mandatory reason); RM responds and resubmits, opening a new review cycle while every prior
  cycle is preserved untouched.
- Risk clears to Approval Authority; Approval Authority queries are always coordinated **through
  Risk**, never sent directly to the RM.
- Final external approval and execution are **recorded** with a supporting reference — the system
  tracks these; it does not itself approve financing or execute transactions.
- RM obtains signatures and sends documentation to CAD; CAD performs final review before Operations.
- Document visibility: RM sees their own submission; Risk sees full documentation once routed to
  them; Approval Authority likewise; CAD only after final approval is recorded.

### Technical defaults applied

- Assignment scope beyond the department queue defaults to **Own** (most restrictive) until an
  administrator configures `Configuration → Assignment Scope`.
- Operations' document access defaults to none beyond tracking information, absent an explicit
  `VIEW_RESTRICTED_DOCUMENTS` grant.
- CRO80 references are entered/confirmed by the RM at creation (a "Suggest" button proposes the
  next sequential number for this local deployment only — there is no core-banking integration).

### TBC — awaiting confirmation (not invented)

- **Approval-routing matrix**: without an active `ROUTING_MATRIX` configuration, every application
  shows *"Approval authority TBC — routing matrix not configured"* instead of an inferred
  authority. The workflow still functions — applications can sit in and move through the Approval
  Authority queue — only the specific authority label is withheld.
- **TAT thresholds & business calendar**: without an active `TAT_PROFILE` (and calendar) for a
  stage/request type, that stage shows *"TAT not configured"* rather than a compliance verdict.
  Pause/resume semantics during queries and the exact start/end of "approval duration" are not
  defined and are called out as provisional in `src/lib/tat.ts`.
- **Document checklists**: Pre-Flight completeness shows *"Checklist TBC"* without an active
  `DOCUMENT_CHECKLIST` configuration for the relevant request type/subtype.
- **Reference uniqueness rules, currency conversion, cross-currency routing**: not implemented —
  the system explicitly refuses to combine exposures across currencies rather than guessing a rate.
- **Rejection, withdrawal, cancellation, reopening, delegation, exception-routing**: not
  implemented as workflow actions.
- Recording external approval/execution requires the `RECORD_EXTERNAL_APPROVAL` /
  `RECORD_EXTERNAL_EXECUTION` capability to be **explicitly** granted; denied by default.

### Future integrations (not prerequisites for local use)

- Email notifications, gated on an `EMAIL_PROVIDER` environment variable; shows *"Email not
  configured"* otherwise. In-app notifications work fully without it.
- An optional server-side AI adapter for the intelligence panels — disabled by default, never
  required, never given authority over credit decisions or authoritative records.
- Core-banking reference integration for CRO80 numbering.

## 9. Noted scope limitations

- **Query Cycle Viewer** and **Query Pattern Map** are implemented as interactive 2D
  visualizations rather than 3D scenes, to keep the three flagship 3D scenes (Credit Journey,
  Exposure Orb, Application Flow & Bottlenecks) solid and performant within the available time.
  Every 3D scene also has a genuine 2D/table fallback, reachable on demand via a toggle or
  automatically on WebGL failure/context loss — both presentations use the same data and actions.
- The 3D scenes are original, stylized geometry (stations, cubes, markers, an exposure orb) built
  to match the reference images' composition, layout, palette and materials — they are not
  photorealistic renders, since the reference concept art was AI-generated imagery rather than a
  licensed 3D asset pack. Camera framing, colors, and component placement were matched by hand;
  pixel-level comparison against the reference screenshots was not performed because no browser
  automation/screenshot tool was available in the build environment. **Please open the app and
  compare it against the three reference images yourself** and treat any remaining visual gaps as
  unverified until you do.
- No automated end-to-end (Playwright-style) browser tests were written, for the same reason — the
  test suite (`npm test`) covers the money/workflow/command-parsing logic layer with a real
  database, and the manual smoke test below covers the HTTP/API layer, but neither exercises the
  rendered browser UI automatically.

## 10. Manual verification performed

Run directly against the server (not simulated) during this build, using `curl` against a running
`npm run dev` instance with an empty database:

- ✅ Install → migrate → dev server starts cleanly; `npm run build` and `npm test` both pass.
- ✅ Fresh database has zero business records, zero users, and no sample-data badges anywhere in
  the UI; `/` redirects to `/setup`.
- ✅ One-time admin setup creates exactly one Authorized Administrator; a second `POST
  /api/auth/setup` after that is rejected with 409.
- ✅ Login/logout via real password hashing (bcrypt) and signed httpOnly session cookies.
- ✅ Creating a CA immediately submits it to Credit Review; Approval-Routing Exposure computed
  correctly (verified: 8,400,000 + 1,100,000 BHD → 9,500,000.000 BHD exactly, matching the
  reference image's example).
- ✅ Risk return-query → RM notification created → RM response → resubmit, opening a **new** review
  cycle while cycle 1 is preserved with outcome `RETURNED` (also covered by an automated test).
  Attempting to resubmit before responding, or to act on a stale `version`, is rejected.
- ✅ Document upload (RM) and authorized download (Risk, once routed to Credit Review) both work;
  a user with no relationship to the application (a CAD user, before approval) gets a 404 both
  through the application detail endpoint and the direct document-download endpoint — not just a
  hidden UI element.
- ✅ Configuration: `ROUTING_MATRIX` starts as `{active: null}` ("TBC"); creating a draft leaves it
  `DRAFT`; only an explicit "Activate" call promotes it, after which the application's routing
  resolution immediately reflects the configured tier.
- ✅ Every page route (`/dashboard`, `/applications`, `/applications/new`, `/my-work`,
  `/intelligence`, `/audit`, `/configuration`, `/help`, and an application's Credit Passport)
  returns HTTP 200 with no server-side errors in the dev server log.
- ✅ Dashboard/Intelligence analytics endpoints return real, computed figures (lifecycle counts,
  department distribution, bottleneck radar, executive brief with source references) and an
  honest `"TAT health … not available"` message when no TAT profile is configured, rather than a
  fabricated percentage.
- ✅ `npm run seed:test` populates the isolated `prisma/fixtures.db` without touching `dev.db`.

**Not verified**: pixel-level visual fidelity to the three reference images, and interactive
behavior of the 3D scenes in an actual browser (camera controls, hover tooltips, click-through) —
see §9. Please verify these yourself by running the app.

## 11. Local-use notice

This is a local development/evaluation build. It is **not** hardened, audited, or approved for use
with real confidential banking data. In particular: SQLite is a local, developer-administered
file, not a tamper-proof ledger (the audit trail is append-only through the application's own
endpoints, but the underlying file can be edited by anyone with filesystem access to the machine);
session cookies are marked `secure: false` for local HTTP use; and no penetration testing or
security review has been performed.
