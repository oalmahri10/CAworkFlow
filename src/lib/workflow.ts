import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";
import type { AuthenticatedUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import type { Department, WorkflowAction } from "@/lib/domain/enums";

/**
 * The shared CA/AT workflow engine. Every transition below corresponds to
 * exactly one numbered step in the product requirements' "Shared CA and AT
 * workflow" section. A transition is only ever applied via
 * `performWorkflowAction`, inside a single Prisma transaction that:
 *
 *   1. re-reads the application and checks the caller's `expectedVersion`
 *      against its current `version` (rejecting stale edits and duplicate
 *      submissions instead of silently overwriting concurrent changes),
 *   2. validates the action is legal from the application's current
 *      department/substage,
 *   3. validates the actor holds the required capability (and, for RM
 *      actions, is the actual initiating RM),
 *   4. applies the state change, closes/opens StageIntervals, creates or
 *      closes Query/ReviewCycle/ApprovalCycle rows, creates the
 *      notification(s) the requirements call for, and writes exactly one
 *      WorkflowEvent and one AuditEvent.
 *
 * Nothing here invents banking policy: routing-authority *identity* and TAT
 * compliance are looked up from configuration and rendered as TBC when
 * unconfigured, but that never blocks a transition the requirements say
 * must always be possible (e.g. recording a real external approval).
 */

export class WorkflowError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export class StaleEditError extends WorkflowError {
  constructor() {
    super(
      "This application has been updated since you loaded it. Refresh to see the latest version before retrying.",
      409
    );
  }
}

type Tx = Prisma.TransactionClient;

async function requireOpenInterval(tx: Tx, applicationId: string) {
  const interval = await tx.stageInterval.findFirst({
    where: { applicationId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!interval) {
    throw new WorkflowError("No open stage interval found for this application (data integrity issue).", 500);
  }
  return interval;
}

/** Ends the currently open StageInterval and opens a new one for `department`. */
async function moveDepartment(
  tx: Tx,
  applicationId: string,
  department: Department,
  substage: string,
  ownerUserId: string | null
) {
  const now = new Date();
  const current = await tx.stageInterval.findFirst({
    where: { applicationId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (current) {
    await tx.stageInterval.update({ where: { id: current.id }, data: { endedAt: now } });
  }
  await tx.stageInterval.create({
    data: {
      applicationId,
      department,
      stage: department,
      substage,
      ownerUserId: ownerUserId ?? undefined,
      startedAt: now,
    },
  });
}

/** Updates the substage on the currently open interval without moving department. */
async function updateSubstageInPlace(tx: Tx, applicationId: string, substage: string) {
  const current = await requireOpenInterval(tx, applicationId);
  await tx.stageInterval.update({ where: { id: current.id }, data: { substage } });
}

async function notify(
  tx: Tx,
  userId: string,
  applicationId: string,
  type: string,
  title: string,
  body: string
) {
  await tx.notification.create({
    data: { userId, applicationId, type, title, body },
  });
}

type ActionContext = {
  applicationId: string;
  actor: AuthenticatedUser;
  expectedVersion: number;
  reason?: string;
  supportingReference?: string;
  notes?: string;
};

async function loadForTransition(tx: Tx, applicationId: string) {
  const app = await tx.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new WorkflowError("Application not found.", 404);
  return app;
}

function checkVersion(app: { version: number }, expected: number) {
  if (app.version !== expected) throw new StaleEditError();
}

function requireCap(actor: AuthenticatedUser, capability: string, action: string) {
  if (!actor.capabilities.includes(capability as never)) {
    throw new WorkflowError(
      `Your account is not configured with the "${capability}" capability required to perform "${action}".`,
      403
    );
  }
}

// ---------------------------------------------------------------------------
// Step 3: Risk returns the request to the initiating RM with a mandatory
// query/reason. Ownership atomically moves to the RM in the same transaction
// that opens the query and notifies them.
// ---------------------------------------------------------------------------
export async function riskReturnQuery(ctx: ActionContext) {
  if (!ctx.reason || !ctx.reason.trim()) {
    throw new WorkflowError("A query reason is mandatory when returning a request to the RM.");
  }
  requireCap(ctx.actor, "RISK_REVIEW_ACTIONS", "Return to RM with query");

  return prisma.$transaction(async (tx) => {
    const app = await loadForTransition(tx, ctx.applicationId);
    checkVersion(app, ctx.expectedVersion);
    if (app.currentDepartment !== "CREDIT_REVIEW" || !["SUBMITTED", "IN_REVIEW", "RESUBMITTED"].includes(app.substage)) {
      throw new WorkflowError(`Cannot return a query from substage "${app.substage}".`);
    }

    let cycle = await tx.reviewCycle.findFirst({
      where: { applicationId: app.id, outcome: null },
      orderBy: { cycleNumber: "desc" },
    });
    if (!cycle) {
      const last = await tx.reviewCycle.findFirst({
        where: { applicationId: app.id },
        orderBy: { cycleNumber: "desc" },
      });
      cycle = await tx.reviewCycle.create({
        data: { applicationId: app.id, cycleNumber: (last?.cycleNumber ?? 0) + 1 },
      });
    }

    const query = await tx.query.create({
      data: {
        applicationId: app.id,
        source: "RISK",
        reason: ctx.reason!,
        authorId: ctx.actor.id,
        reviewCycleId: cycle.id,
      },
    });

    const updated = await tx.application.update({
      where: { id: app.id },
      data: {
        substage: "QUERY_RETURNED_TO_RM",
        actionOwnerId: app.initiatingRmId,
        actionOwnerDept: "CORPORATE_FINANCE",
        version: { increment: 1 },
      },
    });
    await updateSubstageInPlace(tx, app.id, "QUERY_RETURNED_TO_RM");

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "RISK_RETURN_QUERY",
        fromDept: app.currentDepartment,
        fromSubstage: app.substage,
        toDept: app.currentDepartment,
        toSubstage: "QUERY_RETURNED_TO_RM",
        actorId: ctx.actor.id,
        reason: ctx.reason,
        cycleRef: cycle.id,
      },
    });

    await notify(
      tx,
      app.initiatingRmId,
      app.id,
      "QUERY_RETURNED",
      `Query on ${app.croReference}`,
      ctx.reason!
    );

    await recordAuditEvent(
      {
        eventType: "WORKFLOW",
        applicationId: app.id,
        actorId: ctx.actor.id,
        action: "RISK_RETURN_QUERY",
        previousJson: { substage: app.substage },
        newJson: { substage: "QUERY_RETURNED_TO_RM", queryId: query.id },
        reason: ctx.reason,
        cycleRef: cycle.id,
      },
      tx
    );

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Steps 4–5: RM responds (via a QueryResponse, created separately) and
// resubmits. Resubmission opens a new review cycle and preserves the prior
// one untouched.
// ---------------------------------------------------------------------------
export async function rmResubmit(ctx: ActionContext) {
  return prisma.$transaction(async (tx) => {
    const app = await loadForTransition(tx, ctx.applicationId);
    checkVersion(app, ctx.expectedVersion);
    if (app.substage !== "QUERY_RETURNED_TO_RM") {
      throw new WorkflowError(`Cannot resubmit from substage "${app.substage}".`);
    }
    if (app.initiatingRmId !== ctx.actor.id) {
      throw new WorkflowError("Only the initiating RM may resubmit this application.", 403);
    }

    const openQuery = await tx.query.findFirst({
      where: { applicationId: app.id, status: { in: ["OPEN"] }, source: "RISK" },
      orderBy: { createdAt: "desc" },
      include: { responses: true },
    });
    if (!openQuery || openQuery.responses.length === 0) {
      throw new WorkflowError("Respond to the open Risk query before resubmitting.");
    }
    await tx.query.update({ where: { id: openQuery.id }, data: { status: "CLOSED" } });

    // Resubmission closes out the review cycle the query belonged to and
    // opens a fresh one for Risk to re-review — every prior cycle (and its
    // queries/responses/elapsed time) is preserved untouched.
    let newCycleId: string | undefined;
    if (openQuery.reviewCycleId) {
      const closedCycle = await tx.reviewCycle.update({
        where: { id: openQuery.reviewCycleId },
        data: { outcome: "RETURNED", endedAt: new Date() },
      });
      const newCycle = await tx.reviewCycle.create({
        data: { applicationId: app.id, cycleNumber: closedCycle.cycleNumber + 1 },
      });
      newCycleId = newCycle.id;
    }

    const updated = await tx.application.update({
      where: { id: app.id },
      data: {
        substage: "RESUBMITTED",
        actionOwnerId: null,
        actionOwnerDept: "CREDIT_REVIEW",
        version: { increment: 1 },
      },
    });
    await updateSubstageInPlace(tx, app.id, "RESUBMITTED");

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "RM_RESUBMIT",
        fromDept: app.currentDepartment,
        fromSubstage: app.substage,
        toDept: app.currentDepartment,
        toSubstage: "RESUBMITTED",
        actorId: ctx.actor.id,
        cycleRef: newCycleId ?? openQuery.reviewCycleId,
      },
    });

    await recordAuditEvent(
      {
        eventType: "WORKFLOW",
        applicationId: app.id,
        actorId: ctx.actor.id,
        action: "RM_RESUBMIT",
        previousJson: { substage: app.substage },
        newJson: { substage: "RESUBMITTED" },
      },
      tx
    );

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Step 6–7: Risk clears the request; it proceeds to the configured Approval
// Authority queue. Whether an authority tier is actually configured is
// surfaced separately via resolveApprovalAuthorityTier — it never blocks the
// transition itself.
// ---------------------------------------------------------------------------
export async function riskClear(ctx: ActionContext) {
  requireCap(ctx.actor, "RISK_REVIEW_ACTIONS", "Clear and forward to Approval Authority");

  return prisma.$transaction(async (tx) => {
    const app = await loadForTransition(tx, ctx.applicationId);
    checkVersion(app, ctx.expectedVersion);
    if (app.currentDepartment !== "CREDIT_REVIEW" || !["SUBMITTED", "IN_REVIEW", "RESUBMITTED"].includes(app.substage)) {
      throw new WorkflowError(`Cannot clear from substage "${app.substage}".`);
    }

    const openCycle = await tx.reviewCycle.findFirst({
      where: { applicationId: app.id, outcome: null },
      orderBy: { cycleNumber: "desc" },
    });
    if (openCycle) {
      await tx.reviewCycle.update({
        where: { id: openCycle.id },
        data: { outcome: "CLEARED", endedAt: new Date() },
      });
    }

    await moveDepartment(tx, app.id, "APPROVAL_AUTHORITY", "PENDING_APPROVAL", null);
    await tx.approvalCycle.create({
      data: {
        applicationId: app.id,
        cycleNumber: 1,
      },
    });

    const updated = await tx.application.update({
      where: { id: app.id },
      data: {
        currentDepartment: "APPROVAL_AUTHORITY",
        substage: "PENDING_APPROVAL",
        actionOwnerId: null,
        actionOwnerDept: "APPROVAL_AUTHORITY",
        version: { increment: 1 },
      },
    });

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "RISK_CLEAR",
        fromDept: "CREDIT_REVIEW",
        fromSubstage: app.substage,
        toDept: "APPROVAL_AUTHORITY",
        toSubstage: "PENDING_APPROVAL",
        actorId: ctx.actor.id,
        cycleRef: openCycle?.id,
      },
    });

    await recordAuditEvent(
      {
        eventType: "WORKFLOW",
        applicationId: app.id,
        actorId: ctx.actor.id,
        action: "RISK_CLEAR",
        previousJson: { department: "CREDIT_REVIEW" },
        newJson: { department: "APPROVAL_AUTHORITY", substage: "PENDING_APPROVAL" },
      },
      tx
    );

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Step 8: Approval Authority queries are coordinated through Risk, never
// directly to the RM.
// ---------------------------------------------------------------------------
export async function approvalQuery(ctx: ActionContext) {
  if (!ctx.reason || !ctx.reason.trim()) {
    throw new WorkflowError("A query reason is mandatory.");
  }
  requireCap(ctx.actor, "APPROVAL_AUTHORITY_ACTIONS", "Raise an approval query");

  return prisma.$transaction(async (tx) => {
    const app = await loadForTransition(tx, ctx.applicationId);
    checkVersion(app, ctx.expectedVersion);
    if (app.currentDepartment !== "APPROVAL_AUTHORITY" || app.substage !== "PENDING_APPROVAL") {
      throw new WorkflowError(`Cannot raise an approval query from substage "${app.substage}".`);
    }

    const cycle = await tx.approvalCycle.findFirst({
      where: { applicationId: app.id, outcome: null },
      orderBy: { cycleNumber: "desc" },
    });
    if (!cycle) throw new WorkflowError("No open approval cycle found.", 500);

    const query = await tx.query.create({
      data: {
        applicationId: app.id,
        source: "APPROVAL_AUTHORITY",
        reason: ctx.reason!,
        authorId: ctx.actor.id,
        approvalCycleId: cycle.id,
      },
    });

    const updated = await tx.application.update({
      where: { id: app.id },
      data: {
        substage: "APPROVAL_QUERY_VIA_RISK",
        actionOwnerId: null,
        actionOwnerDept: "CREDIT_REVIEW",
        version: { increment: 1 },
      },
    });
    await updateSubstageInPlace(tx, app.id, "APPROVAL_QUERY_VIA_RISK");

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "APPROVAL_QUERY",
        fromDept: "APPROVAL_AUTHORITY",
        fromSubstage: "PENDING_APPROVAL",
        toDept: "APPROVAL_AUTHORITY",
        toSubstage: "APPROVAL_QUERY_VIA_RISK",
        actorId: ctx.actor.id,
        reason: ctx.reason,
        cycleRef: cycle.id,
      },
    });

    await notify(
      tx,
      app.initiatingRmId,
      app.id,
      "APPROVAL_QUERY",
      `Approval Authority query on ${app.croReference} (via Risk)`,
      ctx.reason!
    );

    await recordAuditEvent(
      {
        eventType: "WORKFLOW",
        applicationId: app.id,
        actorId: ctx.actor.id,
        action: "APPROVAL_QUERY",
        newJson: { queryId: query.id },
        reason: ctx.reason,
        cycleRef: cycle.id,
      },
      tx
    );

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Step 9: Risk agrees the response with the RM and responds to Approval
// Authority on the RM's behalf.
// ---------------------------------------------------------------------------
export async function riskRespondToApproval(ctx: ActionContext) {
  requireCap(ctx.actor, "RISK_REVIEW_ACTIONS", "Respond to Approval Authority");

  return prisma.$transaction(async (tx) => {
    const app = await loadForTransition(tx, ctx.applicationId);
    checkVersion(app, ctx.expectedVersion);
    if (app.substage !== "APPROVAL_QUERY_VIA_RISK") {
      throw new WorkflowError(`Cannot respond to Approval Authority from substage "${app.substage}".`);
    }

    const openQuery = await tx.query.findFirst({
      where: { applicationId: app.id, source: "APPROVAL_AUTHORITY", status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });
    if (!openQuery) throw new WorkflowError("No open Approval Authority query found.");
    if (!ctx.notes || !ctx.notes.trim()) {
      throw new WorkflowError("Provide the agreed response before sending it to Approval Authority.");
    }

    await tx.queryResponse.create({
      data: { queryId: openQuery.id, authorId: ctx.actor.id, message: ctx.notes! },
    });
    await tx.query.update({ where: { id: openQuery.id }, data: { status: "RESPONDED" } });

    const updated = await tx.application.update({
      where: { id: app.id },
      data: {
        substage: "PENDING_APPROVAL",
        actionOwnerId: null,
        actionOwnerDept: "APPROVAL_AUTHORITY",
        version: { increment: 1 },
      },
    });
    await updateSubstageInPlace(tx, app.id, "PENDING_APPROVAL");

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "RISK_RESPOND_TO_APPROVAL",
        fromDept: "APPROVAL_AUTHORITY",
        fromSubstage: "APPROVAL_QUERY_VIA_RISK",
        toDept: "APPROVAL_AUTHORITY",
        toSubstage: "PENDING_APPROVAL",
        actorId: ctx.actor.id,
        cycleRef: openQuery.approvalCycleId,
      },
    });

    await recordAuditEvent(
      {
        eventType: "WORKFLOW",
        applicationId: app.id,
        actorId: ctx.actor.id,
        action: "RISK_RESPOND_TO_APPROVAL",
        newJson: { queryId: openQuery.id },
      },
      tx
    );

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Step 10–11: Final external approval is recorded, then the request moves to
// CAD for documentation (with the immediate pending action on the RM to
// obtain signatures — step 12).
// ---------------------------------------------------------------------------
export async function recordExternalApproval(ctx: ActionContext) {
  requireCap(ctx.actor, "RECORD_EXTERNAL_APPROVAL", "Record external approval");
  if (!ctx.supportingReference || !ctx.supportingReference.trim()) {
    throw new WorkflowError("A supporting reference is required to record external approval.");
  }

  return prisma.$transaction(async (tx) => {
    const app = await loadForTransition(tx, ctx.applicationId);
    checkVersion(app, ctx.expectedVersion);
    if (app.currentDepartment !== "APPROVAL_AUTHORITY" || app.substage !== "PENDING_APPROVAL") {
      throw new WorkflowError(`Cannot record external approval from substage "${app.substage}".`);
    }

    await tx.externalMilestone.create({
      data: {
        applicationId: app.id,
        type: "EXTERNAL_APPROVAL",
        recordedById: ctx.actor.id,
        supportingReference: ctx.supportingReference!,
        notes: ctx.notes,
      },
    });

    const openCycle = await tx.approvalCycle.findFirst({
      where: { applicationId: app.id, outcome: null },
      orderBy: { cycleNumber: "desc" },
    });
    if (openCycle) {
      await tx.approvalCycle.update({
        where: { id: openCycle.id },
        data: { outcome: "APPROVED", endedAt: new Date(), externalApprovalReference: ctx.supportingReference },
      });
    }

    await moveDepartment(tx, app.id, "CAD", "AWAITING_SIGNATURES", app.initiatingRmId);

    const updated = await tx.application.update({
      where: { id: app.id },
      data: {
        currentDepartment: "CAD",
        substage: "AWAITING_SIGNATURES",
        actionOwnerId: app.initiatingRmId,
        actionOwnerDept: "CORPORATE_FINANCE",
        version: { increment: 1 },
      },
    });

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "RECORD_EXTERNAL_APPROVAL",
        fromDept: "APPROVAL_AUTHORITY",
        fromSubstage: "PENDING_APPROVAL",
        toDept: "CAD",
        toSubstage: "AWAITING_SIGNATURES",
        actorId: ctx.actor.id,
        reason: ctx.supportingReference,
      },
    });

    await notify(
      tx,
      app.initiatingRmId,
      app.id,
      "APPROVAL_RECORDED",
      `External approval recorded for ${app.croReference}`,
      `Reference: ${ctx.supportingReference}. Please obtain customer signatures and send documentation to CAD.`
    );

    await recordAuditEvent(
      {
        eventType: "WORKFLOW",
        applicationId: app.id,
        actorId: ctx.actor.id,
        action: "RECORD_EXTERNAL_APPROVAL",
        newJson: { supportingReference: ctx.supportingReference },
      },
      tx
    );

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Step 13: RM sends completed documentation to CAD.
// ---------------------------------------------------------------------------
export async function sendToCad(ctx: ActionContext) {
  return prisma.$transaction(async (tx) => {
    const app = await loadForTransition(tx, ctx.applicationId);
    checkVersion(app, ctx.expectedVersion);
    if (app.substage !== "AWAITING_SIGNATURES") {
      throw new WorkflowError(`Cannot send to CAD from substage "${app.substage}".`);
    }
    if (app.initiatingRmId !== ctx.actor.id) {
      throw new WorkflowError("Only the initiating RM may send documentation to CAD.", 403);
    }

    await updateSubstageInPlace(tx, app.id, "CAD_REVIEW");
    const updated = await tx.application.update({
      where: { id: app.id },
      data: {
        substage: "CAD_REVIEW",
        actionOwnerId: null,
        actionOwnerDept: "CAD",
        version: { increment: 1 },
      },
    });

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "SEND_TO_CAD",
        fromDept: "CAD",
        fromSubstage: "AWAITING_SIGNATURES",
        toDept: "CAD",
        toSubstage: "CAD_REVIEW",
        actorId: ctx.actor.id,
      },
    });

    await recordAuditEvent(
      { eventType: "WORKFLOW", applicationId: app.id, actorId: ctx.actor.id, action: "SEND_TO_CAD" },
      tx
    );

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Step 14–15: CAD performs final review and forwards to Operations.
// ---------------------------------------------------------------------------
export async function cadClear(ctx: ActionContext) {
  requireCap(ctx.actor, "CAD_ACTIONS", "Complete CAD review and forward to Operations");

  return prisma.$transaction(async (tx) => {
    const app = await loadForTransition(tx, ctx.applicationId);
    checkVersion(app, ctx.expectedVersion);
    if (app.currentDepartment !== "CAD" || app.substage !== "CAD_REVIEW") {
      throw new WorkflowError(`Cannot clear CAD review from substage "${app.substage}".`);
    }

    await moveDepartment(tx, app.id, "OPERATIONS", "SENT_TO_OPERATIONS", null);
    const updated = await tx.application.update({
      where: { id: app.id },
      data: {
        currentDepartment: "OPERATIONS",
        substage: "SENT_TO_OPERATIONS",
        actionOwnerId: null,
        actionOwnerDept: "OPERATIONS",
        version: { increment: 1 },
      },
    });

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "CAD_CLEAR",
        fromDept: "CAD",
        fromSubstage: "CAD_REVIEW",
        toDept: "OPERATIONS",
        toSubstage: "SENT_TO_OPERATIONS",
        actorId: ctx.actor.id,
      },
    });

    await recordAuditEvent(
      { eventType: "WORKFLOW", applicationId: app.id, actorId: ctx.actor.id, action: "CAD_CLEAR" },
      tx
    );

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Step 16: External execution is recorded.
// ---------------------------------------------------------------------------
export async function recordExternalExecution(ctx: ActionContext) {
  requireCap(ctx.actor, "RECORD_EXTERNAL_EXECUTION", "Record external execution");
  if (!ctx.supportingReference || !ctx.supportingReference.trim()) {
    throw new WorkflowError("A supporting reference is required to record external execution.");
  }

  return prisma.$transaction(async (tx) => {
    const app = await loadForTransition(tx, ctx.applicationId);
    checkVersion(app, ctx.expectedVersion);
    if (app.currentDepartment !== "OPERATIONS" || app.substage !== "SENT_TO_OPERATIONS") {
      throw new WorkflowError(`Cannot record external execution from substage "${app.substage}".`);
    }

    await tx.externalMilestone.create({
      data: {
        applicationId: app.id,
        type: "EXTERNAL_EXECUTION",
        recordedById: ctx.actor.id,
        supportingReference: ctx.supportingReference!,
        notes: ctx.notes,
      },
    });

    await updateSubstageInPlace(tx, app.id, "EXTERNAL_EXECUTION_RECORDED");
    const updated = await tx.application.update({
      where: { id: app.id },
      data: { substage: "EXTERNAL_EXECUTION_RECORDED", version: { increment: 1 } },
    });

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "RECORD_EXTERNAL_EXECUTION",
        fromDept: "OPERATIONS",
        fromSubstage: "SENT_TO_OPERATIONS",
        toDept: "OPERATIONS",
        toSubstage: "EXTERNAL_EXECUTION_RECORDED",
        actorId: ctx.actor.id,
        reason: ctx.supportingReference,
      },
    });

    await recordAuditEvent(
      {
        eventType: "WORKFLOW",
        applicationId: app.id,
        actorId: ctx.actor.id,
        action: "RECORD_EXTERNAL_EXECUTION",
        newJson: { supportingReference: ctx.supportingReference },
      },
      tx
    );

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Step 17: Completion.
// ---------------------------------------------------------------------------
export async function completeApplication(ctx: ActionContext) {
  requireCap(ctx.actor, "OPERATIONS_ACTIONS", "Mark the request completed");

  return prisma.$transaction(async (tx) => {
    const app = await loadForTransition(tx, ctx.applicationId);
    checkVersion(app, ctx.expectedVersion);
    if (app.currentDepartment !== "OPERATIONS" || app.substage !== "EXTERNAL_EXECUTION_RECORDED") {
      throw new WorkflowError(`Cannot complete from substage "${app.substage}".`);
    }

    await moveDepartment(tx, app.id, "OPERATIONS", "COMPLETED", null);
    await tx.stageInterval.updateMany({
      where: { applicationId: app.id, endedAt: null },
      data: { endedAt: new Date() },
    });

    const updated = await tx.application.update({
      where: { id: app.id },
      data: {
        currentDepartment: "COMPLETED",
        stage: "COMPLETED",
        substage: "COMPLETED",
        actionOwnerId: null,
        actionOwnerDept: null,
        completedAt: new Date(),
        version: { increment: 1 },
      },
    });

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "COMPLETE",
        fromDept: "OPERATIONS",
        fromSubstage: "EXTERNAL_EXECUTION_RECORDED",
        toDept: "COMPLETED",
        toSubstage: "COMPLETED",
        actorId: ctx.actor.id,
      },
    });

    await recordAuditEvent(
      { eventType: "WORKFLOW", applicationId: app.id, actorId: ctx.actor.id, action: "COMPLETE" },
      tx
    );

    return updated;
  });
}

export const WORKFLOW_HANDLERS: Record<WorkflowAction, (ctx: ActionContext) => Promise<unknown>> = {
  SUBMIT: async () => {
    throw new WorkflowError("SUBMIT is performed as part of application creation, not as a standalone transition.");
  },
  RISK_RETURN_QUERY: riskReturnQuery,
  RM_RESUBMIT: rmResubmit,
  RISK_CLEAR: riskClear,
  APPROVAL_QUERY: approvalQuery,
  RISK_RESPOND_TO_APPROVAL: riskRespondToApproval,
  RECORD_EXTERNAL_APPROVAL: recordExternalApproval,
  SEND_TO_CAD: sendToCad,
  CAD_CLEAR: cadClear,
  RECORD_EXTERNAL_EXECUTION: recordExternalExecution,
  COMPLETE: completeApplication,
};
