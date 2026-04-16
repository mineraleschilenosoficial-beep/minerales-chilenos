"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CompanyRequest, ReviewCompanyRequestInput } from "@minerales/contracts";
import { fetchCompanyRequests, reviewCompanyRequest } from "@/modules/directory/services/directory-api.service";
import {
  directoryTranslations,
  type SupportedLocale
} from "@/modules/i18n/directory-translations";
import styles from "./page.module.css";

type RequestReviewDraft = {
  status: ReviewCompanyRequestInput["status"];
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

export default function OperationsRequestsPage() {
  const [locale, setLocale] = useState<SupportedLocale>("en");
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, RequestReviewDraft>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [applyingRequestId, setApplyingRequestId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ isError: boolean; message: string } | null>(null);
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

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchCompanyRequests();
      setRequests(payload.items);
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
      setFeedback({ isError: true, message: t.operationsErrorFeedback });
    } finally {
      setLoading(false);
    }
  }, [t.operationsErrorFeedback]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleApplyReview = async (requestId: string) => {
    const draft = reviewDrafts[requestId];
    if (!draft) {
      return;
    }

    setApplyingRequestId(requestId);
    setFeedback(null);
    try {
      await reviewCompanyRequest(requestId, draft);
      setFeedback({ isError: false, message: t.operationsSuccessFeedback });
      await loadRequests();
    } catch {
      setFeedback({ isError: true, message: t.operationsErrorFeedback });
    } finally {
      setApplyingRequestId(null);
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
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => setLocale("en")}
              disabled={locale === "en"}
            >
              {t.localeEnglish}
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => setLocale("es")}
              disabled={locale === "es"}
            >
              {t.localeSpanish}
            </button>
            <button type="button" className={styles.button} onClick={() => void loadRequests()}>
              {t.operationsRefresh}
            </button>
          </div>
        </div>

        {feedback ? (
          <p className={`${styles.feedback} ${feedback.isError ? styles.feedbackError : styles.feedbackSuccess}`}>
            {feedback.message}
          </p>
        ) : null}

        <div className={styles.requests}>
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
                      <span>
                        {t.operationsStatusLabel}: {statusLabels[request.status]}
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
        </div>
      </div>
    </div>
  );
}
