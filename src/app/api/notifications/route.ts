import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const unreadOnly = new URL(req.url).searchParams.get("unreadOnly") === "true";

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { application: { select: { croReference: true } } },
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return NextResponse.json({ items, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}
