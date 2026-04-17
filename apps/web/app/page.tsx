"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createCompanyRequestSchema,
  type Company,
  type CompanyMetrics,
  type LocationCommune,
  type LocationCountry,
  type LocationRegion
} from "@minerales/contracts";
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
  fetchCompanyMetrics,
  fetchCompanyById,
  fetchLocationCommunes,
  fetchLocationCountries,
  fetchLocationRegions,
  submitCompanyRequest
} from "@/modules/directory/services/directory-api.service";
import styles from "./page.module.css";

export default function HomePage() {
  type RequestFieldErrorKey = keyof RequestFormState;
  const [locale, setLocale] = useState<SupportedLocale>("es");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(6);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalCompaniesFromQuery, setTotalCompaniesFromQuery] = useState<number>(0);
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<CompanyCategory | "all">("all");
  const [formState, setFormState] = useState<RequestFormState>(initialRequestFormState);
  const [countries, setCountries] = useState<LocationCountry[]>([]);
  const [regions, setRegions] = useState<LocationRegion[]>([]);
  const [communes, setCommunes] = useState<LocationCommune[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("CL");
  const [selectedRegionCode, setSelectedRegionCode] = useState<string>("");
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [feedbackIsError, setFeedbackIsError] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<RequestFieldErrorKey, string>>>({});
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const t = directoryTranslations[locale];

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await fetchCompanies({
          search,
          category,
          page: currentPage,
          pageSize,
          sortBy: "priority",
          sortDirection: "desc"
        });
        setCompanies(items.items);
        setTotalPages(items.totalPages);
        setTotalCompaniesFromQuery(items.total);
      } catch {
        setCompanies([]);
        setTotalPages(0);
        setTotalCompaniesFromQuery(0);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [search, category, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setLoadingMetrics(true);
      try {
        const metricsPayload = await fetchCompanyMetrics();
        if (isMounted) {
          setMetrics(metricsPayload);
        }
      } catch {
        if (isMounted) {
          setMetrics(null);
        }
      } finally {
        if (isMounted) {
          setLoadingMetrics(false);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const countryPayload = await fetchLocationCountries();
        setCountries(countryPayload.items);
        if (!countryPayload.items.some((item) => item.code === "CL")) {
          const firstCountry = countryPayload.items.at(0);
          if (firstCountry) {
            setSelectedCountryCode(firstCountry.code);
          }
        }
      } catch {
        setCountries([]);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const regionsPayload = await fetchLocationRegions(selectedCountryCode);
        setRegions(regionsPayload.items);
      } catch {
        setRegions([]);
      }
    })();
  }, [selectedCountryCode]);

  useEffect(() => {
    if (!selectedRegionCode) {
      setCommunes([]);
      setSelectedCommuneId("");
      return;
    }

    void (async () => {
      try {
        const communesPayload = await fetchLocationCommunes(selectedRegionCode);
        setCommunes(communesPayload.items);
      } catch {
        setCommunes([]);
      }
    })();
  }, [selectedRegionCode]);

  const categoriesCount = useMemo(() => {
    if (metrics) {
      return metrics.totalCategories;
    }

    return new Set(companies.map((company) => company.category)).size;
  }, [companies, metrics]);

  const publishedSuppliersCount = metrics?.totalCompanies ?? totalCompaniesFromQuery;
  const premiumSuppliersCount = metrics?.byPlan[CompanyPlan.PREMIUM] ?? 0;
  const topCategory = metrics?.byCategory[0]?.category;

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedbackMessage("");
    setFeedbackIsError(false);

    const parsedPayload = createCompanyRequestSchema.safeParse({
      ...formState,
      website: formState.website.trim() || undefined
    });

    if (!parsedPayload.success) {
      const nextFormErrors: Partial<Record<RequestFieldErrorKey, string>> = {};
      for (const issue of parsedPayload.error.issues) {
        const pathKey = issue.path[0];
        if (typeof pathKey !== "string") {
          continue;
        }

        const fieldKey = pathKey as RequestFieldErrorKey;
        if (fieldKey === "communeId") {
          nextFormErrors.city = t.formErrorRequired;
          continue;
        }
        if (nextFormErrors[fieldKey]) {
          continue;
        }

        if (issue.code === "invalid_type") {
          nextFormErrors[fieldKey] = t.formErrorRequired;
          continue;
        }
        if (issue.code === "too_small" && issue.minimum === 2) {
          nextFormErrors[fieldKey] = t.formErrorMinChars2;
          continue;
        }
        if (issue.code === "too_small" && issue.minimum === 6) {
          nextFormErrors[fieldKey] = t.formErrorMinChars6;
          continue;
        }
        if (issue.code === "too_small" && issue.minimum === 10) {
          nextFormErrors[fieldKey] = t.formErrorMinChars10;
          continue;
        }
        if (issue.code === "invalid_string" && issue.validation === "email") {
          nextFormErrors[fieldKey] = t.formErrorInvalidEmail;
          continue;
        }
        if (issue.code === "invalid_string" && issue.validation === "url") {
          nextFormErrors[fieldKey] = t.formErrorInvalidWebsite;
          continue;
        }

        nextFormErrors[fieldKey] = t.invalidFormFeedback;
      }

      setFormErrors(nextFormErrors);
      setFeedbackIsError(true);
      setFeedbackMessage(t.invalidFormFeedback);
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    try {
      await submitCompanyRequest(formState);

      setFeedbackIsError(false);
      setFeedbackMessage(t.submitSuccessFeedback);
      setFormState(initialRequestFormState);
      setFormErrors({});
      setSelectedRegionCode("");
      setSelectedCommuneId("");
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
          <div className={styles.logo}>
            <div className={styles.logoIcon}>MC</div>
            <div className={styles.logoText}>
              <div className={styles.brand}>{t.brandName}</div>
              <div className={styles.brandTagline}>{t.brandTagline}</div>
            </div>
          </div>
          <nav className={styles.nav}>
            <a href="#directorio">{t.landingNavDirectory}</a>
            <a href="#categorias">{t.landingNavCategories}</a>
            <a href="#planes">{t.landingNavPlans}</a>
            <a href="#contacto">{t.landingNavContact}</a>
          </nav>
          <div>
            <Link href="/operations/login" className={styles.linkButton}>
              {t.adminAccessAction}
            </Link>
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

      <div className={styles.launchBanner}>
        <strong>{t.landingLaunchBannerTitle}</strong>
        <span>{t.landingLaunchBannerSubtitle}</span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroBadge}>{t.landingHeroBadge}</div>
        <h1 className={styles.heroTitle}>{t.heroTitle}</h1>
        <p className={styles.heroSubtitle}>{t.heroSubtitle}</p>
        <div className={styles.heroActions}>
          <a href="#directorio" className={styles.button}>
            {t.landingHeroPrimaryAction}
          </a>
          <a href="#planes" className={styles.outlineButton}>
            {t.landingHeroSecondaryAction}
          </a>
        </div>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.statsPublishedSuppliers}</div>
            <div className={styles.statValue}>
              {loading || loadingMetrics ? t.statsLoadingValue : publishedSuppliersCount}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.statsActiveCategories}</div>
            <div className={styles.statValue}>
              {loading || loadingMetrics ? t.statsLoadingValue : categoriesCount}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.statsPremiumSuppliers}</div>
            <div className={styles.statValue}>
              {loadingMetrics ? t.statsLoadingValue : premiumSuppliersCount}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t.statsTopCategory}</div>
            <div className={styles.statValue}>
              {loadingMetrics
                ? t.statsLoadingValue
                : topCategory
                  ? t.categories[topCategory]
                  : t.statsNotAvailable}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.panel} id="directorio">
          <h2 className={styles.panelTitle}>{t.directoryTitle}</h2>
          <div className={styles.searchTitle}>{t.landingSearchTitle}</div>
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

          <div className={styles.cards} id="categorias">
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
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1 || loading}
            >
              {t.paginationPrev}
            </button>
            <div className={styles.formLabel}>
              {t.paginationPageOf} {totalPages === 0 ? 0 : currentPage}/{totalPages}
            </div>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => setCurrentPage((page) => Math.min(totalPages || 1, page + 1))}
              disabled={loading || totalPages === 0 || currentPage >= totalPages}
            >
              {t.paginationNext}
            </button>
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
              onChange={(event) => {
                setFormState((state) => ({ ...state, name: event.target.value }));
                setFormErrors((current) => ({ ...current, name: undefined }));
              }}
            />
            {formErrors.name ? <p className={styles.fieldError}>{formErrors.name}</p> : null}

            <label className={styles.formLabel} htmlFor="tagline">
              {t.formTaglineLabel}
            </label>
            <input
              id="tagline"
              className={styles.input}
              value={formState.tagline}
              onChange={(event) => {
                setFormState((state) => ({ ...state, tagline: event.target.value }));
                setFormErrors((current) => ({ ...current, tagline: undefined }));
              }}
            />
            {formErrors.tagline ? <p className={styles.fieldError}>{formErrors.tagline}</p> : null}

            <label className={styles.formLabel} htmlFor="description">
              {t.formDescriptionLabel}
            </label>
            <textarea
              id="description"
              className={styles.textarea}
              value={formState.description}
              onChange={(event) => {
                setFormState((state) => ({ ...state, description: event.target.value }));
                setFormErrors((current) => ({ ...current, description: undefined }));
              }}
              rows={4}
            />
            {formErrors.description ? <p className={styles.fieldError}>{formErrors.description}</p> : null}

            <label className={styles.formLabel} htmlFor="country">
              {t.formCountryLabel}
            </label>
            <select
              id="country"
              className={styles.select}
              value={selectedCountryCode}
              onChange={(event) => {
                const nextCountryCode = event.target.value;
                setSelectedCountryCode(nextCountryCode);
                setSelectedRegionCode("");
                setSelectedCommuneId("");
                setFormState((state) => ({ ...state, region: "", city: "", communeId: "" }));
                setFormErrors((current) => ({ ...current, city: undefined, region: undefined }));
              }}
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>

            <label className={styles.formLabel} htmlFor="region">
              {t.formRegionLabel}
            </label>
            <select
              id="region"
              className={styles.select}
              value={selectedRegionCode}
              onChange={(event) => {
                const nextRegionCode = event.target.value;
                const nextRegion = regions.find((region) => region.code === nextRegionCode);
                setSelectedRegionCode(nextRegionCode);
                setSelectedCommuneId("");
                setFormState((state) => ({
                  ...state,
                  region: nextRegion?.name ?? "",
                  city: "",
                  communeId: ""
                }));
                setFormErrors((current) => ({ ...current, city: undefined, region: undefined }));
              }}
            >
              <option value="">{t.formRegionSelectPlaceholder}</option>
              {regions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </select>
            {formErrors.region ? <p className={styles.fieldError}>{formErrors.region}</p> : null}

            <label className={styles.formLabel} htmlFor="commune">
              {t.formCityLabel}
            </label>
            <select
              id="commune"
              className={styles.select}
              value={selectedCommuneId}
              onChange={(event) => {
                const nextCommuneId = event.target.value;
                const nextCommune = communes.find((commune) => commune.id === nextCommuneId);
                setSelectedCommuneId(nextCommuneId);
                setFormState((state) => ({
                  ...state,
                  communeId: nextCommuneId,
                  city: nextCommune?.name ?? ""
                }));
                setFormErrors((current) => ({ ...current, city: undefined }));
              }}
              disabled={!selectedRegionCode}
            >
              <option value="">{t.formCommuneSelectPlaceholder}</option>
              {communes.map((commune) => (
                <option key={commune.id} value={commune.id}>
                  {commune.name}
                </option>
              ))}
            </select>
            {formErrors.city ? <p className={styles.fieldError}>{formErrors.city}</p> : null}

            <label className={styles.formLabel} htmlFor="phone">
              {t.formPhoneLabel}
            </label>
            <input
              id="phone"
              className={styles.input}
              value={formState.phone}
              onChange={(event) => {
                setFormState((state) => ({ ...state, phone: event.target.value }));
                setFormErrors((current) => ({ ...current, phone: undefined }));
              }}
            />
            {formErrors.phone ? <p className={styles.fieldError}>{formErrors.phone}</p> : null}

            <label className={styles.formLabel} htmlFor="email">
              {t.formEmailLabel}
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              value={formState.email}
              onChange={(event) => {
                setFormState((state) => ({ ...state, email: event.target.value }));
                setFormErrors((current) => ({ ...current, email: undefined }));
              }}
            />
            {formErrors.email ? <p className={styles.fieldError}>{formErrors.email}</p> : null}

            <label className={styles.formLabel} htmlFor="website">
              {t.formWebsiteLabel}
            </label>
            <input
              id="website"
              className={styles.input}
              value={formState.website}
              onChange={(event) => {
                setFormState((state) => ({ ...state, website: event.target.value }));
                setFormErrors((current) => ({ ...current, website: undefined }));
              }}
            />
            {formErrors.website ? <p className={styles.fieldError}>{formErrors.website}</p> : null}

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

      <section className={styles.pricingSection} id="planes">
        <div className={styles.pricingInner}>
          <h2 className={styles.pricingTitle}>{t.landingPricingTitle}</h2>
          <p className={styles.pricingSubtitle}>{t.landingPricingSubtitle}</p>
          <div className={styles.plansGrid}>
            <article className={styles.planCard}>
              <div className={styles.planName}>{t.landingPlanBasicName}</div>
              <div className={styles.planPrice}>{t.landingPlanBasicPrice}</div>
              <div className={styles.planPeriod}>{t.landingPlanBasicPeriod}</div>
              <ul className={styles.planFeatures}>
                {t.landingPlanBasicFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button
                className={styles.button}
                onClick={() =>
                  document.getElementById("name")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {t.landingHeroSecondaryAction}
              </button>
            </article>
            <article className={`${styles.planCard} ${styles.planFeatured}`}>
              <div className={styles.planBadge}>{t.landingPlanPopularBadge}</div>
              <div className={styles.planName}>{t.landingPlanStandardName}</div>
              <div className={styles.planPrice}>{t.landingPlanStandardPrice}</div>
              <div className={styles.planPeriod}>{t.landingPlanStandardPeriod}</div>
              <ul className={styles.planFeatures}>
                {t.landingPlanStandardFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button
                className={styles.button}
                onClick={() =>
                  document.getElementById("name")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {t.submitAction}
              </button>
            </article>
            <article className={styles.planCard}>
              <div className={styles.planName}>{t.landingPlanPremiumName}</div>
              <div className={styles.planPrice}>{t.landingPlanPremiumPrice}</div>
              <div className={styles.planPeriod}>{t.landingPlanPremiumPeriod}</div>
              <ul className={styles.planFeatures}>
                {t.landingPlanPremiumFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button
                className={styles.button}
                onClick={() =>
                  document.getElementById("name")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {t.submitAction}
              </button>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection} id="contacto">
        <h2 className={styles.ctaTitle}>{t.landingCtaTitle}</h2>
        <p className={styles.ctaSubtitle}>{t.landingCtaSubtitle}</p>
        <button
          className={styles.button}
          onClick={() => document.getElementById("name")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          {t.landingCtaAction}
        </button>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>{t.brandName}</div>
        <div className={styles.footerText}>{t.landingFooterCopyright}</div>
        <div className={styles.footerText}>{t.landingFooterContact}</div>
      </footer>

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
