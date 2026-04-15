import { CompanyCategory, CompanyPlan, CompanyStatus } from "@minerales/types";
import type { Company } from "@minerales/contracts";

export const seedCompanies: Company[] = [
  {
    id: "cmp_001",
    name: "SGS Chile Ltda.",
    tagline: "Laboratory and certification services for mining operations.",
    description:
      "Global inspection, testing, and certification provider with local mining expertise.",
    city: "Santiago",
    region: "Metropolitana",
    phone: "+56 2 2793 2000",
    website: "https://www.sgs.com",
    category: CompanyCategory.LABORATORY,
    plan: CompanyPlan.PREMIUM,
    status: CompanyStatus.ACTIVE
  },
  {
    id: "cmp_002",
    name: "ALS Chemex Chile",
    tagline: "Geochemical and metallurgical assay services.",
    description:
      "Laboratory focused on analytical quality and turnaround time for exploration projects.",
    city: "Antofagasta",
    region: "Antofagasta",
    phone: "+56 55 2281 000",
    website: "https://www.alsglobal.com",
    category: CompanyCategory.LABORATORY,
    plan: CompanyPlan.STANDARD,
    status: CompanyStatus.ACTIVE
  },
  {
    id: "cmp_003",
    name: "SRK Consulting Chile",
    tagline: "Geotechnical and mining consulting.",
    description:
      "Independent consulting for technical studies, mine planning, and risk assessment.",
    city: "Santiago",
    region: "Metropolitana",
    phone: "+56 2 2448 3000",
    website: "https://www.srk.com",
    category: CompanyCategory.CONSULTING,
    plan: CompanyPlan.PREMIUM,
    status: CompanyStatus.ACTIVE
  },
  {
    id: "cmp_004",
    name: "Finning Chile",
    tagline: "Heavy equipment and maintenance for mining fleets.",
    description:
      "Caterpillar distributor with field support, parts logistics, and maintenance contracts.",
    city: "Santiago",
    region: "Metropolitana",
    phone: "+56 2 2928 4000",
    website: "https://www.finning.com",
    category: CompanyCategory.EQUIPMENT,
    plan: CompanyPlan.PREMIUM,
    status: CompanyStatus.ACTIVE
  },
  {
    id: "cmp_005",
    name: "Enaex",
    tagline: "Explosives and blasting services.",
    description:
      "Industrial explosives manufacturer with onsite support for blasting optimization.",
    city: "Santiago",
    region: "Metropolitana",
    phone: "+56 2 2339 7000",
    website: "https://www.enaex.com",
    category: CompanyCategory.EXPLOSIVES,
    plan: CompanyPlan.PREMIUM,
    status: CompanyStatus.ACTIVE
  },
  {
    id: "cmp_006",
    name: "Mutual de Seguridad",
    tagline: "Occupational health and safety for mining companies.",
    description:
      "Safety training, prevention programs, and compliance support for industrial operations.",
    city: "Santiago",
    region: "Metropolitana",
    phone: "+56 2 2685 3000",
    website: "https://www.mutual.cl",
    category: CompanyCategory.SAFETY,
    plan: CompanyPlan.FREE,
    status: CompanyStatus.ACTIVE
  },
  {
    id: "cmp_007",
    name: "Transchile Mineria",
    tagline: "Specialized transport for mining materials.",
    description:
      "Road logistics operator for concentrate, chemicals, and oversized mining cargo.",
    city: "Antofagasta",
    region: "Antofagasta",
    phone: "+56 55 2600 700",
    website: "https://www.transchile.cl",
    category: CompanyCategory.TRANSPORT,
    plan: CompanyPlan.STANDARD,
    status: CompanyStatus.ACTIVE
  },
  {
    id: "cmp_008",
    name: "Maptek Chile",
    tagline: "Mining software and geological modeling.",
    description:
      "Digital tools for geological modeling, planning, and production optimization.",
    city: "Santiago",
    region: "Metropolitana",
    phone: "+56 2 2720 9100",
    website: "https://www.maptek.com",
    category: CompanyCategory.SOFTWARE,
    plan: CompanyPlan.PREMIUM,
    status: CompanyStatus.ACTIVE
  },
  {
    id: "cmp_009",
    name: "Fluor Chile",
    tagline: "Engineering and project management.",
    description:
      "Integrated engineering and EPCM services for large mining developments.",
    city: "Santiago",
    region: "Metropolitana",
    phone: "+56 2 2652 5000",
    website: "https://www.fluor.com",
    category: CompanyCategory.ENGINEERING,
    plan: CompanyPlan.STANDARD,
    status: CompanyStatus.ACTIVE
  }
];
