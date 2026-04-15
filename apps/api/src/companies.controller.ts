import { Controller, Get, Query } from "@nestjs/common";
import {
  companyCategoryFilterSchema,
  companyListResponseSchema,
  type Company
} from "@minerales/contracts";
import { CompanyStatus } from "@minerales/types";
import { seedCompanies } from "./data/seed-companies";

type CompanyQuery = {
  search?: string;
  category?: string;
};

@Controller("companies")
export class CompaniesController {
  @Get()
  listCompanies(@Query() query: CompanyQuery) {
    const category = companyCategoryFilterSchema.parse(query.category ?? "all");
    const search = (query.search ?? "").trim().toLowerCase();

    const filteredCompanies = seedCompanies.filter((company) => {
      const isActive = company.status === CompanyStatus.ACTIVE;
      const categoryMatch = category === "all" || company.category === category;
      const searchMatch =
        search.length === 0 ||
        company.name.toLowerCase().includes(search) ||
        company.tagline.toLowerCase().includes(search) ||
        company.city.toLowerCase().includes(search);

      return isActive && categoryMatch && searchMatch;
    });

    const response = {
      total: filteredCompanies.length,
      items: filteredCompanies
    };

    return companyListResponseSchema.parse(response);
  }

  @Get("categories")
  listCategories() {
    const categories = Array.from(new Set(seedCompanies.map((company) => company.category)));

    return {
      total: categories.length,
      items: categories
    };
  }

  @Get("featured")
  listFeaturedCompanies() {
    const featuredCompanies: Company[] = seedCompanies.slice(0, 4);

    return {
      total: featuredCompanies.length,
      items: featuredCompanies
    };
  }
}
