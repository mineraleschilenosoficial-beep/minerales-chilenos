import { Injectable, NotFoundException } from "@nestjs/common";
import {
  adminCreateUserSchema,
  adminUpdateUserActiveSchema,
  adminUpdateUserRolesSchema,
  userListResponseSchema,
  userProfileSchema
} from "@minerales/contracts";
import { UserRole } from "@minerales/types";
import { hash } from "bcryptjs";
import { PrismaService } from "../../database/prisma.service";

/**
 * Admin service for user and role management.
 */
@Injectable()
export class UsersAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      include: { roles: true },
      orderBy: { createdAt: "desc" }
    });

    return userListResponseSchema.parse({
      total: users.length,
      items: users.map((user) => this.mapUserProfile(user))
    });
  }

  async createUser(payload: unknown) {
    const parsedPayload = adminCreateUserSchema.parse(payload);
    const passwordHash = await hash(parsedPayload.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: parsedPayload.email.toLowerCase(),
        fullName: parsedPayload.fullName,
        passwordHash,
        roles: {
          create: Array.from(new Set(parsedPayload.roles)).map((role) => ({
            role: this.toPrismaRole(role)
          }))
        }
      },
      include: { roles: true }
    });

    return userProfileSchema.parse(this.mapUserProfile(user));
  }

  async updateUserRoles(userId: string, payload: unknown) {
    const parsedPayload = adminUpdateUserRolesSchema.parse(payload);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.$transaction([
      this.prisma.userRoleAssignment.deleteMany({
        where: { userId }
      }),
      this.prisma.userRoleAssignment.createMany({
        data: Array.from(new Set(parsedPayload.roles)).map((role) => ({
          userId,
          role: this.toPrismaRole(role)
        }))
      })
    ]);

    const refreshedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    if (!refreshedUser) {
      throw new NotFoundException("User not found");
    }

    return userProfileSchema.parse(this.mapUserProfile(refreshedUser));
  }

  async updateUserActive(userId: string, payload: unknown) {
    const parsedPayload = adminUpdateUserActiveSchema.parse(payload);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: parsedPayload.isActive },
      include: { roles: true }
    });

    return userProfileSchema.parse(this.mapUserProfile(user));
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
      roles: user.roles.map((role) => this.toDomainRole(role.role)),
      createdAt: user.createdAt.toISOString()
    };
  }

  private toPrismaRole(role: UserRole): "SUPER_ADMIN" | "STAFF" | "COMPANY_USER" {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return "SUPER_ADMIN";
      case UserRole.STAFF:
        return "STAFF";
      default:
        return "COMPANY_USER";
    }
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
