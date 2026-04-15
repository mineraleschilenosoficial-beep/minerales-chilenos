import { z } from "zod";
import { CompanyCategory, CompanyPlan, CompanyStatus } from "@minerales/types";

/**
 * Schema used by public forms and admin APIs to create supplier requests.
 */
export const createCompanyRequestSchema = z.object({
  name: z.string().min(2).max(160),
  tagline: z.string().min(2).max(240),
  description: z.string().min(10).max(2000),
  city: z.string().min(2).max(80),
  region: z.string().min(2).max(80),
  phone: z.string().min(6).max(40),
  email: z.string().email(),
  website: z.string().url().optional(),
  category: z.nativeEnum(CompanyCategory),
  requestedPlan: z.nativeEnum(CompanyPlan).default(CompanyPlan.FREE)
});

/**
 * Schema used in the admin panel to update a published company profile.
 */
export const updateCompanySchema = z.object({
  name: z.string().min(2).max(160).optional(),
  tagline: z.string().min(2).max(240).optional(),
  description: z.string().min(10).max(2000).optional(),
  city: z.string().min(2).max(80).optional(),
  region: z.string().min(2).max(80).optional(),
  phone: z.string().min(6).max(40).optional(),
  website: z.string().url().optional(),
  category: z.nativeEnum(CompanyCategory).optional(),
  plan: z.nativeEnum(CompanyPlan).optional(),
  status: z.nativeEnum(CompanyStatus).optional()
});

/**
 * Type-safe payload for company request creation.
 */
export type CreateCompanyRequestInput = z.infer<typeof createCompanyRequestSchema>;

/**
 * Type-safe payload for company profile updates.
 */
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
