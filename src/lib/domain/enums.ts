/**
 * Canonical vocabularies for the whole application.
 *
 * SQLite has no native enum type, so these values are stored as plain
 * strings and validated here (and via the Zod schemas in
 * src/lib/validation) before every write. Keeping one authoritative list per
 * concept — instead of scattering string literals — is what lets the UI,
 * API routes, workflow engine and tests all agree on the same terminology.
 *
 * CA = Credit Application. AT = Availment Ticket. These two abbreviations
 * are used consistently everywhere in this codebase; do not introduce
 * alternate expansions (e.g. "Corporate Application" or "Asset/Trade
 * Application", both of which appeared in the original design references
 * and are incorrect).
 */

export const REQUEST_TYPES = ["CA", "AT"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  CA: "Credit Application",
  AT: "Availment Ticket",
};

export const SUBTYPES = [
  "ANNUAL_REVIEW",
  "RESCHEDULING",
  "RESTRUCTURING",
  "WAIVER",
  "TEMP_EXCESS",
  "OTHER",
] as const;
export type Subtype = (typeof SUBTYPES)[number];

export const SUBTYPE_LABELS: Record<Subtype, string> = {
  ANNUAL_REVIEW: "Annual Review",
  RESCHEDULING: "Rescheduling",
  RESTRUCTURING: "Restructuring",
  WAIVER: "Waiver",
  TEMP_EXCESS: "Temporary Excess/Access",
  OTHER: "Other",
};

export const CUSTOMER_TYPES = [
  "CORPORATE",
  "SME",
  "INDIVIDUAL",
  "FINANCIAL_INSTITUTION",
  "OTHER",
] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

// The five departments/stations shared by both the Executive Control Tower
// 3D scene and the workflow engine. COMPLETED is a terminal pseudo-stage,
// not a station.
export const DEPARTMENTS = [
  "CORPORATE_FINANCE",
  "CREDIT_REVIEW",
  "APPROVAL_AUTHORITY",
  "CAD",
  "OPERATIONS",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const STAGES = [...DEPARTMENTS, "COMPLETED"] as const;
export type Stage = (typeof STAGES)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  CORPORATE_FINANCE: "Corporate Finance",
  CREDIT_REVIEW: "Credit Review",
  APPROVAL_AUTHORITY: "Approval Authority",
  CAD: "CAD",
  OPERATIONS: "Operations",
};

export const STAGE_LABELS: Record<Stage, string> = {
  ...DEPARTMENT_LABELS,
  COMPLETED: "Completed",
};

// Fine-grained position within a stage. Distinguishing substage from
// department/action-owner lets the documentation phase, for example, sit in
// the CAD department while the pending action belongs to the RM.
export const SUBSTAGES = [
  "SUBMITTED",
  "IN_REVIEW",
  "QUERY_RETURNED_TO_RM",
  "RESUBMITTED",
  "CLEARED_BY_RISK",
  "PENDING_APPROVAL",
  "APPROVAL_QUERY_VIA_RISK",
  "RISK_RESPONSE_TO_APPROVAL",
  "EXTERNAL_APPROVAL_RECORDED",
  "AWAITING_SIGNATURES",
  "SENT_TO_CAD",
  "CAD_REVIEW",
  "SENT_TO_OPERATIONS",
  "EXTERNAL_EXECUTION_RECORDED",
  "COMPLETED",
] as const;
export type Substage = (typeof SUBSTAGES)[number];

export const SUBSTAGE_LABELS: Record<Substage, string> = {
  SUBMITTED: "Submitted",
  IN_REVIEW: "In Review",
  QUERY_RETURNED_TO_RM: "Query — Returned to RM",
  RESUBMITTED: "Resubmitted",
  CLEARED_BY_RISK: "Cleared by Risk",
  PENDING_APPROVAL: "Pending with Approval Authority",
  APPROVAL_QUERY_VIA_RISK: "Approval Query (via Risk)",
  RISK_RESPONSE_TO_APPROVAL: "Risk Response to Approval Authority",
  EXTERNAL_APPROVAL_RECORDED: "External Approval Recorded",
  AWAITING_SIGNATURES: "Awaiting Customer Signatures",
  SENT_TO_CAD: "Sent to CAD",
  CAD_REVIEW: "CAD Final Review",
  SENT_TO_OPERATIONS: "Sent to Operations",
  EXTERNAL_EXECUTION_RECORDED: "External Execution Recorded",
  COMPLETED: "Completed",
};

// Workflow actions — every state transition is one of these, recorded on
// WorkflowEvent. See src/lib/workflow.ts for the transition table.
export const WORKFLOW_ACTIONS = [
  "SUBMIT",
  "RISK_RETURN_QUERY",
  "RM_RESUBMIT",
  "RISK_CLEAR",
  "APPROVAL_QUERY",
  "RISK_RESPOND_TO_APPROVAL",
  "RECORD_EXTERNAL_APPROVAL",
  "SEND_TO_CAD",
  "CAD_CLEAR", // also forwards the request on to Operations (steps 14-15 are one atomic transition)
  "RECORD_EXTERNAL_EXECUTION",
  "COMPLETE",
] as const;
export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

// Roles map to job function. Capabilities (below) are separately and
// explicitly granted — holding a role does not by itself unlock every
// capability associated with it, matching "configuration administration
// does not automatically grant access to credit documents".
export const ROLES = [
  "RM",
  "CORPORATE_FINANCE",
  "CREDIT_REVIEW",
  "APPROVAL_AUTHORITY",
  "CAD",
  "OPERATIONS",
  "CRO",
  "CHIEF_OF_CORPORATE",
  "SENIOR_MANAGEMENT",
  "AUTHORIZED_ADMINISTRATOR",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  RM: "Relationship Manager / Relationship Officer",
  CORPORATE_FINANCE: "Corporate Finance",
  CREDIT_REVIEW: "Credit Review / Risk",
  APPROVAL_AUTHORITY: "Approval Authority",
  CAD: "CAD",
  OPERATIONS: "Operations",
  CRO: "Chief Risk Officer",
  CHIEF_OF_CORPORATE: "Chief of Corporate",
  SENIOR_MANAGEMENT: "Senior Management",
  AUTHORIZED_ADMINISTRATOR: "Authorized Administrator",
};

export const CAPABILITIES = [
  "VIEW_APPLICATIONS",
  "CREATE_APPLICATION",
  "EDIT_OWN_APPLICATION",
  "RISK_REVIEW_ACTIONS",
  "APPROVAL_AUTHORITY_ACTIONS",
  "CAD_ACTIONS",
  "OPERATIONS_ACTIONS",
  "RECORD_EXTERNAL_APPROVAL",
  "RECORD_EXTERNAL_EXECUTION",
  "VIEW_RESTRICTED_DOCUMENTS",
  "VIEW_ANALYTICS",
  "MANAGE_CONFIG",
  "MANAGE_USERS",
  "VIEW_AUDIT_TRAIL",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const DOCUMENT_CATEGORIES = [
  "RM_SUBMISSION",
  "RISK_REVIEW",
  "APPROVAL_PACK",
  "CAD_DOCUMENTS",
  "OTHER",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  RM_SUBMISSION: "RM Submission",
  RISK_REVIEW: "Risk Review",
  APPROVAL_PACK: "Approval Pack",
  CAD_DOCUMENTS: "CAD Documents",
  OTHER: "Other",
};

export const QUERY_SOURCES = ["RISK", "APPROVAL_AUTHORITY"] as const;
export type QuerySource = (typeof QUERY_SOURCES)[number];

export const EXTERNAL_MILESTONE_TYPES = [
  "EXTERNAL_APPROVAL",
  "EXTERNAL_EXECUTION",
] as const;
export type ExternalMilestoneType = (typeof EXTERNAL_MILESTONE_TYPES)[number];

export const CONFIG_TYPES = [
  "ROUTING_MATRIX",
  "TAT_PROFILE",
  "CALENDAR",
  "SUBTYPE_MAPPING",
  "DOCUMENT_CHECKLIST",
  "NOTIFICATION_PREFS",
  "ASSIGNMENT_SCOPE",
] as const;
export type ConfigType = (typeof CONFIG_TYPES)[number];

export const CONFIG_TYPE_LABELS: Record<ConfigType, string> = {
  ROUTING_MATRIX: "Approval-Routing Matrix",
  TAT_PROFILE: "TAT Profile",
  CALENDAR: "Business Calendar",
  SUBTYPE_MAPPING: "Subtype Mapping",
  DOCUMENT_CHECKLIST: "Document Checklist",
  NOTIFICATION_PREFS: "Notification Preferences",
  ASSIGNMENT_SCOPE: "Assignment Scope",
};

export const CONFIG_STATUSES = ["DRAFT", "ACTIVE", "SUPERSEDED"] as const;
export type ConfigStatus = (typeof CONFIG_STATUSES)[number];

// Lifecycle populations shown on the dashboard. These are *computed*
// classifications over Application + WorkflowEvent history, never a stored
// status field, so they can never drift from the underlying records.
export const LIFECYCLE_POPULATIONS = [
  "CIRCULATED", // every application ever submitted (i.e. not left in an unsubmitted draft)
  "ACTIVE", // circulated, not completed
  "COMPLETED", // reached the COMPLETED stage
  "RETURNED", // currently sitting with the RM due to an open query
] as const;
export type LifecyclePopulation = (typeof LIFECYCLE_POPULATIONS)[number];

export function isRequestType(value: string): value is RequestType {
  return (REQUEST_TYPES as readonly string[]).includes(value);
}

export function isDepartment(value: string): value is Department {
  return (DEPARTMENTS as readonly string[]).includes(value);
}
