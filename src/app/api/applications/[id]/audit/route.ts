import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { applicationVisibilityWhere } from "@/lib/authz";
import { handleApiError } from "@/lib/api-error";
import { WorkflowError } from "@/lib/workflow";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const app = await prisma.application.findFirst({ where: { id, ...applicationVisibilityWhere(actor) } });
    if (!app) throw new WorkflowError("Application not found, or you do not have visibility of it.", 404);

    const events = await prisma.auditEvent.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: "asc" },
      include: { actor: { select: { name: true } } },
    });
    return NextResponse.json(events);
  } catch (error) {
    return handleApiError(error);
  }
}
