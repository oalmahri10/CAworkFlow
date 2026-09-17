import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { bigIntReplacer } from "@/lib/money";

type TxClient = Prisma.TransactionClient | PrismaClient;

export type AuditEventInput = {
  eventType: string;
  applicationId?: string | null;
  actorId: string;
  action: string;
  previousJson?: unknown;
  newJson?: unknown;
  reason?: string | null;
  cycleRef?: string | null;
  configVersionId?: string | null;
};

function toJsonString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value, bigIntReplacer);
}

/**
 * Writes one append-only audit event. This is the single writer for the
 * AuditEvent table — every material mutation in the system (workflow
 * transitions, exposure amendments, config changes, document uploads,
 * external milestone recording, account/capability changes) must call this
 * inside the same transaction as the mutation it documents, so the audit
 * trail can never fall out of sync with what actually happened.
 *
 * Pass a transaction client (`tx`) when called from within
 * `prisma.$transaction(...)` so the audit row commits or rolls back
 * atomically with the rest of the change.
 */
export async function recordAuditEvent(input: AuditEventInput, tx: TxClient = prisma) {
  return tx.auditEvent.create({
    data: {
      eventType: input.eventType,
      applicationId: input.applicationId ?? null,
      actorId: input.actorId,
      action: input.action,
      previousJson: toJsonString(input.previousJson),
      newJson: toJsonString(input.newJson),
      reason: input.reason ?? null,
      cycleRef: input.cycleRef ?? null,
      configVersionId: input.configVersionId ?? null,
    },
  });
}
