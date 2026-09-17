import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";
import { CONFIG_SCHEMAS } from "@/lib/validation/config";
import type { ConfigType } from "@/lib/domain/enums";
import type { ConfigVersion } from "@prisma/client";

/**
 * Versioned configuration service. Nothing here is ever auto-activated:
 * a new version starts as DRAFT, and only an explicit `activateConfigVersion`
 * call (which requires MANAGE_CONFIG, enforced by the calling API route)
 * promotes it to ACTIVE and supersedes whatever was active before. Every
 * state change is audited. Historical versions are never deleted, which is
 * what lets TAT calculations reference "the configuration version in effect
 * at the time" instead of silently recalculating old results under new
 * rules.
 */

export async function getActiveConfig(configType: ConfigType): Promise<ConfigVersion | null> {
  return prisma.configVersion.findFirst({
    where: { configType, status: "ACTIVE" },
    orderBy: { version: "desc" },
  });
}

export async function listConfigVersions(configType: ConfigType): Promise<ConfigVersion[]> {
  return prisma.configVersion.findMany({
    where: { configType },
    orderBy: { version: "desc" },
  });
}

export async function getConfigVersion(id: string): Promise<ConfigVersion | null> {
  return prisma.configVersion.findUnique({ where: { id } });
}

export async function createDraftConfig(
  configType: ConfigType,
  payload: unknown,
  createdById: string,
  notes?: string
): Promise<ConfigVersion> {
  const schema = CONFIG_SCHEMAS[configType];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ConfigValidationError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  }

  const last = await prisma.configVersion.findFirst({
    where: { configType },
    orderBy: { version: "desc" },
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const created = await prisma.configVersion.create({
    data: {
      configType,
      version: nextVersion,
      status: "DRAFT",
      payloadJson: JSON.stringify(parsed.data),
      notes,
      createdById,
    },
  });

  await recordAuditEvent({
    eventType: "CONFIG",
    actorId: createdById,
    action: "CREATE_DRAFT",
    newJson: created.payloadJson,
    configVersionId: created.id,
    reason: notes,
  });

  return created;
}

export async function activateConfigVersion(id: string, actorId: string): Promise<ConfigVersion> {
  const target = await prisma.configVersion.findUnique({ where: { id } });
  if (!target) throw new ConfigValidationError(["Configuration version not found."]);
  if (target.status === "ACTIVE") return target;

  const result = await prisma.$transaction(async (tx) => {
    const currentActive = await tx.configVersion.findFirst({
      where: { configType: target.configType, status: "ACTIVE" },
    });
    if (currentActive) {
      await tx.configVersion.update({
        where: { id: currentActive.id },
        data: { status: "SUPERSEDED" },
      });
    }
    return tx.configVersion.update({
      where: { id: target.id },
      data: { status: "ACTIVE", effectiveFrom: target.effectiveFrom ?? new Date() },
    });
  });

  await recordAuditEvent({
    eventType: "CONFIG",
    actorId,
    action: "ACTIVATE",
    previousJson: null,
    newJson: result.payloadJson,
    configVersionId: result.id,
  });

  return result;
}

export class ConfigValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(issues.join("; "));
    this.issues = issues;
  }
}
