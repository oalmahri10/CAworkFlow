import { cookies } from "next/headers";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Capability, Role } from "@/lib/domain/enums";

const SESSION_COOKIE = "bisb_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  roles: Role[];
  capabilities: Capability[];
};

async function loadUser(userId: string): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true, capabilities: true },
  });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    roles: user.roles.map((r) => r.role as Role),
    capabilities: user.capabilities.map((c) => c.capability as Capability),
  };
}

export async function createSession(userId: string, userAgent?: string): Promise<string> {
  const token = generateToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: userAgent ?? null,
    },
  });
  return token;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // local loopback deployment only; enable when served over TLS
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session || session.expiresAt < new Date()) return null;

  return loadUser(session.userId);
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sign-in required.", 401);
  return user;
}

export async function requireCapability(capability: Capability): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!user.capabilities.includes(capability)) {
    throw new AuthError(
      `Your account is not configured with the "${capability}" capability required for this action.`,
      403
    );
  }
  return user;
}

export function hasCapability(user: AuthenticatedUser, capability: Capability): boolean {
  return user.capabilities.includes(capability);
}

export function hasRole(user: AuthenticatedUser, role: Role): boolean {
  return user.roles.includes(role);
}

export async function isSetupComplete(): Promise<boolean> {
  const count = await prisma.user.count();
  return count > 0;
}
