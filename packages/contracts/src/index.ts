import { z } from "zod";
import { CompanyCategory, CompanyPlan, CompanyStatus } from "@minerales/types";

/**
 * Category filter allowed for company listing queries.
 */
export const companyCategoryFilterSchema = z
  .union([z.literal("all"), z.nativeEnum(CompanyCategory)])
  .default("all");

/**
 * Query schema for company listing endpoint.
 */
export const companyListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: companyCategoryFilterSchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  sortBy: z.enum(["priority", "name", "recent"]).default("priority"),
  sortDirection: z.enum(["asc", "desc"]).default("desc")
});

/**
 * Core company schema exposed by API contracts.
 */
export const companySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(160),
  tagline: z.string().min(2).max(240),
  description: z.string().min(10).max(2000),
  city: z.string().min(2).max(80),
  region: z.string().min(2).max(80),
  phone: z.string().min(6).max(40),
  website: z.string().url().optional(),
  category: z.nativeEnum(CompanyCategory),
  plan: z.nativeEnum(CompanyPlan),
  status: z.nativeEnum(CompanyStatus)
});

/**
 * Listing response for the company directory endpoint.
 */
export const companyListResponseSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  items: z.array(companySchema)
});

/**
 * Aggregated metrics response for directory dashboards.
 */
export const companyMetricsSchema = z.object({
  totalCompanies: z.number().int().min(0),
  totalCategories: z.number().int().min(0),
  byPlan: z.object({
    [CompanyPlan.FREE]: z.number().int().min(0),
    [CompanyPlan.STANDARD]: z.number().int().min(0),
    [CompanyPlan.PREMIUM]: z.number().int().min(0)
  }),
  byCategory: z.array(
    z.object({
      category: z.nativeEnum(CompanyCategory),
      total: z.number().int().min(0)
    })
  )
});

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
 * Schema used to review a pending company request.
 */
export const reviewCompanyRequestSchema = z.object({
  status: z.enum(["under_review", "approved", "rejected"]),
  reviewNotes: z.string().max(2000).optional()
});

/**
 * Canonical status schema for company requests.
 */
export const companyRequestStatusSchema = z.enum([
  "pending",
  "under_review",
  "approved",
  "rejected"
]);

/**
 * Query schema for listing company requests.
 */
export const companyRequestListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z
    .union([z.literal("all"), companyRequestStatusSchema])
    .default("all"),
  createdAtOrder: z.enum(["newest", "oldest"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10)
});

/**
 * Query schema for exporting company requests as CSV.
 */
export const companyRequestExportQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z
    .union([z.literal("all"), companyRequestStatusSchema])
    .default("all"),
  createdAtOrder: z.enum(["newest", "oldest"]).default("newest")
});

/**
 * Company request schema returned by API.
 */
export const companyRequestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(160),
  tagline: z.string().min(2).max(240),
  description: z.string().min(10).max(2000),
  city: z.string().min(2).max(80),
  region: z.string().min(2).max(80),
  phone: z.string().min(6).max(40),
  email: z.string().email(),
  website: z.string().url().optional(),
  category: z.nativeEnum(CompanyCategory),
  requestedPlan: z.nativeEnum(CompanyPlan),
  status: companyRequestStatusSchema,
  createdAt: z.string(),
  reviewNotes: z.string().max(2000).optional(),
  companyId: z.string().min(1).optional()
});

/**
 * List response schema for company requests endpoint.
 */
export const companyRequestListResponseSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  items: z.array(companyRequestSchema)
});

/**
 * Response schema after request creation.
 */
export const createCompanyRequestResponseSchema = z.object({
  id: z.string().min(1),
  status: companyRequestStatusSchema
});

/**
 * Response schema after request review.
 */
export const reviewCompanyRequestResponseSchema = z.object({
  id: z.string().min(1),
  status: companyRequestStatusSchema,
  companyId: z.string().min(1).optional()
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

/**
 * Type-safe payload for request review actions.
 */
export type ReviewCompanyRequestInput = z.infer<typeof reviewCompanyRequestSchema>;

/**
 * Type-safe company request model.
 */
export type CompanyRequest = z.infer<typeof companyRequestSchema>;

/**
 * Type-safe company request list response.
 */
export type CompanyRequestListResponse = z.infer<typeof companyRequestListResponseSchema>;

/**
 * Type-safe company request list query payload.
 */
export type CompanyRequestListQuery = z.infer<typeof companyRequestListQuerySchema>;

/**
 * Type-safe company request export query payload.
 */
export type CompanyRequestExportQuery = z.infer<typeof companyRequestExportQuerySchema>;

/**
 * Type-safe company model used by frontend and backend.
 */
export type Company = z.infer<typeof companySchema>;

/**
 * Type-safe company listing response.
 */
export type CompanyListResponse = z.infer<typeof companyListResponseSchema>;

/**
 * Type-safe company list query payload.
 */
export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;

/**
 * Type-safe company metrics payload.
 */
export type CompanyMetrics = z.infer<typeof companyMetricsSchema>;
