import { CompanyCategory, CompanyPlan } from "@minerales/types";

export type SupportedLocale = "en" | "es";

/**
 * @description Resolves app locale to a BCP-47 region tag for formatting dates/numbers.
 * @param locale App locale code.
 * @returns Region-aware locale tag.
 */
export function resolveFormattingLocale(locale: SupportedLocale): string {
  return locale === "es" ? "es-CL" : "en-US";
}

type DirectoryTranslation = {
  localeSwitcherLabel: string;
  localeEnglish: string;
  localeSpanish: string;
  adminAccessAction: string;
  themeSwitcherLabel: string;
  themeLight: string;
  themeDark: string;
  brandName: string;
  brandTagline: string;
  landingNavDirectory: string;
  landingNavCategories: string;
  landingNavPlans: string;
  landingNavContact: string;
  landingLaunchBannerTitle: string;
  landingLaunchBannerSubtitle: string;
  landingHeroBadge: string;
  landingHeroPrimaryAction: string;
  landingHeroSecondaryAction: string;
  landingSearchTitle: string;
  landingPricingTitle: string;
  landingPricingSubtitle: string;
  landingPlanBasicName: string;
  landingPlanStandardName: string;
  landingPlanPremiumName: string;
  landingPlanBasicPrice: string;
  landingPlanStandardPrice: string;
  landingPlanPremiumPrice: string;
  landingPlanBasicPeriod: string;
  landingPlanStandardPeriod: string;
  landingPlanPremiumPeriod: string;
  landingPlanPopularBadge: string;
  landingPlanBasicFeatures: string[];
  landingPlanStandardFeatures: string[];
  landingPlanPremiumFeatures: string[];
  landingCtaTitle: string;
  landingCtaSubtitle: string;
  landingCtaAction: string;
  landingFooterCopyright: string;
  landingFooterContact: string;
  heroTitle: string;
  heroSubtitle: string;
  statsPublishedSuppliers: string;
  statsActiveCategories: string;
  statsPremiumSuppliers: string;
  statsTopCategory: string;
  statsNotAvailable: string;
  statsLoadingValue: string;
  paginationPrev: string;
  paginationNext: string;
  paginationPageOf: string;
  operationsTitle: string;
  operationsSubtitle: string;
  operationsRefresh: string;
  operationsExportCsvAction: string;
  operationsExportingCsvAction: string;
  operationsExportSuccessFeedback: string;
  operationsExportErrorFeedback: string;
  operationsCsvFilePrefix: string;
  operationsFilterStatusLabel: string;
  operationsFilterStatusAll: string;
  operationsCanonicalReadyCountLabel: string;
  operationsCanonicalPendingCountLabel: string;
  operationsSortLabel: string;
  operationsSortNewest: string;
  operationsSortOldest: string;
  operationsSearchPlaceholder: string;
  operationsPaginationPage: string;
  operationsPaginationPrev: string;
  operationsPaginationNext: string;
  operationsTotalResultsLabel: string;
  operationsAuthTitle: string;
  operationsAuthSubtitle: string;
  operationsAuthEmailLabel: string;
  operationsAuthPasswordLabel: string;
  operationsAuthLoginAction: string;
  operationsAuthLogoutAction: string;
  operationsAuthLoginError: string;
  operationsAuthSessionExpired: string;
  operationsAuthLoginPageHint: string;
  operationsAuthGoToLogin: string;
  operationsAuthBackToDirectory: string;
  operationsAdminShellTitle: string;
  operationsAdminShellSubtitle: string;
  operationsNoAccess: string;
  operationsNavDashboard: string;
  operationsNavCompanies: string;
  operationsNavRequests: string;
  operationsNavUsers: string;
  operationsNavPlans: string;
  operationsDashboardTitle: string;
  operationsDashboardSubtitle: string;
  operationsDashboardActiveCompanies: string;
  operationsDashboardPendingRequests: string;
  operationsDashboardPremiumCompanies: string;
  operationsDashboardStandardCompanies: string;
  operationsDashboardRecentRequests: string;
  operationsDashboardCategoryBreakdown: string;
  operationsDashboardOpenRequestAction: string;
  operationsDashboardWhatsAppAction: string;
  operationsDashboardWhatsAppTemplate: string;
  operationsCompaniesTitle: string;
  operationsCompaniesSubtitle: string;
  operationsCompaniesCreateAction: string;
  operationsEditAction: string;
  operationsCompaniesDeleteAction: string;
  operationsCompaniesSaveAction: string;
  operationsCompaniesStatusFilterLabel: string;
  operationsCompaniesPlanFilterLabel: string;
  operationsCompaniesStatusAll: string;
  operationsCompaniesStatusActive: string;
  operationsCompaniesStatusInactive: string;
  operationsCompaniesSearchPlaceholder: string;
  operationsCompaniesLoadError: string;
  operationsCompaniesCreateSuccess: string;
  operationsCompaniesUpdateSuccess: string;
  operationsCompaniesDeleteSuccess: string;
  operationsPlansTitle: string;
  operationsPlansSubtitle: string;
  operationsPlansPremium: string;
  operationsPlansStandard: string;
  operationsPlansFree: string;
  operationsPlansTotal: string;
  operationsPlansProjectedRevenue: string;
  operationsUsersTitle: string;
  operationsUsersSubtitle: string;
  operationsUsersNoAccess: string;
  operationsUsersLoadError: string;
  operationsUsersCreateTitle: string;
  operationsUsersNameLabel: string;
  operationsUsersEmailLabel: string;
  operationsUsersPasswordLabel: string;
  operationsUsersRolesLabel: string;
  operationsUsersCreateAction: string;
  operationsUsersCreateSuccess: string;
  operationsUsersUpdateSuccess: string;
  operationsUsersTableName: string;
  operationsUsersTableEmail: string;
  operationsUsersTableRoles: string;
  operationsUsersTableActive: string;
  operationsUsersSaveRolesAction: string;
  operationsUsersToggleActiveAction: string;
  operationsUsersActiveYes: string;
  operationsUsersActiveNo: string;
  operationsUsersRoleSuperAdmin: string;
  operationsUsersRoleStaff: string;
  operationsUsersRoleCompanyUser: string;
  operationsEmptyState: string;
  operationsStatusLabel: string;
  operationsNotesLabel: string;
  operationsApplyAction: string;
  operationsApplyingAction: string;
  operationsSuccessFeedback: string;
  operationsErrorFeedback: string;
  operationsStatusPending: string;
  operationsStatusUnderReview: string;
  operationsStatusApproved: string;
  operationsStatusRejected: string;
  operationsStatusOptionUnderReview: string;
  operationsStatusOptionApproved: string;
  operationsStatusOptionRejected: string;
  operationsCreatedAtLabel: string;
  operationsLatestReviewNotesLabel: string;
  operationsNoReviewNotes: string;
  operationsRequestedLocationLabel: string;
  operationsCanonicalLocationLabel: string;
  operationsCanonicalLocationPending: string;
  operationsLocationMatchLabel: string;
  operationsLocationMismatchLabel: string;
  operationsRejectConfirmTitle: string;
  operationsRejectConfirmMessage: string;
  operationsRejectConfirmAction: string;
  operationsRejectCancelAction: string;
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
  formCountryLabel: string;
  formRegionSelectPlaceholder: string;
  formCommuneSelectPlaceholder: string;
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
  formErrorRequired: string;
  formErrorInvalidEmail: string;
  formErrorInvalidWebsite: string;
  formErrorMinChars2: string;
  formErrorMinChars6: string;
  formErrorMinChars8: string;
  formErrorMinChars10: string;
  formErrorMaxChars2000: string;
  formErrorSelectRole: string;
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
    adminAccessAction: "Admin Access",
    themeSwitcherLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    brandName: "MineralesChilenos.cl",
    brandTagline: "B2B Mining Supplier Directory",
    landingNavDirectory: "Directory",
    landingNavCategories: "Categories",
    landingNavPlans: "Plans",
    landingNavContact: "Contact",
    landingLaunchBannerTitle: "Launch Offer - 1 FREE month for all companies",
    landingLaunchBannerSubtitle: "Publish your company today at no cost. Limited-time offer.",
    landingHeroBadge: "Chile's B2B Mining Directory",
    landingHeroPrimaryAction: "View Directory",
    landingHeroSecondaryAction: "Publish for Free",
    landingSearchTitle: "Find a supplier",
    landingPricingTitle: "PUBLISH YOUR COMPANY",
    landingPricingSubtitle: "Choose the plan that fits your company. First month is free on paid plans.",
    landingPlanBasicName: "Basic",
    landingPlanStandardName: "Standard",
    landingPlanPremiumName: "Premium",
    landingPlanBasicPrice: "$0",
    landingPlanStandardPrice: "$19,990",
    landingPlanPremiumPrice: "$49,990",
    landingPlanBasicPeriod: "/ month - forever free",
    landingPlanStandardPeriod: "/ month - first month free",
    landingPlanPremiumPeriod: "/ month - first month free",
    landingPlanPopularBadge: "Most Popular",
    landingPlanBasicFeatures: [
      "Company name",
      "Category and city",
      "Short description",
      "No logo",
      "No direct contact",
      "No website",
      "No search priority"
    ],
    landingPlanStandardFeatures: [
      "Everything in Basic",
      "Company logo",
      "Full description",
      "Phone and website",
      "Contact form",
      "Tags and specialties",
      "No search priority"
    ],
    landingPlanPremiumFeatures: [
      "Everything in Standard",
      "Top search priority",
      "Featured banner",
      "Premium badge",
      "Visit analytics",
      "Priority contact",
      "Dedicated support"
    ],
    landingCtaTitle: "IS YOUR COMPANY STILL MISSING?",
    landingCtaSubtitle: "Register today and publish in under 24 hours.",
    landingCtaAction: "Register My Company for Free",
    landingFooterCopyright: "© 2025 MineralesChilenos · B2B Mining Directory in Chile",
    landingFooterContact: "Contact: contacto@mineraleschilenos.cl",
    heroTitle: "Find trusted mining suppliers in Chile.",
    heroSubtitle:
      "Search companies by category, compare supplier profiles, and submit your company for publication in the directory.",
    statsPublishedSuppliers: "Published Suppliers",
    statsActiveCategories: "Active Categories",
    statsPremiumSuppliers: "Premium Suppliers",
    statsTopCategory: "Top Category",
    statsNotAvailable: "N/A",
    statsLoadingValue: "...",
    paginationPrev: "Previous",
    paginationNext: "Next",
    paginationPageOf: "Page",
    operationsTitle: "Request Operations",
    operationsSubtitle: "Review and process supplier publication requests.",
    operationsRefresh: "Refresh",
    operationsExportCsvAction: "Export CSV",
    operationsExportingCsvAction: "Exporting...",
    operationsExportSuccessFeedback: "CSV exported successfully.",
    operationsExportErrorFeedback: "Unable to export CSV right now.",
    operationsCsvFilePrefix: "company-requests",
    operationsFilterStatusLabel: "Filter status",
    operationsFilterStatusAll: "All statuses",
    operationsCanonicalReadyCountLabel: "Canonical in list",
    operationsCanonicalPendingCountLabel: "Pending in list",
    operationsSortLabel: "Sort by date",
    operationsSortNewest: "Newest first",
    operationsSortOldest: "Oldest first",
    operationsSearchPlaceholder: "Search by company, email, or phone",
    operationsPaginationPage: "Page",
    operationsPaginationPrev: "Previous",
    operationsPaginationNext: "Next",
    operationsTotalResultsLabel: "Total results",
    operationsAuthTitle: "Operator access",
    operationsAuthSubtitle: "Authenticate to review and manage requests.",
    operationsAuthEmailLabel: "Email",
    operationsAuthPasswordLabel: "Password",
    operationsAuthLoginAction: "Sign in",
    operationsAuthLogoutAction: "Sign out",
    operationsAuthLoginError: "Invalid credentials or inactive user.",
    operationsAuthSessionExpired: "Your session expired. Please sign in again.",
    operationsAuthLoginPageHint: "Sign in from the dedicated admin access page.",
    operationsAuthGoToLogin: "Go to login",
    operationsAuthBackToDirectory: "Back to directory",
    operationsAdminShellTitle: "MineralesChilenos Admin",
    operationsAdminShellSubtitle: "Operations control panel",
    operationsNoAccess: "Your account does not have permission for this section.",
    operationsNavDashboard: "Dashboard",
    operationsNavCompanies: "Companies",
    operationsNavRequests: "Requests",
    operationsNavUsers: "Users",
    operationsNavPlans: "Plans",
    operationsDashboardTitle: "Admin Dashboard",
    operationsDashboardSubtitle: "Operational overview for directory management.",
    operationsDashboardActiveCompanies: "Active companies",
    operationsDashboardPendingRequests: "Pending requests",
    operationsDashboardPremiumCompanies: "Premium companies",
    operationsDashboardStandardCompanies: "Standard companies",
    operationsDashboardRecentRequests: "Recent requests",
    operationsDashboardCategoryBreakdown: "Companies by category",
    operationsDashboardOpenRequestAction: "Open request",
    operationsDashboardWhatsAppAction: "WhatsApp",
    operationsDashboardWhatsAppTemplate:
      "Hello, reaching out about {name}'s request on MineralesChilenos.",
    operationsCompaniesTitle: "Company Management",
    operationsCompaniesSubtitle: "Create, edit and remove published companies.",
    operationsCompaniesCreateAction: "Create company",
    operationsEditAction: "Edit",
    operationsCompaniesDeleteAction: "Delete",
    operationsCompaniesSaveAction: "Save",
    operationsCompaniesStatusFilterLabel: "Status",
    operationsCompaniesPlanFilterLabel: "Plan",
    operationsCompaniesStatusAll: "All",
    operationsCompaniesStatusActive: "Active",
    operationsCompaniesStatusInactive: "Inactive",
    operationsCompaniesSearchPlaceholder: "Search companies",
    operationsCompaniesLoadError: "Unable to load companies.",
    operationsCompaniesCreateSuccess: "Company created successfully.",
    operationsCompaniesUpdateSuccess: "Company updated successfully.",
    operationsCompaniesDeleteSuccess: "Company deleted successfully.",
    operationsPlansTitle: "Plans and Revenue",
    operationsPlansSubtitle: "Plan distribution and monthly projection.",
    operationsPlansPremium: "Premium",
    operationsPlansStandard: "Standard",
    operationsPlansFree: "Free",
    operationsPlansTotal: "Total companies",
    operationsPlansProjectedRevenue: "Projected monthly revenue (CLP)",
    operationsUsersTitle: "User Administration",
    operationsUsersSubtitle: "Manage platform users and global roles.",
    operationsUsersNoAccess: "Your account does not have permission to manage users.",
    operationsUsersLoadError: "Unable to load user administration data.",
    operationsUsersCreateTitle: "Create user",
    operationsUsersNameLabel: "Full name",
    operationsUsersEmailLabel: "Email",
    operationsUsersPasswordLabel: "Temporary password",
    operationsUsersRolesLabel: "Roles",
    operationsUsersCreateAction: "Create user",
    operationsUsersCreateSuccess: "User created successfully.",
    operationsUsersUpdateSuccess: "User updated successfully.",
    operationsUsersTableName: "Name",
    operationsUsersTableEmail: "Email",
    operationsUsersTableRoles: "Roles",
    operationsUsersTableActive: "Active",
    operationsUsersSaveRolesAction: "Save roles",
    operationsUsersToggleActiveAction: "Toggle active",
    operationsUsersActiveYes: "Yes",
    operationsUsersActiveNo: "No",
    operationsUsersRoleSuperAdmin: "Super admin",
    operationsUsersRoleStaff: "Staff",
    operationsUsersRoleCompanyUser: "Company user",
    operationsEmptyState: "No requests available.",
    operationsStatusLabel: "Current status",
    operationsNotesLabel: "Review notes",
    operationsApplyAction: "Apply review",
    operationsApplyingAction: "Applying...",
    operationsSuccessFeedback: "Review applied successfully.",
    operationsErrorFeedback: "Unable to apply review. Please try again.",
    operationsStatusPending: "Pending",
    operationsStatusUnderReview: "Under review",
    operationsStatusApproved: "Approved",
    operationsStatusRejected: "Rejected",
    operationsStatusOptionUnderReview: "Mark as under review",
    operationsStatusOptionApproved: "Approve and publish",
    operationsStatusOptionRejected: "Reject",
    operationsCreatedAtLabel: "Created at",
    operationsLatestReviewNotesLabel: "Latest review notes",
    operationsNoReviewNotes: "No review notes yet.",
    operationsRequestedLocationLabel: "Requested location",
    operationsCanonicalLocationLabel: "Canonical location",
    operationsCanonicalLocationPending: "Not selected yet.",
    operationsLocationMatchLabel: "Canonical match",
    operationsLocationMismatchLabel: "Canonical differs",
    operationsRejectConfirmTitle: "Confirm rejection",
    operationsRejectConfirmMessage:
      "This request will be marked as rejected. You can include notes for traceability.",
    operationsRejectConfirmAction: "Confirm reject",
    operationsRejectCancelAction: "Cancel",
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
    formCountryLabel: "Country",
    formRegionSelectPlaceholder: "Select region",
    formCommuneSelectPlaceholder: "Select commune",
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
    formErrorRequired: "This field is required.",
    formErrorInvalidEmail: "Please enter a valid email.",
    formErrorInvalidWebsite: "Please enter a valid website URL.",
    formErrorMinChars2: "Use at least 2 characters.",
    formErrorMinChars6: "Use at least 6 characters.",
    formErrorMinChars8: "Use at least 8 characters.",
    formErrorMinChars10: "Use at least 10 characters.",
    formErrorMaxChars2000: "Use at most 2000 characters.",
    formErrorSelectRole: "Select at least one role.",
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
    adminAccessAction: "Acceso Admin",
    themeSwitcherLabel: "Tema",
    themeLight: "Claro",
    themeDark: "Oscuro",
    brandName: "MineralesChilenos.cl",
    brandTagline: "Directorio B2B de Proveedores Mineros",
    landingNavDirectory: "Directorio",
    landingNavCategories: "Categorias",
    landingNavPlans: "Planes",
    landingNavContact: "Contacto",
    landingLaunchBannerTitle: "Lanzamiento - 1 MES GRATIS para todas las empresas",
    landingLaunchBannerSubtitle: "Publica tu empresa hoy sin costo. Oferta por tiempo limitado.",
    landingHeroBadge: "El Directorio B2B Minero de Chile",
    landingHeroPrimaryAction: "Ver Directorio",
    landingHeroSecondaryAction: "Publicar Gratis",
    landingSearchTitle: "Buscar proveedor",
    landingPricingTitle: "PUBLICA TU EMPRESA",
    landingPricingSubtitle: "Elige el plan que mas se adapte a tu empresa. Primer mes gratis en planes pagados.",
    landingPlanBasicName: "Basico",
    landingPlanStandardName: "Estandar",
    landingPlanPremiumName: "Premium",
    landingPlanBasicPrice: "$0",
    landingPlanStandardPrice: "$19.990",
    landingPlanPremiumPrice: "$49.990",
    landingPlanBasicPeriod: "/ mes - siempre gratis",
    landingPlanStandardPeriod: "/ mes - primer mes gratis",
    landingPlanPremiumPeriod: "/ mes - primer mes gratis",
    landingPlanPopularBadge: "Mas Popular",
    landingPlanBasicFeatures: [
      "Nombre de empresa",
      "Categoria y ciudad",
      "Descripcion corta",
      "Sin logo",
      "Sin contacto directo",
      "Sin sitio web",
      "Sin prioridad en busquedas"
    ],
    landingPlanStandardFeatures: [
      "Todo lo basico",
      "Logo de empresa",
      "Descripcion completa",
      "Telefono y sitio web",
      "Formulario de contacto",
      "Tags y especialidades",
      "Sin prioridad en busquedas"
    ],
    landingPlanPremiumFeatures: [
      "Todo lo estandar",
      "Primero en busquedas",
      "Banner destacado",
      "Insignia premium",
      "Estadisticas de visitas",
      "Contacto prioritario",
      "Soporte dedicado"
    ],
    landingCtaTitle: "TU EMPRESA AUN NO ESTA?",
    landingCtaSubtitle: "Registrala hoy y publicala en menos de 24 horas.",
    landingCtaAction: "Registrar mi Empresa Gratis",
    landingFooterCopyright: "© 2025 MineralesChilenos · Directorio B2B Minero de Chile",
    landingFooterContact: "Contacto: contacto@mineraleschilenos.cl",
    heroTitle: "Encuentra proveedores mineros confiables en Chile.",
    heroSubtitle:
      "Busca empresas por categoria, compara perfiles de proveedores y envia tu empresa para publicacion en el directorio.",
    statsPublishedSuppliers: "Proveedores Publicados",
    statsActiveCategories: "Categorias Activas",
    statsPremiumSuppliers: "Proveedores Premium",
    statsTopCategory: "Categoria Principal",
    statsNotAvailable: "N/D",
    statsLoadingValue: "...",
    paginationPrev: "Anterior",
    paginationNext: "Siguiente",
    paginationPageOf: "Pagina",
    operationsTitle: "Operacion de Solicitudes",
    operationsSubtitle: "Revisa y procesa solicitudes de publicacion de proveedores.",
    operationsRefresh: "Actualizar",
    operationsExportCsvAction: "Exportar CSV",
    operationsExportingCsvAction: "Exportando...",
    operationsExportSuccessFeedback: "CSV exportado correctamente.",
    operationsExportErrorFeedback: "No se pudo exportar el CSV en este momento.",
    operationsCsvFilePrefix: "solicitudes-empresas",
    operationsFilterStatusLabel: "Filtrar estado",
    operationsFilterStatusAll: "Todos los estados",
    operationsCanonicalReadyCountLabel: "Canonicas en lista",
    operationsCanonicalPendingCountLabel: "Pendientes en lista",
    operationsSortLabel: "Orden por fecha",
    operationsSortNewest: "Mas nuevas primero",
    operationsSortOldest: "Mas antiguas primero",
    operationsSearchPlaceholder: "Buscar por empresa, correo o telefono",
    operationsPaginationPage: "Pagina",
    operationsPaginationPrev: "Anterior",
    operationsPaginationNext: "Siguiente",
    operationsTotalResultsLabel: "Total resultados",
    operationsAuthTitle: "Acceso operador",
    operationsAuthSubtitle: "Autenticate para revisar y gestionar solicitudes.",
    operationsAuthEmailLabel: "Correo",
    operationsAuthPasswordLabel: "Contrasena",
    operationsAuthLoginAction: "Ingresar",
    operationsAuthLogoutAction: "Salir",
    operationsAuthLoginError: "Credenciales invalidas o usuario inactivo.",
    operationsAuthSessionExpired: "Tu sesion expiro. Ingresa nuevamente.",
    operationsAuthLoginPageHint: "Ingresa desde la pantalla dedicada de acceso admin.",
    operationsAuthGoToLogin: "Ir a login",
    operationsAuthBackToDirectory: "Volver al directorio",
    operationsAdminShellTitle: "MineralesChilenos Admin",
    operationsAdminShellSubtitle: "Panel de control operativo",
    operationsNoAccess: "Tu cuenta no tiene permisos para esta seccion.",
    operationsNavDashboard: "Dashboard",
    operationsNavCompanies: "Empresas",
    operationsNavRequests: "Solicitudes",
    operationsNavUsers: "Usuarios",
    operationsNavPlans: "Planes",
    operationsDashboardTitle: "Dashboard Admin",
    operationsDashboardSubtitle: "Resumen operativo para gestionar el directorio.",
    operationsDashboardActiveCompanies: "Empresas activas",
    operationsDashboardPendingRequests: "Solicitudes pendientes",
    operationsDashboardPremiumCompanies: "Empresas premium",
    operationsDashboardStandardCompanies: "Empresas estandar",
    operationsDashboardRecentRequests: "Solicitudes recientes",
    operationsDashboardCategoryBreakdown: "Empresas por categoria",
    operationsDashboardOpenRequestAction: "Abrir solicitud",
    operationsDashboardWhatsAppAction: "WhatsApp",
    operationsDashboardWhatsAppTemplate:
      "Hola, contacto por la solicitud de {name} en MineralesChilenos.",
    operationsCompaniesTitle: "Gestion de Empresas",
    operationsCompaniesSubtitle: "Crea, edita y elimina empresas publicadas.",
    operationsCompaniesCreateAction: "Crear empresa",
    operationsEditAction: "Editar",
    operationsCompaniesDeleteAction: "Eliminar",
    operationsCompaniesSaveAction: "Guardar",
    operationsCompaniesStatusFilterLabel: "Estado",
    operationsCompaniesPlanFilterLabel: "Plan",
    operationsCompaniesStatusAll: "Todos",
    operationsCompaniesStatusActive: "Activas",
    operationsCompaniesStatusInactive: "Inactivas",
    operationsCompaniesSearchPlaceholder: "Buscar empresas",
    operationsCompaniesLoadError: "No se pudo cargar empresas.",
    operationsCompaniesCreateSuccess: "Empresa creada correctamente.",
    operationsCompaniesUpdateSuccess: "Empresa actualizada correctamente.",
    operationsCompaniesDeleteSuccess: "Empresa eliminada correctamente.",
    operationsPlansTitle: "Planes e Ingresos",
    operationsPlansSubtitle: "Distribucion por plan y proyeccion mensual.",
    operationsPlansPremium: "Premium",
    operationsPlansStandard: "Estandar",
    operationsPlansFree: "Gratis",
    operationsPlansTotal: "Total empresas",
    operationsPlansProjectedRevenue: "Ingreso mensual proyectado (CLP)",
    operationsUsersTitle: "Administracion de Usuarios",
    operationsUsersSubtitle: "Gestiona usuarios de plataforma y roles globales.",
    operationsUsersNoAccess: "Tu cuenta no tiene permisos para gestionar usuarios.",
    operationsUsersLoadError: "No se pudo cargar la administracion de usuarios.",
    operationsUsersCreateTitle: "Crear usuario",
    operationsUsersNameLabel: "Nombre completo",
    operationsUsersEmailLabel: "Correo",
    operationsUsersPasswordLabel: "Contrasena temporal",
    operationsUsersRolesLabel: "Roles",
    operationsUsersCreateAction: "Crear usuario",
    operationsUsersCreateSuccess: "Usuario creado correctamente.",
    operationsUsersUpdateSuccess: "Usuario actualizado correctamente.",
    operationsUsersTableName: "Nombre",
    operationsUsersTableEmail: "Correo",
    operationsUsersTableRoles: "Roles",
    operationsUsersTableActive: "Activo",
    operationsUsersSaveRolesAction: "Guardar roles",
    operationsUsersToggleActiveAction: "Cambiar activo",
    operationsUsersActiveYes: "Si",
    operationsUsersActiveNo: "No",
    operationsUsersRoleSuperAdmin: "Super admin",
    operationsUsersRoleStaff: "Staff",
    operationsUsersRoleCompanyUser: "Usuario empresa",
    operationsEmptyState: "No hay solicitudes disponibles.",
    operationsStatusLabel: "Estado actual",
    operationsNotesLabel: "Notas de revision",
    operationsApplyAction: "Aplicar revision",
    operationsApplyingAction: "Aplicando...",
    operationsSuccessFeedback: "Revision aplicada correctamente.",
    operationsErrorFeedback: "No se pudo aplicar la revision. Intentalo nuevamente.",
    operationsStatusPending: "Pendiente",
    operationsStatusUnderReview: "En revision",
    operationsStatusApproved: "Aprobada",
    operationsStatusRejected: "Rechazada",
    operationsStatusOptionUnderReview: "Marcar en revision",
    operationsStatusOptionApproved: "Aprobar y publicar",
    operationsStatusOptionRejected: "Rechazar",
    operationsCreatedAtLabel: "Creada el",
    operationsLatestReviewNotesLabel: "Ultimas notas de revision",
    operationsNoReviewNotes: "Sin notas de revision.",
    operationsRequestedLocationLabel: "Ubicacion solicitada",
    operationsCanonicalLocationLabel: "Ubicacion canonica",
    operationsCanonicalLocationPending: "Aun no seleccionada.",
    operationsLocationMatchLabel: "Canonica coincide",
    operationsLocationMismatchLabel: "Canonica distinta",
    operationsRejectConfirmTitle: "Confirmar rechazo",
    operationsRejectConfirmMessage:
      "Esta solicitud quedara marcada como rechazada. Puedes incluir notas para trazabilidad.",
    operationsRejectConfirmAction: "Confirmar rechazo",
    operationsRejectCancelAction: "Cancelar",
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
    formCountryLabel: "Pais",
    formRegionSelectPlaceholder: "Selecciona region",
    formCommuneSelectPlaceholder: "Selecciona comuna",
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
    formErrorRequired: "Este campo es obligatorio.",
    formErrorInvalidEmail: "Ingresa un correo valido.",
    formErrorInvalidWebsite: "Ingresa una URL valida.",
    formErrorMinChars2: "Debe tener al menos 2 caracteres.",
    formErrorMinChars6: "Debe tener al menos 6 caracteres.",
    formErrorMinChars8: "Debe tener al menos 8 caracteres.",
    formErrorMinChars10: "Debe tener al menos 10 caracteres.",
    formErrorMaxChars2000: "Debe tener maximo 2000 caracteres.",
    formErrorSelectRole: "Selecciona al menos un rol.",
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
