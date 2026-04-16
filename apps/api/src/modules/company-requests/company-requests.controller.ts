import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res
} from "@nestjs/common";
import {
  companyRequestExportQuerySchema,
  companyRequestListQuerySchema,
  companyRequestListResponseSchema,
  createCompanyRequestResponseSchema,
  reviewCompanyRequestResponseSchema
} from "@minerales/contracts";
import { gzipSync } from "node:zlib";
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
  async listRequests(
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("createdAtOrder") createdAtOrder?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const parsedQuery = companyRequestListQuerySchema.parse({
      status: status ?? "all",
      search,
      createdAtOrder,
      page,
      pageSize
    });

    const response = await this.companyRequestsService.listRequests(parsedQuery);
    return companyRequestListResponseSchema.parse(response);
  }

  @Get("export.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  async exportRequestsCsv(
    @Res({ passthrough: true })
    response: { setHeader: (name: string, value: string) => void },
    @Headers("accept-encoding") acceptEncoding?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("createdAtOrder") createdAtOrder?: string
  ) {
    const parsedQuery = companyRequestExportQuerySchema.parse({
      status: status ?? "all",
      search,
      createdAtOrder
    });

    const csvContent = await this.companyRequestsService.exportRequestsCsv(parsedQuery);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="company-requests-${timestamp}.csv"`
    );
    response.setHeader("Vary", "Accept-Encoding");

    const supportsGzip = (acceptEncoding ?? "").toLowerCase().includes("gzip");
    if (supportsGzip) {
      response.setHeader("Content-Encoding", "gzip");
      return gzipSync(csvContent);
    }

    return csvContent;
  }

  @Patch(":id/review")
  async reviewRequest(@Param("id") id: string, @Body() payload: unknown) {
    const response = await this.companyRequestsService.reviewRequest(id, payload);
    return reviewCompanyRequestResponseSchema.parse(response);
  }
}
