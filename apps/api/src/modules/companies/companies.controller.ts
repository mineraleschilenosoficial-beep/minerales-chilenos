import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  adminCompanyListQuerySchema,
  adminCompanyListResponseSchema,
  adminCreateCompanySchema,
  adminDashboardSummarySchema,
  adminPlansSummarySchema,
  companyListQuerySchema,
  companyListResponseSchema,
  companySchema,
  updateCompanySchema
} from "@minerales/contracts";
import { UserRole } from "@minerales/types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthenticatedUserModel } from "../auth/models/authenticated-user.model";
import { CompaniesService } from "./companies.service";

type CompanyQuery = {
  search?: string;
  category?: string;
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortDirection?: string;
};

@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async listCompanies(@Query() query: CompanyQuery) {
    const parsedQuery = companyListQuerySchema.parse({
      search: query.search,
      category: query.category ?? "all",
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection
    });

    const response = await this.companiesService.listCompanies(parsedQuery);

    return companyListResponseSchema.parse(response);
  }

  @Get("categories")
  async listCategories() {
    const categories = await this.companiesService.listCategories();

    return {
      total: categories.length,
      items: categories
    };
  }

  @Get("featured")
  async listFeaturedCompanies() {
    const featuredCompanies = await this.companiesService.listFeaturedCompanies();

    return {
      total: featuredCompanies.length,
      items: featuredCompanies
    };
  }

  @Get("metrics")
  async getDirectoryMetrics() {
    return await this.companiesService.getDirectoryMetrics();
  }

  @Get("/admin/companies")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.STAFF)
  async listAdminCompanies(@Query() query: CompanyQuery) {
    const parsedQuery = adminCompanyListQuerySchema.parse(query);
    const response = await this.companiesService.listAdminCompanies(parsedQuery);
    return adminCompanyListResponseSchema.parse(response);
  }

  @Post("/admin/companies")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.STAFF)
  async createAdminCompany(
    @Body() payload: unknown,
    @CurrentUser() currentUser: AuthenticatedUserModel
  ) {
    const parsedPayload = adminCreateCompanySchema.parse(payload);
    const response = await this.companiesService.createAdminCompany(parsedPayload, currentUser?.id);
    return companySchema.parse(response);
  }

  @Patch("/admin/companies/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.STAFF)
  async updateAdminCompany(
    @Param("id") id: string,
    @Body() payload: unknown,
    @CurrentUser() currentUser: AuthenticatedUserModel
  ) {
    const parsedPayload = updateCompanySchema.parse(payload);
    const response = await this.companiesService.updateAdminCompany(id, parsedPayload, currentUser?.id);
    return companySchema.parse(response);
  }

  @Delete("/admin/companies/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async deleteAdminCompany(@Param("id") id: string) {
    await this.companiesService.deleteAdminCompany(id);
    return {
      success: true
    };
  }

  @Get("/admin/dashboard")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.STAFF)
  async getAdminDashboard() {
    const response = await this.companiesService.getAdminDashboardSummary();
    return adminDashboardSummarySchema.parse(response);
  }

  @Get("/admin/plans/summary")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.STAFF)
  async getAdminPlansSummary() {
    const response = await this.companiesService.getAdminPlansSummary();
    return adminPlansSummarySchema.parse(response);
  }

  @Get(":id")
  async getCompanyById(@Param("id") id: string) {
    return await this.companiesService.getCompanyById(id);
  }
}
