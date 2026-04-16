import {
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
  reviewCompanyRequestResponseSchema,
  reviewCompanyRequestSchema,
  userListResponseSchema,
  userProfileSchema,
  type Company,
  type CompanyListResponse,
  type CompanyMetrics,
  type CompanyRequestListResponse,
  type UserProfile,
  type ReviewCompanyRequestInput
} from "@minerales/contracts";
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
  createdAtOrder?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
}): Promise<CompanyRequestListResponse> {
  const parsedQuery = companyRequestListQuerySchema.parse({
    search: params?.search,
    status: params?.status ?? "all",
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
  url.searchParams.set("createdAtOrder", parsedQuery.createdAtOrder);
  url.searchParams.set("page", String(parsedQuery.page));
  url.searchParams.set("pageSize", String(parsedQuery.pageSize));

  const response = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error(DIRECTORY_API_ERRORS.FETCH_COMPANY_REQUESTS_FAILED);
  }

  const payload = await response.json();
  return companyRequestListResponseSchema.parse(payload);
}

/**
 * Downloads company requests in CSV format using the same filtering rules as the list endpoint.
 */
export async function downloadCompanyRequestsCsv(params?: {
  search?: string;
  status?: "all" | "pending" | "under_review" | "approved" | "rejected";
  createdAtOrder?: "newest" | "oldest";
}): Promise<void> {
  const parsedQuery = companyRequestExportQuerySchema.parse({
    search: params?.search,
    status: params?.status ?? "all",
    createdAtOrder: params?.createdAtOrder ?? "newest"
  });

  const url = new URL("/company-requests/export.csv", API_BASE_URL);
  if (parsedQuery.search && parsedQuery.search.length > 0) {
    url.searchParams.set("search", parsedQuery.search);
  }
  if (parsedQuery.status !== "all") {
    url.searchParams.set("status", parsedQuery.status);
  }
  url.searchParams.set("createdAtOrder", parsedQuery.createdAtOrder);

  const response = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error(DIRECTORY_API_ERRORS.EXPORT_COMPANY_REQUESTS_FAILED);
  }

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

  const response = await fetch(new URL(`/company-requests/${requestId}/review`, API_BASE_URL), {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(parsedPayload satisfies ReviewCompanyRequestInput)
  });

  if (!response.ok) {
    throw new Error(DIRECTORY_API_ERRORS.REVIEW_COMPANY_REQUEST_FAILED);
  }

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
  }
  return parsedResponse.user;
}

/**
 * Fetches current operator profile from active JWT session.
 */
export async function fetchCurrentOperator(): Promise<UserProfile> {
  const response = await fetch(new URL("/auth/me", API_BASE_URL), {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error("SESSION_INVALID");
  }

  return userProfileSchema.parse(await response.json());
}

/**
 * Retrieves admin user list.
 */
export async function fetchAdminUsers(): Promise<{ total: number; items: UserProfile[] }> {
  const response = await fetch(new URL("/admin/users", API_BASE_URL), {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error("FETCH_ADMIN_USERS_FAILED");
  }

  return userListResponseSchema.parse(await response.json());
}

/**
 * Creates a new platform user.
 */
export async function createAdminUser(payload: unknown): Promise<UserProfile> {
  const parsedPayload = adminCreateUserSchema.parse(payload);
  const response = await fetch(new URL("/admin/users", API_BASE_URL), {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(parsedPayload)
  });
  if (!response.ok) {
    throw new Error("CREATE_ADMIN_USER_FAILED");
  }

  return userProfileSchema.parse(await response.json());
}

/**
 * Updates assigned roles for a platform user.
 */
export async function updateAdminUserRoles(userId: string, payload: unknown): Promise<UserProfile> {
  const parsedPayload = adminUpdateUserRolesSchema.parse(payload);
  const response = await fetch(new URL(`/admin/users/${userId}/roles`, API_BASE_URL), {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(parsedPayload)
  });
  if (!response.ok) {
    throw new Error("UPDATE_ADMIN_USER_ROLES_FAILED");
  }

  return userProfileSchema.parse(await response.json());
}

/**
 * Toggles active status for a platform user.
 */
export async function updateAdminUserActive(userId: string, payload: unknown): Promise<UserProfile> {
  const parsedPayload = adminUpdateUserActiveSchema.parse(payload);
  const response = await fetch(new URL(`/admin/users/${userId}/active`, API_BASE_URL), {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(parsedPayload)
  });
  if (!response.ok) {
    throw new Error("UPDATE_ADMIN_USER_ACTIVE_FAILED");
  }

  return userProfileSchema.parse(await response.json());
}

/**
 * Clears persisted operator session token.
 */
export function logoutOperator(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

/**
 * Returns whether an operator token exists in storage.
 */
export function hasOperatorSession(): boolean {
  return readOperatorToken().length > 0;
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
