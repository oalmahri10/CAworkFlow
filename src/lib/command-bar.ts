import type { Prisma } from "@prisma/client";
import { DEPARTMENT_LABELS, DEPARTMENTS, type Department } from "@/lib/domain/enums";

/**
 * Local, deterministic command-bar parsing ("Ask Credit Intelligence" /
 * "Show applications approaching configured TAT"). This is explicitly
 * rule-based pattern matching over a fixed set of supported phrasings — it
 * is labelled as such in the UI, never presented as AI-generated, and never
 * silently guesses at an unsupported query. See EXAMPLE_COMMANDS for the
 * full supported set.
 */

export const EXAMPLE_COMMANDS = [
  "Show active ATs",
  "Show active CAs",
  "Show applications pending with Risk",
  "Show applications pending with Approval Authority",
  "Show applications pending with CAD",
  "Show applications pending with Operations",
  "Find CRO80-CA-2026-0001",
  "Show requests returned more than once",
  "Show completed applications",
];

export type CommandResult =
  | { matched: true; description: string; where: Prisma.ApplicationWhereInput }
  | { matched: false; message: string };

const DEPARTMENT_BY_ALIAS: Record<string, Department> = {
  risk: "CREDIT_REVIEW",
  "credit review": "CREDIT_REVIEW",
  "approval authority": "APPROVAL_AUTHORITY",
  approval: "APPROVAL_AUTHORITY",
  cad: "CAD",
  operations: "OPERATIONS",
  "corporate finance": "CORPORATE_FINANCE",
};

export function parseCommand(raw: string): CommandResult {
  const input = raw.trim().toLowerCase();
  if (!input) {
    return { matched: false, message: `Type a command. Try: "${EXAMPLE_COMMANDS[0]}".` };
  }

  if (/^show active ats?$/.test(input)) {
    return {
      matched: true,
      description: "Active Availment Tickets (AT)",
      where: { requestType: "AT", currentDepartment: { not: "COMPLETED" } },
    };
  }
  if (/^show active cas?$/.test(input)) {
    return {
      matched: true,
      description: "Active Credit Applications (CA)",
      where: { requestType: "CA", currentDepartment: { not: "COMPLETED" } },
    };
  }
  if (/^show completed applications?$/.test(input)) {
    return {
      matched: true,
      description: "Completed applications",
      where: { currentDepartment: "COMPLETED" },
    };
  }
  if (/^show requests returned more than once$/.test(input)) {
    return {
      matched: true,
      description: "Requests returned more than once (2+ review cycles)",
      where: { reviewCycles: { some: { cycleNumber: { gt: 1 } } } },
    };
  }

  const pendingMatch = input.match(/^show applications pending with (.+)$/);
  if (pendingMatch) {
    const alias = pendingMatch[1].trim();
    const department = DEPARTMENT_BY_ALIAS[alias];
    if (department) {
      return {
        matched: true,
        description: `Pending with ${DEPARTMENT_LABELS[department]}`,
        where: { currentDepartment: department },
      };
    }
    return {
      matched: false,
      message: `Unknown department "${pendingMatch[1]}". Known: ${DEPARTMENTS.map((d) => DEPARTMENT_LABELS[d]).join(", ")}.`,
    };
  }

  const findMatch = raw.trim().match(/^find\s+(.+)$/i);
  if (findMatch) {
    const reference = findMatch[1].trim();
    return {
      matched: true,
      description: `Search for "${reference}"`,
      where: {
        OR: [
          { croReference: { contains: reference } },
          { customerName: { contains: reference } },
        ],
      },
    };
  }

  return {
    matched: false,
    message: `Unsupported command. Try one of: ${EXAMPLE_COMMANDS.join(" · ")}`,
  };
}
