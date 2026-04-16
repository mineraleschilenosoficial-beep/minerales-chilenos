import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { authResponseSchema, userProfileSchema } from "@minerales/contracts";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import type { AuthenticatedUserModel } from "./models/authenticated-user.model";
import { AuthService } from "./auth.service";

/**
 * Public and authenticated endpoints for JWT identity.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(201)
  async register(@Body() payload: unknown) {
    const response = await this.authService.register(payload);
    return authResponseSchema.parse(response);
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() payload: unknown) {
    const response = await this.authService.login(payload);
    return authResponseSchema.parse(response);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUserModel) {
    const profile = await this.authService.me(user.id);
    return userProfileSchema.parse(profile);
  }
}
