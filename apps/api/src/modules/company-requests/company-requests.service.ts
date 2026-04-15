import { Injectable } from "@nestjs/common";
import { createCompanyRequestSchema } from "@minerales/contracts";
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
      throw new Error("Invalid plan or category for company request");
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
  async listRequests() {
    const requests = await this.prisma.companyRequest.findMany({
      include: {
        categories: {
          include: {
            category: true
          }
        },
        requestedPlan: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return {
      total: requests.length,
      items: requests.map((request: Awaited<typeof requests>[number]) => this.mapRequest(request))
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

  private mapRequest(request: {
    id: string;
    companyName: string;
    tagline: string | null;
    description: string;
    contactEmail: string;
    contactPhone: string;
    website: string | null;
    cityText: string;
    regionText: string;
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
      status: request.status.toLowerCase() as CompanyRequestModel["status"],
      reviewNotes: request.reviewNotes ?? undefined
    };
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
