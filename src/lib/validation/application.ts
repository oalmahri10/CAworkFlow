import { z } from "zod";
import { CUSTOMER_TYPES, REQUEST_TYPES, SUBTYPES } from "@/lib/domain/enums";
import { isKnownCurrency } from "@/lib/money";

const decimalAmount = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "Enter a non-negative decimal amount.");

export const createApplicationSchema = z
  .object({
    croReference: z
      .string()
      .trim()
      .min(6, "CRO80 reference is required.")
      .max(60),
    requestType: z.enum(REQUEST_TYPES),
    subtype: z.enum(SUBTYPES),
    customerName: z.string().trim().min(1, "Customer name is required."),
    customerType: z.enum(CUSTOMER_TYPES),
    sector: z.string().trim().max(120).optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .refine((c) => isKnownCurrency(c), { message: "Unsupported currency for this deployment." }),
    totalGroupExposure: decimalAmount,
    relatedPartyExposure: decimalAmount,
    facilityAmount: decimalAmount.optional(),
    facilities: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          facilityType: z.string().trim().optional(),
          amount: decimalAmount,
          description: z.string().trim().optional(),
        })
      )
      .optional()
      .default([]),
  })
  .strict();

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const amendExposureSchema = z.object({
  totalGroupExposure: decimalAmount,
  relatedPartyExposure: decimalAmount,
  reason: z.string().trim().min(1, "Provide a reason for this amendment."),
  expectedVersion: z.number().int().nonnegative(),
});

export const queryResponseSchema = z.object({
  message: z.string().trim().min(1, "A response message is required."),
});

export const workflowActionSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().optional(),
  supportingReference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
