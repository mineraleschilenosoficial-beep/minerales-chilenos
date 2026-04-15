import { CompanyCategory, CompanyPlan } from "@minerales/types";

export const categoryLabels: Record<CompanyCategory, string> = {
  [CompanyCategory.LABORATORY]: "Laboratory",
  [CompanyCategory.CONSULTING]: "Consulting",
  [CompanyCategory.EQUIPMENT]: "Equipment",
  [CompanyCategory.EXPLOSIVES]: "Explosives",
  [CompanyCategory.SAFETY]: "Safety",
  [CompanyCategory.TRANSPORT]: "Transport",
  [CompanyCategory.SOFTWARE]: "Software",
  [CompanyCategory.ENGINEERING]: "Engineering"
};

export const planLabels: Record<CompanyPlan, string> = {
  [CompanyPlan.FREE]: "Free",
  [CompanyPlan.STANDARD]: "Standard",
  [CompanyPlan.PREMIUM]: "Premium"
};
