import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUserModel } from "../models/authenticated-user.model";

/**
 * Returns the authenticated user from current request.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUserModel | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUserModel }>();
    return request.user;
  }
);
