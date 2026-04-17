import {
  adminCompanyListQuerySchema,
  adminCompanyListResponseSchema,
  adminCreateCompanySchema,
  adminDashboardSummarySchema,
  adminPlansSummarySchema,
  adminCreateUserSchema,
  adminUpdateUserActiveSchema,
  adminUpdateUserRolesSchema,
  authLoginSchema,
  authResponseSchema,
  companyListQuerySchema,
  companyListResponseSchema,
  companyMetricsSchema,
  companyRequestExportQuerySchema,
  companyRequestListQuerySchema,
  companyRequestListResponseSchema,
  companySchema,
  createCompanyRequestSchema,
  locationCommunesQuerySchema,
  locationCommunesResponseSchema,
  locationCountriesResponseSchema,
  locationRegionsResponseSchema,
  reviewCompanyRequestResponseSchema,
  reviewCompanyRequestSchema,
  updateCompanySchema,
  userListResponseSchema,
  userProfileSchema,
  type Company,
  type CompanyListResponse,
  type CompanyMetrics,
  type CompanyRequestListResponse,
  type LocationCommunesResponse,
  type LocationCountriesResponse,
  type LocationRegionsResponse,
  type AdminDashboardSummary,
  type AdminPlansSummary,
  type UserProfile,
  type ReviewCompanyRequestInput
} from "@minerales/contracts";
import { CompanyCategory } from "@minerales/types";
import type { RequestFormState } from "../models/directory.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const DIRECTORY_API_ERRORS = {
  FETCH_COMPANIES_FAILED: "FETCH_COMPANIES_FAILED",
  FETCH_COMPANY_DETAILS_FAILED: "FETCH_COMPANY_DETAILS_FAILED",
  FETCH_COMPANY_METRICS_FAILED: "FETCH_COMPANY_METRICS_FAILED",
  FETCH_COMPANY_REQUESTS_FAILED: "FETCH_COMPANY_REQUESTS_FAILED",
  EXPORT_COMPANY_REQUESTS_FAILED: "EXPORT_COMPANY_REQUESTS_FAILED",
  SUBMIT_COMPANY_REQUEST_FAILED: "SUBMIT_COMPANY_REQUEST_FAILED",
  REVIEW_COMPANY_REQUEST_FAILED: "REVIEW_COMPANY_REQUEST_FAILED"
} as const;

const AUTH_TOKEN_STORAGE_KEY = "mc.auth.token";
const AUTH_SESSION_COOKIE_KEY = "mc.auth.session";
export const AUTH_SESSION_INVALID_EVENT = "mc:auth-session-invalid";
const AUTH_ERRORS = {
  SESSION_INVALID: "SESSION_INVALID"
} as const;

function resolveCsvFilename(
  contentDispositionHeader: string | null,
  fallbackPrefix: string
): string {
  if (contentDispositionHeader) {
    const match =
      /filename\*=UTF-8''([^;]+)/i.exec(contentDispositionHeader) ??
      /filename="?([^"]+)"?/i.exec(contentDispositionHeader);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${fallbackPrefix}-${timestamp}.csv`;
}

/**
 * Fetches companies based on optional search and category filters.
 */
export async function fetchCompanies(params: {
  search: string;
  category: string;
  page: number;
  pageSize: number;
  sortBy: "priority" | "name" | "recent";
  sortDirection: "asc" | "desc";
}): Promise<CompanyListResponse> {
  const parsedQuery = companyListQuerySchema.parse(params);
  const url = new URL("/companies", API_BASE_URL);

  if (parsedQuery.search && parsedQuery.search.length > 0) {
    url.searchParams.set("search", parsedQuery.search);
  }
  if (parsedQuery.category !== "all") {
    url.searchParams.set("category", parsedQuery.category);
  }
  url.searchParams.set("page", String(parsedQuery.page));
  url.searchParams.set("pageSize", String(parsedQuery.pageSize));
  url.searchParams.set("sortBy", parsedQuery.sortBy);
  url.searchParams.set("sortDirection", parsedQuery.sortDirection);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(DIRECTORY_API_ERRORS.FETCH_COMPANIES_FAILED);
  }

  const payload = await response.json();
  return companyListResponseSchema.parse(payload);
}

/**
 * Fetches full profile details for one company.
 */
export async function fetchCompanyById(id: string): Promise<Company> {
  const response = await fetch(new URL(`/companies/${id}`, API_BASE_URL));
  if (!response.ok) {
    throw new Error(DIRECTORY_API_ERRORS.FETCH_COMPANY_DETAILS_FAILED);
  }

  const payload = await response.json();
  return companySchema.parse(payload);
}

/**
 * Fetches aggregate metrics for directory insights.
 */
export async function fetchCompanyMetrics(): Promise<CompanyMetrics> {
  const response = await fetch(new URL("/companies/metrics", API_BASE_URL));
  if (!response.ok) {
    throw new Error(DIRECTORY_API_ERRORS.FETCH_COMPANY_METRICS_FAILED);
  }

  const payload = await response.json();
  return companyMetricsSchema.parse(payload);
}

/**
 * Submits a company publication request.
 */
export async function submitCompanyRequest(formState: RequestFormState): Promise<void> {
  const payload = {
    ...formState,
    website: formState.website.trim() || undefined
  };

  const parsedPayload = createCompanyRequestSchema.parse(payload);

  const response = await fetch(new URL("/company-requests", API_BASE_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(parsedPayload)
  });

  if (!response.ok) {
    throw new Error(DIRECTORY_API_ERRORS.SUBMIT_COMPANY_REQUEST_FAILED);
  }
}

/**
 * Fetches company publication requests for internal operations.
 */
export async function fetchCompanyRequests(params?: {
  search?: string;
  status?: "all" | "pending" | "under_review" | "approved" | "rejected";
  normalizedLocation?: "all" | "normalized" | "pending_normalization";
  createdAtOrder?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
}): Promise<CompanyRequestListResponse> {
  const parsedQuery = companyRequestListQuerySchema.parse({
    search: params?.search,
    status: params?.status ?? "all",
    normalizedLocation: params?.normalizedLocation ?? "all",
    createdAtOrder: params?.createdAtOrder ?? "newest",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 10
  });
  const url = new URL("/company-requests", API_BASE_URL);
  if (parsedQuery.search && parsedQuery.search.length > 0) {
    url.searchParams.set("search", parsedQuery.search);
  }
  if (parsedQuery.status !== "all") {
    url.searchParams.set("status", parsedQuery.status);
  }
  const normalizedLocationFilter =
    (parsedQuery as unknown as { normalizedLocation?: "all" | "normalized" | "pending_normalization" })
      .normalizedLocation ?? "all";
  if (normalizedLocationFilter !== "all") {
    url.searchParams.set("normalizedLocation", normalizedLocationFilter);
  }
  url.searchParams.set("createdAtOrder", parsedQuery.createdAtOrder);
  url.searchParams.set("page", String(parsedQuery.page));
  url.searchParams.set("pageSize", String(parsedQuery.pageSize));

  const response = await fetchWithAuth(url, undefined, DIRECTORY_API_ERRORS.FETCH_COMPANY_REQUESTS_FAILED);

  const payload = await response.json();
  return companyRequestListResponseSchema.parse(payload);
}

/**
 * Downloads company requests in CSV format using the same filtering rules as the list endpoint.
 */
export async function downloadCompanyRequestsCsv(params?: {
  search?: string;
  status?: "all" | "pending" | "under_review" | "approved" | "rejected";
  normalizedLocation?: "all" | "normalized" | "pending_normalization";
  createdAtOrder?: "newest" | "oldest";
}): Promise<void> {
  const parsedQuery = companyRequestExportQuerySchema.parse({
    search: params?.search,
    status: params?.status ?? "all",
    normalizedLocation: params?.normalizedLocation ?? "all",
    createdAtOrder: params?.createdAtOrder ?? "newest"
  });

  const url = new URL("/company-requests/export.csv", API_BASE_URL);
  if (parsedQuery.search && parsedQuery.search.length > 0) {
    url.searchParams.set("search", parsedQuery.search);
  }
  if (parsedQuery.status !== "all") {
    url.searchParams.set("status", parsedQuery.status);
  }
  const normalizedLocationExportFilter =
    (parsedQuery as unknown as { normalizedLocation?: "all" | "normalized" | "pending_normalization" })
      .normalizedLocation ?? "all";
  if (normalizedLocationExportFilter !== "all") {
    url.searchParams.set("normalizedLocation", normalizedLocationExportFilter);
  }
  url.searchParams.set("createdAtOrder", parsedQuery.createdAtOrder);

  const response = await fetchWithAuth(
    url,
    undefined,
    DIRECTORY_API_ERRORS.EXPORT_COMPANY_REQUESTS_FAILED
  );

  const csvContent = await response.text();
  const contentDisposition = response.headers.get("Content-Disposition");
  const fileName = resolveCsvFilename(contentDisposition, "company-requests");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
}

/**
 * Reviews one company request.
 */
export async function reviewCompanyRequest(requestId: string, payload: unknown): Promise<void> {
  const parsedPayload = reviewCompanyRequestSchema.parse(payload);

  const response = await fetchWithAuth(
    new URL(`/company-requests/${requestId}/review`, API_BASE_URL),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(parsedPayload satisfies ReviewCompanyRequestInput)
    },
    DIRECTORY_API_ERRORS.REVIEW_COMPANY_REQUEST_FAILED
  );

  const responsePayload = await response.json();
  reviewCompanyRequestResponseSchema.parse(responsePayload);
}

/**
 * Authenticates an operator and stores JWT for protected API calls.
 */
export async function loginOperator(email: string, password: string): Promise<UserProfile> {
  const payload = authLoginSchema.parse({ email, password });
  const response = await fetch(new URL("/auth/login", API_BASE_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("LOGIN_FAILED");
  }

  const parsedResponse = authResponseSchema.parse(await response.json());
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, parsedResponse.accessToken);
    writeOperatorSessionCookie(true);
  }
  return parsedResponse.user;
}

/**
 * Fetches current operator profile from active JWT session.
 */
export async function fetchCurrentOperator(): Promise<UserProfile> {
  const response = await fetchWithAuth(new URL("/auth/me", API_BASE_URL), undefined, "FETCH_ME_FAILED");

  return userProfileSchema.parse(await response.json());
}

/**
 * Retrieves admin user list.
 */
export async function fetchAdminUsers(): Promise<{ total: number; items: UserProfile[] }> {
  const response = await fetchWithAuth(
    new URL("/admin/users", API_BASE_URL),
    undefined,
    "FETCH_ADMIN_USERS_FAILED"
  );

  return userListResponseSchema.parse(await response.json());
}

/**
 * Creates a new platform user.
 */
export async function createAdminUser(payload: unknown): Promise<UserProfile> {
  const parsedPayload = adminCreateUserSchema.parse(payload);
  const response = await fetchWithAuth(
    new URL("/admin/users", API_BASE_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(parsedPayload)
    },
    "CREATE_ADMIN_USER_FAILED"
  );

  return userProfileSchema.parse(await response.json());
}

/**
 * Updates assigned roles for a platform user.
 */
export async function updateAdminUserRoles(userId: string, payload: unknown): Promise<UserProfile> {
  const parsedPayload = adminUpdateUserRolesSchema.parse(payload);
  const response = await fetchWithAuth(
    new URL(`/admin/users/${userId}/roles`, API_BASE_URL),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(parsedPayload)
    },
    "UPDATE_ADMIN_USER_ROLES_FAILED"
  );

  return userProfileSchema.parse(await response.json());
}

/**
 * Toggles active status for a platform user.
 */
export async function updateAdminUserActive(userId: string, payload: unknown): Promise<UserProfile> {
  const parsedPayload = adminUpdateUserActiveSchema.parse(payload);
  const response = await fetchWithAuth(
    new URL(`/admin/users/${userId}/active`, API_BASE_URL),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(parsedPayload)
    },
    "UPDATE_ADMIN_USER_ACTIVE_FAILED"
  );

  return userProfileSchema.parse(await response.json());
}

/**
 * Retrieves admin company list with search/status/plan filters.
 */
export async function fetchAdminCompanies(params?: {
  search?: string;
  status?: "all" | "active" | "inactive";
  plan?: "all" | "free" | "standard" | "premium";
  category?: "all" | CompanyCategory;
  page?: number;
  pageSize?: number;
}): Promise<{
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: Company[];
}> {
  const parsedQuery = adminCompanyListQuerySchema.parse({
    search: params?.search,
    status: params?.status ?? "all",
    plan: params?.plan ?? "all",
    category: params?.category ?? "all",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20
  });

  const url = new URL("/companies/admin/companies", API_BASE_URL);
  if (parsedQuery.search && parsedQuery.search.length > 0) {
    url.searchParams.set("search", parsedQuery.search);
  }
  if (parsedQuery.status !== "all") {
    url.searchParams.set("status", parsedQuery.status);
  }
  if (parsedQuery.plan !== "all") {
    url.searchParams.set("plan", parsedQuery.plan);
  }
  if (parsedQuery.category !== "all") {
    url.searchParams.set("category", parsedQuery.category);
  }
  url.searchParams.set("page", String(parsedQuery.page));
  url.searchParams.set("pageSize", String(parsedQuery.pageSize));

  const response = await fetchWithAuth(url, undefined, "FETCH_ADMIN_COMPANIES_FAILED");

  return adminCompanyListResponseSchema.parse(await response.json());
}

/**
 * Creates one company from admin panel.
 */
export async function createAdminCompany(payload: unknown): Promise<Company> {
  const parsedPayload = adminCreateCompanySchema.parse(payload);
  const response = await fetchWithAuth(
    new URL("/companies/admin/companies", API_BASE_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(parsedPayload)
    },
    "CREATE_ADMIN_COMPANY_FAILED"
  );
  return companySchema.parse(await response.json());
}

/**
 * Updates one company from admin panel.
 */
export async function updateAdminCompany(companyId: string, payload: unknown): Promise<Company> {
  const parsedPayload = updateCompanySchema.parse(payload);
  const response = await fetchWithAuth(
    new URL(`/companies/admin/companies/${companyId}`, API_BASE_URL),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(parsedPayload)
    },
    "UPDATE_ADMIN_COMPANY_FAILED"
  );
  return companySchema.parse(await response.json());
}

/**
 * Deletes one company from admin panel.
 */
export async function deleteAdminCompany(companyId: string): Promise<void> {
  await fetchWithAuth(
    new URL(`/companies/admin/companies/${companyId}`, API_BASE_URL),
    {
      method: "DELETE"
    },
    "DELETE_ADMIN_COMPANY_FAILED"
  );
}

/**
 * Retrieves dashboard counters and recent requests for admin panel.
 */
export async function fetchAdminDashboard(): Promise<AdminDashboardSummary> {
  const response = await fetchWithAuth(
    new URL("/companies/admin/dashboard", API_BASE_URL),
    undefined,
    "FETCH_ADMIN_DASHBOARD_FAILED"
  );
  return adminDashboardSummarySchema.parse(await response.json());
}

/**
 * Retrieves plan/revenue summary for admin panel.
 */
export async function fetchAdminPlansSummary(): Promise<AdminPlansSummary> {
  const response = await fetchWithAuth(
    new URL("/companies/admin/plans/summary", API_BASE_URL),
    undefined,
    "FETCH_ADMIN_PLANS_FAILED"
  );
  return adminPlansSummarySchema.parse(await response.json());
}

/**
 * Retrieves active country catalog.
 */
export async function fetchLocationCountries(): Promise<LocationCountriesResponse> {
  const response = await fetch(new URL("/locations/countries", API_BASE_URL));
  if (!response.ok) {
    throw new Error("FETCH_LOCATION_COUNTRIES_FAILED");
  }
  return locationCountriesResponseSchema.parse(await response.json());
}

/**
 * Retrieves active region catalog for one country code.
 */
export async function fetchLocationRegions(countryCode = "CL"): Promise<LocationRegionsResponse> {
  const url = new URL("/locations/regions", API_BASE_URL);
  url.searchParams.set("countryCode", countryCode);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("FETCH_LOCATION_REGIONS_FAILED");
  }
  return locationRegionsResponseSchema.parse(await response.json());
}

/**
 * Retrieves active commune catalog for one region code.
 */
export async function fetchLocationCommunes(regionCode: string): Promise<LocationCommunesResponse> {
  const parsedQuery = locationCommunesQuerySchema.parse({ regionCode });
  const url = new URL("/locations/communes", API_BASE_URL);
  url.searchParams.set("regionCode", parsedQuery.regionCode);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("FETCH_LOCATION_COMMUNES_FAILED");
  }
  return locationCommunesResponseSchema.parse(await response.json());
}

/**
 * Clears persisted operator session token.
 */
export function logoutOperator(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    writeOperatorSessionCookie(false);
  }
}

/**
 * Returns whether an operator token exists in storage.
 */
export function hasOperatorSession(): boolean {
  return readOperatorToken().length > 0;
}

/**
 * Synchronizes browser session cookie with current local token state for route guards.
 */
export function syncOperatorSessionCookie(): void {
  writeOperatorSessionCookie(hasOperatorSession());
}

function readOperatorToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "";
}

function getAuthHeaders(): Record<string, string> {
  const token = readOperatorToken();
  if (token.length === 0) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`
  };
}

async function fetchWithAuth(
  input: URL | string,
  init: RequestInit | undefined,
  fallbackErrorCode: string
): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      logoutOperator();
      emitSessionInvalidEvent();
      throw new Error(AUTH_ERRORS.SESSION_INVALID);
    }
    throw new Error(fallbackErrorCode);
  }

  return response;
}

function emitSessionInvalidEvent(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_INVALID_EVENT));
}

function writeOperatorSessionCookie(isActive: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  const maxAge = isActive ? 60 * 60 * 24 * 7 : 0;
  document.cookie = `${AUTH_SESSION_COOKIE_KEY}=${isActive ? "1" : ""}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
