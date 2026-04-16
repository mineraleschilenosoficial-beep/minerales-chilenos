import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { userListResponseSchema, userProfileSchema } from "@minerales/contracts";
import { UserRole } from "@minerales/types";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UsersAdminService } from "./users-admin.service";

/**
 * Admin endpoints for user and global role management.
 */
@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersAdminController {
  constructor(private readonly usersAdminService: UsersAdminService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.STAFF)
  async listUsers() {
    const response = await this.usersAdminService.listUsers();
    return userListResponseSchema.parse(response);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async createUser(@Body() payload: unknown) {
    const response = await this.usersAdminService.createUser(payload);
    return userProfileSchema.parse(response);
  }

  @Patch(":id/roles")
  @Roles(UserRole.SUPER_ADMIN)
  async updateUserRoles(@Param("id") id: string, @Body() payload: unknown) {
    const response = await this.usersAdminService.updateUserRoles(id, payload);
    return userProfileSchema.parse(response);
  }

  @Patch(":id/active")
  @Roles(UserRole.SUPER_ADMIN)
  async updateUserActive(@Param("id") id: string, @Body() payload: unknown) {
    const response = await this.usersAdminService.updateUserActive(id, payload);
    return userProfileSchema.parse(response);
  }
}
