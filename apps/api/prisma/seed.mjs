import { PrismaClient } from "@prisma/client";

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

async function main() {
  await seedPlans();
  await seedCategories();
  await seedRegionsAndCities();
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
