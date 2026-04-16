import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const planSeeds = [
  {
    code: "FREE",
    name: "Free",
    monthlyPriceCents: 0,
    isPublic: true,
    isDefault: true,
    featureFlags: {
      listing: true,
      priority: false,
      leadForm: false
    }
  },
  {
    code: "STANDARD",
    name: "Standard",
    monthlyPriceCents: 19990,
    isPublic: true,
    isDefault: false,
    featureFlags: {
      listing: true,
      priority: false,
      leadForm: true
    }
  },
  {
    code: "PREMIUM",
    name: "Premium",
    monthlyPriceCents: 49990,
    isPublic: true,
    isDefault: false,
    featureFlags: {
      listing: true,
      priority: true,
      leadForm: true
    }
  }
];

const categorySeeds = [
  { key: "laboratory", name: "Laboratory", sortOrder: 10 },
  { key: "consulting", name: "Consulting", sortOrder: 20 },
  { key: "equipment", name: "Equipment", sortOrder: 30 },
  { key: "explosives", name: "Explosives", sortOrder: 40 },
  { key: "safety", name: "Safety", sortOrder: 50 },
  { key: "transport", name: "Transport", sortOrder: 60 },
  { key: "software", name: "Software", sortOrder: 70 },
  { key: "engineering", name: "Engineering", sortOrder: 80 }
];

const regionSeeds = [
  {
    code: "CL-RM",
    name: "Region Metropolitana de Santiago",
    cities: ["Santiago", "Las Condes", "Providencia"]
  },
  {
    code: "CL-AN",
    name: "Region de Antofagasta",
    cities: ["Antofagasta", "Calama", "Mejillones"]
  },
  {
    code: "CL-AT",
    name: "Region de Atacama",
    cities: ["Copiapo", "Caldera", "Vallenar"]
  }
];

const companySeeds = [
  {
    slug: "sgs-chile",
    legalName: "SGS Chile Ltda.",
    displayName: "SGS Chile",
    tagline: "Laboratory and certification services for mining operations.",
    description:
      "Global inspection, testing, and certification provider with local mining expertise.",
    categoryKey: "laboratory",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2793 2000",
    website: "https://www.sgs.com",
    planCode: "PREMIUM",
    verificationScore: 95
  },
  {
    slug: "als-chemex-chile",
    legalName: "ALS Chemex Chile",
    displayName: "ALS Chemex Chile",
    tagline: "Geochemical and metallurgical assay services.",
    description:
      "Laboratory focused on analytical quality and turnaround time for exploration projects.",
    categoryKey: "laboratory",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2281 000",
    website: "https://www.alsglobal.com",
    planCode: "STANDARD",
    verificationScore: 88
  },
  {
    slug: "srk-consulting-chile",
    legalName: "SRK Consulting Chile",
    displayName: "SRK Consulting Chile",
    tagline: "Geotechnical and mining consulting.",
    description:
      "Independent consulting for technical studies, mine planning, and risk assessment.",
    categoryKey: "consulting",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2448 3000",
    website: "https://www.srk.com",
    planCode: "PREMIUM",
    verificationScore: 92
  },
  {
    slug: "finning-chile",
    legalName: "Finning Chile S.A.",
    displayName: "Finning Chile",
    tagline: "Heavy equipment and maintenance for mining fleets.",
    description:
      "Caterpillar distributor with field support, parts logistics, and maintenance contracts.",
    categoryKey: "equipment",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2928 4000",
    website: "https://www.finning.com",
    planCode: "PREMIUM",
    verificationScore: 90
  },
  {
    slug: "maptek-chile",
    legalName: "Maptek Chile",
    displayName: "Maptek Chile",
    tagline: "Mining software and geological modeling.",
    description:
      "Digital tools for geological modeling, planning, and production optimization.",
    categoryKey: "software",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2720 9100",
    website: "https://www.maptek.com",
    planCode: "STANDARD",
    verificationScore: 86
  }
];

async function seedPlans() {
  for (const plan of planSeeds) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        monthlyPriceCents: plan.monthlyPriceCents,
        isPublic: plan.isPublic,
        isDefault: plan.isDefault,
        featureFlags: plan.featureFlags
      },
      create: {
        code: plan.code,
        name: plan.name,
        monthlyPriceCents: plan.monthlyPriceCents,
        isPublic: plan.isPublic,
        isDefault: plan.isDefault,
        featureFlags: plan.featureFlags
      }
    });
  }
}

async function seedCategories() {
  for (const category of categorySeeds) {
    await prisma.category.upsert({
      where: { key: category.key },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: true
      },
      create: {
        key: category.key,
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: true
      }
    });
  }
}

async function seedRegionsAndCities() {
  for (const region of regionSeeds) {
    const createdRegion = await prisma.region.upsert({
      where: { code: region.code },
      update: {
        name: region.name,
        countryCode: "CL",
        isActive: true
      },
      create: {
        code: region.code,
        name: region.name,
        countryCode: "CL",
        isActive: true
      }
    });

    for (const cityName of region.cities) {
      await prisma.city.upsert({
        where: {
          regionId_name: {
            regionId: createdRegion.id,
            name: cityName
          }
        },
        update: {
          isActive: true
        },
        create: {
          regionId: createdRegion.id,
          name: cityName,
          isActive: true
        }
      });
    }
  }
}

async function seedCompanies() {
  for (const company of companySeeds) {
    const [category, region, plan] = await Promise.all([
      prisma.category.findUnique({ where: { key: company.categoryKey } }),
      prisma.region.findUnique({ where: { code: company.regionCode } }),
      prisma.plan.findUnique({ where: { code: company.planCode } })
    ]);

    if (!category || !region || !plan) {
      throw new Error(`Missing category, region, or plan reference for ${company.slug}`);
    }

    const city = await prisma.city.findUnique({
      where: {
        regionId_name: {
          regionId: region.id,
          name: company.cityName
        }
      }
    });

    if (!city) {
      throw new Error(`Missing city ${company.cityName} for ${company.slug}`);
    }

    const persistedCompany = await prisma.company.upsert({
      where: { slug: company.slug },
      update: {
        legalName: company.legalName,
        displayName: company.displayName,
        tagline: company.tagline,
        description: company.description,
        status: "ACTIVE",
        verificationScore: company.verificationScore,
        publishedAt: new Date()
      },
      create: {
        slug: company.slug,
        legalName: company.legalName,
        displayName: company.displayName,
        tagline: company.tagline,
        description: company.description,
        status: "ACTIVE",
        verificationScore: company.verificationScore,
        publishedAt: new Date()
      }
    });

    await prisma.companyCategoryLink.upsert({
      where: {
        companyId_categoryId: {
          companyId: persistedCompany.id,
          categoryId: category.id
        }
      },
      update: {
        isPrimary: true
      },
      create: {
        companyId: persistedCompany.id,
        categoryId: category.id,
        isPrimary: true
      }
    });

    await prisma.companyAddress.upsert({
      where: {
        id: `${persistedCompany.id}_hq`
      },
      update: {
        cityId: city.id,
        type: "HEADQUARTERS",
        addressLine1: "Mining District Office",
        countryCode: "CL",
        isPrimary: true
      },
      create: {
        id: `${persistedCompany.id}_hq`,
        companyId: persistedCompany.id,
        cityId: city.id,
        type: "HEADQUARTERS",
        addressLine1: "Mining District Office",
        countryCode: "CL",
        isPrimary: true
      }
    });

    await prisma.companyContact.upsert({
      where: {
        id: `${persistedCompany.id}_general`
      },
      update: {
        type: "GENERAL",
        phone: company.phone,
        website: company.website,
        isPrimary: true
      },
      create: {
        id: `${persistedCompany.id}_general`,
        companyId: persistedCompany.id,
        type: "GENERAL",
        phone: company.phone,
        website: company.website,
        isPrimary: true
      }
    });

    const existingSubscription = await prisma.companySubscription.findFirst({
      where: {
        companyId: persistedCompany.id,
        planId: plan.id
      }
    });

    if (existingSubscription) {
      await prisma.companySubscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "ACTIVE",
          currentPeriodStartAt: new Date(),
          currentPeriodEndAt: null
        }
      });
    } else {
      await prisma.companySubscription.create({
        data: {
          companyId: persistedCompany.id,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStartAt: new Date()
        }
      });
    }
  }
}

async function main() {
  await seedPlans();
  await seedCategories();
  await seedRegionsAndCities();
  await seedCompanies();
  await seedAdminUser();
}

async function seedAdminUser() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@mineraleschilenos.cl").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "minero2025";
  const adminFullName = process.env.SEED_ADMIN_NAME ?? "Platform Admin";

  const passwordHash = await hash(adminPassword, 12);
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: adminFullName,
      passwordHash,
      isActive: true
    },
    create: {
      email: adminEmail,
      fullName: adminFullName,
      passwordHash,
      isActive: true
    }
  });

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_role: {
        userId: user.id,
        role: "SUPER_ADMIN"
      }
    },
    update: {},
    create: {
      userId: user.id,
      role: "SUPER_ADMIN"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Prisma seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
