import { UserRole } from "@minerales/types";

/**
 * Authenticated user payload available in request context.
 */
export type AuthenticatedUserModel = {
  id: string;
  email: string;
  roles: UserRole[];
};
