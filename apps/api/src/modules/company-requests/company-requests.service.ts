import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  companyRequestExportQuerySchema,
  companyRequestListQuerySchema,
  createCompanyRequestSchema,
  reviewCompanyRequestSchema,
  type CompanyRequestExportQuery,
  type CompanyRequestListQuery,
  type ReviewCompanyRequestInput
} from "@minerales/contracts";
import { CompanyPlan } from "@minerales/types";
import { PrismaService } from "../../database/prisma.service";
import type { CompanyRequestModel } from "./models/company-request.model";

@Injectable()
export class CompanyRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new company publication request.
   */
  async createRequest(payload: unknown) {
    const parsedPayload = createCompanyRequestSchema.parse(payload);

    const [requestedPlan, requestedCategory] = await Promise.all([
      this.prisma.plan.findUnique({
        where: {
          code: this.toPrismaPlan(parsedPayload.requestedPlan)
        }
      }),
      this.prisma.category.findUnique({
        where: {
          key: parsedPayload.category
        }
      })
    ]);

    if (!requestedPlan || !requestedCategory) {
      throw new BadRequestException("Invalid plan or category for company request");
    }

    const createdRequest = await this.prisma.companyRequest.create({
      data: {
        companyName: parsedPayload.name,
        tagline: parsedPayload.tagline,
        description: parsedPayload.description,
        contactName: parsedPayload.name,
        contactEmail: parsedPayload.email,
        contactPhone: parsedPayload.phone,
        website: parsedPayload.website,
        cityText: parsedPayload.city,
        regionText: parsedPayload.region,
        requestedPlanId: requestedPlan.id,
        categories: {
          create: [{ categoryId: requestedCategory.id }]
        }
      }
    });

    return {
      id: createdRequest.id,
      status: "pending"
    };
  }

  /**
   * Lists all submitted requests.
   */
  async listRequests(query: CompanyRequestListQuery) {
    const parsedQuery = companyRequestListQuerySchema.parse(query);
    const whereClause = this.buildRequestWhereClause(parsedQuery);
    const orderBy = this.buildRequestOrderBy(parsedQuery.createdAtOrder);

    const total = await this.prisma.companyRequest.count({
      where: whereClause
    });

    const requests = await this.prisma.companyRequest.findMany({
      where: whereClause,
      include: {
        categories: {
          include: {
            category: true
          }
        },
        requestedPlan: true
      },
      orderBy,
      skip: (parsedQuery.page - 1) * parsedQuery.pageSize,
      take: parsedQuery.pageSize
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / parsedQuery.pageSize);

    return {
      total,
      page: parsedQuery.page,
      pageSize: parsedQuery.pageSize,
      totalPages,
      items: requests.map((request: Awaited<typeof requests>[number]) =>
        this.mapRequest(request as Parameters<typeof this.mapRequest>[0])
      )
    };
  }

  /**
   * Exports filtered requests as CSV content.
   */
  async exportRequestsCsv(query: CompanyRequestExportQuery): Promise<string> {
    const parsedQuery = companyRequestExportQuerySchema.parse(query);
    const whereClause = this.buildRequestWhereClause(parsedQuery);
    const orderBy = this.buildRequestOrderBy(parsedQuery.createdAtOrder);

    const requests = await this.prisma.companyRequest.findMany({
      where: whereClause,
      include: {
        categories: {
          include: {
            category: true
          }
        },
        requestedPlan: true
      },
      orderBy
    });

    const mappedRequests = requests.map((request: Awaited<typeof requests>[number]) =>
      this.mapRequest(request as Parameters<typeof this.mapRequest>[0])
    );

    const header = [
      "id",
      "name",
      "email",
      "phone",
      "city",
      "region",
      "normalizedRegionCode",
      "normalizedCommuneId",
      "status",
      "category",
      "requestedPlan",
      "createdAt",
      "reviewNotes",
      "companyId"
    ];

    const rows: string[][] = mappedRequests.map((request: CompanyRequestModel) => [
      request.id,
      request.name,
      request.email,
      request.phone,
      request.city,
      request.region,
      request.normalizedRegionCode ?? "",
      request.normalizedCommuneId ?? "",
      request.status,
      request.category,
      request.requestedPlan,
      request.createdAt,
      request.reviewNotes ?? "",
      request.companyId ?? ""
    ].map((value) => String(value)));

    return [header, ...rows]
      .map((row: string[]) => row.map((cell: string) => this.escapeCsvValue(cell)).join(","))
      .join("\n");
  }

  private buildRequestWhereClause(query: {
    status: CompanyRequestListQuery["status"];
    search?: string;
  }) {
    const normalizedSearch = (query.search ?? "").trim();

    return {
      ...(query.status === "all"
        ? {}
        : {
            status: this.toPrismaStatusFilter(query.status)
          }),
      ...(normalizedSearch.length === 0
        ? {}
        : {
            OR: [
              {
                companyName: {
                  contains: normalizedSearch,
                  mode: "insensitive" as const
                }
              },
              {
                contactEmail: {
                  contains: normalizedSearch,
                  mode: "insensitive" as const
                }
              },
              {
                contactPhone: {
                  contains: normalizedSearch,
                  mode: "insensitive" as const
                }
              }
            ]
          })
    };
  }

  private buildRequestOrderBy(createdAtOrder: "newest" | "oldest") {
    const createdAtSort = createdAtOrder === "oldest" ? ("asc" as const) : ("desc" as const);
    return [{ status: "asc" as const }, { createdAt: createdAtSort }];
  }

  private escapeCsvValue(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, "\"\"")}"`;
    }

    return value;
  }

  private toPrismaStatusFilter(
    status: CompanyRequestListQuery["status"]
  ): "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" {
    switch (status) {
      case "under_review":
        return "UNDER_REVIEW";
      case "approved":
        return "APPROVED";
      case "rejected":
        return "REJECTED";
      default:
        return "PENDING";
    }
  }

  /**
   * Reviews a request and optionally publishes a new company when approved.
   */
  async reviewRequest(requestId: string, payload: unknown) {
    const parsedPayload = reviewCompanyRequestSchema.parse(payload);

    const existingRequest = await this.prisma.companyRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedPlan: true,
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    if (!existingRequest) {
      throw new NotFoundException("Company request not found");
    }

    if (parsedPayload.status === "approved") {
      const company = await this.upsertCompanyFromRequest(existingRequest, parsedPayload);
      const normalizedCommune = await this.resolveApprovalCommune(existingRequest.cityText, parsedPayload);
      await this.prisma.companyRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewNotes: parsedPayload.reviewNotes,
          reviewedAt: new Date(),
          companyId: company.id,
          normalizedRegionCode: normalizedCommune?.region.code ?? parsedPayload.regionCode ?? null,
          normalizedCommuneId: normalizedCommune?.id ?? parsedPayload.communeId ?? null
        }
      });

      return {
        id: requestId,
        status: "approved",
        companyId: company.id
      };
    }

    const prismaStatus = this.toPrismaRequestStatus(parsedPayload.status);
    const selectedNormalization = await this.resolveManualNormalization(parsedPayload);
    await this.prisma.companyRequest.update({
      where: { id: requestId },
      data: {
        status: prismaStatus,
        reviewNotes: parsedPayload.reviewNotes,
        reviewedAt: new Date(),
        normalizedRegionCode: selectedNormalization?.regionCode ?? null,
        normalizedCommuneId: selectedNormalization?.communeId ?? null
      }
    });

    return {
      id: requestId,
      status: parsedPayload.status
    };
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

  private toPrismaRequestStatus(
    status: ReviewCompanyRequestInput["status"]
  ): "UNDER_REVIEW" | "APPROVED" | "REJECTED" {
    switch (status) {
      case "under_review":
        return "UNDER_REVIEW";
      case "approved":
        return "APPROVED";
      default:
        return "REJECTED";
    }
  }

  private async upsertCompanyFromRequest(request: {
    id: string;
    companyName: string;
    tagline: string | null;
    description: string;
    contactPhone: string;
    website: string | null;
    cityText: string;
    requestedPlanId: string;
    categories: Array<{ category: { id: string } }>;
  }, reviewPayload: ReviewCompanyRequestInput) {
    const companySlug = this.toSlug(request.companyName);
    const [commune, existingCompany] = await Promise.all([
      this.resolveApprovalCommune(request.cityText, reviewPayload),
      this.prisma.company.findUnique({
        where: { slug: companySlug }
      })
    ]);

    if (!commune) {
      throw new BadRequestException(
        `Commune '${request.cityText}' is not configured. Add it to catalog before approval.`
      );
    }

    const persistedCompany = existingCompany
      ? await this.prisma.company.update({
          where: { id: existingCompany.id },
          data: {
            legalName: request.companyName,
            displayName: request.companyName,
            tagline: request.tagline,
            description: request.description,
            status: "ACTIVE",
            publishedAt: new Date()
          }
        })
      : await this.prisma.company.create({
          data: {
            slug: companySlug,
            legalName: request.companyName,
            displayName: request.companyName,
            tagline: request.tagline,
            description: request.description,
            status: "ACTIVE",
            publishedAt: new Date()
          }
        });

    const firstCategory = request.categories[0];
    if (!firstCategory) {
      throw new BadRequestException("Request does not include a valid category");
    }

    await this.prisma.companyCategoryLink.upsert({
      where: {
        companyId_categoryId: {
          companyId: persistedCompany.id,
          categoryId: firstCategory.category.id
        }
      },
      update: {
        isPrimary: true
      },
      create: {
        companyId: persistedCompany.id,
        categoryId: firstCategory.category.id,
        isPrimary: true
      }
    });

    await this.prisma.companyAddress.upsert({
      where: {
        id: `${persistedCompany.id}_hq`
      },
      update: {
        communeId: commune.id,
        addressLine1: "Main Office",
        type: "HEADQUARTERS",
        isPrimary: true
      },
      create: {
        id: `${persistedCompany.id}_hq`,
        companyId: persistedCompany.id,
        communeId: commune.id,
        addressLine1: "Main Office",
        type: "HEADQUARTERS",
        isPrimary: true
      }
    });

    await this.prisma.companyContact.upsert({
      where: {
        id: `${persistedCompany.id}_general`
      },
      update: {
        type: "GENERAL",
        phone: request.contactPhone,
        website: request.website,
        isPrimary: true
      },
      create: {
        id: `${persistedCompany.id}_general`,
        companyId: persistedCompany.id,
        type: "GENERAL",
        phone: request.contactPhone,
        website: request.website,
        isPrimary: true
      }
    });

    const existingSubscription = await this.prisma.companySubscription.findFirst({
      where: {
        companyId: persistedCompany.id,
        planId: request.requestedPlanId
      }
    });

    if (existingSubscription) {
      await this.prisma.companySubscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "ACTIVE",
          currentPeriodStartAt: new Date()
        }
      });
    } else {
      await this.prisma.companySubscription.create({
        data: {
          companyId: persistedCompany.id,
          planId: request.requestedPlanId,
          status: "ACTIVE",
          currentPeriodStartAt: new Date()
        }
      });
    }

    return persistedCompany;
  }

  private async resolveApprovalCommune(
    cityText: string,
    reviewPayload: ReviewCompanyRequestInput
  ) {
    if (reviewPayload.communeId) {
      const commune = await this.prisma.commune.findUnique({
        where: { id: reviewPayload.communeId },
        include: { region: true }
      });
      if (!commune) {
        throw new BadRequestException("Selected commune does not exist");
      }
      if (reviewPayload.regionCode && commune.region.code !== reviewPayload.regionCode) {
        throw new BadRequestException("Selected commune does not belong to selected region");
      }
      return commune;
    }

    if (reviewPayload.regionCode) {
      const communeInRegion = await this.prisma.commune.findFirst({
        where: {
          name: {
            equals: cityText,
            mode: "insensitive"
          },
          region: {
            code: reviewPayload.regionCode
          }
        },
        include: { region: true }
      });
      if (communeInRegion) {
        return communeInRegion;
      }
    }

    return this.prisma.commune.findFirst({
      where: {
        name: {
          equals: cityText,
          mode: "insensitive"
        }
      },
      include: { region: true }
    });
  }

  private async resolveManualNormalization(reviewPayload: ReviewCompanyRequestInput) {
    if (reviewPayload.communeId) {
      const commune = await this.prisma.commune.findUnique({
        where: { id: reviewPayload.communeId },
        include: { region: true }
      });
      if (!commune) {
        throw new BadRequestException("Selected commune does not exist");
      }
      if (reviewPayload.regionCode && commune.region.code !== reviewPayload.regionCode) {
        throw new BadRequestException("Selected commune does not belong to selected region");
      }
      return {
        regionCode: commune.region.code,
        communeId: commune.id
      };
    }
    if (reviewPayload.regionCode) {
      return {
        regionCode: reviewPayload.regionCode
      };
    }
    return undefined;
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

  private mapRequest(request: {
    id: string;
    companyId: string | null;
    companyName: string;
    tagline: string | null;
    description: string;
    contactEmail: string;
    contactPhone: string;
    website: string | null;
    cityText: string;
    regionText: string;
    normalizedRegionCode: string | null;
    normalizedCommuneId: string | null;
    status: string;
    reviewNotes: string | null;
    createdAt: Date;
    requestedPlan: { code: string };
    categories: Array<{ category: { key: string } }>;
  }): CompanyRequestModel {
    return {
      id: request.id,
      name: request.companyName,
      tagline: request.tagline ?? "Company request submitted from public form.",
      description: request.description,
      city: request.cityText,
      region: request.regionText,
      phone: request.contactPhone,
      email: request.contactEmail,
      website: request.website ?? undefined,
      category: (request.categories[0]?.category.key ?? "consulting") as CompanyRequestModel["category"],
      requestedPlan: this.toCompanyPlan(request.requestedPlan.code),
      createdAt: request.createdAt.toISOString(),
      status: this.toCompanyRequestStatus(request.status),
      reviewNotes: request.reviewNotes ?? undefined,
      companyId: request.companyId ?? undefined,
      normalizedRegionCode: request.normalizedRegionCode ?? undefined,
      normalizedCommuneId: request.normalizedCommuneId ?? undefined
    };
  }

  private toCompanyRequestStatus(rawValue: string): CompanyRequestModel["status"] {
    switch (rawValue) {
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

  private toCompanyPlan(rawValue: string): CompanyPlan {
    switch (rawValue) {
      case "PREMIUM":
        return CompanyPlan.PREMIUM;
      case "STANDARD":
        return CompanyPlan.STANDARD;
      default:
        return CompanyPlan.FREE;
    }
  }
}
