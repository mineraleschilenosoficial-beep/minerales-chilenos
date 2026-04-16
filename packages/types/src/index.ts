/**
 * Company listing plans available in the platform.
 */
export enum CompanyPlan {
  FREE = "free",
  STANDARD = "standard",
  PREMIUM = "premium"
}

/**
 * Lifecycle statuses for a company profile.
 */
export enum CompanyStatus {
  ACTIVE = "active",
  INACTIVE = "inactive"
}

/**
 * Supported categories in the mining supplier directory.
 */
export enum CompanyCategory {
  LABORATORY = "laboratory",
  CONSULTING = "consulting",
  EQUIPMENT = "equipment",
  EXPLOSIVES = "explosives",
  SAFETY = "safety",
  TRANSPORT = "transport",
  SOFTWARE = "software",
  ENGINEERING = "engineering"
}

/**
 * Global authorization roles for platform access.
 */
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  STAFF = "staff",
  COMPANY_USER = "company_user"
}

/**
 * Generic identifier for persisted entities.
 */
export type EntityId = string;
