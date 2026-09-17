import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, isSetupComplete, setSessionCookie } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { handleApiError } from "@/lib/api-error";

const setupSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(10, "Use at least 10 characters for the administrator password."),
});

/**
 * One-time administrator setup. Only reachable while zero users exist —
 * this is the *only* way an Authorized Administrator account is ever
 * created, deliberately excluding any "role dropdown" style bootstrap.
 */
export async function GET() {
  const complete = await isSetupComplete();
  return NextResponse.json({ setupComplete: complete });
}

export async function POST(req: NextRequest) {
  try {
    if (await isSetupComplete()) {
      return NextResponse.json(
        { error: "Setup has already been completed. Sign in, or ask an administrator to create your account." },
        { status: 409 }
      );
    }

    const body = setupSchema.parse(await req.json());
    const passwordHash = await hashPassword(body.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: body.name, email: body.email.toLowerCase(), passwordHash },
      });
      await tx.userRoleAssignment.create({ data: { userId: created.id, role: "AUTHORIZED_ADMINISTRATOR" } });
      await tx.userCapability.create({ data: { userId: created.id, capability: "MANAGE_USERS" } });
      await tx.userCapability.create({ data: { userId: created.id, capability: "MANAGE_CONFIG" } });
      await tx.userCapability.create({ data: { userId: created.id, capability: "VIEW_AUDIT_TRAIL" } });
      await recordAuditEvent(
        { eventType: "ADMIN", actorId: created.id, action: "INITIAL_SETUP", newJson: { email: created.email } },
        tx
      );
      return created;
    });

    const token = await createSession(user.id, req.headers.get("user-agent") ?? undefined);
    await setSessionCookie(token);

    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    return handleApiError(error);
  }
}
