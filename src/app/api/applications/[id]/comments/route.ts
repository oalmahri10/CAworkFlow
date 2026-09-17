import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { applicationVisibilityWhere } from "@/lib/authz";
import { handleApiError } from "@/lib/api-error";
import { WorkflowError } from "@/lib/workflow";
import { recordAuditEvent } from "@/lib/audit";

const commentSchema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const app = await prisma.application.findFirst({ where: { id, ...applicationVisibilityWhere(actor) } });
    if (!app) throw new WorkflowError("Application not found, or you do not have visibility of it.", 404);

    const comments = await prisma.comment.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true } } },
    });
    return NextResponse.json(comments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const app = await prisma.application.findFirst({ where: { id, ...applicationVisibilityWhere(actor) } });
    if (!app) throw new WorkflowError("Application not found, or you do not have visibility of it.", 404);

    const body = commentSchema.parse(await req.json());
    const comment = await prisma.comment.create({
      data: { applicationId: id, authorId: actor.id, body: body.body },
    });

    await recordAuditEvent({
      eventType: "COMMENT",
      applicationId: id,
      actorId: actor.id,
      action: "ADD_COMMENT",
      newJson: { commentId: comment.id },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
