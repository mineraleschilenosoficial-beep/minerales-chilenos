import { Body, Controller, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { CompanyRequestsService } from "./company-requests.service";

@Controller("company-requests")
export class CompanyRequestsController {
  constructor(private readonly companyRequestsService: CompanyRequestsService) {}

  @Post()
  @HttpCode(201)
  async createRequest(@Body() payload: unknown) {
    return await this.companyRequestsService.createRequest(payload);
  }

  @Get()
  async listRequests() {
    return await this.companyRequestsService.listRequests();
  }

  @Patch(":id/review")
  async reviewRequest(@Param("id") id: string, @Body() payload: unknown) {
    return await this.companyRequestsService.reviewRequest(id, payload);
  }
}
