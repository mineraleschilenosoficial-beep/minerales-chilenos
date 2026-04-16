import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { UserRole } from "@minerales/types";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../database/prisma.service";
import type { AuthenticatedUserModel } from "./models/authenticated-user.model";

type JwtPayload = {
  sub: string;
  email: string;
  roles: UserRole[];
};

/**
 * Passport JWT strategy that maps token payload to request user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "dev-jwt-secret-change-me"
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUserModel> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User is not active");
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((role) => this.toDomainRole(role.role))
    };
  }

  private toDomainRole(rawRole: "SUPER_ADMIN" | "STAFF" | "COMPANY_USER"): UserRole {
    switch (rawRole) {
      case "SUPER_ADMIN":
        return UserRole.SUPER_ADMIN;
      case "STAFF":
        return UserRole.STAFF;
      default:
        return UserRole.COMPANY_USER;
    }
  }
}
