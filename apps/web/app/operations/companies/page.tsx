"use client";

import { useEffect, useState } from "react";
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
import styles from "./page.module.css";

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
  const { locale, setLocale, isAuthenticated, currentUser, handleAuthChange } =
    useOperationsSession();
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [plan, setPlan] = useState<"all" | "free" | "standard" | "premium">("all");
  const [companies, setCompanies] = useState<Awaited<ReturnType<typeof fetchAdminCompanies>>["items"]>([]);
  const [draft, setDraft] = useState<CompanyDraft>(INITIAL_DRAFT);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { feedback, clearFeedback, setErrorFeedback, setSuccessFeedback } = useOperationFeedback();
  const t = directoryTranslations[locale];

  const canManage =
    currentUser?.roles.includes(UserRole.SUPER_ADMIN) ||
    currentUser?.roles.includes(UserRole.STAFF);
  const canDelete = currentUser?.roles.includes(UserRole.SUPER_ADMIN) ?? false;

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetchAdminCompanies({
        search,
        status,
        plan,
        page: 1,
        pageSize: 50
      });
      setCompanies(response.items);
    } catch {
      setErrorFeedback(t.operationsCompaniesLoadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !canManage) {
      return;
    }
    void loadCompanies();
  }, [isAuthenticated, canManage, search, status, plan]);

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
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t.operationsCompaniesTitle}</h1>
        <p className={styles.subtitle}>{t.operationsCompaniesSubtitle}</p>

        <OperationsShell locale={locale} setLocale={setLocale} onAuthChange={handleAuthChange}>
          {() => null}
        </OperationsShell>
        <OperationsFeedback feedback={feedback} />

        {isAuthenticated && canManage ? (
          <>
            <div className={styles.toolbar}>
              <input
                className={styles.input}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.operationsCompaniesSearchPlaceholder}
              />
              <select
                className={styles.select}
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
              >
                <option value="all">all</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
              <select
                className={styles.select}
                value={plan}
                onChange={(event) => setPlan(event.target.value as typeof plan)}
              >
                <option value="all">all</option>
                <option value="free">{t.plans.free}</option>
                <option value="standard">{t.plans.standard}</option>
                <option value="premium">{t.plans.premium}</option>
              </select>
            </div>

            <div className={styles.toolbar}>
              <input
                className={styles.input}
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder={t.formNameLabel}
              />
              <input
                className={styles.input}
                value={draft.tagline}
                onChange={(event) => setDraft((current) => ({ ...current, tagline: event.target.value }))}
                placeholder={t.formTaglineLabel}
              />
              <input
                className={styles.input}
                value={draft.city}
                onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                placeholder={t.formCityLabel}
              />
              <input
                className={styles.input}
                value={draft.region}
                onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))}
                placeholder={t.formRegionLabel}
              />
              <input
                className={styles.input}
                value={draft.phone}
                onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                placeholder={t.formPhoneLabel}
              />
              <input
                className={styles.input}
                value={draft.website}
                onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))}
                placeholder={t.formWebsiteLabel}
              />
              <select
                className={styles.select}
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, category: event.target.value as CompanyCategory }))
                }
              >
                {Object.entries(t.categories).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className={styles.select}
                value={draft.plan}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, plan: event.target.value as CompanyPlan }))
                }
              >
                <option value="free">{t.plans.free}</option>
                <option value="standard">{t.plans.standard}</option>
                <option value="premium">{t.plans.premium}</option>
              </select>
              <select
                className={styles.select}
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, status: event.target.value as CompanyStatus }))
                }
              >
                <option value="active">{t.operationsUsersActiveYes}</option>
                <option value="inactive">{t.operationsUsersActiveNo}</option>
              </select>
              <input
                className={styles.input}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder={t.formDescriptionLabel}
              />
              <button
                type="button"
                className={styles.button}
                onClick={() => void (editingCompanyId ? handleSave() : handleCreate())}
              >
                {editingCompanyId ? t.operationsCompaniesSaveAction : t.operationsCompaniesCreateAction}
              </button>
              {editingCompanyId ? (
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => {
                    setEditingCompanyId(null);
                    setDraft(INITIAL_DRAFT);
                  }}
                >
                  {t.operationsRejectCancelAction}
                </button>
              ) : null}
            </div>

            {loading ? <div>{t.statsLoadingValue}</div> : null}
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t.operationsUsersTableName}</th>
                  <th>{t.operationsCompaniesStatusFilterLabel}</th>
                  <th>{t.operationsCompaniesPlanFilterLabel}</th>
                  <th>{t.operationsApplyAction}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{company.status}</td>
                    <td>{company.plan}</td>
                    <td>
                      <div className={styles.toolbar}>
                        <button
                          type="button"
                          className={styles.buttonSecondary}
                          onClick={() => startEdit(company)}
                        >
                          {t.operationsEditAction}
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            className={styles.buttonSecondary}
                            onClick={() => void handleDelete(company.id)}
                          >
                            {t.operationsCompaniesDeleteAction}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
        {isAuthenticated && !canManage ? <div>{t.operationsUsersNoAccess}</div> : null}
      </div>
    </div>
  );
}
