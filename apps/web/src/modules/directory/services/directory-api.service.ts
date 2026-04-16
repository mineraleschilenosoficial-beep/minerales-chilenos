import {
  companyListQuerySchema,
  companyListResponseSchema,
  companyMetricsSchema,
  companySchema,
  createCompanyRequestSchema,
  type Company,
  type CompanyListResponse,
  type CompanyMetrics
} from "@minerales/contracts";
import type { RequestFormState } from "../models/directory.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const DIRECTORY_API_ERRORS = {
  FETCH_COMPANIES_FAILED: "FETCH_COMPANIES_FAILED",
  FETCH_COMPANY_DETAILS_FAILED: "FETCH_COMPANY_DETAILS_FAILED",
  FETCH_COMPANY_METRICS_FAILED: "FETCH_COMPANY_METRICS_FAILED",
  SUBMIT_COMPANY_REQUEST_FAILED: "SUBMIT_COMPANY_REQUEST_FAILED"
} as const;

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
