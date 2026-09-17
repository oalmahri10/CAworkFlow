import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/api-error";
import { roleAssignmentSchema } from "@/lib/validation/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCapability("MANAGE_USERS");
    const { id } = await params;
    const { role } = roleAssignmentSchema.parse(await req.json());

    await prisma.userRoleAssignment.upsert({
      where: { userId_role: { userId: id, role } },
      create: { userId: id, role },
      update: {},
    });
    await recordAuditEvent({
      eventType: "ADMIN",
      actorId: actor.id,
      action: "GRANT_ROLE",
      newJson: { userId: id, role },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCapability("MANAGE_USERS");
    const { id } = await params;
    const { role } = roleAssignmentSchema.parse(await req.json());

    await prisma.userRoleAssignment.deleteMany({ where: { userId: id, role } });
    await recordAuditEvent({
      eventType: "ADMIN",
      actorId: actor.id,
      action: "REVOKE_ROLE",
      newJson: { userId: id, role },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
