import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { applicationVisibilityWhere, documentAccessDecision } from "@/lib/authz";
import { handleApiError } from "@/lib/api-error";
import { WorkflowError } from "@/lib/workflow";
import { readDocumentFile } from "@/lib/documents";
import { recordAuditEvent } from "@/lib/audit";
import type { DocumentCategory } from "@/lib/domain/enums";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const actor = await requireUser();
    const { id, docId } = await params;

    const app = await prisma.application.findFirst({
      where: { id, ...applicationVisibilityWhere(actor) },
      include: { stageIntervals: true, externalMilestones: true },
    });
    if (!app) throw new WorkflowError("Application not found, or you do not have visibility of it.", 404);

    const doc = await prisma.documentVersion.findFirst({ where: { id: docId, applicationId: id } });
    if (!doc) throw new WorkflowError("Document not found.", 404);

    const decision = await documentAccessDecision(actor, app, doc.category as DocumentCategory);
    if (!decision.allowed) {
      throw new WorkflowError(`Access denied: ${decision.reason}`, 403);
    }

    const buffer = await readDocumentFile(doc.storageKey);

    await recordAuditEvent({
      eventType: "DOCUMENT",
      applicationId: id,
      actorId: actor.id,
      action: "DOWNLOAD",
      newJson: { documentId: doc.id, filename: doc.filename },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `attachment; filename="${doc.filename}"`,
        "Content-Length": String(doc.sizeBytes),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
