import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@minerales/types";

export const ROLES_METADATA_KEY = "roles";

/**
 * Declares required global roles for an endpoint.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_METADATA_KEY, roles);
