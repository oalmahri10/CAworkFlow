import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });

    // Constant-shape response: don't reveal whether the email exists.
    const invalidResponse = () =>
      NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    if (!user || !user.isActive) return invalidResponse();

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) return invalidResponse();

    const token = await createSession(user.id, req.headers.get("user-agent") ?? undefined);
    await setSessionCookie(token);

    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    return handleApiError(error);
  }
}
