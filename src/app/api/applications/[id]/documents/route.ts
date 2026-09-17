import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { applicationVisibilityWhere, documentAccessDecision } from "@/lib/authz";
import { handleApiError } from "@/lib/api-error";
import { WorkflowError } from "@/lib/workflow";
import { storeDocument } from "@/lib/documents";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/domain/enums";

async function loadAppForAuthz(applicationId: string, userVisibility: ReturnType<typeof applicationVisibilityWhere>) {
  const app = await prisma.application.findFirst({
    where: { id: applicationId, ...userVisibility },
    include: { stageIntervals: true, externalMilestones: true },
  });
  if (!app) throw new WorkflowError("Application not found, or you do not have visibility of it.", 404);
  return app;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const app = await loadAppForAuthz(id, applicationVisibilityWhere(actor));

    const form = await req.formData();
    const file = form.get("file");
    const category = form.get("category");
    if (!(file instanceof File)) throw new WorkflowError("No file provided.");
    if (typeof category !== "string" || !(DOCUMENT_CATEGORIES as readonly string[]).includes(category)) {
      throw new WorkflowError(`Category must be one of: ${DOCUMENT_CATEGORIES.join(", ")}.`);
    }

    const decision = await documentAccessDecision(actor, app, category as DocumentCategory);
    if (!decision.allowed) {
      throw new WorkflowError(`Not permitted to add documents in this category: ${decision.reason}`, 403);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await storeDocument(actor, id, category as DocumentCategory, file.name, file.type, buffer);

    return NextResponse.json(
      { id: doc.id, filename: doc.filename, category: doc.category, version: doc.version, sizeBytes: doc.sizeBytes },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
