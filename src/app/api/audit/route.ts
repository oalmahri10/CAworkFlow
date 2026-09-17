import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

/** Global, filterable audit trail. Requires VIEW_AUDIT_TRAIL explicitly. */
export async function GET(req: NextRequest) {
  try {
    await requireCapability("VIEW_AUDIT_TRAIL");
    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get("eventType");
    const applicationId = searchParams.get("applicationId");
    const actorId = searchParams.get("actorId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10) || 50));

    const where: Prisma.AuditEventWhereInput = {};
    if (eventType) where.eventType = eventType;
    if (applicationId) where.applicationId = applicationId;
    if (actorId) where.actorId = actorId;

    const [total, items] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { name: true, email: true } },
          application: { select: { croReference: true, customerName: true } },
        },
      }),
    ]);

    return NextResponse.json({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (error) {
    return handleApiError(error);
  }
}
