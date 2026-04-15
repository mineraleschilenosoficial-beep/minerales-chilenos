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
  listCompanies(@Query() query: CompanyQuery) {
    const filteredCompanies = this.companiesService.listCompanies(query);

    const response = {
      total: filteredCompanies.length,
      items: filteredCompanies
    };

    return companyListResponseSchema.parse(response);
  }

  @Get("categories")
  listCategories() {
    const categories = this.companiesService.listCategories();

    return {
      total: categories.length,
      items: categories
    };
  }

  @Get("featured")
  listFeaturedCompanies() {
    const featuredCompanies = this.companiesService.listFeaturedCompanies();

    return {
      total: featuredCompanies.length,
      items: featuredCompanies
    };
  }

  @Get(":id")
  getCompanyById(@Param("id") id: string) {
    return this.companiesService.getCompanyById(id);
  }
}
