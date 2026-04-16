"use client";

import { useEffect, useState } from "react";
import { UserRole } from "@minerales/types";
import { fetchAdminPlansSummary } from "@/modules/directory/services/directory-api.service";
import { directoryTranslations } from "@/modules/i18n/directory-translations";
import { OperationsFeedback } from "@/modules/operations/operations-feedback";
import { OperationsShell } from "@/modules/operations/operations-shell";
import { useOperationFeedback } from "@/modules/operations/use-operation-feedback";
import { useOperationsSession } from "@/modules/operations/use-operations-session";
import styles from "./page.module.css";

export default function OperationsPlansPage() {
  const { locale, setLocale, isAuthenticated, currentUser, handleAuthChange } = useOperationsSession();
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchAdminPlansSummary>> | null>(null);
  const { feedback, setErrorFeedback, clearFeedback } = useOperationFeedback();
  const t = directoryTranslations[locale];

  const canViewPlans =
    currentUser?.roles.includes(UserRole.SUPER_ADMIN) || currentUser?.roles.includes(UserRole.STAFF);

  useEffect(() => {
    if (!isAuthenticated || !canViewPlans) {
      return;
    }

    void (async () => {
      clearFeedback();
      try {
        const response = await fetchAdminPlansSummary();
        setSummary(response);
      } catch {
        setSummary(null);
        setErrorFeedback(t.operationsErrorFeedback);
      }
    })();
  }, [canViewPlans, clearFeedback, isAuthenticated, setErrorFeedback, t.operationsErrorFeedback]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t.operationsPlansTitle}</h1>
        <p className={styles.subtitle}>{t.operationsPlansSubtitle}</p>

        <OperationsShell locale={locale} setLocale={setLocale} onAuthChange={handleAuthChange}>
          {() => null}
        </OperationsShell>
        <OperationsFeedback feedback={feedback} />
        {isAuthenticated && !canViewPlans ? <div>{t.operationsNoAccess}</div> : null}

        {isAuthenticated && canViewPlans && summary ? (
          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.label}>{t.operationsPlansPremium}</div>
              <div className={styles.value}>{summary.premiumCompanies}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.label}>{t.operationsPlansStandard}</div>
              <div className={styles.value}>{summary.standardCompanies}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.label}>{t.operationsPlansFree}</div>
              <div className={styles.value}>{summary.freeCompanies}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.label}>{t.operationsPlansTotal}</div>
              <div className={styles.value}>{summary.totalCompanies}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.label}>{t.operationsPlansProjectedRevenue}</div>
              <div className={styles.value}>
                {summary.projectedMonthlyRevenueClp.toLocaleString(locale === "es" ? "es-CL" : "en-US")}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
