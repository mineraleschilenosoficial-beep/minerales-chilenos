"use client";

import { useEffect, useMemo, useState } from "react";
import { createCompanyRequestSchema, type Company } from "@minerales/contracts";
import { CompanyCategory, CompanyPlan } from "@minerales/types";
import {
  initialRequestFormState,
  type RequestFormState
} from "@/modules/directory/models/directory.types";
import {
  directoryTranslations,
  type SupportedLocale
} from "@/modules/i18n/directory-translations";
import {
  fetchCompanies,
  fetchCompanyById,
  submitCompanyRequest
} from "@/modules/directory/services/directory-api.service";
import styles from "./page.module.css";

export default function HomePage() {
  const [locale, setLocale] = useState<SupportedLocale>("en");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<CompanyCategory | "all">("all");
  const [formState, setFormState] = useState<RequestFormState>(initialRequestFormState);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [feedbackIsError, setFeedbackIsError] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const t = directoryTranslations[locale];

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await fetchCompanies({
          search,
          category
        });
        setCompanies(items);
      } catch {
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [search, category]);

  const categoriesCount = useMemo(() => {
    return new Set(companies.map((company) => company.category)).size;
  }, [companies]);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedbackMessage("");
    setFeedbackIsError(false);

    const parsedPayload = createCompanyRequestSchema.safeParse({
      ...formState,
      website: formState.website.trim() || undefined
    });

    if (!parsedPayload.success) {
      setFeedbackIsError(true);
      setFeedbackMessage(t.invalidFormFeedback);
      return;
    }

    setSubmitting(true);
    try {
      await submitCompanyRequest(formState);

      setFeedbackIsError(false);
      setFeedbackMessage(t.submitSuccessFeedback);
      setFormState(initialRequestFormState);
    } catch {
      setFeedbackIsError(true);
      setFeedbackMessage(t.submitErrorFeedback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>{t.brandName}</div>
          <div>{t.brandTagline}</div>
          <div>
            <span className={styles.formLabel}>{t.localeSwitcherLabel} </span>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => setLocale("en")}
              disabled={locale === "en"}
            >
              {t.localeEnglish}
            </button>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => setLocale("es")}
              disabled={locale === "es"}
            >
              {t.localeSpanish}
            </button>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>{t.heroTitle}</h1>
        <p className={styles.heroSubtitle}>{t.heroSubtitle}</p>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.statsPublishedSuppliers}</div>
            <div className={styles.statValue}>{loading ? "..." : companies.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.statsActiveCategories}</div>
            <div className={styles.statValue}>{loading ? "..." : categoriesCount}</div>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{t.directoryTitle}</h2>
          <div className={styles.toolbar}>
            <input
              className={styles.input}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.searchPlaceholder}
            />
            <select
              className={styles.select}
              value={category}
              onChange={(event) => setCategory(event.target.value as CompanyCategory | "all")}
            >
              <option value="all">{t.allCategoriesOption}</option>
              {Object.entries(t.categories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.cards}>
            {loading ? (
              <div className={styles.card}>{t.loadingSuppliers}</div>
            ) : companies.length === 0 ? (
              <div className={styles.card}>{t.noSupplierResults}</div>
            ) : (
              companies.map((company) => (
                <article key={company.id} className={styles.card}>
                  <h3 className={styles.cardName}>{company.name}</h3>
                  <p className={styles.cardTagline}>{company.tagline || t.defaultCompanyTagline}</p>
                  <div className={styles.chipRow}>
                    <span className={styles.chip}>{t.categories[company.category]}</span>
                    <span className={styles.chip}>{t.plans[company.plan]}</span>
                  </div>
                  <div className={styles.meta}>
                    <span>
                      {company.city}, {company.region}
                    </span>
                    <span>{company.phone}</span>
                    {company.website ? <span>{company.website}</span> : null}
                  </div>
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={async () => {
                      try {
                        const companyDetails = await fetchCompanyById(company.id);
                        setSelectedCompany(companyDetails);
                      } catch {
                        setSelectedCompany(company);
                      }
                    }}
                  >
                    {t.viewDetailsAction}
                  </button>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className={styles.panel}>
          <h2 className={styles.panelTitle}>{t.requestTitle}</h2>
          <form className={styles.form} onSubmit={handleFormSubmit}>
            <label className={styles.formLabel} htmlFor="name">
              {t.formNameLabel}
            </label>
            <input
              id="name"
              className={styles.input}
              value={formState.name}
              onChange={(event) => setFormState((state) => ({ ...state, name: event.target.value }))}
            />

            <label className={styles.formLabel} htmlFor="tagline">
              {t.formTaglineLabel}
            </label>
            <input
              id="tagline"
              className={styles.input}
              value={formState.tagline}
              onChange={(event) =>
                setFormState((state) => ({ ...state, tagline: event.target.value }))
              }
            />

            <label className={styles.formLabel} htmlFor="description">
              {t.formDescriptionLabel}
            </label>
            <textarea
              id="description"
              className={styles.textarea}
              value={formState.description}
              onChange={(event) =>
                setFormState((state) => ({ ...state, description: event.target.value }))
              }
              rows={4}
            />

            <label className={styles.formLabel} htmlFor="city">
              {t.formCityLabel}
            </label>
            <input
              id="city"
              className={styles.input}
              value={formState.city}
              onChange={(event) => setFormState((state) => ({ ...state, city: event.target.value }))}
            />

            <label className={styles.formLabel} htmlFor="region">
              {t.formRegionLabel}
            </label>
            <input
              id="region"
              className={styles.input}
              value={formState.region}
              onChange={(event) =>
                setFormState((state) => ({ ...state, region: event.target.value }))
              }
            />

            <label className={styles.formLabel} htmlFor="phone">
              {t.formPhoneLabel}
            </label>
            <input
              id="phone"
              className={styles.input}
              value={formState.phone}
              onChange={(event) =>
                setFormState((state) => ({ ...state, phone: event.target.value }))
              }
            />

            <label className={styles.formLabel} htmlFor="email">
              {t.formEmailLabel}
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              value={formState.email}
              onChange={(event) =>
                setFormState((state) => ({ ...state, email: event.target.value }))
              }
            />

            <label className={styles.formLabel} htmlFor="website">
              {t.formWebsiteLabel}
            </label>
            <input
              id="website"
              className={styles.input}
              value={formState.website}
              onChange={(event) =>
                setFormState((state) => ({ ...state, website: event.target.value }))
              }
            />

            <label className={styles.formLabel} htmlFor="category">
              {t.formCategoryLabel}
            </label>
            <select
              id="category"
              className={styles.select}
              value={formState.category}
              onChange={(event) =>
                setFormState((state) => ({
                  ...state,
                  category: event.target.value as CompanyCategory
                }))
              }
            >
              {Object.entries(t.categories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <label className={styles.formLabel} htmlFor="requestedPlan">
              {t.formPlanLabel}
            </label>
            <select
              id="requestedPlan"
              className={styles.select}
              value={formState.requestedPlan}
              onChange={(event) =>
                setFormState((state) => ({
                  ...state,
                  requestedPlan: event.target.value as CompanyPlan
                }))
              }
            >
              {Object.entries(t.plans).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <button className={styles.button} disabled={submitting} type="submit">
              {submitting ? t.submittingAction : t.submitAction}
            </button>
            {feedbackMessage ? (
              <p
                className={`${styles.feedback} ${
                  feedbackIsError ? styles.feedbackError : styles.feedbackSuccess
                }`}
              >
                {feedbackMessage}
              </p>
            ) : null}
          </form>
        </aside>
      </section>

      {selectedCompany ? (
        <div className={styles.modalBackdrop} onClick={() => setSelectedCompany(null)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selectedCompany.name}</h3>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setSelectedCompany(null)}
              >
                {t.closeAction}
              </button>
            </div>
            <div className={styles.chipRow} style={{ marginTop: "8px" }}>
              <span className={styles.chip}>{t.categories[selectedCompany.category]}</span>
              <span className={styles.chip}>{t.plans[selectedCompany.plan]}</span>
            </div>
            <p className={styles.modalBody}>{selectedCompany.description}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
