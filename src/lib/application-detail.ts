import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/lib/auth";
import { applicationVisibilityWhere, documentAccessDecision } from "@/lib/authz";
import { evaluateTat } from "@/lib/tat";
import { resolveApprovalAuthorityTier } from "@/lib/routing";
import { WorkflowError } from "@/lib/workflow";
import type { Department, DocumentCategory, RequestType } from "@/lib/domain/enums";

/**
 * Assembles everything the Credit Passport page needs in one authorized
 * read: the application, its facilities/exposure history, full workflow and
 * cycle history, queries with responses, external milestones, comments,
 * documents (each annotated with why it is or isn't visible to this user —
 * "a locked card alone is not security" means the reason has to be real),
 * plus derived TAT and routing-authority evaluations.
 */
export async function getApplicationDetail(user: AuthenticatedUser, applicationId: string) {
  const visibility = applicationVisibilityWhere(user);
  const app = await prisma.application.findFirst({
    where: { id: applicationId, ...visibility },
    include: {
      initiatingRm: { select: { id: true, name: true, email: true } },
      actionOwner: { select: { id: true, name: true, email: true } },
      facilities: true,
      exposureSnapshots: { orderBy: { createdAt: "asc" } },
      workflowEvents: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
      stageIntervals: { orderBy: { startedAt: "asc" }, include: { owner: { select: { name: true } } } },
      reviewCycles: { orderBy: { cycleNumber: "asc" } },
      approvalCycles: { orderBy: { cycleNumber: "asc" } },
      queries: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } }, responses: { include: { author: { select: { name: true } } } } },
      },
      externalMilestones: { orderBy: { recordedAt: "asc" }, include: { recordedBy: { select: { name: true } } } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      documents: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
    },
  });

  if (!app) {
    throw new WorkflowError("Application not found, or you do not have visibility of it.", 404);
  }

  const authzContext = {
    initiatingRmId: app.initiatingRmId,
    stageIntervals: app.stageIntervals,
    externalMilestones: app.externalMilestones,
  };

  const documentsWithAccess = await Promise.all(
    app.documents.map(async (doc) => {
      const decision = await documentAccessDecision(user, authzContext, doc.category as DocumentCategory);
      return {
        id: doc.id,
        category: doc.category,
        filename: doc.filename,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        version: doc.version,
        uploadedAt: doc.uploadedAt,
        uploadedBy: doc.uploadedBy.name,
        allowed: decision.allowed,
        reason: decision.reason,
      };
    })
  );

  const currentIntervalStart =
    app.stageIntervals.filter((s) => !s.endedAt)[0]?.startedAt ?? app.updatedAt;
  const tat = await evaluateTat(app.requestType as RequestType, app.currentDepartment as Department, currentIntervalStart);
  const routing = await resolveApprovalAuthorityTier(app.approvalRoutingExposureMinor, app.currency);

  const openReviewCycle = app.reviewCycles.find((c) => !c.outcome) ?? app.reviewCycles.at(-1) ?? null;
  const cycleStart = openReviewCycle?.startedAt ?? app.submissionAt ?? app.createdAt;

  return {
    application: app,
    documentsWithAccess,
    tat,
    routing,
    ages: {
      totalApplicationAgeMs: Date.now() - (app.submissionAt ?? app.createdAt).getTime(),
      currentStageAgeMs: Date.now() - currentIntervalStart.getTime(),
      currentCycleElapsedMs: Date.now() - cycleStart.getTime(),
    },
  };
}
