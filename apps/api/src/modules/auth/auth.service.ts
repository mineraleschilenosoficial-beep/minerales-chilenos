import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  authLoginSchema,
  authRegisterSchema,
  authResponseSchema,
  userProfileSchema
} from "@minerales/contracts";
import { UserRole } from "@minerales/types";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../../database/prisma.service";

/**
 * Service responsible for JWT authentication and identity retrieval.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(payload: unknown) {
    const parsedPayload = authRegisterSchema.parse(payload);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: parsedPayload.email.toLowerCase() }
    });
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await hash(parsedPayload.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: parsedPayload.email.toLowerCase(),
        fullName: parsedPayload.fullName,
        passwordHash,
        roles: {
          create: [{ role: "COMPANY_USER" }]
        }
      },
      include: { roles: true }
    });

    return authResponseSchema.parse({
      accessToken: this.signToken(user.id, user.email, [UserRole.COMPANY_USER]),
      user: this.mapUserProfile(user)
    });
  }

  async login(payload: unknown) {
    const parsedPayload = authLoginSchema.parse(payload);
    const user = await this.prisma.user.findUnique({
      where: { email: parsedPayload.email.toLowerCase() },
      include: { roles: true }
    });

    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatch = await compare(parsedPayload.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const roles = this.mapRoleAssignments(user.roles.map((item) => item.role));
    return authResponseSchema.parse({
      accessToken: this.signToken(user.id, user.email, roles),
      user: this.mapUserProfile(user)
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return userProfileSchema.parse(this.mapUserProfile(user));
  }

  private signToken(userId: string, email: string, roles: UserRole[]): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      roles
    });
  }

  private mapRoleAssignments(rawRoles: Array<"SUPER_ADMIN" | "STAFF" | "COMPANY_USER">): UserRole[] {
    return rawRoles.map((role) => this.toDomainRole(role));
  }

  private mapUserProfile(user: {
    id: string;
    email: string;
    fullName: string;
    isActive: boolean;
    createdAt: Date;
    roles: Array<{ role: "SUPER_ADMIN" | "STAFF" | "COMPANY_USER" }>;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      roles: this.mapRoleAssignments(user.roles.map((item) => item.role)),
      createdAt: user.createdAt.toISOString()
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
