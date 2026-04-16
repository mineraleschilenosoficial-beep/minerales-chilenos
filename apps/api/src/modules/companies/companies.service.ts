import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  type AdminCompanyListQuery,
  type CompanyListQuery,
  type UpdateCompanyInput
} from "@minerales/contracts";
import { CompanyCategory, CompanyPlan, CompanyStatus } from "@minerales/types";
import { PrismaService } from "../../database/prisma.service";
import type { CompanyModel } from "./models/company.model";

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
  async listCompanies(query: CompanyListQuery): Promise<{
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    items: CompanyModel[];
  }> {
    const mappedCompanies = await this.fetchFilteredCompanies(query.search, query.category);
    const sortedCompanies = this.sortCompanies(mappedCompanies, query.sortBy, query.sortDirection);

    const total = sortedCompanies.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);
    const startIndex = (query.page - 1) * query.pageSize;
    const items = sortedCompanies.slice(startIndex, startIndex + query.pageSize);

    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      items
    };
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
    const mappedCompanies = await this.fetchFilteredCompanies("", "all");
    return this.sortCompanies(mappedCompanies, "priority", "desc").slice(0, limit);
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
    const companies = await this.fetchFilteredCompanies("", "all");

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

  /**
   * Lists companies for admin operations including inactive records.
   */
  async listAdminCompanies(query: AdminCompanyListQuery): Promise<{
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    items: CompanyModel[];
  }> {
    const normalizedSearch = (query.search ?? "").trim();
    const companies = await this.prisma.company.findMany({
      where: {
        ...(normalizedSearch.length > 0
          ? {
              OR: [
                { displayName: { contains: normalizedSearch, mode: "insensitive" } },
                { legalName: { contains: normalizedSearch, mode: "insensitive" } },
                { description: { contains: normalizedSearch, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: this.companyIncludes(),
      orderBy: { updatedAt: "desc" }
    });

    let mappedCompanies = companies.map((company: Awaited<typeof companies>[number]) =>
      this.mapCompanyToContract(company)
    );

    if (query.status !== "all") {
      mappedCompanies = mappedCompanies.filter(
        (company: CompanyModel) => company.status === query.status
      );
    }
    if (query.plan !== "all") {
      mappedCompanies = mappedCompanies.filter((company: CompanyModel) => company.plan === query.plan);
    }
    if (query.category !== "all") {
      mappedCompanies = mappedCompanies.filter(
        (company: CompanyModel) => company.category === query.category
      );
    }

    const total = mappedCompanies.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);
    const startIndex = (query.page - 1) * query.pageSize;
    const items = mappedCompanies.slice(startIndex, startIndex + query.pageSize);

    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      items
    };
  }

  /**
   * Creates a company directly from admin operations.
   */
  async createAdminCompany(
    payload: {
      name: string;
      tagline: string;
      description: string;
      city: string;
      region: string;
      phone: string;
      website?: string;
      category: CompanyCategory;
      plan: CompanyPlan;
      status: CompanyStatus;
    },
    actorUserId?: string
  ): Promise<CompanyModel> {
    const commune = await this.findCommuneByName(payload.region, payload.city);
    const category = await this.prisma.category.findUnique({
      where: { key: payload.category }
    });
    const plan = await this.prisma.plan.findUnique({
      where: { code: this.toPrismaPlan(payload.plan) }
    });

    if (!commune || !category || !plan) {
      throw new BadRequestException("Invalid commune, category, or plan");
    }

    const slug = await this.generateUniqueSlug(payload.name);
    const createdCompany = await this.prisma.company.create({
      data: {
        slug,
        legalName: payload.name,
        displayName: payload.name,
        tagline: payload.tagline,
        description: payload.description,
        status: this.toPrismaCompanyStatus(payload.status),
        publishedAt: payload.status === CompanyStatus.ACTIVE ? new Date() : null,
        createdById: actorUserId,
        updatedById: actorUserId,
        categories: {
          create: [
            {
              categoryId: category.id,
              isPrimary: true
            }
          ]
        },
        addresses: {
          create: [
            {
              communeId: commune.id,
              addressLine1: "Main Office",
              type: "HEADQUARTERS",
              isPrimary: true
            }
          ]
        },
        contacts: {
          create: [
            {
              phone: payload.phone,
              website: payload.website,
              type: "GENERAL",
              isPrimary: true
            }
          ]
        },
        subscriptions: {
          create: [
            {
              planId: plan.id,
              status: payload.status === CompanyStatus.ACTIVE ? "ACTIVE" : "TRIALING",
              currentPeriodStartAt: payload.status === CompanyStatus.ACTIVE ? new Date() : null
            }
          ]
        }
      },
      include: this.companyIncludes()
    });

    return this.mapCompanyToContract(createdCompany);
  }

  /**
   * Updates an existing company from admin operations.
   */
  async updateAdminCompany(
    id: string,
    payload: UpdateCompanyInput,
    actorUserId?: string
  ): Promise<CompanyModel> {
    const existingCompany = await this.prisma.company.findUnique({
      where: { id },
      include: this.companyIncludes()
    });
    if (!existingCompany) {
      throw new NotFoundException("Company not found");
    }

    const updates: {
      legalName?: string;
      displayName?: string;
      tagline?: string;
      description?: string;
      status?: "ACTIVE" | "SUSPENDED";
      publishedAt?: Date | null;
      updatedById?: string;
    } = {
      updatedById: actorUserId
    };

    if (payload.name) {
      updates.legalName = payload.name;
      updates.displayName = payload.name;
    }
    if (payload.tagline) {
      updates.tagline = payload.tagline;
    }
    if (payload.description) {
      updates.description = payload.description;
    }
    if (payload.status) {
      updates.status = this.toPrismaCompanyStatus(payload.status);
      updates.publishedAt = payload.status === CompanyStatus.ACTIVE ? new Date() : null;
    }

    await this.prisma.company.update({
      where: { id },
      data: updates
    });

    if (payload.category) {
      const category = await this.prisma.category.findUnique({
        where: { key: payload.category }
      });
      if (!category) {
        throw new BadRequestException("Invalid category");
      }

      await this.prisma.companyCategoryLink.deleteMany({ where: { companyId: id } });
      await this.prisma.companyCategoryLink.create({
        data: {
          companyId: id,
          categoryId: category.id,
          isPrimary: true
        }
      });
    }

    if (payload.city || payload.region) {
      const primaryAddress = existingCompany.addresses.find(
        (address: Awaited<typeof existingCompany.addresses>[number]) => address.isPrimary
      );
      const currentRegion = primaryAddress?.commune.region.name ?? payload.region;
      const currentCity = payload.city ?? primaryAddress?.commune.name;
      if (!currentRegion || !currentCity) {
        throw new BadRequestException("City and region are required for address update");
      }
      const commune = await this.findCommuneByName(currentRegion, currentCity);
      if (!commune) {
        throw new BadRequestException("Invalid commune/region");
      }

      if (primaryAddress) {
        await this.prisma.companyAddress.update({
          where: { id: primaryAddress.id },
          data: {
            communeId: commune.id
          }
        });
      } else {
        await this.prisma.companyAddress.create({
          data: {
            companyId: id,
            communeId: commune.id,
            addressLine1: "Main Office",
            type: "HEADQUARTERS",
            isPrimary: true
          }
        });
      }
    }

    if (payload.phone || payload.website) {
      const primaryContact = existingCompany.contacts.find(
        (contact: Awaited<typeof existingCompany.contacts>[number]) => contact.isPrimary
      );
      if (primaryContact) {
        await this.prisma.companyContact.update({
          where: { id: primaryContact.id },
          data: {
            phone: payload.phone ?? primaryContact.phone,
            website: payload.website ?? primaryContact.website
          }
        });
      } else {
        await this.prisma.companyContact.create({
          data: {
            companyId: id,
            type: "GENERAL",
            phone: payload.phone,
            website: payload.website,
            isPrimary: true
          }
        });
      }
    }

    if (payload.plan) {
      const plan = await this.prisma.plan.findUnique({
        where: { code: this.toPrismaPlan(payload.plan) }
      });
      if (!plan) {
        throw new BadRequestException("Invalid plan");
      }

      const latestSubscription = await this.prisma.companySubscription.findFirst({
        where: { companyId: id },
        orderBy: { createdAt: "desc" }
      });

      if (latestSubscription) {
        await this.prisma.companySubscription.update({
          where: { id: latestSubscription.id },
          data: {
            planId: plan.id
          }
        });
      } else {
        await this.prisma.companySubscription.create({
          data: {
            companyId: id,
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodStartAt: new Date()
          }
        });
      }
    }

    const refreshedCompany = await this.prisma.company.findUnique({
      where: { id },
      include: this.companyIncludes()
    });
    if (!refreshedCompany) {
      throw new NotFoundException("Company not found");
    }

    return this.mapCompanyToContract(refreshedCompany);
  }

  /**
   * Deletes one company and dependent records.
   */
  async deleteAdminCompany(id: string): Promise<void> {
    await this.prisma.company.delete({
      where: { id }
    });
  }

  /**
   * Aggregates admin dashboard cards and recent requests.
   */
  async getAdminDashboardSummary(): Promise<{
    activeCompanies: number;
    pendingRequests: number;
    premiumCompanies: number;
    standardCompanies: number;
    requestsRecent: Array<{
      id: string;
      name: string;
      status: "pending" | "under_review" | "approved" | "rejected";
      createdAt: string;
      email: string;
      phone: string;
    }>;
    byCategory: Array<{ category: CompanyCategory; total: number }>;
  }> {
    const [metrics, pendingRequests, recentRequests] = await Promise.all([
      this.getDirectoryMetrics(),
      this.prisma.companyRequest.count({
        where: { status: "PENDING" }
      }),
      this.prisma.companyRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      })
    ]);

    return {
      activeCompanies: metrics.totalCompanies,
      pendingRequests,
      premiumCompanies: metrics.byPlan[CompanyPlan.PREMIUM],
      standardCompanies: metrics.byPlan[CompanyPlan.STANDARD],
      requestsRecent: recentRequests.map((request: Awaited<typeof recentRequests>[number]) => ({
        id: request.id,
        name: request.companyName,
        status: this.toRequestStatusContract(request.status),
        createdAt: request.createdAt.toISOString(),
        email: request.contactEmail,
        phone: request.contactPhone
      })),
      byCategory: metrics.byCategory
    };
  }

  /**
   * Returns plan-based counts and revenue projection.
   */
  async getAdminPlansSummary(): Promise<{
    premiumCompanies: number;
    standardCompanies: number;
    freeCompanies: number;
    totalCompanies: number;
    projectedMonthlyRevenueClp: number;
  }> {
    const metrics = await this.getDirectoryMetrics();
    const premiumCompanies = metrics.byPlan[CompanyPlan.PREMIUM];
    const standardCompanies = metrics.byPlan[CompanyPlan.STANDARD];
    const freeCompanies = metrics.byPlan[CompanyPlan.FREE];

    return {
      premiumCompanies,
      standardCompanies,
      freeCompanies,
      totalCompanies: premiumCompanies + standardCompanies + freeCompanies,
      projectedMonthlyRevenueClp: premiumCompanies * 49990 + standardCompanies * 19990
    };
  }

  private async fetchFilteredCompanies(
    search: string | undefined,
    category: CompanyListQuery["category"]
  ): Promise<CompanyModel[]> {
    const normalizedSearch = (search ?? "").trim();

    const companies = await this.prisma.company.findMany({
      where: {
        status: "ACTIVE",
        ...(normalizedSearch.length > 0
          ? {
              OR: [
                { displayName: { contains: normalizedSearch, mode: "insensitive" } },
                { legalName: { contains: normalizedSearch, mode: "insensitive" } },
                { description: { contains: normalizedSearch, mode: "insensitive" } }
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
      include: this.companyIncludes()
    });

    return companies.map((company: Awaited<typeof companies>[number]) =>
      this.mapCompanyToContract(company)
    );
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
          commune: {
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
    addresses: Array<{ isPrimary: boolean; commune: { name: string; region: { name: string } } }>;
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
      city: primaryAddress?.commune.name ?? "N/A",
      region: primaryAddress?.commune.region.name ?? "N/A",
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

  private toPrismaCompanyStatus(status: CompanyStatus): "ACTIVE" | "SUSPENDED" {
    return status === CompanyStatus.ACTIVE ? "ACTIVE" : "SUSPENDED";
  }

  private toPrismaPlan(plan: CompanyPlan): "FREE" | "STANDARD" | "PREMIUM" {
    switch (plan) {
      case CompanyPlan.PREMIUM:
        return "PREMIUM";
      case CompanyPlan.STANDARD:
        return "STANDARD";
      default:
        return "FREE";
    }
  }

  private toRequestStatusContract(
    status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED"
  ): "pending" | "under_review" | "approved" | "rejected" {
    switch (status) {
      case "UNDER_REVIEW":
        return "under_review";
      case "APPROVED":
        return "approved";
      case "REJECTED":
        return "rejected";
      default:
        return "pending";
    }
  }

  private async findCommuneByName(regionName: string, communeName: string) {
    return await this.prisma.commune.findFirst({
      where: {
        name: {
          equals: communeName,
          mode: "insensitive"
        },
        region: {
          name: {
            equals: regionName,
            mode: "insensitive"
          }
        }
      }
    });
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = this.toSlug(name);
    const existing = await this.prisma.company.findUnique({
      where: { slug: baseSlug }
    });
    if (!existing) {
      return baseSlug;
    }

    let suffix = 2;
    while (suffix < 1000) {
      const candidate = `${baseSlug}-${suffix}`;
      const used = await this.prisma.company.findUnique({
        where: { slug: candidate }
      });
      if (!used) {
        return candidate;
      }
      suffix += 1;
    }

    throw new BadRequestException("Unable to generate unique company slug");
  }

  private toSlug(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
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

  private sortCompanies(
    companies: CompanyModel[],
    sortBy: CompanyListQuery["sortBy"],
    sortDirection: CompanyListQuery["sortDirection"]
  ): CompanyModel[] {
    const directionFactor = sortDirection === "asc" ? 1 : -1;
    const sorted = [...companies];

    if (sortBy === "name") {
      sorted.sort((leftCompany, rightCompany) =>
        leftCompany.name.localeCompare(rightCompany.name) * directionFactor
      );
      return sorted;
    }

    if (sortBy === "recent") {
      sorted.sort((leftCompany, rightCompany) =>
        leftCompany.id.localeCompare(rightCompany.id) * -directionFactor
      );
      return sorted;
    }

    const prioritized = this.sortByPlanPriority(sorted);
    return sortDirection === "asc" ? prioritized.reverse() : prioritized;
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
