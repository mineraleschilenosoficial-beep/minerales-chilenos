"use client";

import {
  Button,
  Container,
  Group,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CompanyCategory, CompanyPlan, CompanyStatus, UserRole } from "@minerales/types";
import {
  createAdminCompany,
  deleteAdminCompany,
  fetchAdminCompanies,
  updateAdminCompany
} from "@/modules/directory/services/directory-api.service";
import { directoryTranslations } from "@/modules/i18n/directory-translations";
import { OperationsFeedback } from "@/modules/operations/operations-feedback";
import { OperationsShell } from "@/modules/operations/operations-shell";
import { useOperationFeedback } from "@/modules/operations/use-operation-feedback";
import { useOperationsSession } from "@/modules/operations/use-operations-session";

type CompanyDraft = {
  name: string;
  tagline: string;
  description: string;
  city: string;
  region: string;
  phone: string;
  website: string;
  category: CompanyCategory;
  plan: CompanyPlan;
  status: CompanyStatus;
};

const INITIAL_DRAFT: CompanyDraft = {
  name: "",
  tagline: "",
  description: "",
  city: "",
  region: "",
  phone: "",
  website: "",
  category: CompanyCategory.CONSULTING,
  plan: CompanyPlan.FREE,
  status: CompanyStatus.ACTIVE
};

export default function OperationsCompaniesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, setLocale, isAuthenticated, currentUser, handleAuthChange } =
    useOperationsSession();
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [plan, setPlan] = useState<"all" | "free" | "standard" | "premium">("all");
  const [category, setCategory] = useState<"all" | CompanyCategory>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [pageSize] = useState<number>(20);
  const [companies, setCompanies] = useState<Awaited<ReturnType<typeof fetchAdminCompanies>>["items"]>(
    []
  );
  const [draft, setDraft] = useState<CompanyDraft>(INITIAL_DRAFT);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [filtersHydrated, setFiltersHydrated] = useState<boolean>(false);
  const hasFilterResetInitialized = useRef<boolean>(false);
  const { feedback, clearFeedback, setErrorFeedback, setSuccessFeedback } = useOperationFeedback();
  const t = directoryTranslations[locale];

  const statusOptions = [
    { value: "all", label: t.operationsCompaniesStatusAll },
    { value: "active", label: t.operationsCompaniesStatusActive },
    { value: "inactive", label: t.operationsCompaniesStatusInactive }
  ];
  const planOptions = [
    { value: "all", label: t.operationsCompaniesStatusAll },
    { value: CompanyPlan.FREE, label: t.plans.free },
    { value: CompanyPlan.STANDARD, label: t.plans.standard },
    { value: CompanyPlan.PREMIUM, label: t.plans.premium }
  ];
  const categoryOptions = [
    { value: "all", label: t.operationsCompaniesStatusAll },
    ...Object.entries(t.categories).map(([value, label]) => ({
      value,
      label
    }))
  ];
  const draftCategoryOptions = Object.entries(t.categories).map(([value, label]) => ({
    value,
    label
  }));
  const draftPlanOptions = [
    { value: CompanyPlan.FREE, label: t.plans.free },
    { value: CompanyPlan.STANDARD, label: t.plans.standard },
    { value: CompanyPlan.PREMIUM, label: t.plans.premium }
  ];
  const draftStatusOptions = [
    { value: CompanyStatus.ACTIVE, label: t.operationsUsersActiveYes },
    { value: CompanyStatus.INACTIVE, label: t.operationsUsersActiveNo }
  ];
  const companyStatusLabels: Record<CompanyStatus, string> = {
    [CompanyStatus.ACTIVE]: t.operationsCompaniesStatusActive,
    [CompanyStatus.INACTIVE]: t.operationsCompaniesStatusInactive
  };
  const companyPlanLabels: Record<CompanyPlan, string> = {
    [CompanyPlan.FREE]: t.plans.free,
    [CompanyPlan.STANDARD]: t.plans.standard,
    [CompanyPlan.PREMIUM]: t.plans.premium
  };

  const canManage =
    currentUser?.roles.includes(UserRole.SUPER_ADMIN) ||
    currentUser?.roles.includes(UserRole.STAFF);
  const canDelete = currentUser?.roles.includes(UserRole.SUPER_ADMIN) ?? false;

  useEffect(() => {
    const searchParam = searchParams.get("search");
    const statusParam = searchParams.get("status");
    const planParam = searchParams.get("plan");
    const categoryParam = searchParams.get("category");
    const pageParam = searchParams.get("page");

    if (searchParam) {
      setSearch(searchParam);
    } else {
      setSearch("");
    }
    if (statusParam === "all" || statusParam === "active" || statusParam === "inactive") {
      setStatus(statusParam);
    } else {
      setStatus("all");
    }
    if (
      planParam === "all" ||
      planParam === "free" ||
      planParam === "standard" ||
      planParam === "premium"
    ) {
      setPlan(planParam);
    } else {
      setPlan("all");
    }
    if (categoryParam && (Object.values(CompanyCategory) as string[]).includes(categoryParam)) {
      setCategory(categoryParam as CompanyCategory);
    } else {
      setCategory("all");
    }
    if (pageParam) {
      const parsedPage = Number.parseInt(pageParam, 10);
      if (!Number.isNaN(parsedPage) && parsedPage > 0) {
        setCurrentPage(parsedPage);
      } else {
        setCurrentPage(1);
      }
    } else {
      setCurrentPage(1);
    }

    setFiltersHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    const nextParams = new URLSearchParams();
    if (search.trim().length > 0) {
      nextParams.set("search", search.trim());
    }
    if (status !== "all") {
      nextParams.set("status", status);
    }
    if (plan !== "all") {
      nextParams.set("plan", plan);
    }
    if (category !== "all") {
      nextParams.set("category", category);
    }
    if (currentPage > 1) {
      nextParams.set("page", String(currentPage));
    }

    const nextQuery = nextParams.toString();
    const targetUrl = nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [category, currentPage, filtersHydrated, pathname, plan, router, search, status]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetchAdminCompanies({
        search,
        status,
        plan,
        category,
        page: currentPage,
        pageSize
      });
      setCompanies(response.items);
      setTotalPages(response.totalPages);
      setTotalResults(response.total);
    } catch {
      setCompanies([]);
      setTotalPages(0);
      setTotalResults(0);
      setErrorFeedback(t.operationsCompaniesLoadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !canManage || !filtersHydrated) {
      return;
    }
    void loadCompanies();
  }, [isAuthenticated, canManage, search, status, plan, category, currentPage, pageSize, filtersHydrated]);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }
    if (!hasFilterResetInitialized.current) {
      hasFilterResetInitialized.current = true;
      return;
    }
    setCurrentPage(1);
  }, [category, filtersHydrated, plan, search, status]);

  const handleCreate = async () => {
    clearFeedback();
    try {
      await createAdminCompany({
        ...draft,
        website: draft.website.trim() || undefined
      });
      setDraft(INITIAL_DRAFT);
      setSuccessFeedback(t.operationsCompaniesCreateSuccess);
      await loadCompanies();
    } catch {
      setErrorFeedback(t.operationsErrorFeedback);
    }
  };

  const handleSave = async () => {
    if (!editingCompanyId) {
      return;
    }

    clearFeedback();
    try {
      await updateAdminCompany(editingCompanyId, {
        name: draft.name,
        tagline: draft.tagline,
        description: draft.description,
        city: draft.city,
        region: draft.region,
        phone: draft.phone,
        website: draft.website.trim() || undefined,
        category: draft.category,
        plan: draft.plan,
        status: draft.status
      });
      setSuccessFeedback(t.operationsCompaniesUpdateSuccess);
      setEditingCompanyId(null);
      setDraft(INITIAL_DRAFT);
      await loadCompanies();
    } catch {
      setErrorFeedback(t.operationsErrorFeedback);
    }
  };

  const handleDelete = async (companyId: string) => {
    clearFeedback();
    try {
      await deleteAdminCompany(companyId);
      setSuccessFeedback(t.operationsCompaniesDeleteSuccess);
      await loadCompanies();
    } catch {
      setErrorFeedback(t.operationsErrorFeedback);
    }
  };

  const startEdit = (company: Awaited<ReturnType<typeof fetchAdminCompanies>>["items"][number]) => {
    setEditingCompanyId(company.id);
    setDraft({
      name: company.name,
      tagline: company.tagline,
      description: company.description,
      city: company.city,
      region: company.region,
      phone: company.phone,
      website: company.website ?? "",
      category: company.category,
      plan: company.plan,
      status: company.status
    });
  };

  return (
    <Container size="lg" py="lg" className="ops-page">
      <Stack gap="sm">
        <Title order={1} className="ops-heading">
          {t.operationsCompaniesTitle}
        </Title>
        <Text className="ops-subtitle">{t.operationsCompaniesSubtitle}</Text>

        <OperationsShell locale={locale} setLocale={setLocale} onAuthChange={handleAuthChange} />
        <OperationsFeedback feedback={feedback} />

        {isAuthenticated && canManage ? (
          <>
            <Group align="end" gap="sm" wrap="wrap" className="ops-toolbar">
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.operationsCompaniesSearchPlaceholder}
                w={{ base: "100%", sm: 260 }}
              />
              <Select
                value={status}
                onChange={(value) => {
                  if (value === "all" || value === "active" || value === "inactive") {
                    setStatus(value);
                  }
                }}
                data={statusOptions}
                label={t.operationsCompaniesStatusFilterLabel}
                w={{ base: "100%", sm: 180 }}
                allowDeselect={false}
              />
              <Select
                value={plan}
                onChange={(value) => {
                  if (value === "all" || value === "free" || value === "standard" || value === "premium") {
                    setPlan(value);
                  }
                }}
                data={planOptions}
                label={t.operationsCompaniesPlanFilterLabel}
                w={{ base: "100%", sm: 180 }}
                allowDeselect={false}
              />
              <Select
                value={category}
                onChange={(value) => {
                  if (value === "all" || (value && (Object.values(CompanyCategory) as string[]).includes(value))) {
                    setCategory(value as "all" | CompanyCategory);
                  }
                }}
                data={categoryOptions}
                label={t.formCategoryLabel}
                w={{ base: "100%", sm: 240 }}
                allowDeselect={false}
              />
            </Group>

            <Paper withBorder p="md" className="ops-panel">
              <Stack gap="sm">
                <Group grow align="end">
                  <TextInput
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    label={t.formNameLabel}
                  />
                  <TextInput
                    value={draft.tagline}
                    onChange={(event) => setDraft((current) => ({ ...current, tagline: event.target.value }))}
                    label={t.formTaglineLabel}
                  />
                </Group>
                <Group grow align="end">
                  <TextInput
                    value={draft.city}
                    onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                    label={t.formCityLabel}
                  />
                  <TextInput
                    value={draft.region}
                    onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))}
                    label={t.formRegionLabel}
                  />
                  <TextInput
                    value={draft.phone}
                    onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                    label={t.formPhoneLabel}
                  />
                </Group>
                <Group grow align="end">
                  <TextInput
                    value={draft.website}
                    onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))}
                    label={t.formWebsiteLabel}
                  />
                  <Select
                    value={draft.category}
                    onChange={(value) => {
                      if (value && (Object.values(CompanyCategory) as string[]).includes(value)) {
                        setDraft((current) => ({ ...current, category: value as CompanyCategory }));
                      }
                    }}
                    data={draftCategoryOptions}
                    label={t.formCategoryLabel}
                    allowDeselect={false}
                  />
                  <Select
                    value={draft.plan}
                    onChange={(value) => {
                      if (value === "free" || value === "standard" || value === "premium") {
                        setDraft((current) => ({ ...current, plan: value as CompanyPlan }));
                      }
                    }}
                    data={draftPlanOptions}
                    label={t.operationsCompaniesPlanFilterLabel}
                    allowDeselect={false}
                  />
                  <Select
                    value={draft.status}
                    onChange={(value) => {
                      if (value === "active" || value === "inactive") {
                        setDraft((current) => ({ ...current, status: value as CompanyStatus }));
                      }
                    }}
                    data={draftStatusOptions}
                    label={t.operationsCompaniesStatusFilterLabel}
                    allowDeselect={false}
                  />
                </Group>
                <Textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  label={t.formDescriptionLabel}
                  minRows={3}
                />
                <Group gap="xs">
                  <Button onClick={() => void (editingCompanyId ? handleSave() : handleCreate())} loading={loading}>
                    {editingCompanyId ? t.operationsCompaniesSaveAction : t.operationsCompaniesCreateAction}
                  </Button>
                  {editingCompanyId ? (
                    <Button
                      variant="default"
                      onClick={() => {
                        setEditingCompanyId(null);
                        setDraft(INITIAL_DRAFT);
                      }}
                    >
                      {t.operationsRejectCancelAction}
                    </Button>
                  ) : null}
                </Group>
              </Stack>
            </Paper>

            {loading ? <Text>{t.statsLoadingValue}</Text> : null}
            <Table.ScrollContainer minWidth={780}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t.operationsUsersTableName}</Table.Th>
                    <Table.Th>{t.operationsCompaniesStatusFilterLabel}</Table.Th>
                    <Table.Th>{t.operationsCompaniesPlanFilterLabel}</Table.Th>
                    <Table.Th>{t.operationsApplyAction}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {companies.map((company) => (
                    <Table.Tr key={company.id}>
                      <Table.Td>{company.name}</Table.Td>
                      <Table.Td>{companyStatusLabels[company.status]}</Table.Td>
                      <Table.Td>{companyPlanLabels[company.plan]}</Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="wrap">
                          <Button variant="light" size="xs" onClick={() => startEdit(company)}>
                            {t.operationsEditAction}
                          </Button>
                          {canDelete ? (
                            <Button
                              variant="light"
                              color="red"
                              size="xs"
                              onClick={() => void handleDelete(company.id)}
                            >
                              {t.operationsCompaniesDeleteAction}
                            </Button>
                          ) : null}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            <Group gap="sm" mt="xs" wrap="wrap" className="ops-toolbar">
              <Button
                variant="default"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={loading || currentPage <= 1}
              >
                {t.operationsPaginationPrev}
              </Button>
              <Text>
                {t.operationsPaginationPage} {totalPages === 0 ? 0 : currentPage}/{totalPages}
              </Text>
              <Text>
                {t.operationsTotalResultsLabel}: {totalResults}
              </Text>
              <Button
                variant="default"
                onClick={() => setCurrentPage((page) => Math.min(totalPages || 1, page + 1))}
                disabled={loading || totalPages === 0 || currentPage >= totalPages}
              >
                {t.operationsPaginationNext}
              </Button>
            </Group>
          </>
        ) : null}
        {isAuthenticated && !canManage ? <Text>{t.operationsUsersNoAccess}</Text> : null}
      </Stack>
    </Container>
  );
}
