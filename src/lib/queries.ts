import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";
import type { AuthenticatedUser } from "@/lib/auth";
import { WorkflowError } from "@/lib/workflow";

/**
 * Records the RM's (or Risk's, for an Approval Authority query) response to
 * an open query. This does not by itself change workflow state — resubmit
 * (`rmResubmit`) or `riskRespondToApproval` are the transitions that move
 * the application forward, and both require at least one response to exist
 * on the relevant open query first.
 */
export async function respondToQuery(actor: AuthenticatedUser, queryId: string, message: string) {
  const query = await prisma.query.findUnique({
    where: { id: queryId },
    include: { application: true },
  });
  if (!query) throw new WorkflowError("Query not found.", 404);

  if (query.source === "RISK" && query.application.initiatingRmId !== actor.id) {
    throw new WorkflowError("Only the initiating RM may respond to a Risk query.", 403);
  }

  const response = await prisma.queryResponse.create({
    data: { queryId, authorId: actor.id, message },
  });

  await prisma.notification.create({
    data: {
      userId: query.authorId,
      applicationId: query.applicationId,
      type: "QUERY_RESPONSE",
      title: `Response received on ${query.application.croReference}`,
      body: message,
    },
  });

  await recordAuditEvent({
    eventType: "QUERY",
    applicationId: query.applicationId,
    actorId: actor.id,
    action: "RESPOND",
    newJson: { queryId, responseId: response.id },
  });

  return response;
}
