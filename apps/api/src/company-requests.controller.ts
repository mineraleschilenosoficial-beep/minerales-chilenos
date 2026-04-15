import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { createCompanyRequestSchema, type CreateCompanyRequestInput } from "@minerales/contracts";

type StoredCompanyRequest = CreateCompanyRequestInput & {
  id: string;
  createdAt: string;
  status: "pending";
};

const requestsStore: StoredCompanyRequest[] = [];

@Controller("company-requests")
export class CompanyRequestsController {
  @Post()
  @HttpCode(201)
  createRequest(@Body() payload: unknown) {
    const parsedPayload = createCompanyRequestSchema.parse(payload);

    const request: StoredCompanyRequest = {
      ...parsedPayload,
      id: `req_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "pending"
    };

    requestsStore.push(request);

    return {
      id: request.id,
      status: request.status
    };
  }

  @Get()
  listRequests() {
    return {
      total: requestsStore.length,
      items: requestsStore
    };
  }
}
