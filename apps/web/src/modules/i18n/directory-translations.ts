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
  operationsTotalResultsLabel: string;
  operationsAuthTitle: string;
  operationsAuthSubtitle: string;
  operationsAuthEmailLabel: string;
  operationsAuthPasswordLabel: string;
  operationsAuthLoginAction: string;
  operationsAuthLogoutAction: string;
  operationsAuthLoginError: string;
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
  operationsCompaniesTitle: string;
  operationsCompaniesSubtitle: string;
  operationsCompaniesCreateAction: string;
  operationsCompaniesDeleteAction: string;
  operationsCompaniesSaveAction: string;
  operationsCompaniesStatusFilterLabel: string;
  operationsCompaniesPlanFilterLabel: string;
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
    operationsTotalResultsLabel: "Total results",
    operationsAuthTitle: "Operator access",
    operationsAuthSubtitle: "Authenticate to review and manage requests.",
    operationsAuthEmailLabel: "Email",
    operationsAuthPasswordLabel: "Password",
    operationsAuthLoginAction: "Sign in",
    operationsAuthLogoutAction: "Sign out",
    operationsAuthLoginError: "Invalid credentials or inactive user.",
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
    operationsCompaniesTitle: "Company Management",
    operationsCompaniesSubtitle: "Create, edit and remove published companies.",
    operationsCompaniesCreateAction: "Create company",
    operationsCompaniesDeleteAction: "Delete",
    operationsCompaniesSaveAction: "Save",
    operationsCompaniesStatusFilterLabel: "Status",
    operationsCompaniesPlanFilterLabel: "Plan",
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
    operationsTotalResultsLabel: "Total resultados",
    operationsAuthTitle: "Acceso operador",
    operationsAuthSubtitle: "Autenticate para revisar y gestionar solicitudes.",
    operationsAuthEmailLabel: "Correo",
    operationsAuthPasswordLabel: "Contrasena",
    operationsAuthLoginAction: "Ingresar",
    operationsAuthLogoutAction: "Salir",
    operationsAuthLoginError: "Credenciales invalidas o usuario inactivo.",
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
    operationsCompaniesTitle: "Gestion de Empresas",
    operationsCompaniesSubtitle: "Crea, edita y elimina empresas publicadas.",
    operationsCompaniesCreateAction: "Crear empresa",
    operationsCompaniesDeleteAction: "Eliminar",
    operationsCompaniesSaveAction: "Guardar",
    operationsCompaniesStatusFilterLabel: "Estado",
    operationsCompaniesPlanFilterLabel: "Plan",
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
