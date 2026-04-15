import {
  companyListResponseSchema,
  companySchema,
  createCompanyRequestSchema,
  type Company
} from "@minerales/contracts";
import type { RequestFormState } from "../models/directory.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Fetches companies based on optional search and category filters.
 */
export async function fetchCompanies(params: {
  search: string;
  category: string;
}): Promise<Company[]> {
  const url = new URL("/companies", API_BASE_URL);

  if (params.search.trim().length > 0) {
    url.searchParams.set("search", params.search.trim());
  }
  if (params.category !== "all") {
    url.searchParams.set("category", params.category);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Failed to fetch companies");
  }

  const payload = await response.json();
  const parsedPayload = companyListResponseSchema.parse(payload);
  return parsedPayload.items;
}

/**
 * Fetches full profile details for one company.
 */
export async function fetchCompanyById(id: string): Promise<Company> {
  const response = await fetch(new URL(`/companies/${id}`, API_BASE_URL));
  if (!response.ok) {
    throw new Error("Failed to fetch company details");
  }

  const payload = await response.json();
  return companySchema.parse(payload);
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
    throw new Error("Failed to submit request");
  }
}
