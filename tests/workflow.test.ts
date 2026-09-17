import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createApplication } from "@/lib/applications";
import {
  approvalQuery,
  cadClear,
  completeApplication,
  recordExternalApproval,
  recordExternalExecution,
  riskClear,
  riskRespondToApproval,
  riskReturnQuery,
  rmResubmit,
  sendToCad,
  StaleEditError,
  WorkflowError,
} from "@/lib/workflow";
import { respondToQuery } from "@/lib/queries";
import type { AuthenticatedUser } from "@/lib/auth";
import { CAPABILITIES, type Capability } from "@/lib/domain/enums";

async function makeActor(email: string): Promise<AuthenticatedUser> {
  const user = await prisma.user.create({
    data: { email, name: "Test Actor", passwordHash: "x" },
  });
  for (const role of ["RM", "CREDIT_REVIEW", "APPROVAL_AUTHORITY", "CAD", "OPERATIONS"] as const) {
    await prisma.userRoleAssignment.create({ data: { userId: user.id, role } });
  }
  for (const capability of CAPABILITIES) {
    await prisma.userCapability.create({ data: { userId: user.id, capability } });
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: true,
    roles: ["RM", "CREDIT_REVIEW", "APPROVAL_AUTHORITY", "CAD", "OPERATIONS"],
    capabilities: [...CAPABILITIES] as Capability[],
  };
}

describe("shared CA/AT workflow engine — the full 17-step lifecycle", () => {
  let actor: AuthenticatedUser;

  beforeAll(async () => {
    actor = await makeActor("workflow-test@example.com");
  });

  it("takes an application from submission through a Risk query cycle to completion", async () => {
    const app = await createApplication(actor, {
      croReference: "CRO80-CA-TEST-0001",
      requestType: "CA",
      subtype: "ANNUAL_REVIEW",
      customerName: "Test Trading Co",
      customerType: "CORPORATE",
      currency: "BHD",
      totalGroupExposure: "1000000",
      relatedPartyExposure: "0",
      facilities: [],
    });

    expect(app.currentDepartment).toBe("CREDIT_REVIEW");
    expect(app.substage).toBe("SUBMITTED");
    expect(app.approvalRoutingExposureMinor.toString()).toBe("1000000000");

    // Step 3: Risk returns a query to the RM.
    let current = await riskReturnQuery({
      applicationId: app.id,
      actor,
      expectedVersion: app.version,
      reason: "Please clarify related-party exposure.",
    });
    expect(current.substage).toBe("QUERY_RETURNED_TO_RM");
    expect(current.actionOwnerId).toBe(actor.id);

    const notifications = await prisma.notification.findMany({ where: { applicationId: app.id } });
    expect(notifications.some((n) => n.type === "QUERY_RETURNED")).toBe(true);

    // Cannot resubmit before responding.
    await expect(
      rmResubmit({ applicationId: app.id, actor, expectedVersion: current.version })
    ).rejects.toThrow(WorkflowError);

    const openQuery = await prisma.query.findFirst({ where: { applicationId: app.id, status: "OPEN" } });
    await respondToQuery(actor, openQuery!.id, "Related-party exposure confirmed at zero.");

    // Step 4-5: RM resubmits — this opens review cycle #2 while cycle #1 is preserved.
    current = await rmResubmit({ applicationId: app.id, actor, expectedVersion: current.version });
    expect(current.substage).toBe("RESUBMITTED");

    const cycles = await prisma.reviewCycle.findMany({ where: { applicationId: app.id }, orderBy: { cycleNumber: "asc" } });
    expect(cycles).toHaveLength(2);
    expect(cycles[0].outcome).toBe("RETURNED"); // closed out by resubmission, not overwritten
    expect(cycles[1].outcome).toBeNull(); // the new cycle Risk is now reviewing

    // Stale-edit protection: acting on an old version must fail, not silently overwrite.
    await expect(
      riskClear({ applicationId: app.id, actor, expectedVersion: current.version - 1 })
    ).rejects.toThrow(StaleEditError);

    // Step 6-7: Risk clears, forwarding to Approval Authority.
    current = await riskClear({ applicationId: app.id, actor, expectedVersion: current.version });
    expect(current.currentDepartment).toBe("APPROVAL_AUTHORITY");

    // Step 8-9: Approval Authority queries via Risk, Risk responds.
    current = await approvalQuery({
      applicationId: app.id,
      actor,
      expectedVersion: current.version,
      reason: "Confirm facility currency.",
    });
    expect(current.substage).toBe("APPROVAL_QUERY_VIA_RISK");
    expect(current.actionOwnerDept).toBe("CREDIT_REVIEW");

    current = await riskRespondToApproval({
      applicationId: app.id,
      actor,
      expectedVersion: current.version,
      notes: "Confirmed — BHD throughout.",
    });
    expect(current.substage).toBe("PENDING_APPROVAL");

    // Step 10-11: External approval recorded, moves to CAD with RM owning signatures.
    current = await recordExternalApproval({
      applicationId: app.id,
      actor,
      expectedVersion: current.version,
      supportingReference: "APPROVAL-REF-001",
    });
    expect(current.currentDepartment).toBe("CAD");
    expect(current.substage).toBe("AWAITING_SIGNATURES");
    expect(current.actionOwnerDept).toBe("CORPORATE_FINANCE");

    // Step 13: RM sends documentation to CAD.
    current = await sendToCad({ applicationId: app.id, actor, expectedVersion: current.version });
    expect(current.substage).toBe("CAD_REVIEW");

    // Step 14-15: CAD clears, forwarding to Operations.
    current = await cadClear({ applicationId: app.id, actor, expectedVersion: current.version });
    expect(current.currentDepartment).toBe("OPERATIONS");

    // Step 16: External execution recorded.
    current = await recordExternalExecution({
      applicationId: app.id,
      actor,
      expectedVersion: current.version,
      supportingReference: "EXECUTION-REF-001",
    });
    expect(current.substage).toBe("EXTERNAL_EXECUTION_RECORDED");

    // Step 17: Completed.
    current = await completeApplication({ applicationId: app.id, actor, expectedVersion: current.version });
    expect(current.currentDepartment).toBe("COMPLETED");
    expect(current.completedAt).not.toBeNull();

    // The full history must be intact: one WorkflowEvent per transition —
    // SUBMIT plus the 10 subsequent transitions exercised above — and
    // matching audit events, with no gaps introduced by the query cycle.
    const events = await prisma.workflowEvent.findMany({ where: { applicationId: app.id } });
    expect(events.length).toBe(11);

    const auditEvents = await prisma.auditEvent.findMany({ where: { applicationId: app.id } });
    expect(auditEvents.length).toBeGreaterThanOrEqual(events.length);

    const intervals = await prisma.stageInterval.findMany({ where: { applicationId: app.id } });
    const openIntervals = intervals.filter((i) => i.endedAt === null);
    expect(openIntervals).toHaveLength(0); // completion must close every interval
  });

  it("rejects an illegal transition (skipping stages)", async () => {
    const app = await createApplication(actor, {
      croReference: "CRO80-AT-TEST-0002",
      requestType: "AT",
      subtype: "WAIVER",
      customerName: "Skip Stage Co",
      customerType: "SME",
      currency: "USD",
      totalGroupExposure: "500",
      relatedPartyExposure: "0",
      facilities: [],
    });

    // Cannot record external approval while sitting in Credit Review.
    await expect(
      recordExternalApproval({
        applicationId: app.id,
        actor,
        expectedVersion: app.version,
        supportingReference: "SHOULD-FAIL",
      })
    ).rejects.toThrow(WorkflowError);
  });

  it("requires a reason to return a query", async () => {
    const app = await createApplication(actor, {
      croReference: "CRO80-CA-TEST-0003",
      requestType: "CA",
      subtype: "OTHER",
      customerName: "No Reason Co",
      customerType: "SME",
      currency: "USD",
      totalGroupExposure: "100",
      relatedPartyExposure: "0",
      facilities: [],
    });

    await expect(
      riskReturnQuery({ applicationId: app.id, actor, expectedVersion: app.version, reason: "" })
    ).rejects.toThrow(WorkflowError);
  });
});
