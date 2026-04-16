import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@minerales/types";
import { ROLES_METADATA_KEY } from "../decorators/roles.decorator";
import type { AuthenticatedUserModel } from "../models/authenticated-user.model";

/**
 * Guard that enforces role-based access control.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_METADATA_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUserModel }>();
    const userRoles = request.user?.roles ?? [];

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
