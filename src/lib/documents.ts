import path from "node:path";
import crypto from "node:crypto";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";
import type { AuthenticatedUser } from "@/lib/auth";
import type { DocumentCategory } from "@/lib/domain/enums";
import { WorkflowError } from "@/lib/workflow";

/**
 * Local, private document storage. Files live outside `public/` under
 * DOCUMENTS_ROOT and are only ever served through the authorized
 * `/api/applications/[id]/documents/[docId]` route, which re-checks
 * `documentAccessDecision` on every download — never through a static or
 * directly linkable path. Filenames on disk are content-addressed
 * (`storageKey`), so the original filename is only ever used for display.
 */

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

export class DocumentError extends WorkflowError {}

function documentsRoot(): string {
  return path.resolve(process.cwd(), process.env.DOCUMENTS_ROOT ?? "./var/documents");
}

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime);
}

export async function storeDocument(
  actor: AuthenticatedUser,
  applicationId: string,
  category: DocumentCategory,
  filename: string,
  mimeType: string,
  buffer: Buffer
) {
  if (!isAllowedMimeType(mimeType)) {
    throw new DocumentError(`File type "${mimeType}" is not permitted.`);
  }
  if (buffer.byteLength === 0) {
    throw new DocumentError("The uploaded file is empty.");
  }
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new DocumentError(`File exceeds the ${MAX_FILE_BYTES / (1024 * 1024)}MB size limit.`);
  }
  const safeName = path.basename(filename).replace(/[^\w.\- ]/g, "_");
  if (!safeName) throw new DocumentError("Invalid filename.");

  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const lastVersion = await prisma.documentVersion.findFirst({
    where: { applicationId, category, filename: safeName },
    orderBy: { version: "desc" },
  });
  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const root = documentsRoot();
  const appDir = path.join(root, applicationId);
  await mkdir(appDir, { recursive: true });
  const storageKey = path.join(applicationId, `${checksum}-v${nextVersion}-${safeName}`);
  await writeFile(path.join(root, storageKey), buffer);

  const doc = await prisma.documentVersion.create({
    data: {
      applicationId,
      category,
      filename: safeName,
      mimeType,
      sizeBytes: buffer.byteLength,
      storageKey,
      version: nextVersion,
      checksum,
      uploadedById: actor.id,
    },
  });

  await recordAuditEvent({
    eventType: "DOCUMENT",
    applicationId,
    actorId: actor.id,
    action: "UPLOAD",
    newJson: { filename: safeName, category, version: nextVersion, checksum },
  });

  return doc;
}

export async function readDocumentFile(storageKey: string): Promise<Buffer> {
  const root = documentsRoot();
  const resolved = path.resolve(root, storageKey);
  // Defense in depth against path traversal even though storageKey is
  // server-generated, never user-supplied, at the point of writing.
  if (!resolved.startsWith(path.resolve(root))) {
    throw new DocumentError("Invalid document path.", 400);
  }
  await stat(resolved); // throws if missing, surfaced as a clear 404 upstream
  return readFile(resolved);
}
