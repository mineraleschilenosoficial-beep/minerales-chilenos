"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  const toWhatsAppLink = (phone: string, companyName: string): string => {
    const digits = phone.replace(/\D/g, "");
    const message =
      locale === "es"
        ? `Hola, contacto por la solicitud de ${companyName} en MineralesChilenos.`
        : `Hello, reaching out about ${companyName}'s request on MineralesChilenos.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  };

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
                <Link href="/operations/companies?status=active" className={styles.cardLink}>
                  <div className={styles.cardLabel}>{t.operationsDashboardActiveCompanies}</div>
                  <div className={styles.cardValue}>{data.activeCompanies}</div>
                </Link>
              </div>
              <div className={styles.card}>
                <Link href="/operations/requests?status=pending" className={styles.cardLink}>
                  <div className={styles.cardLabel}>{t.operationsDashboardPendingRequests}</div>
                  <div className={styles.cardValue}>{data.pendingRequests}</div>
                </Link>
              </div>
              <div className={styles.card}>
                <Link href="/operations/companies?plan=premium" className={styles.cardLink}>
                  <div className={styles.cardLabel}>{t.operationsDashboardPremiumCompanies}</div>
                  <div className={styles.cardValue}>{data.premiumCompanies}</div>
                </Link>
              </div>
              <div className={styles.card}>
                <Link href="/operations/companies?plan=standard" className={styles.cardLink}>
                  <div className={styles.cardLabel}>{t.operationsDashboardStandardCompanies}</div>
                  <div className={styles.cardValue}>{data.standardCompanies}</div>
                </Link>
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
                    <th>{t.operationsApplyAction}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requestsRecent.map((request) => (
                    <tr key={request.id}>
                      <td>{request.name}</td>
                      <td>{request.email}</td>
                      <td>{request.status}</td>
                      <td>
                        <div className={styles.actions}>
                          <Link
                            href={`/operations/requests?search=${encodeURIComponent(request.name)}&requestId=${request.id}`}
                            className={styles.actionLink}
                          >
                            {t.operationsDashboardOpenRequestAction}
                          </Link>
                          <a
                            href={toWhatsAppLink(request.phone, request.name)}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.actionLink}
                          >
                            {t.operationsDashboardWhatsAppAction}
                          </a>
                        </div>
                      </td>
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
                      <td>
                        <Link
                          href={`/operations/companies?category=${item.category}`}
                          className={styles.actionLink}
                        >
                          {t.categories[item.category]}
                        </Link>
                      </td>
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
