import type { CreateCompanyRequestInput } from "@minerales/contracts";
import { CompanyPlan } from "@minerales/types";

type CompanyRequestStatus = "pending" | "under_review" | "approved" | "rejected";

/**
 * Stored request model for company publication flow.
 */
export type CompanyRequestModel = Omit<CreateCompanyRequestInput, "requestedPlan" | "communeId"> & {
  id: string;
  requestedPlan: CompanyPlan;
  createdAt: string;
  status: CompanyRequestStatus;
  reviewNotes?: string;
  companyId?: string;
  communeId?: string;
  normalizedRegionCode?: string;
  normalizedCommuneId?: string;
};
