import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { HealthController } from "./modules/health/health.controller";
import { CompaniesController } from "./modules/companies/companies.controller";
import { CompanyRequestsController } from "./modules/company-requests/company-requests.controller";
import { AuthController } from "./modules/auth/auth.controller";
import { UsersAdminController } from "./modules/users-admin/users-admin.controller";
import { LocationsController } from "./modules/locations/locations.controller";
import { CompaniesService } from "./modules/companies/companies.service";
import { CompanyRequestsService } from "./modules/company-requests/company-requests.service";
import { AuthService } from "./modules/auth/auth.service";
import { JwtStrategy } from "./modules/auth/jwt.strategy";
import { RolesGuard } from "./modules/auth/guards/roles.guard";
import { UsersAdminService } from "./modules/users-admin/users-admin.service";
import { LocationsService } from "./modules/locations/locations.service";
import { PrismaService } from "./database/prisma.service";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-me"
    })
  ],
  controllers: [
    HealthController,
    CompaniesController,
    CompanyRequestsController,
    AuthController,
    UsersAdminController,
    LocationsController
  ],
  providers: [
    PrismaService,
    CompaniesService,
    CompanyRequestsService,
    AuthService,
    UsersAdminService,
    LocationsService,
    JwtStrategy,
    RolesGuard
  ]
})
export class AppModule {}
