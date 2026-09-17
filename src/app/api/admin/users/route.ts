import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireCapability } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/api-error";
import { createUserSchema } from "@/lib/validation/admin";
import { WorkflowError } from "@/lib/workflow";

export async function GET() {
  try {
    await requireCapability("MANAGE_USERS");
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { roles: true, capabilities: true },
    });
    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        createdAt: u.createdAt,
        roles: u.roles.map((r) => r.role),
        capabilities: u.capabilities.map((c) => c.capability),
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireCapability("MANAGE_USERS");
    const body = createUserSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) throw new WorkflowError("A user with this email already exists.", 409);

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: body.name, email: body.email.toLowerCase(), passwordHash },
      });
      for (const role of body.roles) {
        await tx.userRoleAssignment.create({ data: { userId: created.id, role } });
      }
      for (const capability of body.capabilities) {
        await tx.userCapability.create({ data: { userId: created.id, capability, grantedBy: actor.id } });
      }
      await recordAuditEvent(
        {
          eventType: "ADMIN",
          actorId: actor.id,
          action: "CREATE_USER",
          newJson: { email: created.email, roles: body.roles, capabilities: body.capabilities },
        },
        tx
      );
      return created;
    });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
