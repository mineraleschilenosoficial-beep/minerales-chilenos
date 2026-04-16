import { CompanyCategory, CompanyPlan } from "@minerales/types";

export type SupportedLocale = "en" | "es";

type DirectoryTranslation = {
  localeSwitcherLabel: string;
  localeEnglish: string;
  localeSpanish: string;
  brandName: string;
  brandTagline: string;
  heroTitle: string;
  heroSubtitle: string;
  statsPublishedSuppliers: string;
  statsActiveCategories: string;
  statsPremiumSuppliers: string;
  statsTopCategory: string;
  statsNotAvailable: string;
  statsLoadingValue: string;
  directoryTitle: string;
  searchPlaceholder: string;
  allCategoriesOption: string;
  loadingSuppliers: string;
  noSupplierResults: string;
  viewDetailsAction: string;
  requestTitle: string;
  formNameLabel: string;
  formTaglineLabel: string;
  formDescriptionLabel: string;
  formCityLabel: string;
  formRegionLabel: string;
  formPhoneLabel: string;
  formEmailLabel: string;
  formWebsiteLabel: string;
  formCategoryLabel: string;
  formPlanLabel: string;
  submitAction: string;
  submittingAction: string;
  closeAction: string;
  defaultCompanyTagline: string;
  invalidFormFeedback: string;
  submitSuccessFeedback: string;
  submitErrorFeedback: string;
  categories: Record<CompanyCategory, string>;
  plans: Record<CompanyPlan, string>;
};

export const directoryTranslations: Record<SupportedLocale, DirectoryTranslation> = {
  en: {
    localeSwitcherLabel: "Language",
    localeEnglish: "EN",
    localeSpanish: "ES",
    brandName: "MineralesChilenos.cl",
    brandTagline: "B2B Mining Supplier Directory",
    heroTitle: "Find trusted mining suppliers in Chile.",
    heroSubtitle:
      "Search companies by category, compare supplier profiles, and submit your company for publication in the directory.",
    statsPublishedSuppliers: "Published Suppliers",
    statsActiveCategories: "Active Categories",
    statsPremiumSuppliers: "Premium Suppliers",
    statsTopCategory: "Top Category",
    statsNotAvailable: "N/A",
    statsLoadingValue: "...",
    directoryTitle: "Supplier Directory",
    searchPlaceholder: "Search by company, city, or tagline",
    allCategoriesOption: "All categories",
    loadingSuppliers: "Loading suppliers...",
    noSupplierResults: "No suppliers match your search.",
    viewDetailsAction: "View details",
    requestTitle: "Submit Your Company",
    formNameLabel: "Company name",
    formTaglineLabel: "Tagline",
    formDescriptionLabel: "Description",
    formCityLabel: "City",
    formRegionLabel: "Region",
    formPhoneLabel: "Phone",
    formEmailLabel: "Email",
    formWebsiteLabel: "Website (optional)",
    formCategoryLabel: "Category",
    formPlanLabel: "Requested plan",
    submitAction: "Submit request",
    submittingAction: "Submitting...",
    closeAction: "Close",
    defaultCompanyTagline: "Mining supplier profile.",
    invalidFormFeedback: "Please complete the form with valid values.",
    submitSuccessFeedback: "Request submitted successfully. We will contact you soon.",
    submitErrorFeedback: "Unable to submit request right now. Please try again.",
    categories: {
      [CompanyCategory.LABORATORY]: "Laboratory",
      [CompanyCategory.CONSULTING]: "Consulting",
      [CompanyCategory.EQUIPMENT]: "Equipment",
      [CompanyCategory.EXPLOSIVES]: "Explosives",
      [CompanyCategory.SAFETY]: "Safety",
      [CompanyCategory.TRANSPORT]: "Transport",
      [CompanyCategory.SOFTWARE]: "Software",
      [CompanyCategory.ENGINEERING]: "Engineering"
    },
    plans: {
      [CompanyPlan.FREE]: "Free",
      [CompanyPlan.STANDARD]: "Standard",
      [CompanyPlan.PREMIUM]: "Premium"
    }
  },
  es: {
    localeSwitcherLabel: "Idioma",
    localeEnglish: "EN",
    localeSpanish: "ES",
    brandName: "MineralesChilenos.cl",
    brandTagline: "Directorio B2B de Proveedores Mineros",
    heroTitle: "Encuentra proveedores mineros confiables en Chile.",
    heroSubtitle:
      "Busca empresas por categoria, compara perfiles de proveedores y envia tu empresa para publicacion en el directorio.",
    statsPublishedSuppliers: "Proveedores Publicados",
    statsActiveCategories: "Categorias Activas",
    statsPremiumSuppliers: "Proveedores Premium",
    statsTopCategory: "Categoria Principal",
    statsNotAvailable: "N/D",
    statsLoadingValue: "...",
    directoryTitle: "Directorio de Proveedores",
    searchPlaceholder: "Buscar por empresa, ciudad o descripcion",
    allCategoriesOption: "Todas las categorias",
    loadingSuppliers: "Cargando proveedores...",
    noSupplierResults: "No hay proveedores que coincidan con tu busqueda.",
    viewDetailsAction: "Ver detalle",
    requestTitle: "Publica Tu Empresa",
    formNameLabel: "Nombre de empresa",
    formTaglineLabel: "Descripcion corta",
    formDescriptionLabel: "Descripcion",
    formCityLabel: "Ciudad",
    formRegionLabel: "Region",
    formPhoneLabel: "Telefono",
    formEmailLabel: "Correo",
    formWebsiteLabel: "Sitio web (opcional)",
    formCategoryLabel: "Categoria",
    formPlanLabel: "Plan solicitado",
    submitAction: "Enviar solicitud",
    submittingAction: "Enviando...",
    closeAction: "Cerrar",
    defaultCompanyTagline: "Perfil de proveedor minero.",
    invalidFormFeedback: "Completa el formulario con valores validos.",
    submitSuccessFeedback: "Solicitud enviada correctamente. Te contactaremos pronto.",
    submitErrorFeedback: "No se pudo enviar la solicitud. Intentalo nuevamente.",
    categories: {
      [CompanyCategory.LABORATORY]: "Laboratorio",
      [CompanyCategory.CONSULTING]: "Consultoria",
      [CompanyCategory.EQUIPMENT]: "Equipos",
      [CompanyCategory.EXPLOSIVES]: "Explosivos",
      [CompanyCategory.SAFETY]: "Seguridad",
      [CompanyCategory.TRANSPORT]: "Transporte",
      [CompanyCategory.SOFTWARE]: "Software",
      [CompanyCategory.ENGINEERING]: "Ingenieria"
    },
    plans: {
      [CompanyPlan.FREE]: "Gratis",
      [CompanyPlan.STANDARD]: "Estandar",
      [CompanyPlan.PREMIUM]: "Premium"
    }
  }
};
