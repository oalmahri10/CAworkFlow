import { z } from "zod";
import { CAPABILITIES, DEPARTMENTS, DOCUMENT_CATEGORIES, REQUEST_TYPES, ROLES, SUBTYPES } from "@/lib/domain/enums";

// Each schema validates the `payloadJson` for one ConfigVersion.configType.
// Keeping these centralized means the configuration UI, the API routes and
// the routing/TAT engines all agree on exactly one shape per config type.

const minorAmountString = z.string().regex(/^\d+$/, "Must be a non-negative integer of minor units.");

export const routingMatrixSchema = z.object({
  currency: z.string().length(3),
  tiers: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        minMinor: minorAmountString,
        maxMinor: minorAmountString.nullable(),
        approvalAuthorityLabel: z.string().min(1),
        requiredCapability: z.enum(CAPABILITIES),
      })
    )
    .min(1, "At least one routing tier is required."),
});
export type RoutingMatrixPayload = z.infer<typeof routingMatrixSchema>;

export const tatProfileSchema = z.object({
  requestType: z.enum([...REQUEST_TYPES, "ALL"] as [string, ...string[]]),
  stage: z.enum(DEPARTMENTS),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  workingHourStart: z.string().regex(/^\d{2}:\d{2}$/),
  workingHourEnd: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  warningThresholdHours: z.number().positive(),
  escalationThresholdHours: z.number().positive(),
  calendarConfigVersionId: z.string().optional(),
  effectiveFrom: z.string().min(1),
});
export type TatProfilePayload = z.infer<typeof tatProfileSchema>;

export const calendarSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1),
  weekend: z.array(z.number().int().min(0).max(6)),
  holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});
export type CalendarPayload = z.infer<typeof calendarSchema>;

export const subtypeMappingSchema = z.object({
  mappings: z.array(
    z.object({
      requestType: z.enum(REQUEST_TYPES),
      subtype: z.enum(SUBTYPES),
      allowedDepartments: z.array(z.enum(DEPARTMENTS)).min(1),
    })
  ),
});
export type SubtypeMappingPayload = z.infer<typeof subtypeMappingSchema>;

export const documentChecklistSchema = z.object({
  requestType: z.enum([...REQUEST_TYPES, "ALL"] as [string, ...string[]]),
  subtype: z.enum([...SUBTYPES, "ALL"] as [string, ...string[]]),
  requiredItems: z
    .array(
      z.object({
        category: z.enum(DOCUMENT_CATEGORIES),
        description: z.string().min(1),
      })
    )
    .min(1),
});
export type DocumentChecklistPayload = z.infer<typeof documentChecklistSchema>;

export const notificationPrefsSchema = z.object({
  inAppEnabled: z.boolean(),
  emailRequested: z.boolean(), // administrator intent; actual sending also requires env provider config
});
export type NotificationPrefsPayload = z.infer<typeof notificationPrefsSchema>;

export const assignmentScopeSchema = z.object({
  scopesByRole: z.record(z.enum(ROLES), z.enum(["OWN", "TEAM", "ALL"])),
});
export type AssignmentScopePayload = z.infer<typeof assignmentScopeSchema>;

export const CONFIG_SCHEMAS = {
  ROUTING_MATRIX: routingMatrixSchema,
  TAT_PROFILE: tatProfileSchema,
  CALENDAR: calendarSchema,
  SUBTYPE_MAPPING: subtypeMappingSchema,
  DOCUMENT_CHECKLIST: documentChecklistSchema,
  NOTIFICATION_PREFS: notificationPrefsSchema,
  ASSIGNMENT_SCOPE: assignmentScopeSchema,
} as const;
