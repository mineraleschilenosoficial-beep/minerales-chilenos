"use client";

import { useEffect, useMemo, useState } from "react";
import type { Company } from "@minerales/contracts";
import { CompanyCategory, CompanyPlan } from "@minerales/types";
import { categoryLabels, planLabels } from "@/modules/directory/data/directory-labels";
import {
  initialRequestFormState,
  type RequestFormState
} from "@/modules/directory/models/directory.types";
import {
  fetchCompanies,
  fetchCompanyById,
  submitCompanyRequest
} from "@/modules/directory/services/directory-api.service";
import styles from "./page.module.css";

export default function HomePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<CompanyCategory | "all">("all");
  const [formState, setFormState] = useState<RequestFormState>(initialRequestFormState);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [feedbackIsError, setFeedbackIsError] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

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

    const hasRequiredFields =
      formState.name.trim().length > 1 &&
      formState.tagline.trim().length > 1 &&
      formState.description.trim().length > 9 &&
      formState.city.trim().length > 1 &&
      formState.region.trim().length > 1 &&
      formState.phone.trim().length > 5 &&
      formState.email.trim().length > 3;

    if (!hasRequiredFields) {
      setFeedbackIsError(true);
      setFeedbackMessage("Please complete the form with valid values.");
      return;
    }

    setSubmitting(true);
    try {
      await submitCompanyRequest(formState);

      setFeedbackIsError(false);
      setFeedbackMessage("Request submitted successfully. We will contact you soon.");
      setFormState(initialRequestFormState);
    } catch {
      setFeedbackIsError(true);
      setFeedbackMessage("Unable to submit request right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>MineralesChilenos.cl</div>
          <div>B2B Mining Supplier Directory</div>
        </div>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Find trusted mining suppliers in Chile.</h1>
        <p className={styles.heroSubtitle}>
          Search companies by category, compare supplier profiles, and submit your company for
          publication in the directory.
        </p>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Published Suppliers</div>
            <div className={styles.statValue}>{loading ? "..." : companies.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active Categories</div>
            <div className={styles.statValue}>{loading ? "..." : categoriesCount}</div>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Supplier Directory</h2>
          <div className={styles.toolbar}>
            <input
              className={styles.input}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by company, city, or tagline"
            />
            <select
              className={styles.select}
              value={category}
              onChange={(event) => setCategory(event.target.value as CompanyCategory | "all")}
            >
              <option value="all">All categories</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.cards}>
            {loading ? (
              <div className={styles.card}>Loading suppliers...</div>
            ) : companies.length === 0 ? (
              <div className={styles.card}>No suppliers match your search.</div>
            ) : (
              companies.map((company) => (
                <article key={company.id} className={styles.card}>
                  <h3 className={styles.cardName}>{company.name}</h3>
                  <p className={styles.cardTagline}>{company.tagline}</p>
                  <div className={styles.chipRow}>
                    <span className={styles.chip}>{categoryLabels[company.category]}</span>
                    <span className={styles.chip}>{planLabels[company.plan]}</span>
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
                    View details
                  </button>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className={styles.panel}>
          <h2 className={styles.panelTitle}>Submit Your Company</h2>
          <form className={styles.form} onSubmit={handleFormSubmit}>
            <label className={styles.formLabel} htmlFor="name">
              Company name
            </label>
            <input
              id="name"
              className={styles.input}
              value={formState.name}
              onChange={(event) => setFormState((state) => ({ ...state, name: event.target.value }))}
            />

            <label className={styles.formLabel} htmlFor="tagline">
              Tagline
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
              Description
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
              City
            </label>
            <input
              id="city"
              className={styles.input}
              value={formState.city}
              onChange={(event) => setFormState((state) => ({ ...state, city: event.target.value }))}
            />

            <label className={styles.formLabel} htmlFor="region">
              Region
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
              Phone
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
              Email
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
              Website (optional)
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
              Category
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
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <label className={styles.formLabel} htmlFor="requestedPlan">
              Requested plan
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
              {Object.entries(planLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <button className={styles.button} disabled={submitting} type="submit">
              {submitting ? "Submitting..." : "Submit request"}
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
                Close
              </button>
            </div>
            <div className={styles.chipRow} style={{ marginTop: "8px" }}>
              <span className={styles.chip}>{categoryLabels[selectedCompany.category]}</span>
              <span className={styles.chip}>{planLabels[selectedCompany.plan]}</span>
            </div>
            <p className={styles.modalBody}>{selectedCompany.description}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
