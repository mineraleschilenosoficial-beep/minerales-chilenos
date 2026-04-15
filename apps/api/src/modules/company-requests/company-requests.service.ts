import { Injectable } from "@nestjs/common";
import { createCompanyRequestSchema } from "@minerales/contracts";
import type { CompanyRequestModel } from "./models/company-request.model";

@Injectable()
export class CompanyRequestsService {
  private readonly requestsStore: CompanyRequestModel[] = [];

  /**
   * Creates a new company publication request.
   */
  createRequest(payload: unknown) {
    const parsedPayload = createCompanyRequestSchema.parse(payload);

    const request: CompanyRequestModel = {
      ...parsedPayload,
      id: `req_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "pending"
    };

    this.requestsStore.push(request);

    return {
      id: request.id,
      status: request.status
    };
  }

  /**
   * Lists all submitted requests.
   */
  listRequests() {
    return {
      total: this.requestsStore.length,
      items: this.requestsStore
    };
  }
}
