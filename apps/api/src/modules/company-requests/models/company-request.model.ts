import type { CreateCompanyRequestInput } from "@minerales/contracts";

/**
 * Stored request model for company publication flow.
 */
export type CompanyRequestModel = CreateCompanyRequestInput & {
  id: string;
  createdAt: string;
  status: "pending";
};
