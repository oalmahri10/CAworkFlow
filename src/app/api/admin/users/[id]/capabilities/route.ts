import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/api-error";
import { capabilityAssignmentSchema } from "@/lib/validation/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCapability("MANAGE_USERS");
    const { id } = await params;
    const { capability } = capabilityAssignmentSchema.parse(await req.json());

    await prisma.userCapability.upsert({
      where: { userId_capability: { userId: id, capability } },
      create: { userId: id, capability, grantedBy: actor.id },
      update: {},
    });
    await recordAuditEvent({
      eventType: "ADMIN",
      actorId: actor.id,
      action: "GRANT_CAPABILITY",
      newJson: { userId: id, capability },
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
    const { capability } = capabilityAssignmentSchema.parse(await req.json());

    await prisma.userCapability.deleteMany({ where: { userId: id, capability } });
    await recordAuditEvent({
      eventType: "ADMIN",
      actorId: actor.id,
      action: "REVOKE_CAPABILITY",
      newJson: { userId: id, capability },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
