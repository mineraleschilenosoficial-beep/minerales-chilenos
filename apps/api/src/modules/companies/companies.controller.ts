import { Controller, Get, Param, Query } from "@nestjs/common";
import { companyListQuerySchema, companyListResponseSchema } from "@minerales/contracts";
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

  @Get(":id")
  async getCompanyById(@Param("id") id: string) {
    return await this.companiesService.getCompanyById(id);
  }
}
