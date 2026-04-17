import { BadRequestException } from "@nestjs/common";
import { CompanyCategory, CompanyPlan } from "@minerales/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../database/prisma.service";
import { CompanyRequestsService } from "./company-requests.service";

function buildPrismaMock() {
  return {
    plan: { findUnique: vi.fn() },
    category: { findUnique: vi.fn() },
    commune: { findUnique: vi.fn(), findFirst: vi.fn() },
    companyRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn()
    },
    company: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    companyCategoryLink: { upsert: vi.fn() },
    companyAddress: { upsert: vi.fn() },
    companyContact: { upsert: vi.fn() },
    companySubscription: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() }
  };
}

describe("CompanyRequestsService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: CompanyRequestsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new CompanyRequestsService(prisma as unknown as PrismaService);
  });

  it("creates request using canonical commune data", async () => {
    prisma.plan.findUnique.mockResolvedValue({ id: "plan-1" });
    prisma.category.findUnique.mockResolvedValue({ id: "cat-1" });
    prisma.commune.findUnique.mockResolvedValue({
      id: "comm-1",
      name: "Antofagasta",
      region: { name: "Región de Antofagasta" }
    });
    prisma.companyRequest.create.mockResolvedValue({ id: "req-1" });

    const result = await service.createRequest({
      name: "Minería Norte",
      tagline: "Servicios mineros",
      description: "Proveedor integral para operaciones mineras en el norte.",
      communeId: "comm-1",
      city: "Antofagasta",
      region: "Región de Antofagasta",
      phone: "+56912345678",
      email: "contacto@minerianorte.cl",
      website: "https://minerianorte.cl",
      category: CompanyCategory.CONSULTING,
      requestedPlan: CompanyPlan.FREE
    });

    expect(prisma.companyRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communeId: "comm-1",
          cityText: "Antofagasta",
          regionText: "Región de Antofagasta"
        })
      })
    );
    expect(result).toEqual({ id: "req-1", status: "pending" });
  });

  it("fails request creation when canonical commune is invalid", async () => {
    prisma.plan.findUnique.mockResolvedValue({ id: "plan-1" });
    prisma.category.findUnique.mockResolvedValue({ id: "cat-1" });
    prisma.commune.findUnique.mockResolvedValue(null);

    await expect(
      service.createRequest({
        name: "Minería Norte",
        tagline: "Servicios mineros",
        description: "Proveedor integral para operaciones mineras en el norte.",
        communeId: "missing",
        city: "Antofagasta",
        region: "Región de Antofagasta",
        phone: "+56912345678",
        email: "contacto@minerianorte.cl",
        website: "https://minerianorte.cl",
        category: CompanyCategory.CONSULTING,
        requestedPlan: CompanyPlan.FREE
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reviews under_review and persists canonical commune override", async () => {
    prisma.companyRequest.findUnique.mockResolvedValue({
      id: "req-1",
      cityText: "Antofagasta",
      regionText: "Región de Antofagasta",
      communeId: "comm-1",
      requestedPlan: { code: "FREE" },
      categories: [{ category: { id: "cat-1", key: CompanyCategory.CONSULTING } }]
    });
    prisma.commune.findUnique.mockResolvedValue({
      id: "comm-2",
      name: "Calama",
      region: { code: "CL-AN", name: "Región de Antofagasta" }
    });
    prisma.companyRequest.update.mockResolvedValue({});

    const result = await service.reviewRequest("req-1", {
      status: "under_review",
      reviewNotes: "Revisión en curso",
      regionCode: "CL-AN",
      communeId: "comm-2"
    });

    expect(prisma.companyRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "req-1" },
        data: expect.objectContaining({
          status: "UNDER_REVIEW",
          communeId: "comm-2",
          cityText: "Calama",
          regionText: "Región de Antofagasta"
        })
      })
    );
    expect(result).toEqual({ id: "req-1", status: "under_review" });
  });
});
