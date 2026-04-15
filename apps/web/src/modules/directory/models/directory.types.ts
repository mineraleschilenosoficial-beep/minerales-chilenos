import type { Company } from "@minerales/contracts";
import { CompanyCategory, CompanyPlan } from "@minerales/types";

export type CompanyListResponse = {
  total: number;
  items: Company[];
};

export type RequestFormState = {
  name: string;
  tagline: string;
  description: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  website: string;
  category: CompanyCategory;
  requestedPlan: CompanyPlan;
};

export const initialRequestFormState: RequestFormState = {
  name: "",
  tagline: "",
  description: "",
  city: "",
  region: "",
  phone: "",
  email: "",
  website: "",
  category: CompanyCategory.LABORATORY,
  requestedPlan: CompanyPlan.FREE
};
