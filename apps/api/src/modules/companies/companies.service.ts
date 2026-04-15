import { Injectable, NotFoundException } from "@nestjs/common";
import { companyCategoryFilterSchema } from "@minerales/contracts";
import { CompanyStatus } from "@minerales/types";
import { seedCompanies } from "./data/seed-companies";
import type { CompanyModel } from "./models/company.model";

type ListCompaniesFilters = {
  search?: string;
  category?: string;
};

@Injectable()
export class CompaniesService {
  /**
   * Lists active companies filtered by text and category.
   */
  listCompanies(filters: ListCompaniesFilters): CompanyModel[] {
    const category = companyCategoryFilterSchema.parse(filters.category ?? "all");
    const search = (filters.search ?? "").trim().toLowerCase();

    return seedCompanies.filter((company) => {
      const isActive = company.status === CompanyStatus.ACTIVE;
      const categoryMatch = category === "all" || company.category === category;
      const searchMatch =
        search.length === 0 ||
        company.name.toLowerCase().includes(search) ||
        company.tagline.toLowerCase().includes(search) ||
        company.city.toLowerCase().includes(search);

      return isActive && categoryMatch && searchMatch;
    });
  }

  /**
   * Returns unique categories from the current company list.
   */
  listCategories(): string[] {
    return Array.from(new Set(seedCompanies.map((company) => company.category)));
  }

  /**
   * Returns highlighted companies for homepage sections.
   */
  listFeaturedCompanies(limit = 4): CompanyModel[] {
    return seedCompanies.slice(0, limit);
  }

  /**
   * Finds one company by identifier.
   * @throws NotFoundException when no company is found.
   */
  getCompanyById(id: string): CompanyModel {
    const company = seedCompanies.find((item) => item.id === id);
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    return company;
  }
}
