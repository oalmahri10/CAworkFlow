import { z } from "zod";
import { CAPABILITIES, ROLES } from "@/lib/domain/enums";

export const createUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(10, "Use at least 10 characters."),
  roles: z.array(z.enum(ROLES)).default([]),
  capabilities: z.array(z.enum(CAPABILITIES)).default([]),
});

export const roleAssignmentSchema = z.object({ role: z.enum(ROLES) });
export const capabilityAssignmentSchema = z.object({ capability: z.enum(CAPABILITIES) });

export const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
});
