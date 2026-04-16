"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CompanyRequest, ReviewCompanyRequestInput } from "@minerales/contracts";
import {
  downloadCompanyRequestsCsv,
  fetchCompanyRequests,
  reviewCompanyRequest
} from "@/modules/directory/services/directory-api.service";
import {
  directoryTranslations,
} from "@/modules/i18n/directory-translations";
import { OperationsFeedback } from "@/modules/operations/operations-feedback";
import { useOperationFeedback } from "@/modules/operations/use-operation-feedback";
import { OperationsShell } from "@/modules/operations/operations-shell";
import { useOperationsSession } from "@/modules/operations/use-operations-session";
import styles from "./page.module.css";

type RequestReviewDraft = {
  status: ReviewCompanyRequestInput["status"];
  reviewNotes: string;
};

type RejectConfirmationState = {
  requestId: string;
  reviewNotes: string;
};

function getEditableStatus(
  status: CompanyRequest["status"]
): ReviewCompanyRequestInput["status"] {
  if (status === "pending") {
    return "under_review";
  }

  return status;
}

function getStatusBadgeClass(status: CompanyRequest["status"]): string {
  switch (status) {
    case "under_review":
      return styles.statusUnderReview ?? "";
    case "approved":
      return styles.statusApproved ?? "";
    case "rejected":
      return styles.statusRejected ?? "";
    default:
      return styles.statusPending ?? "";
  }
}

export default function OperationsRequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, setLocale, isAuthenticated, handleAuthChange } = useOperationsSession();
  const [statusFilter, setStatusFilter] = useState<CompanyRequest["status"] | "all">("all");
  const [createdAtOrder, setCreatedAtOrder] = useState<"newest" | "oldest">("newest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [pageSize] = useState<number>(8);
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, RequestReviewDraft>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [applyingRequestId, setApplyingRequestId] = useState<string | null>(null);
  const [rejectConfirmation, setRejectConfirmation] = useState<RejectConfirmationState | null>(null);
  const [filtersHydrated, setFiltersHydrated] = useState<boolean>(false);
  const { feedback, clearFeedback, setErrorFeedback, setSuccessFeedback } = useOperationFeedback();
  const t = directoryTranslations[locale];

  const statusLabels = useMemo(
    () => ({
      pending: t.operationsStatusPending,
      under_review: t.operationsStatusUnderReview,
      approved: t.operationsStatusApproved,
      rejected: t.operationsStatusRejected
    }),
    [t]
  );

  useEffect(() => {
    const statusParam = searchParams.get("status");
    const orderParam = searchParams.get("createdAtOrder");
    const searchParam = searchParams.get("search");
    const pageParam = searchParams.get("page");

    if (
      statusParam === "pending" ||
      statusParam === "under_review" ||
      statusParam === "approved" ||
      statusParam === "rejected" ||
      statusParam === "all"
    ) {
      setStatusFilter(statusParam);
    }

    if (orderParam === "newest" || orderParam === "oldest") {
      setCreatedAtOrder(orderParam);
    }

    if (searchParam) {
      setSearchQuery(searchParam);
    }

    if (pageParam) {
      const parsedPage = Number.parseInt(pageParam, 10);
      if (!Number.isNaN(parsedPage) && parsedPage > 0) {
        setCurrentPage(parsedPage);
      }
    }

    setFiltersHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    const nextParams = new URLSearchParams();
    if (statusFilter !== "all") {
      nextParams.set("status", statusFilter);
    }
    if (createdAtOrder !== "newest") {
      nextParams.set("createdAtOrder", createdAtOrder);
    }
    if (searchQuery.trim().length > 0) {
      nextParams.set("search", searchQuery.trim());
    }
    if (currentPage > 1) {
      nextParams.set("page", String(currentPage));
    }

    const nextQuery = nextParams.toString();
    const targetUrl = nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [createdAtOrder, currentPage, filtersHydrated, pathname, router, searchQuery, statusFilter]);

  const loadRequests = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    if (!filtersHydrated) {
      return;
    }

    setLoading(true);
    try {
      const payload = await fetchCompanyRequests({
        status: statusFilter,
        createdAtOrder,
        search: searchQuery,
        page: currentPage,
        pageSize
      });
      setRequests(payload.items);
      setTotalPages(payload.totalPages);
      setTotalResults(payload.total);
      setReviewDrafts((currentDrafts) => {
        const nextDrafts: Record<string, RequestReviewDraft> = {};
        for (const request of payload.items) {
          const existing = currentDrafts[request.id];
          nextDrafts[request.id] = existing ?? {
            status: getEditableStatus(request.status),
            reviewNotes: request.reviewNotes ?? ""
          };
        }

        return nextDrafts;
      });
    } catch {
      setRequests([]);
      setTotalPages(0);
      setTotalResults(0);
      setErrorFeedback(t.operationsErrorFeedback);
    } finally {
      setLoading(false);
    }
  }, [
    createdAtOrder,
    currentPage,
    filtersHydrated,
    pageSize,
    searchQuery,
    statusFilter,
    t.operationsErrorFeedback
  ]);


  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, createdAtOrder]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es-CL" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short"
      }),
    [locale]
  );

  const executeReview = async (
    requestId: string,
    status: ReviewCompanyRequestInput["status"],
    reviewNotes: string
  ) => {
    const draft = reviewDrafts[requestId];
    if (!draft && reviewNotes.length === 0) {
      return;
    }

    setApplyingRequestId(requestId);
    clearFeedback();
    try {
      await reviewCompanyRequest(requestId, {
        status,
        reviewNotes: reviewNotes.trim() || undefined
      });
      setSuccessFeedback(t.operationsSuccessFeedback);
      await loadRequests();
    } catch {
      setErrorFeedback(t.operationsErrorFeedback);
    } finally {
      setApplyingRequestId(null);
    }
  };

  const handleApplyReview = async (requestId: string) => {
    const draft = reviewDrafts[requestId];
    if (!draft) {
      return;
    }

    await executeReview(requestId, draft.status, draft.reviewNotes);
  };

  const handleConfirmReject = async () => {
    if (!rejectConfirmation) {
      return;
    }

    await executeReview(rejectConfirmation.requestId, "rejected", rejectConfirmation.reviewNotes);
    setRejectConfirmation(null);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    clearFeedback();
    try {
      await downloadCompanyRequestsCsv({
        status: statusFilter,
        createdAtOrder,
        search: searchQuery
      });

      setSuccessFeedback(t.operationsExportSuccessFeedback);
    } catch {
      setErrorFeedback(t.operationsExportErrorFeedback);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{t.operationsTitle}</h1>
            <p className={styles.subtitle}>{t.operationsSubtitle}</p>
          </div>
          <div />
        </div>

        <OperationsShell
          locale={locale}
          setLocale={setLocale}
          onAuthChange={handleAuthChange}
        >
          {() => null}
        </OperationsShell>

        {isAuthenticated ? (
          <div className={styles.toolbar}>
            <button type="button" className={styles.button} onClick={() => void loadRequests()}>
              {t.operationsRefresh}
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              disabled={exporting}
              onClick={() => void handleExportCsv()}
            >
              {exporting ? t.operationsExportingCsvAction : t.operationsExportCsvAction}
            </button>
            <input
              type="text"
              className={`${styles.select} ${styles.toolbarInput}`}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.operationsSearchPlaceholder}
            />
            <label className={styles.label} htmlFor="status-filter">
              {t.operationsFilterStatusLabel}
            </label>
            <select
              id="status-filter"
              className={`${styles.select} ${styles.toolbarSelect}`}
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as CompanyRequest["status"] | "all")
              }
            >
              <option value="all">{t.operationsFilterStatusAll}</option>
              <option value="pending">{t.operationsStatusPending}</option>
              <option value="under_review">{t.operationsStatusUnderReview}</option>
              <option value="approved">{t.operationsStatusApproved}</option>
              <option value="rejected">{t.operationsStatusRejected}</option>
            </select>
            <label className={styles.label} htmlFor="sort-order">
              {t.operationsSortLabel}
            </label>
            <select
              id="sort-order"
              className={`${styles.select} ${styles.toolbarSelect}`}
              value={createdAtOrder}
              onChange={(event) => setCreatedAtOrder(event.target.value as "newest" | "oldest")}
            >
              <option value="newest">{t.operationsSortNewest}</option>
              <option value="oldest">{t.operationsSortOldest}</option>
            </select>
          </div>
        ) : null}

        <OperationsFeedback feedback={feedback} />

        {isAuthenticated ? <div className={styles.requests}>
          {loading ? <div className={styles.requestCard}>{t.statsLoadingValue}</div> : null}
          {!loading && requests.length === 0 ? (
            <div className={styles.requestCard}>{t.operationsEmptyState}</div>
          ) : null}
          {!loading
            ? requests.map((request) => {
                const draft = reviewDrafts[request.id] ?? {
                  status: getEditableStatus(request.status),
                  reviewNotes: request.reviewNotes ?? ""
                };
                const isApplying = applyingRequestId === request.id;

                return (
                  <article key={request.id} className={styles.requestCard}>
                    <h2 className={styles.requestTitle}>{request.name}</h2>
                    <div className={styles.requestMeta}>
                      <span>{request.email}</span>
                      <span>{request.phone}</span>
                      <span>
                        {request.city}, {request.region}
                      </span>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(request.status)}`}>
                        {statusLabels[request.status]}
                      </span>
                      <span>
                        {t.operationsCreatedAtLabel}: {dateFormatter.format(new Date(request.createdAt))}
                      </span>
                    </div>

                    <label className={styles.label} htmlFor={`status-${request.id}`}>
                      {t.operationsStatusLabel}
                    </label>
                    <select
                      id={`status-${request.id}`}
                      className={styles.select}
                      value={draft.status}
                      onChange={(event) =>
                        setReviewDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [request.id]: {
                            ...draft,
                            status: event.target.value as ReviewCompanyRequestInput["status"]
                          }
                        }))
                      }
                    >
                      <option value="under_review">{t.operationsStatusOptionUnderReview}</option>
                      <option value="approved">{t.operationsStatusOptionApproved}</option>
                      <option value="rejected">{t.operationsStatusOptionRejected}</option>
                    </select>

                    <label className={styles.label} htmlFor={`notes-${request.id}`}>
                      {t.operationsNotesLabel}
                    </label>
                    <textarea
                      id={`notes-${request.id}`}
                      className={styles.textarea}
                      rows={3}
                      value={draft.reviewNotes}
                      onChange={(event) =>
                        setReviewDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [request.id]: {
                            ...draft,
                            reviewNotes: event.target.value
                          }
                        }))
                      }
                    />
                    <div className={styles.notesBox}>
                      <span className={styles.label}>{t.operationsLatestReviewNotesLabel}</span>
                      <p className={styles.notesText}>
                        {request.reviewNotes && request.reviewNotes.trim().length > 0
                          ? request.reviewNotes
                          : t.operationsNoReviewNotes}
                      </p>
                    </div>

                    <div className={styles.quickActions}>
                      <button
                        type="button"
                        className={styles.buttonSecondary}
                        disabled={isApplying}
                        onClick={() => void executeReview(request.id, "under_review", draft.reviewNotes)}
                      >
                        {t.operationsStatusOptionUnderReview}
                      </button>
                      <button
                        type="button"
                        className={styles.buttonSecondary}
                        disabled={isApplying}
                        onClick={() => void executeReview(request.id, "approved", draft.reviewNotes)}
                      >
                        {t.operationsStatusOptionApproved}
                      </button>
                      <button
                        type="button"
                        className={styles.buttonSecondary}
                        disabled={isApplying}
                        onClick={() =>
                          setRejectConfirmation({
                            requestId: request.id,
                            reviewNotes: draft.reviewNotes
                          })
                        }
                      >
                        {t.operationsStatusOptionRejected}
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.button}
                      disabled={isApplying}
                      onClick={() => void handleApplyReview(request.id)}
                    >
                      {isApplying ? t.operationsApplyingAction : t.operationsApplyAction}
                    </button>
                  </article>
                );
              })
            : null}
        </div> : null}
        {isAuthenticated ? <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={loading || currentPage <= 1}
          >
            {t.operationsPaginationPrev}
          </button>
          <span className={styles.label}>
            {t.operationsPaginationPage} {totalPages === 0 ? 0 : currentPage}/{totalPages}
          </span>
          <span className={styles.label}>
            {t.operationsTotalResultsLabel}: {totalResults}
          </span>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => setCurrentPage((page) => Math.min(totalPages || 1, page + 1))}
            disabled={loading || totalPages === 0 || currentPage >= totalPages}
          >
            {t.operationsPaginationNext}
          </button>
        </div> : null}
      </div>
      {rejectConfirmation ? (
        <div className={styles.modalBackdrop} onClick={() => setRejectConfirmation(null)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t.operationsRejectConfirmTitle}</h3>
            <p className={styles.modalMessage}>{t.operationsRejectConfirmMessage}</p>
            <div className={styles.quickActions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => setRejectConfirmation(null)}
              >
                {t.operationsRejectCancelAction}
              </button>
              <button type="button" className={styles.button} onClick={() => void handleConfirmReject()}>
                {t.operationsRejectConfirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
