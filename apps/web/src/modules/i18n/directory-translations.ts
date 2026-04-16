import { CompanyCategory, CompanyPlan } from "@minerales/types";

export type SupportedLocale = "en" | "es";

type DirectoryTranslation = {
  localeSwitcherLabel: string;
  localeEnglish: string;
  localeSpanish: string;
  themeSwitcherLabel: string;
  themeLight: string;
  themeDark: string;
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
  operationsSortLabel: string;
  operationsSortNewest: string;
  operationsSortOldest: string;
  operationsSearchPlaceholder: string;
  operationsPaginationPage: string;
  operationsPaginationPrev: string;
  operationsPaginationNext: string;
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
    themeSwitcherLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
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
    operationsSortLabel: "Sort by date",
    operationsSortNewest: "Newest first",
    operationsSortOldest: "Oldest first",
    operationsSearchPlaceholder: "Search by company, email, or phone",
    operationsPaginationPage: "Page",
    operationsPaginationPrev: "Previous",
    operationsPaginationNext: "Next",
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
    themeSwitcherLabel: "Tema",
    themeLight: "Claro",
    themeDark: "Oscuro",
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
    operationsSortLabel: "Orden por fecha",
    operationsSortNewest: "Mas nuevas primero",
    operationsSortOldest: "Mas antiguas primero",
    operationsSearchPlaceholder: "Buscar por empresa, correo o telefono",
    operationsPaginationPage: "Pagina",
    operationsPaginationPrev: "Anterior",
    operationsPaginationNext: "Siguiente",
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
