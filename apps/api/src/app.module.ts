import { Module } from "@nestjs/common";
import { HealthController } from "./modules/health/health.controller";
import { CompaniesController } from "./modules/companies/companies.controller";
import { CompanyRequestsController } from "./modules/company-requests/company-requests.controller";
import { CompaniesService } from "./modules/companies/companies.service";
import { CompanyRequestsService } from "./modules/company-requests/company-requests.service";
import { PrismaService } from "./database/prisma.service";

@Module({
  imports: [],
  controllers: [HealthController, CompaniesController, CompanyRequestsController],
  providers: [PrismaService, CompaniesService, CompanyRequestsService]
})
export class AppModule {}
