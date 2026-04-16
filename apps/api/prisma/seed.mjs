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
  // Laboratory
  {
    slug: "sgs-chile-ltda",
    legalName: "SGS Chile Ltda.",
    displayName: "SGS Chile Ltda.",
    tagline: "Laboratorio internacional de analisis minero y certificacion.",
    description: "SGS ofrece servicios de analisis, inspeccion y certificacion para operaciones mineras.",
    categoryKey: "laboratory",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2793 2000",
    website: "https://www.sgs.com/cl",
    planCode: "PREMIUM",
    verificationScore: 95
  },
  {
    slug: "als-chemex-chile",
    legalName: "ALS Chemex Chile",
    displayName: "ALS Chemex Chile",
    tagline: "Analisis geoquimico y servicios de laboratorio para mineria.",
    description: "ALS entrega analisis minero con foco en calidad y tiempos de respuesta.",
    categoryKey: "laboratory",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2281 000",
    website: "https://www.alsglobal.com",
    planCode: "STANDARD",
    verificationScore: 90
  },
  {
    slug: "acme-analytical-labs-chile",
    legalName: "Acme Analytical Labs Chile",
    displayName: "Acme Analytical Labs Chile",
    tagline: "Analisis de minerales y procesamiento de muestras.",
    description: "Laboratorio especializado en materiales geologicos para la industria minera.",
    categoryKey: "laboratory",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2206 1500",
    website: "https://www.acmelab.com",
    planCode: "FREE",
    verificationScore: 78
  },
  {
    slug: "lab-chile-sa",
    legalName: "Lab Chile S.A.",
    displayName: "Lab Chile S.A.",
    tagline: "Laboratorio de ensayo y calibracion acreditado por INN.",
    description: "Servicios de analisis de aguas, suelos y minerales con acreditacion tecnica.",
    categoryKey: "laboratory",
    regionCode: "CL-AT",
    cityName: "Copiapo",
    phone: "+56 52 2210 300",
    website: "https://www.labchile.cl",
    planCode: "FREE",
    verificationScore: 75
  },
  {
    slug: "testchem-sa",
    legalName: "Testchem S.A.",
    displayName: "Testchem S.A.",
    tagline: "Analisis quimicos industriales y mineros.",
    description: "Laboratorio regional para analisis de cobre y otros metales.",
    categoryKey: "laboratory",
    regionCode: "CL-AN",
    cityName: "Calama",
    phone: "+56 55 2319 100",
    website: "https://www.testchem.cl",
    planCode: "FREE",
    verificationScore: 72
  },
  // Consulting
  {
    slug: "geoinnova-consultores",
    legalName: "Geoinnova Consultores",
    displayName: "Geoinnova Consultores",
    tagline: "Exploracion geologica y recursos minerales.",
    description: "Consultora para estudios geologicos, exploracion y modelamiento de recursos.",
    categoryKey: "consulting",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2944 5000",
    website: "https://www.geoinnova.cl",
    planCode: "PREMIUM",
    verificationScore: 90
  },
  {
    slug: "srk-consulting-chile",
    legalName: "SRK Consulting Chile",
    displayName: "SRK Consulting Chile",
    tagline: "Consultoria geotecnica, ambiental y minera.",
    description: "Firma internacional de consultoria para factibilidad, geotecnia y cierre minero.",
    categoryKey: "consulting",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2448 3000",
    website: "https://www.srk.com/en/chile",
    planCode: "STANDARD",
    verificationScore: 93
  },
  {
    slug: "amc-consultants-chile",
    legalName: "AMC Consultants Chile",
    displayName: "AMC Consultants Chile",
    tagline: "Gestion de recursos y reservas minerales.",
    description: "Especialistas en estimacion de recursos y planificacion minera.",
    categoryKey: "consulting",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2580 100",
    website: "https://www.amcconsultants.com",
    planCode: "FREE",
    verificationScore: 80
  },
  {
    slug: "ausenco-chile",
    legalName: "Ausenco Chile",
    displayName: "Ausenco Chile",
    tagline: "Ingenieria y consultoria para proyectos mineros.",
    description: "Servicios de pre-factibilidad, factibilidad y EPCM para mineria.",
    categoryKey: "consulting",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2585 0700",
    website: "https://www.ausenco.com",
    planCode: "FREE",
    verificationScore: 82
  },
  {
    slug: "geovita-mineria",
    legalName: "Geovita Mineria S.A.",
    displayName: "Geovita Mineria S.A.",
    tagline: "Asesoria geologica y catastro minero.",
    description: "Asesoria para concesiones, catastro y tramites ante SERNAGEOMIN.",
    categoryKey: "consulting",
    regionCode: "CL-AT",
    cityName: "Copiapo",
    phone: "+56 52 2285 500",
    website: "https://www.geovita.cl",
    planCode: "FREE",
    verificationScore: 74
  },
  // Equipment
  {
    slug: "finning-chile-sa",
    legalName: "Finning Chile S.A.",
    displayName: "Finning Chile S.A.",
    tagline: "Distribuidor Caterpillar. Maquinaria y soporte tecnico.",
    description: "Proveedor de maquinaria pesada, repuestos y soporte para gran mineria.",
    categoryKey: "equipment",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2928 4000",
    website: "https://www.finning.com/cl",
    planCode: "PREMIUM",
    verificationScore: 94
  },
  {
    slug: "ferreyros-chile",
    legalName: "Ferreyros Chile",
    displayName: "Ferreyros Chile",
    tagline: "Equipos Komatsu y soluciones integrales para mineria.",
    description: "Representacion Komatsu para equipos de extraccion y operaciones a rajo abierto.",
    categoryKey: "equipment",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2440 200",
    website: "https://www.ferreyros.com.pe",
    planCode: "STANDARD",
    verificationScore: 88
  },
  {
    slug: "atlas-copco-chile",
    legalName: "Atlas Copco Chile",
    displayName: "Atlas Copco Chile",
    tagline: "Perforadoras, compresores y equipos de roca.",
    description: "Equipos de perforacion y compresion para mineria subterranea y de superficie.",
    categoryKey: "equipment",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2906 0600",
    website: "https://www.atlascopco.com/es-cl",
    planCode: "STANDARD",
    verificationScore: 86
  },
  {
    slug: "sandvik-mining-chile",
    legalName: "Sandvik Mining Chile",
    displayName: "Sandvik Mining Chile",
    tagline: "Equipos y herramientas de corte para mineria.",
    description: "Proveedor global de equipos subterraneos, perforacion y herramientas de roca.",
    categoryKey: "equipment",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2909 6000",
    website: "https://www.home.sandvik/es",
    planCode: "FREE",
    verificationScore: 84
  },
  {
    slug: "epiroc-chile",
    legalName: "Epiroc Chile",
    displayName: "Epiroc Chile",
    tagline: "Perforacion e ingenieria de roca para mineria.",
    description: "Tecnologias de perforacion, accesorios y automatizacion para faenas mineras.",
    categoryKey: "equipment",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2450 000",
    website: "https://www.epiroc.com/es-cl",
    planCode: "FREE",
    verificationScore: 83
  },
  {
    slug: "weir-minerals-chile",
    legalName: "Weir Minerals Chile",
    displayName: "Weir Minerals Chile",
    tagline: "Bombas, valvulas y sistemas de manejo de slurry.",
    description: "Soluciones para manejo de minerales y desgaste en plantas de proceso.",
    categoryKey: "equipment",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2770 8800",
    website: "https://www.global.weir",
    planCode: "FREE",
    verificationScore: 81
  },
  // Explosives
  {
    slug: "enaex-sa",
    legalName: "Enaex S.A.",
    displayName: "Enaex S.A.",
    tagline: "Fabricante y proveedor lider de explosivos en Chile.",
    description: "Produccion de ANFO, emulsiones y servicios integrales de tronadura.",
    categoryKey: "explosives",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2339 7000",
    website: "https://www.enaex.com",
    planCode: "PREMIUM",
    verificationScore: 95
  },
  {
    slug: "orica-chile",
    legalName: "Orica Chile",
    displayName: "Orica Chile",
    tagline: "Servicios globales de voladura y explosivos.",
    description: "Sistemas de iniciacion electronica y soluciones para diseno de tronadura.",
    categoryKey: "explosives",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2248 000",
    website: "https://www.orica.com",
    planCode: "STANDARD",
    verificationScore: 89
  },
  {
    slug: "maxam-chile",
    legalName: "Maxam Chile",
    displayName: "Maxam Chile",
    tagline: "Explosivos y servicios de fragmentacion de roca.",
    description: "Fabricacion y distribucion de explosivos industriales para mineria y obras.",
    categoryKey: "explosives",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2361 4000",
    website: "https://www.maxamcorp.com",
    planCode: "FREE",
    verificationScore: 78
  },
  {
    slug: "detnet-chile",
    legalName: "DetNet Chile",
    displayName: "DetNet Chile",
    tagline: "Detonadores electronicos para tronadura precisa.",
    description: "Sistemas de iniciacion electronica para mejorar precision y control de vibracion.",
    categoryKey: "explosives",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2600 100",
    website: "https://www.detnet.com",
    planCode: "FREE",
    verificationScore: 77
  },
  // Safety
  {
    slug: "iss-chile-seguridad-minera",
    legalName: "ISS Chile (Seguridad Minera)",
    displayName: "ISS Chile (Seguridad Minera)",
    tagline: "Seguridad industrial y vigilancia para faenas mineras.",
    description: "Servicios de guardias, control de acceso y prevencion de riesgos.",
    categoryKey: "safety",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2220 500",
    website: "https://www.iss-security.cl",
    planCode: "PREMIUM",
    verificationScore: 90
  },
  {
    slug: "mutual-de-seguridad-cchc",
    legalName: "Mutual de Seguridad CChC",
    displayName: "Mutual de Seguridad CChC",
    tagline: "Prevencion de accidentes y salud ocupacional.",
    description: "Apoyo en prevencion, salud ocupacional y capacitacion para mineria.",
    categoryKey: "safety",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2685 3000",
    website: "https://www.mutual.cl",
    planCode: "STANDARD",
    verificationScore: 85
  },
  {
    slug: "3m-chile-division-mineria",
    legalName: "3M Chile — Division Mineria",
    displayName: "3M Chile — Division Mineria",
    tagline: "EPP y soluciones de seguridad personal para mineria.",
    description: "Equipos de proteccion personal para entornos mineros de alta exigencia.",
    categoryKey: "safety",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2426 5000",
    website: "https://www.3m.cl",
    planCode: "FREE",
    verificationScore: 82
  },
  {
    slug: "honeywell-safety-chile",
    legalName: "Honeywell Safety Chile",
    displayName: "Honeywell Safety Chile",
    tagline: "Tecnologia de deteccion de gases y EPP avanzado.",
    description: "Detectores de gas y soluciones de seguridad para mineria subterranea.",
    categoryKey: "safety",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2510 200",
    website: "https://www.honeywell.com",
    planCode: "FREE",
    verificationScore: 80
  },
  {
    slug: "prevencontrol-ltda",
    legalName: "Prevencontrol Ltda.",
    displayName: "Prevencontrol Ltda.",
    tagline: "Asesoria en prevencion de riesgos mineros.",
    description: "Auditorias y capacitacion para cumplimiento de normativa de seguridad minera.",
    categoryKey: "safety",
    regionCode: "CL-AT",
    cityName: "Copiapo",
    phone: "+56 52 2300 400",
    website: "https://www.prevencontrol.cl",
    planCode: "FREE",
    verificationScore: 74
  },
  // Transport
  {
    slug: "transchile-mineria-sa",
    legalName: "Transchile Mineria S.A.",
    displayName: "Transchile Mineria S.A.",
    tagline: "Transporte especializado de concentrados y materiales.",
    description: "Transporte minero de carga peligrosa y concentrados con flota dedicada.",
    categoryKey: "transport",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2600 700",
    website: "https://www.transchile.cl",
    planCode: "PREMIUM",
    verificationScore: 91
  },
  {
    slug: "efe-cargo-chile",
    legalName: "Efe Cargo Chile",
    displayName: "Efe Cargo Chile",
    tagline: "Transporte ferroviario de minerales y carga pesada.",
    description: "Logistica ferroviaria para grandes volumenes de mineral y carga industrial.",
    categoryKey: "transport",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2376 5000",
    website: "https://www.efecargo.cl",
    planCode: "FREE",
    verificationScore: 79
  },
  {
    slug: "logistec-sa",
    legalName: "Logistec S.A.",
    displayName: "Logistec S.A.",
    tagline: "Logistica portuaria y distribucion para mineria.",
    description: "Servicios portuarios y despacho de concentrados para exportacion.",
    categoryKey: "transport",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2502 000",
    website: "https://www.logistec.cl",
    planCode: "FREE",
    verificationScore: 78
  },
  {
    slug: "starco-chile-division-mineria",
    legalName: "Starco Chile — Division Mineria",
    displayName: "Starco Chile — Division Mineria",
    tagline: "Soluciones de transporte y logistica integral minera.",
    description: "Flota especializada para transporte interno y rutas mineras del norte.",
    categoryKey: "transport",
    regionCode: "CL-AN",
    cityName: "Calama",
    phone: "+56 55 2300 800",
    website: "https://www.starco.cl",
    planCode: "FREE",
    verificationScore: 76
  },
  // Software
  {
    slug: "maptek-chile",
    legalName: "Maptek Chile",
    displayName: "Maptek Chile",
    tagline: "Software de modelamiento geologico y planificacion minera.",
    description: "Suite digital para modelamiento, recursos y planificacion operativa.",
    categoryKey: "software",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2720 9100",
    website: "https://www.maptek.com/es",
    planCode: "PREMIUM",
    verificationScore: 92
  },
  {
    slug: "dassault-systemes-chile-geovia",
    legalName: "Dassault Systemes Chile (GEOVIA)",
    displayName: "Dassault Systemes Chile (GEOVIA)",
    tagline: "Soluciones de software para simulacion y planificacion.",
    description: "Plataformas GEOVIA para modelamiento de yacimientos y optimizacion de pit.",
    categoryKey: "software",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2595 0500",
    website: "https://www.3ds.com/geovia",
    planCode: "STANDARD",
    verificationScore: 88
  },
  {
    slug: "hexagon-mining-chile",
    legalName: "Hexagon Mining Chile",
    displayName: "Hexagon Mining Chile",
    tagline: "Tecnologia inteligente para operaciones mineras.",
    description: "Gestion de flota, despacho en tiempo real y seguridad operacional.",
    categoryKey: "software",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2601 500",
    website: "https://www.hexagonmining.com",
    planCode: "FREE",
    verificationScore: 84
  },
  {
    slug: "micromine-chile",
    legalName: "Micromine Chile",
    displayName: "Micromine Chile",
    tagline: "Software de exploracion, geologia y planificacion.",
    description: "Herramientas para exploracion, datos geologicos y planificacion de mina.",
    categoryKey: "software",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2370 7000",
    website: "https://www.micromine.com/es",
    planCode: "FREE",
    verificationScore: 80
  },
  {
    slug: "datamine-chile",
    legalName: "DataMine Chile",
    displayName: "DataMine Chile",
    tagline: "Analisis de datos geologicos y mine planning.",
    description: "Suite para gestion de recursos, programacion y optimizacion minera.",
    categoryKey: "software",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2490 3000",
    website: "https://www.dataminesoftware.com/es",
    planCode: "FREE",
    verificationScore: 79
  },
  {
    slug: "gis-mineria-chile",
    legalName: "GIS Mineria Chile",
    displayName: "GIS Mineria Chile",
    tagline: "Sistemas de informacion geografica aplicados a mineria.",
    description: "Soluciones SIG y cartografia para exploracion y operacion minera.",
    categoryKey: "software",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2361 7000",
    website: "https://www.gismineria.cl",
    planCode: "FREE",
    verificationScore: 75
  },
  // Engineering
  {
    slug: "bechtel-chile",
    legalName: "Bechtel Chile",
    displayName: "Bechtel Chile",
    tagline: "Ingenieria, adquisiciones y construccion (EPC) en mineria.",
    description: "Ejecucion EPC/EPCM para proyectos mineros de gran escala.",
    categoryKey: "engineering",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2370 9000",
    website: "https://www.bechtel.com",
    planCode: "PREMIUM",
    verificationScore: 95
  },
  {
    slug: "fluor-chile-sa",
    legalName: "Fluor Chile S.A.",
    displayName: "Fluor Chile S.A.",
    tagline: "Ingenieria y gestion de proyectos mineros.",
    description: "Gestion de proyectos EPCM para cobre, litio y otros metales.",
    categoryKey: "engineering",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2652 5000",
    website: "https://www.fluor.com",
    planCode: "STANDARD",
    verificationScore: 90
  },
  {
    slug: "hatch-chile",
    legalName: "Hatch Chile",
    displayName: "Hatch Chile",
    tagline: "Consultoria e ingenieria de procesos para mineria.",
    description: "Ingenieria de procesos y metalurgia para proyectos mineros complejos.",
    categoryKey: "engineering",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2585 6000",
    website: "https://www.hatch.com",
    planCode: "FREE",
    verificationScore: 86
  },
  {
    slug: "amec-foster-wheeler-chile",
    legalName: "AMEC Foster Wheeler Chile",
    displayName: "AMEC Foster Wheeler Chile",
    tagline: "Ingenieria ambiental y de proyectos para mineria.",
    description: "Estudios ambientales e ingenieria para desarrollo de proyectos mineros.",
    categoryKey: "engineering",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2583 9000",
    website: "https://www.woodplc.com",
    planCode: "FREE",
    verificationScore: 82
  },
  {
    slug: "geocom-mineria",
    legalName: "Geocom Mineria",
    displayName: "Geocom Mineria",
    tagline: "Construccion e infraestructura para faenas mineras.",
    description: "Obras civiles, campamentos e infraestructura de apoyo para mineria.",
    categoryKey: "engineering",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2200 900",
    website: "https://www.geocom.cl",
    planCode: "FREE",
    verificationScore: 78
  },
  {
    slug: "techint-chile-sa",
    legalName: "Techint Chile S.A.",
    displayName: "Techint Chile S.A.",
    tagline: "Ingenieria, fabricacion y montaje industrial.",
    description: "Servicios de ingenieria y montaje para activos mineros e industriales.",
    categoryKey: "engineering",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2352 5000",
    website: "https://www.techint.com/tenova",
    planCode: "FREE",
    verificationScore: 77
  },
  {
    slug: "salfacorp-mineria",
    legalName: "Salfacorp Mineria",
    displayName: "Salfacorp Mineria",
    tagline: "Construccion y servicios de ingenieria en mineria.",
    description: "Construccion de plantas, obras civiles y montaje para gran mineria.",
    categoryKey: "engineering",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2653 9600",
    website: "https://www.salfacorp.com",
    planCode: "FREE",
    verificationScore: 79
  },
  {
    slug: "besalco-mineria-sa",
    legalName: "Besalco Mineria S.A.",
    displayName: "Besalco Mineria S.A.",
    tagline: "Mineria por contrato y obras de infraestructura.",
    description: "Movimiento de tierra e infraestructura para proyectos mineros.",
    categoryKey: "engineering",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2760 8000",
    website: "https://www.besalco.cl",
    planCode: "FREE",
    verificationScore: 78
  },
  {
    slug: "aquatec-mineria",
    legalName: "Aquatec Mineria",
    displayName: "Aquatec Mineria",
    tagline: "Soluciones hidricas para faenas mineras.",
    description: "Sistemas de agua de proceso, recirculacion y desalacion para mineria.",
    categoryKey: "engineering",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2380 200",
    website: "https://www.aquatec.cl",
    planCode: "FREE",
    verificationScore: 76
  },
  {
    slug: "ventus-energia-minera",
    legalName: "Ventus Energia Minera",
    displayName: "Ventus Energia Minera",
    tagline: "Energias renovables para operaciones mineras.",
    description: "Estrategias PPA y proyectos renovables para reducir costos y emisiones.",
    categoryKey: "engineering",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2280 4000",
    website: "https://www.ventus.cl",
    planCode: "FREE",
    verificationScore: 75
  },
  {
    slug: "cidelec-mineria",
    legalName: "Cidelec Mineria",
    displayName: "Cidelec Mineria",
    tagline: "Sistemas electricos e instrumentacion para mineria.",
    description: "Servicios de media/alta tension e instrumentacion para plantas mineras.",
    categoryKey: "engineering",
    regionCode: "CL-AN",
    cityName: "Antofagasta",
    phone: "+56 55 2450 900",
    website: "https://www.cidelec.cl",
    planCode: "FREE",
    verificationScore: 75
  },
  // Bonus entries from code.txt
  {
    slug: "terramar-chile",
    legalName: "Terramar Chile",
    displayName: "Terramar Chile",
    tagline: "Perforacion diamantina y sondajes de exploracion.",
    description: "Perforacion de sondajes diamantinos para exploracion en norte de Chile.",
    categoryKey: "consulting",
    regionCode: "CL-AT",
    cityName: "Copiapo",
    phone: "+56 52 2320 100",
    website: "https://www.terramar.cl",
    planCode: "FREE",
    verificationScore: 73
  },
  {
    slug: "promet-chile",
    legalName: "Promet Chile",
    displayName: "Promet Chile",
    tagline: "Metalurgia extractiva y procesos hidrometalurgicos.",
    description: "Consultoria para flotacion, lixiviacion y optimizacion de procesos metalurgicos.",
    categoryKey: "consulting",
    regionCode: "CL-RM",
    cityName: "Santiago",
    phone: "+56 2 2444 8000",
    website: "https://www.promet.cl",
    planCode: "FREE",
    verificationScore: 74
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
