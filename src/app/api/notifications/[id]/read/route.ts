import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { WorkflowError } from "@/lib/workflow";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== user.id) {
      throw new WorkflowError("Notification not found.", 404);
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
