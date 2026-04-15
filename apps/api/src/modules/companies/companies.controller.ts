import { Controller, Get, Param, Query } from "@nestjs/common";
import { companyListResponseSchema } from "@minerales/contracts";
import { CompaniesService } from "./companies.service";

type CompanyQuery = {
  search?: string;
  category?: string;
};

@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async listCompanies(@Query() query: CompanyQuery) {
    const filteredCompanies = await this.companiesService.listCompanies(query);

    const response = {
      total: filteredCompanies.length,
      items: filteredCompanies
    };

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

  @Get(":id")
  async getCompanyById(@Param("id") id: string) {
    return await this.companiesService.getCompanyById(id);
  }
}
