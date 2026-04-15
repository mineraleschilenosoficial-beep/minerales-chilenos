import { Injectable, NotFoundException } from "@nestjs/common";
import { companyCategoryFilterSchema } from "@minerales/contracts";
import { CompanyCategory, CompanyPlan, CompanyStatus } from "@minerales/types";
import { PrismaService } from "../../database/prisma.service";
import type { CompanyModel } from "./models/company.model";

type ListCompaniesFilters = {
  search?: string;
  category?: string;
};

type CompanyMetrics = {
  totalCompanies: number;
  totalCategories: number;
  byPlan: Record<CompanyPlan, number>;
  byCategory: Array<{ category: CompanyCategory; total: number }>;
};

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists active companies filtered by text and category.
   */
  async listCompanies(filters: ListCompaniesFilters): Promise<CompanyModel[]> {
    const category = companyCategoryFilterSchema.parse(filters.category ?? "all");
    const search = (filters.search ?? "").trim();

    const companies = await this.prisma.company.findMany({
      where: {
        status: "ACTIVE",
        ...(search.length > 0
          ? {
              OR: [
                { displayName: { contains: search, mode: "insensitive" } },
                { legalName: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } }
              ]
            }
          : {}),
        ...(category !== "all"
          ? {
              categories: {
                some: {
                  category: {
                    key: category
                  }
                }
              }
            }
          : {})
      },
      include: this.companyIncludes(),
      orderBy: [{ verificationScore: "desc" }, { displayName: "asc" }]
    });

    const mappedCompanies = companies.map((company: Awaited<typeof companies>[number]) =>
      this.mapCompanyToContract(company)
    );

    return this.sortByPlanPriority(mappedCompanies);
  }

  /**
   * Returns unique categories from the current company list.
   */
  async listCategories(): Promise<string[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { key: true }
    });

    return categories.map((category: Awaited<typeof categories>[number]) => category.key);
  }

  /**
   * Returns highlighted companies for homepage sections.
   */
  async listFeaturedCompanies(limit = 4): Promise<CompanyModel[]> {
    const companies = await this.prisma.company.findMany({
      where: { status: "ACTIVE" },
      include: this.companyIncludes(),
      orderBy: [{ verificationScore: "desc" }, { createdAt: "desc" }],
      take: limit
    });

    const mappedCompanies = companies.map((company: Awaited<typeof companies>[number]) =>
      this.mapCompanyToContract(company)
    );

    return this.sortByPlanPriority(mappedCompanies).slice(0, limit);
  }

  /**
   * Finds one company by identifier.
   * @throws NotFoundException when no company is found.
   */
  async getCompanyById(id: string): Promise<CompanyModel> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: this.companyIncludes()
    });

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    return this.mapCompanyToContract(company);
  }

  /**
   * Returns aggregate metrics for directory monitoring and dashboards.
   */
  async getDirectoryMetrics(): Promise<CompanyMetrics> {
    const companies = await this.listCompanies({
      search: "",
      category: "all"
    });

    const byPlan: Record<CompanyPlan, number> = {
      [CompanyPlan.FREE]: 0,
      [CompanyPlan.STANDARD]: 0,
      [CompanyPlan.PREMIUM]: 0
    };

    const categoryCounter = new Map<CompanyCategory, number>();

    for (const company of companies) {
      byPlan[company.plan] += 1;
      categoryCounter.set(company.category, (categoryCounter.get(company.category) ?? 0) + 1);
    }

    const byCategory = Array.from(categoryCounter.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((leftEntry, rightEntry) => rightEntry.total - leftEntry.total);

    return {
      totalCompanies: companies.length,
      totalCategories: categoryCounter.size,
      byPlan,
      byCategory
    };
  }

  private companyIncludes() {
    return {
      categories: {
        include: {
          category: true
        }
      },
      addresses: {
        include: {
          city: {
            include: {
              region: true
            }
          }
        }
      },
      contacts: true,
      subscriptions: {
        include: {
          plan: true
        }
      }
    };
  }

  private mapCompanyToContract(company: {
    id: string;
    displayName: string;
    tagline: string | null;
    description: string;
    status: string;
    categories: Array<{ isPrimary: boolean; category: { key: string } }>;
    addresses: Array<{ isPrimary: boolean; city: { name: string; region: { name: string } } }>;
    contacts: Array<{ isPrimary: boolean; phone: string | null; website: string | null }>;
    subscriptions: Array<{ status: string; plan: { code: string } }>;
  }): CompanyModel {
    const primaryCategoryLink =
      company.categories.find((link) => link.isPrimary) ?? company.categories[0];
    const primaryAddress = company.addresses.find((address) => address.isPrimary) ?? company.addresses[0];
    const primaryContact = company.contacts.find((contact) => contact.isPrimary) ?? company.contacts[0];
    const activeSubscription = company.subscriptions.find((subscription) =>
      ["TRIALING", "ACTIVE"].includes(subscription.status)
    );

    return {
      id: company.id,
      name: company.displayName,
      tagline: company.tagline ?? "Mining supplier profile.",
      description: company.description,
      city: primaryAddress?.city.name ?? "N/A",
      region: primaryAddress?.city.region.name ?? "N/A",
      phone: primaryContact?.phone ?? "N/A",
      website: primaryContact?.website ?? undefined,
      category: this.toCompanyCategory(primaryCategoryLink?.category.key),
      plan: this.toCompanyPlan(activeSubscription?.plan.code),
      status: this.toCompanyStatus(company.status)
    };
  }

  private toCompanyCategory(rawValue: string | undefined): CompanyCategory {
    if (!rawValue) {
      return CompanyCategory.CONSULTING;
    }

    const category = rawValue as CompanyCategory;
    if (Object.values(CompanyCategory).includes(category)) {
      return category;
    }

    return CompanyCategory.CONSULTING;
  }

  private toCompanyPlan(rawValue: string | undefined): CompanyPlan {
    switch (rawValue) {
      case "PREMIUM":
        return CompanyPlan.PREMIUM;
      case "STANDARD":
        return CompanyPlan.STANDARD;
      default:
        return CompanyPlan.FREE;
    }
  }

  private toCompanyStatus(rawValue: string): CompanyStatus {
    return rawValue === "ACTIVE" ? CompanyStatus.ACTIVE : CompanyStatus.INACTIVE;
  }

  private sortByPlanPriority(companies: CompanyModel[]): CompanyModel[] {
    return [...companies].sort((leftCompany, rightCompany) => {
      const planScoreDiff =
        this.getPlanPriorityScore(rightCompany.plan) - this.getPlanPriorityScore(leftCompany.plan);
      if (planScoreDiff !== 0) {
        return planScoreDiff;
      }

      return leftCompany.name.localeCompare(rightCompany.name);
    });
  }

  private getPlanPriorityScore(plan: CompanyPlan): number {
    switch (plan) {
      case CompanyPlan.PREMIUM:
        return 3;
      case CompanyPlan.STANDARD:
        return 2;
      default:
        return 1;
    }
  }
}
