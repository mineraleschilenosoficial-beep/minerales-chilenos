"use client";

import { useEffect, useState } from "react";
import { UserRole } from "@minerales/types";
import { fetchAdminDashboard } from "@/modules/directory/services/directory-api.service";
import { directoryTranslations } from "@/modules/i18n/directory-translations";
import { OperationsFeedback } from "@/modules/operations/operations-feedback";
import { OperationsShell } from "@/modules/operations/operations-shell";
import { useOperationFeedback } from "@/modules/operations/use-operation-feedback";
import { useOperationsSession } from "@/modules/operations/use-operations-session";
import styles from "./page.module.css";

export default function OperationsDashboardPage() {
  const { locale, setLocale, isAuthenticated, currentUser, handleAuthChange } = useOperationsSession();
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminDashboard>> | null>(null);
  const { feedback, clearFeedback, setErrorFeedback } = useOperationFeedback();
  const t = directoryTranslations[locale];

  const canViewDashboard =
    currentUser?.roles.includes(UserRole.SUPER_ADMIN) || currentUser?.roles.includes(UserRole.STAFF);

  useEffect(() => {
    if (!isAuthenticated || !canViewDashboard) {
      return;
    }

    void (async () => {
      setLoading(true);
      clearFeedback();
      try {
        const response = await fetchAdminDashboard();
        setData(response);
      } catch {
        setData(null);
        setErrorFeedback(t.operationsErrorFeedback);
      } finally {
        setLoading(false);
      }
    })();
  }, [canViewDashboard, clearFeedback, isAuthenticated, setErrorFeedback, t.operationsErrorFeedback]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t.operationsDashboardTitle}</h1>
        <p className={styles.subtitle}>{t.operationsDashboardSubtitle}</p>

        <OperationsShell locale={locale} setLocale={setLocale} onAuthChange={handleAuthChange}>
          {() => null}
        </OperationsShell>
        <OperationsFeedback feedback={feedback} />
        {isAuthenticated && !canViewDashboard ? <div>{t.operationsNoAccess}</div> : null}

        {isAuthenticated && canViewDashboard && data ? (
          <>
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardLabel}>{t.operationsDashboardActiveCompanies}</div>
                <div className={styles.cardValue}>{data.activeCompanies}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>{t.operationsDashboardPendingRequests}</div>
                <div className={styles.cardValue}>{data.pendingRequests}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>{t.operationsDashboardPremiumCompanies}</div>
                <div className={styles.cardValue}>{data.premiumCompanies}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>{t.operationsDashboardStandardCompanies}</div>
                <div className={styles.cardValue}>{data.standardCompanies}</div>
              </div>
            </div>

            <div className={styles.panel}>
              <h3>{t.operationsDashboardRecentRequests}</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t.operationsUsersTableName}</th>
                    <th>{t.operationsUsersTableEmail}</th>
                    <th>{t.operationsStatusLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requestsRecent.map((request) => (
                    <tr key={request.id}>
                      <td>{request.name}</td>
                      <td>{request.email}</td>
                      <td>{request.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.panel}>
              <h3>{t.operationsDashboardCategoryBreakdown}</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t.formCategoryLabel}</th>
                    <th>{t.operationsTotalResultsLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((item) => (
                    <tr key={item.category}>
                      <td>{t.categories[item.category]}</td>
                      <td>{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {isAuthenticated && canViewDashboard && loading ? <div>{t.statsLoadingValue}</div> : null}
      </div>
    </div>
  );
}
