/**
 * Populates an isolated fixtures database (prisma/fixtures.db) for manual
 * visual verification and demoing every stage/substage of the workflow —
 * including empty-record filters, repeated queries, signatures pending with
 * the RM, completion, and deliberately-missing configuration (TAT profiles,
 * routing matrix and document checklists are left unconfigured on purpose,
 * so their TBC states can be verified too).
 *
 * This NEVER touches prisma/dev.db (the real local database) and must be
 * run explicitly with `npm run seed:test`. It is safe to re-run: it always
 * resets the fixtures database first.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { existsSync, unlinkSync } from "node:fs";

const dbPath = path.resolve(__dirname, "fixtures.db");
const databaseUrl = "file:./fixtures.db";

if (existsSync(dbPath)) unlinkSync(dbPath);
execSync("npx prisma db push --skip-generate --accept-data-loss --force-reset", {
  cwd: path.resolve(__dirname, ".."),
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
});

process.env.DATABASE_URL = databaseUrl;
process.env.DOCUMENTS_ROOT = "./var/test-documents";

async function main() {
  // Imported after DATABASE_URL is set so the Prisma client singleton binds
  // to the fixtures database, not whatever is in the developer's .env.
  const { prisma } = await import("../src/lib/prisma");
  const { hashPassword } = await import("../src/lib/auth");
  const { createApplication } = await import("../src/lib/applications");
  const {
    riskReturnQuery,
    rmResubmit,
    riskClear,
    approvalQuery,
    recordExternalApproval,
    sendToCad,
    cadClear,
    recordExternalExecution,
    completeApplication,
  } = await import("../src/lib/workflow");
  const { respondToQuery } = await import("../src/lib/queries");

  console.log("Seeding fixtures database at", databaseUrl);

  async function makeUser(email: string, name: string, roles: string[], capabilities: string[]) {
    const user = await prisma.user.create({
      data: { email, name, passwordHash: await hashPassword("Fixture-Pass-123!") },
    });
    for (const role of roles) await prisma.userRoleAssignment.create({ data: { userId: user.id, role } });
    for (const capability of capabilities) await prisma.userCapability.create({ data: { userId: user.id, capability } });
    return { ...user, roles, capabilities };
  }

  const admin = await makeUser("admin@fixtures.local", "Fixture Administrator", ["AUTHORIZED_ADMINISTRATOR"], [
    "MANAGE_USERS", "MANAGE_CONFIG", "VIEW_AUDIT_TRAIL", "VIEW_APPLICATIONS", "VIEW_ANALYTICS",
  ]);
  const rm = await makeUser("rm@fixtures.local", "Fatima Al-Rashid (RM)", ["RM", "CORPORATE_FINANCE"], [
    "VIEW_APPLICATIONS", "CREATE_APPLICATION", "EDIT_OWN_APPLICATION",
  ]);
  const risk = await makeUser("risk@fixtures.local", "Yousif Al-Sayed (Risk)", ["CREDIT_REVIEW"], [
    "VIEW_APPLICATIONS", "RISK_REVIEW_ACTIONS", "VIEW_ANALYTICS",
  ]);
  const approval = await makeUser("approval@fixtures.local", "Mariam Khalil (Approval Authority)", ["APPROVAL_AUTHORITY"], [
    "VIEW_APPLICATIONS", "APPROVAL_AUTHORITY_ACTIONS", "RECORD_EXTERNAL_APPROVAL",
  ]);
  const cad = await makeUser("cad@fixtures.local", "Ahmed Buali (CAD)", ["CAD"], [
    "VIEW_APPLICATIONS", "CAD_ACTIONS",
  ]);
  const ops = await makeUser("ops@fixtures.local", "Noor Isa (Operations)", ["OPERATIONS"], [
    "VIEW_APPLICATIONS", "RECORD_EXTERNAL_EXECUTION", "OPERATIONS_ACTIONS",
  ]);
  const executive = await makeUser("executive@fixtures.local", "Layla Hassan (CRO)", ["CRO", "SENIOR_MANAGEMENT"], [
    "VIEW_APPLICATIONS", "VIEW_ANALYTICS", "VIEW_AUDIT_TRAIL",
  ]);
  void admin; void executive;

  let seq = 1;
  async function nextRef(type: "CA" | "AT") {
    const ref = `CRO80-${type}-2026-${String(seq).padStart(4, "0")}`;
    seq += 1;
    return ref;
  }

  // 1. Freshly submitted CA, sitting with Risk.
  await createApplication(toAuthUser(rm), {
    croReference: await nextRef("CA"),
    requestType: "CA",
    subtype: "ANNUAL_REVIEW",
    customerName: "Gulf Trading Co W.L.L.",
    customerType: "CORPORATE",
    sector: "General Trading",
    currency: "BHD",
    totalGroupExposure: "2400000",
    relatedPartyExposure: "150000",
    facilities: [{ name: "Overdraft", amount: "500000" }],
  });

  // 2. AT with an open Risk query, pending with the RM.
  const b = await createApplication(toAuthUser(rm), {
    croReference: await nextRef("AT"),
    requestType: "AT",
    subtype: "TEMP_EXCESS",
    customerName: "Manama Steel Industries",
    customerType: "CORPORATE",
    sector: "Manufacturing",
    currency: "BHD",
    totalGroupExposure: "5200000",
    relatedPartyExposure: "0",
    facilities: [],
  });
  await riskReturnQuery({
    applicationId: b.id,
    actor: toAuthUser(risk),
    expectedVersion: b.version,
    reason: "Please confirm the requested temporary excess amount against the latest facility letter.",
  });

  // 3. CA resubmitted after a query — first review cycle closed, second open.
  const c = await createApplication(toAuthUser(rm), {
    croReference: await nextRef("CA"),
    requestType: "CA",
    subtype: "RESTRUCTURING",
    customerName: "Al Khalifa Contracting",
    customerType: "CORPORATE",
    sector: "Construction",
    currency: "USD",
    totalGroupExposure: "3100000",
    relatedPartyExposure: "220000",
    facilities: [],
  });
  let cCurrent = await riskReturnQuery({
    applicationId: c.id, actor: toAuthUser(risk), expectedVersion: c.version, reason: "Restructuring rationale required.",
  });
  const cQuery = await prisma.query.findFirst({ where: { applicationId: c.id, status: "OPEN" } });
  await respondToQuery(toAuthUser(rm), cQuery!.id, "Rationale attached — cash flow mismatch during project handover.");
  cCurrent = await rmResubmit({ applicationId: c.id, actor: toAuthUser(rm), expectedVersion: cCurrent.version });

  // 4. Same application returned a SECOND time — demonstrates repeat-query analytics.
  cCurrent = await riskReturnQuery({
    applicationId: c.id, actor: toAuthUser(risk), expectedVersion: cCurrent.version, reason: "Second query — please also confirm collateral valuation date.",
  });
  const cQuery2 = await prisma.query.findFirst({ where: { applicationId: c.id, status: "OPEN" } });
  await respondToQuery(toAuthUser(rm), cQuery2!.id, "Valuation dated within the last 90 days — report attached.");
  await rmResubmit({ applicationId: c.id, actor: toAuthUser(rm), expectedVersion: cCurrent.version });

  // 5. Cleared by Risk, pending with Approval Authority.
  const d = await createApplication(toAuthUser(rm), {
    croReference: await nextRef("CA"),
    requestType: "CA",
    subtype: "WAIVER",
    customerName: "Bahrain Logistics Group",
    customerType: "CORPORATE",
    currency: "BHD",
    totalGroupExposure: "8400000",
    relatedPartyExposure: "1100000",
    facilities: [],
  });
  await riskClear({ applicationId: d.id, actor: toAuthUser(risk), expectedVersion: d.version });

  // 6. Approval Authority query in progress (coordinated through Risk).
  const e = await createApplication(toAuthUser(rm), {
    croReference: await nextRef("AT"),
    requestType: "AT",
    subtype: "OTHER",
    customerName: "Seef Retail Holdings",
    customerType: "CORPORATE",
    currency: "BHD",
    totalGroupExposure: "1800000",
    relatedPartyExposure: "0",
    facilities: [],
  });
  const eAfterClear = await riskClear({ applicationId: e.id, actor: toAuthUser(risk), expectedVersion: e.version });
  await approvalQuery({
    applicationId: e.id, actor: toAuthUser(approval), expectedVersion: eAfterClear.version, reason: "Confirm facility currency matches the approval pack.",
  });
  const eQuery = await prisma.query.findFirst({ where: { applicationId: e.id, status: "OPEN" } });
  await respondToQuery(toAuthUser(risk), eQuery!.id, "Confirmed — BHD throughout, agreed with RM.");

  // 7. Awaiting customer signatures — action pending with the RM even though
  //    the application "station" is CAD, demonstrating stage vs action-owner.
  const f = await createApplication(toAuthUser(rm), {
    croReference: await nextRef("CA"),
    requestType: "CA",
    subtype: "ANNUAL_REVIEW",
    customerName: "Riffa Views Development",
    customerType: "CORPORATE",
    currency: "BHD",
    totalGroupExposure: "6000000",
    relatedPartyExposure: "0",
    facilities: [],
  });
  let fCurrent = await riskClear({ applicationId: f.id, actor: toAuthUser(risk), expectedVersion: f.version });
  fCurrent = await recordExternalApproval({
    applicationId: f.id, actor: toAuthUser(approval), expectedVersion: fCurrent.version, supportingReference: "CBB-APP-2026-0091",
  });
  void fCurrent;

  // 8. In CAD final review.
  const g = await createApplication(toAuthUser(rm), {
    croReference: await nextRef("AT"),
    requestType: "AT",
    subtype: "RESCHEDULING",
    customerName: "Muharraq Fisheries Co-op",
    customerType: "SME",
    currency: "BHD",
    totalGroupExposure: "420000",
    relatedPartyExposure: "0",
    facilities: [],
  });
  let gCurrent = await riskClear({ applicationId: g.id, actor: toAuthUser(risk), expectedVersion: g.version });
  gCurrent = await recordExternalApproval({ applicationId: g.id, actor: toAuthUser(approval), expectedVersion: gCurrent.version, supportingReference: "CBB-APP-2026-0092" });
  gCurrent = await sendToCad({ applicationId: g.id, actor: toAuthUser(rm), expectedVersion: gCurrent.version });
  void gCurrent;

  // 9. Sent to Operations, awaiting execution.
  const h = await createApplication(toAuthUser(rm), {
    croReference: await nextRef("CA"),
    requestType: "CA",
    subtype: "OTHER",
    customerName: "Sitra Petrochemical Services",
    customerType: "CORPORATE",
    currency: "USD",
    totalGroupExposure: "12500000",
    relatedPartyExposure: "300000",
    facilities: [],
  });
  let hCurrent = await riskClear({ applicationId: h.id, actor: toAuthUser(risk), expectedVersion: h.version });
  hCurrent = await recordExternalApproval({ applicationId: h.id, actor: toAuthUser(approval), expectedVersion: hCurrent.version, supportingReference: "CBB-APP-2026-0093" });
  hCurrent = await sendToCad({ applicationId: h.id, actor: toAuthUser(rm), expectedVersion: hCurrent.version });
  hCurrent = await cadClear({ applicationId: h.id, actor: toAuthUser(cad), expectedVersion: hCurrent.version });
  void hCurrent;

  // 10. Fully completed.
  const i = await createApplication(toAuthUser(rm), {
    croReference: await nextRef("AT"),
    requestType: "AT",
    subtype: "ANNUAL_REVIEW",
    customerName: "Hamad Town Auto Parts",
    customerType: "SME",
    currency: "BHD",
    totalGroupExposure: "260000",
    relatedPartyExposure: "0",
    facilities: [],
  });
  let iCurrent = await riskClear({ applicationId: i.id, actor: toAuthUser(risk), expectedVersion: i.version });
  iCurrent = await recordExternalApproval({ applicationId: i.id, actor: toAuthUser(approval), expectedVersion: iCurrent.version, supportingReference: "CBB-APP-2026-0094" });
  iCurrent = await sendToCad({ applicationId: i.id, actor: toAuthUser(rm), expectedVersion: iCurrent.version });
  iCurrent = await cadClear({ applicationId: i.id, actor: toAuthUser(cad), expectedVersion: iCurrent.version });
  iCurrent = await recordExternalExecution({ applicationId: i.id, actor: toAuthUser(ops), expectedVersion: iCurrent.version, supportingReference: "SETTLE-2026-0044" });
  await completeApplication({ applicationId: i.id, actor: toAuthUser(ops), expectedVersion: iCurrent.version });

  console.log(`Seeded ${seq - 1} applications across every stage/substage, plus 6 users.`);
  console.log("Sign in with any of: rm@fixtures.local / risk@fixtures.local / approval@fixtures.local /");
  console.log("cad@fixtures.local / ops@fixtures.local / admin@fixtures.local — password: Fixture-Pass-123!");
  console.log("Note: TAT profiles, the routing matrix and document checklists are intentionally left");
  console.log("unconfigured in this fixtures database, to verify the TBC states.");

  await prisma.$disconnect();
}

// Reconstructs the AuthenticatedUser shape the workflow/application
// functions expect, from the {user, roles, capabilities} bundle makeUser
// returns, rather than going through a real login.
function toAuthUser(user: { id: string; email: string; name: string; roles: string[]; capabilities: string[] }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: true,
    roles: user.roles,
    capabilities: user.capabilities,
  } as never;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
