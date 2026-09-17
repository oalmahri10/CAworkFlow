import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";
import { computeApprovalRoutingExposure, parseMajorToMinor } from "@/lib/money";
import type { AuthenticatedUser } from "@/lib/auth";
import type { CreateApplicationInput } from "@/lib/validation/application";
import { WorkflowError } from "@/lib/workflow";

/** Suggests the next CRO80-style reference for a request type; always editable/overridable. */
export async function suggestNextReference(requestType: "CA" | "AT"): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CRO80-${requestType}-${year}-`;
  const last = await prisma.application.findFirst({
    where: { croReference: { startsWith: prefix } },
    orderBy: { croReference: "desc" },
  });
  let nextSeq = 1;
  if (last) {
    const tail = last.croReference.slice(prefix.length);
    const parsed = parseInt(tail, 10);
    if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

/**
 * Creates and immediately submits a CA/AT (requirements step 1). The
 * application never exists in an unsubmitted state — creation IS submission,
 * landing directly in the Credit Review queue, which is why there is no
 * separate SUBMIT workflow action to call afterwards.
 */
export async function createApplication(actor: AuthenticatedUser, input: CreateApplicationInput) {
  const existing = await prisma.application.findUnique({ where: { croReference: input.croReference } });
  if (existing) {
    throw new WorkflowError(`CRO80 reference "${input.croReference}" is already in use.`, 409);
  }

  const groupMinor = parseMajorToMinor(input.totalGroupExposure, input.currency);
  const relatedMinor = parseMajorToMinor(input.relatedPartyExposure, input.currency);
  const approvalRoutingMinor = computeApprovalRoutingExposure(
    groupMinor,
    relatedMinor,
    input.currency,
    input.currency
  );
  const facilityMinor = input.facilityAmount
    ? parseMajorToMinor(input.facilityAmount, input.currency)
    : null;

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        croReference: input.croReference,
        requestType: input.requestType,
        subtype: input.subtype,
        customerName: input.customerName,
        customerType: input.customerType,
        sector: input.sector,
        initiatingRmId: actor.id,
        currentDepartment: "CREDIT_REVIEW",
        stage: "CREDIT_REVIEW",
        substage: "SUBMITTED",
        actionOwnerId: null,
        actionOwnerDept: "CREDIT_REVIEW",
        currency: input.currency,
        totalGroupExposureMinor: groupMinor,
        relatedPartyExposureMinor: relatedMinor,
        approvalRoutingExposureMinor: approvalRoutingMinor,
        facilityAmountMinor: facilityMinor,
        submissionAt: now,
      },
    });

    if (input.facilities.length > 0) {
      await tx.facility.createMany({
        data: input.facilities.map((f) => ({
          applicationId: app.id,
          name: f.name,
          facilityType: f.facilityType,
          amountMinor: parseMajorToMinor(f.amount, input.currency),
          currency: input.currency,
          description: f.description,
        })),
      });
    }

    await tx.exposureSnapshot.create({
      data: {
        applicationId: app.id,
        totalGroupExposureMinor: groupMinor,
        relatedPartyExposureMinor: relatedMinor,
        approvalRoutingExposureMinor: approvalRoutingMinor,
        currency: input.currency,
        reason: "INITIAL",
        createdById: actor.id,
      },
    });

    // Corporate Finance is a zero-duration originating interval: the RM
    // submits immediately, so the Credit Journey shows this station as
    // already completed rather than awaiting action.
    await tx.stageInterval.create({
      data: {
        applicationId: app.id,
        department: "CORPORATE_FINANCE",
        stage: "CORPORATE_FINANCE",
        substage: "SUBMITTED",
        ownerUserId: actor.id,
        startedAt: now,
        endedAt: now,
      },
    });
    await tx.stageInterval.create({
      data: {
        applicationId: app.id,
        department: "CREDIT_REVIEW",
        stage: "CREDIT_REVIEW",
        substage: "SUBMITTED",
        startedAt: now,
      },
    });

    await tx.reviewCycle.create({ data: { applicationId: app.id, cycleNumber: 1 } });

    await tx.workflowEvent.create({
      data: {
        applicationId: app.id,
        action: "SUBMIT",
        fromDept: null,
        fromSubstage: null,
        toDept: "CREDIT_REVIEW",
        toSubstage: "SUBMITTED",
        actorId: actor.id,
      },
    });

    await recordAuditEvent(
      {
        eventType: "APPLICATION",
        applicationId: app.id,
        actorId: actor.id,
        action: "CREATE_AND_SUBMIT",
        newJson: {
          croReference: app.croReference,
          requestType: app.requestType,
          subtype: app.subtype,
        },
      },
      tx
    );

    return app;
  });
}

export async function amendExposure(
  actor: AuthenticatedUser,
  applicationId: string,
  input: { totalGroupExposure: string; relatedPartyExposure: string; reason: string; expectedVersion: number }
) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new WorkflowError("Application not found.", 404);
    if (app.version !== input.expectedVersion) {
      throw new WorkflowError(
        "This application has been updated since you loaded it. Refresh before retrying.",
        409
      );
    }
    if (app.initiatingRmId !== actor.id) {
      throw new WorkflowError("Only the initiating RM may amend this application's exposure.", 403);
    }
    if (app.substage !== "QUERY_RETURNED_TO_RM") {
      throw new WorkflowError("Exposure can only be amended while a query is pending with the RM.");
    }

    const groupMinor = parseMajorToMinor(input.totalGroupExposure, app.currency);
    const relatedMinor = parseMajorToMinor(input.relatedPartyExposure, app.currency);
    const approvalRoutingMinor = computeApprovalRoutingExposure(
      groupMinor,
      relatedMinor,
      app.currency,
      app.currency
    );

    const previous = {
      totalGroupExposureMinor: app.totalGroupExposureMinor.toString(),
      relatedPartyExposureMinor: app.relatedPartyExposureMinor.toString(),
      approvalRoutingExposureMinor: app.approvalRoutingExposureMinor.toString(),
    };

    const updated = await tx.application.update({
      where: { id: applicationId },
      data: {
        totalGroupExposureMinor: groupMinor,
        relatedPartyExposureMinor: relatedMinor,
        approvalRoutingExposureMinor: approvalRoutingMinor,
        version: { increment: 1 },
      },
    });

    await tx.exposureSnapshot.create({
      data: {
        applicationId,
        totalGroupExposureMinor: groupMinor,
        relatedPartyExposureMinor: relatedMinor,
        approvalRoutingExposureMinor: approvalRoutingMinor,
        currency: app.currency,
        reason: "AMENDMENT",
        createdById: actor.id,
      },
    });

    await recordAuditEvent(
      {
        eventType: "APPLICATION",
        applicationId,
        actorId: actor.id,
        action: "AMEND_EXPOSURE",
        previousJson: previous,
        newJson: {
          totalGroupExposureMinor: groupMinor.toString(),
          relatedPartyExposureMinor: relatedMinor.toString(),
          approvalRoutingExposureMinor: approvalRoutingMinor.toString(),
        },
        reason: input.reason,
      },
      tx
    );

    return updated;
  });
}
