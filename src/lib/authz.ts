import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/lib/auth";
import type { DocumentCategory, Role } from "@/lib/domain/enums";
import { getActiveConfig } from "@/lib/config";

/**
 * Authorization rules for application and document visibility.
 *
 * Confirmed rules (from the product requirements) are implemented exactly;
 * anything the requirements mark as TBC (assignment scope beyond the
 * department queue, team-level visibility, and Operations' document access)
 * defaults to the most RESTRICTIVE interpretation until an administrator
 * configures an ASSIGNMENT_SCOPE. A locked document always comes with a
 * `reason` string so the UI can explain *why*, per the "a locked card alone
 * is not security" requirement — every one of these checks runs server-side
 * on every read, write, download, export and analytics call, not just in
 * the UI.
 */

const EXECUTIVE_ROLES: Role[] = [
  "CRO",
  "CHIEF_OF_CORPORATE",
  "SENIOR_MANAGEMENT",
  "AUTHORIZED_ADMINISTRATOR",
];

export type Decision = { allowed: boolean; reason: string };

function allow(reason: string): Decision {
  return { allowed: true, reason };
}
function deny(reason: string): Decision {
  return { allowed: false, reason };
}

/**
 * Builds a Prisma `where` fragment restricting which applications a user
 * may see at tracking level (stage, dates, action owner — not documents).
 * Executive roles get organization-wide visibility, matching their function
 * on the Executive Control Tower and Credit Intelligence pages. RM/Corporate
 * Finance default to their own initiated applications. Department roles see
 * applications that are currently, or have ever been, routed to their
 * department (the shared queue), which is the confirmed workflow, not TBC.
 */
export function applicationVisibilityWhere(
  user: AuthenticatedUser
): Prisma.ApplicationWhereInput {
  if (user.roles.some((r) => EXECUTIVE_ROLES.includes(r)) && user.capabilities.includes("VIEW_APPLICATIONS")) {
    return {}; // no restriction — organization-wide tracking visibility
  }

  const clauses: Prisma.ApplicationWhereInput[] = [];

  if (user.roles.includes("RM") || user.roles.includes("CORPORATE_FINANCE")) {
    clauses.push({ initiatingRmId: user.id });
  }
  if (user.roles.includes("CREDIT_REVIEW")) {
    clauses.push({ stageIntervals: { some: { department: "CREDIT_REVIEW" } } });
  }
  if (user.roles.includes("APPROVAL_AUTHORITY")) {
    clauses.push({ stageIntervals: { some: { department: "APPROVAL_AUTHORITY" } } });
  }
  if (user.roles.includes("CAD")) {
    clauses.push({ stageIntervals: { some: { department: "CAD" } } });
  }
  if (user.roles.includes("OPERATIONS")) {
    clauses.push({ stageIntervals: { some: { department: "OPERATIONS" } } });
  }
  // Anything explicitly assigned as action owner is always visible to that person.
  clauses.push({ actionOwnerId: user.id });

  if (clauses.length === 0) {
    // Restrictive default: no configured visibility at all.
    return { id: "__none__" };
  }
  return { OR: clauses };
}

type ApplicationForAuthz = {
  initiatingRmId: string;
  stageIntervals: { department: string }[];
  externalMilestones: { type: string }[];
};

/**
 * Whether `user` may view documents of `category` on `application`.
 * Every branch corresponds to a confirmed rule in the requirements; the
 * final fallback is the restrictive TBC default.
 */
export async function documentAccessDecision(
  user: AuthenticatedUser,
  application: ApplicationForAuthz,
  category: DocumentCategory
): Promise<Decision> {
  if (user.capabilities.includes("VIEW_RESTRICTED_DOCUMENTS")) {
    return allow("Explicit VIEW_RESTRICTED_DOCUMENTS capability granted by an administrator.");
  }

  const inCreditReview = application.stageIntervals.some((s) => s.department === "CREDIT_REVIEW");
  const inApprovalAuthority = application.stageIntervals.some(
    (s) => s.department === "APPROVAL_AUTHORITY"
  );
  const approvalRecorded = application.externalMilestones.some(
    (m) => m.type === "EXTERNAL_APPROVAL"
  );

  // "Documents applicable to their work" (narrower than "full documentation")
  // is read as the RM's own submission material, not Risk's or Approval
  // Authority's internal working documents.
  if (
    (user.roles.includes("RM") || user.roles.includes("CORPORATE_FINANCE")) &&
    application.initiatingRmId === user.id &&
    (category === "RM_SUBMISSION" || category === "OTHER")
  ) {
    return allow("Corporate Finance / RM document access to their own submission.");
  }

  if (user.roles.includes("CREDIT_REVIEW") && user.capabilities.includes("RISK_REVIEW_ACTIONS")) {
    if (inCreditReview) {
      return allow("Risk has full documentation access for an application routed to Credit Review.");
    }
    return deny("This application has not been routed to Credit Review.");
  }

  // Approval Authority sees what it needs to decide (submission, Risk's
  // findings, the approval pack itself) but not CAD's post-approval
  // documentation, which does not exist for their decision yet anyway.
  if (
    user.roles.includes("APPROVAL_AUTHORITY") &&
    user.capabilities.includes("APPROVAL_AUTHORITY_ACTIONS") &&
    category !== "CAD_DOCUMENTS"
  ) {
    if (inApprovalAuthority) {
      return allow("Approval Authority document access for an application routed for approval.");
    }
    return deny("This application has not been routed to Approval Authority.");
  }

  if (user.roles.includes("CAD") && user.capabilities.includes("CAD_ACTIONS")) {
    if (approvalRecorded) {
      return allow("CAD document access unlocked — final external approval is recorded.");
    }
    return deny("CAD document access unlocks only after final approval is recorded.");
  }

  const scope = await getAssignmentScope(user.roles);
  if (scope === "ALL") {
    return allow("Assignment scope configured as organization-wide by an administrator.");
  }

  return deny(
    "No configured document access for this application. Assignment scope and " +
      "general document access beyond confirmed roles remain TBC; access defaults " +
      "to restrictive until an administrator configures it."
  );
}

/** Reads the ASSIGNMENT_SCOPE config (TBC until an administrator sets one). */
export async function getAssignmentScope(roles: Role[]): Promise<"OWN" | "TEAM" | "ALL"> {
  const config = await getActiveConfig("ASSIGNMENT_SCOPE");
  if (!config) return "OWN"; // restrictive default
  try {
    const payload = JSON.parse(config.payloadJson) as {
      scopesByRole?: Record<string, "OWN" | "TEAM" | "ALL">;
    };
    for (const role of roles) {
      const scope = payload.scopesByRole?.[role];
      if (scope) return scope;
    }
  } catch {
    // malformed config payload — fail closed
  }
  return "OWN";
}

export function isExecutiveRole(roles: Role[]): boolean {
  return roles.some((r) => EXECUTIVE_ROLES.includes(r));
}
