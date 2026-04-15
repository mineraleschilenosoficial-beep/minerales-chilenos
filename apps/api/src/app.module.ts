import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { CompaniesController } from "./companies.controller";
import { CompanyRequestsController } from "./company-requests.controller";

@Module({
  imports: [],
  controllers: [AppController, CompaniesController, CompanyRequestsController]
})
export class AppModule {}
