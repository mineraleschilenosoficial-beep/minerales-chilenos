import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { CompanyRequestsService } from "./company-requests.service";

@Controller("company-requests")
export class CompanyRequestsController {
  constructor(private readonly companyRequestsService: CompanyRequestsService) {}

  @Post()
  @HttpCode(201)
  createRequest(@Body() payload: unknown) {
    return this.companyRequestsService.createRequest(payload);
  }

  @Get()
  listRequests() {
    return this.companyRequestsService.listRequests();
  }
}
