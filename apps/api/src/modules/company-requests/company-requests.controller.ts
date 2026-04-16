import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  companyRequestListQuerySchema,
  companyRequestListResponseSchema,
  createCompanyRequestResponseSchema,
  reviewCompanyRequestResponseSchema
} from "@minerales/contracts";
import { CompanyRequestsService } from "./company-requests.service";

@Controller("company-requests")
export class CompanyRequestsController {
  constructor(private readonly companyRequestsService: CompanyRequestsService) {}

  @Post()
  @HttpCode(201)
  async createRequest(@Body() payload: unknown) {
    const response = await this.companyRequestsService.createRequest(payload);
    return createCompanyRequestResponseSchema.parse(response);
  }

  @Get()
  async listRequests(@Query("status") status?: string) {
    const parsedQuery = companyRequestListQuerySchema.parse({
      status: status ?? "all"
    });

    const response = await this.companyRequestsService.listRequests(parsedQuery);
    return companyRequestListResponseSchema.parse(response);
  }

  @Patch(":id/review")
  async reviewRequest(@Param("id") id: string, @Body() payload: unknown) {
    const response = await this.companyRequestsService.reviewRequest(id, payload);
    return reviewCompanyRequestResponseSchema.parse(response);
  }
}
