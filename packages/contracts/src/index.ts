import { z } from "zod";
import { CompanyCategory, CompanyPlan, CompanyStatus, UserRole } from "@minerales/types";

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
  communeId: z.string().min(1).max(64),
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
  reviewNotes: z.string().max(2000).optional(),
  regionCode: z.string().trim().toUpperCase().min(2).max(16).optional(),
  communeId: z.string().min(1).max(64).optional()
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
  companyId: z.string().min(1).optional(),
  communeId: z.string().min(1).max(64),
  normalizedRegionCode: z.string().min(2).max(16).optional(),
  normalizedCommuneId: z.string().min(1).max(64).optional()
});

/**
 * List response schema for company requests endpoint.
 */
export const companyRequestListResponseSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  normalizationSummary: z.object({
    normalized: z.number().int().min(0),
    pending: z.number().int().min(0),
    total: z.number().int().min(0)
  }),
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
 * Role schema for authorization payloads.
 */
export const userRoleSchema = z.nativeEnum(UserRole);

/**
 * Schema for login requests.
 */
export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

/**
 * Schema for self-registration requests.
 */
export const authRegisterSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  password: z.string().min(8).max(128)
});

/**
 * User profile schema returned by auth and admin endpoints.
 */
export const userProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  isActive: z.boolean(),
  roles: z.array(userRoleSchema).min(1),
  createdAt: z.string()
});

/**
 * Auth response schema containing access token and user profile.
 */
export const authResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: userProfileSchema
});

/**
 * User list response schema for admin operations.
 */
export const userListResponseSchema = z.object({
  total: z.number().int().min(0),
  items: z.array(userProfileSchema)
});

/**
 * Schema for admin-created users.
 */
export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  password: z.string().min(8).max(128),
  roles: z.array(userRoleSchema).min(1)
});

/**
 * Schema for admin role updates.
 */
export const adminUpdateUserRolesSchema = z.object({
  roles: z.array(userRoleSchema).min(1)
});

/**
 * Schema for admin active status updates.
 */
export const adminUpdateUserActiveSchema = z.object({
  isActive: z.boolean()
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
 * Schema used by admin panel to create a published company profile.
 */
export const adminCreateCompanySchema = z.object({
  name: z.string().min(2).max(160),
  tagline: z.string().min(2).max(240),
  description: z.string().min(10).max(2000),
  city: z.string().min(2).max(80),
  region: z.string().min(2).max(80),
  phone: z.string().min(6).max(40),
  website: z.string().url().optional(),
  category: z.nativeEnum(CompanyCategory),
  plan: z.nativeEnum(CompanyPlan),
  status: z.nativeEnum(CompanyStatus).default(CompanyStatus.ACTIVE)
});

/**
 * Admin query schema for company management listing.
 */
export const adminCompanyListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.union([z.literal("all"), z.nativeEnum(CompanyStatus)]).default("all"),
  plan: z.union([z.literal("all"), z.nativeEnum(CompanyPlan)]).default("all"),
  category: z.union([z.literal("all"), z.nativeEnum(CompanyCategory)]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * Admin response schema for company management listing.
 */
export const adminCompanyListResponseSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  items: z.array(companySchema)
});

/**
 * Admin dashboard request preview schema.
 */
export const adminDashboardRequestPreviewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(160),
  status: companyRequestStatusSchema,
  createdAt: z.string(),
  email: z.string().email(),
  phone: z.string().min(6).max(40)
});

/**
 * Admin dashboard summary schema.
 */
export const adminDashboardSummarySchema = z.object({
  activeCompanies: z.number().int().min(0),
  pendingRequests: z.number().int().min(0),
  premiumCompanies: z.number().int().min(0),
  standardCompanies: z.number().int().min(0),
  requestsRecent: z.array(adminDashboardRequestPreviewSchema),
  byCategory: z.array(
    z.object({
      category: z.nativeEnum(CompanyCategory),
      total: z.number().int().min(0)
    })
  )
});

/**
 * Admin plans and revenue projection schema.
 */
export const adminPlansSummarySchema = z.object({
  premiumCompanies: z.number().int().min(0),
  standardCompanies: z.number().int().min(0),
  freeCompanies: z.number().int().min(0),
  totalCompanies: z.number().int().min(0),
  projectedMonthlyRevenueClp: z.number().int().min(0)
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
 * Type-safe payload for admin company creation.
 */
export type AdminCreateCompanyInput = z.infer<typeof adminCreateCompanySchema>;

/**
 * Type-safe payload for admin company list queries.
 */
export type AdminCompanyListQuery = z.infer<typeof adminCompanyListQuerySchema>;

/**
 * Type-safe response for admin company list endpoint.
 */
export type AdminCompanyListResponse = z.infer<typeof adminCompanyListResponseSchema>;

/**
 * Type-safe payload for admin dashboard summary.
 */
export type AdminDashboardSummary = z.infer<typeof adminDashboardSummarySchema>;

/**
 * Type-safe payload for admin plans summary.
 */
export type AdminPlansSummary = z.infer<typeof adminPlansSummarySchema>;

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
 * Type-safe login payload.
 */
export type AuthLoginInput = z.infer<typeof authLoginSchema>;

/**
 * Type-safe registration payload.
 */
export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;

/**
 * Type-safe authenticated user profile.
 */
export type UserProfile = z.infer<typeof userProfileSchema>;

/**
 * Type-safe auth response payload.
 */
export type AuthResponse = z.infer<typeof authResponseSchema>;

/**
 * Type-safe admin create-user payload.
 */
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

/**
 * Type-safe admin roles update payload.
 */
export type AdminUpdateUserRolesInput = z.infer<typeof adminUpdateUserRolesSchema>;

/**
 * Type-safe admin active update payload.
 */
export type AdminUpdateUserActiveInput = z.infer<typeof adminUpdateUserActiveSchema>;

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

/**
 * Country catalog item schema.
 */
export const locationCountrySchema = z.object({
  code: z.string().length(2),
  name: z.string().min(2).max(120),
  dialCode: z.string().max(20).optional(),
  emoji: z.string().max(8).optional()
});

/**
 * Region catalog item schema.
 */
export const locationRegionSchema = z.object({
  code: z.string().min(2).max(16),
  name: z.string().min(2).max(120),
  countryCode: z.string().length(2)
});

/**
 * Commune catalog item schema.
 */
export const locationCommuneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(120),
  identifier: z.string().max(40).optional(),
  regionCode: z.string().min(2).max(16),
  countryCode: z.string().length(2)
});

/**
 * Query schema for region catalog endpoint.
 */
export const locationRegionsQuerySchema = z.object({
  countryCode: z.string().trim().toUpperCase().length(2).default("CL")
});

/**
 * Query schema for commune catalog endpoint.
 */
export const locationCommunesQuerySchema = z.object({
  regionCode: z.string().trim().toUpperCase().min(2).max(16)
});

/**
 * Country catalog list response schema.
 */
export const locationCountriesResponseSchema = z.object({
  total: z.number().int().min(0),
  items: z.array(locationCountrySchema)
});

/**
 * Region catalog list response schema.
 */
export const locationRegionsResponseSchema = z.object({
  total: z.number().int().min(0),
  items: z.array(locationRegionSchema)
});

/**
 * Commune catalog list response schema.
 */
export const locationCommunesResponseSchema = z.object({
  total: z.number().int().min(0),
  items: z.array(locationCommuneSchema)
});

/**
 * Type-safe country catalog item.
 */
export type LocationCountry = z.infer<typeof locationCountrySchema>;

/**
 * Type-safe region catalog item.
 */
export type LocationRegion = z.infer<typeof locationRegionSchema>;

/**
 * Type-safe commune catalog item.
 */
export type LocationCommune = z.infer<typeof locationCommuneSchema>;

/**
 * Type-safe query for region catalog.
 */
export type LocationRegionsQuery = z.infer<typeof locationRegionsQuerySchema>;

/**
 * Type-safe query for commune catalog.
 */
export type LocationCommunesQuery = z.infer<typeof locationCommunesQuerySchema>;

/**
 * Type-safe response for country catalog endpoint.
 */
export type LocationCountriesResponse = z.infer<typeof locationCountriesResponseSchema>;

/**
 * Type-safe response for region catalog endpoint.
 */
export type LocationRegionsResponse = z.infer<typeof locationRegionsResponseSchema>;

/**
 * Type-safe response for commune catalog endpoint.
 */
export type LocationCommunesResponse = z.infer<typeof locationCommunesResponseSchema>;
