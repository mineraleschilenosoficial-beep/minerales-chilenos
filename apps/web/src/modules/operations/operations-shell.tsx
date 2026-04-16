"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserProfile } from "@minerales/contracts";
import {
  AUTH_SESSION_INVALID_EVENT,
  fetchCurrentOperator,
  hasOperatorSession,
  loginOperator,
  logoutOperator
} from "@/modules/directory/services/directory-api.service";
import { directoryTranslations, type SupportedLocale } from "@/modules/i18n/directory-translations";
import styles from "./operations-shell.module.css";

type OperationsShellRenderProps = {
  locale: SupportedLocale;
  isAuthenticated: boolean;
  currentUser: UserProfile | null;
};

type OperationsShellProps = {
  locale: SupportedLocale;
  setLocale: (nextLocale: SupportedLocale) => void;
  onAuthChange?: (authState: { isAuthenticated: boolean; currentUser: UserProfile | null }) => void;
  children: (props: OperationsShellRenderProps) => ReactNode;
};

/**
 * Shared shell for operations views with common auth and navigation.
 */
export function OperationsShell({ locale, setLocale, onAuthChange, children }: OperationsShellProps) {
  const pathname = usePathname();
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(hasOperatorSession());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string>("");
  const t = directoryTranslations[locale];

  useEffect(() => {
    onAuthChange?.({ isAuthenticated, currentUser });
  }, [currentUser, isAuthenticated, onAuthChange]);

  useEffect(() => {
    if (!hasOperatorSession()) {
      return;
    }

    void (async () => {
      try {
        const me = await fetchCurrentOperator();
        setCurrentUser(me);
        setIsAuthenticated(true);
      } catch {
        logoutOperator();
        setCurrentUser(null);
        setIsAuthenticated(false);
        setAuthErrorMessage(t.operationsAuthSessionExpired);
      }
    })();
  }, [t.operationsAuthSessionExpired]);

  useEffect(() => {
    const handleSessionInvalid = () => {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setAuthErrorMessage(t.operationsAuthSessionExpired);
    };

    window.addEventListener(AUTH_SESSION_INVALID_EVENT, handleSessionInvalid);
    return () => {
      window.removeEventListener(AUTH_SESSION_INVALID_EVENT, handleSessionInvalid);
    };
  }, [t.operationsAuthSessionExpired]);

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthErrorMessage("");
    try {
      await loginOperator(authEmail, authPassword);
      const me = await fetchCurrentOperator();
      setCurrentUser(me);
      setIsAuthenticated(true);
      setAuthPassword("");
      setAuthErrorMessage("");
    } catch {
      setAuthErrorMessage(t.operationsAuthLoginError);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logoutOperator();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  return (
    <>
      <div className={styles.nav}>
        <button type="button" onClick={() => setLocale("en")} disabled={locale === "en"}>
          {t.localeEnglish}
        </button>
        <button type="button" onClick={() => setLocale("es")} disabled={locale === "es"}>
          {t.localeSpanish}
        </button>
        <Link
          href="/operations/dashboard"
          className={`${styles.link} ${pathname === "/operations/dashboard" ? styles.linkActive : ""}`}
        >
          {t.operationsNavDashboard}
        </Link>
        <Link
          href="/operations/companies"
          className={`${styles.link} ${pathname === "/operations/companies" ? styles.linkActive : ""}`}
        >
          {t.operationsNavCompanies}
        </Link>
        <Link
          href="/operations/requests"
          className={`${styles.link} ${pathname === "/operations/requests" ? styles.linkActive : ""}`}
        >
          {t.operationsNavRequests}
        </Link>
        <Link
          href="/operations/users"
          className={`${styles.link} ${pathname === "/operations/users" ? styles.linkActive : ""}`}
        >
          {t.operationsNavUsers}
        </Link>
        <Link
          href="/operations/plans"
          className={`${styles.link} ${pathname === "/operations/plans" ? styles.linkActive : ""}`}
        >
          {t.operationsNavPlans}
        </Link>
        {isAuthenticated ? (
          <button type="button" onClick={handleLogout}>
            {t.operationsAuthLogoutAction}
          </button>
        ) : null}
      </div>

      {!isAuthenticated ? (
        <div className={styles.authCard}>
          <h3>{t.operationsAuthTitle}</h3>
          <p>{t.operationsAuthSubtitle}</p>
          <label htmlFor="ops-auth-email">{t.operationsAuthEmailLabel}</label>
          <input
            id="ops-auth-email"
            type="email"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
          />
          <label htmlFor="ops-auth-password">{t.operationsAuthPasswordLabel}</label>
          <input
            id="ops-auth-password"
            type="password"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
          />
          <button type="button" disabled={authLoading} onClick={() => void handleLogin()}>
            {authLoading ? t.operationsApplyingAction : t.operationsAuthLoginAction}
          </button>
          {authErrorMessage.length > 0 ? <div>{authErrorMessage}</div> : null}
        </div>
      ) : null}

      {children({
        locale,
        isAuthenticated,
        currentUser
      })}
    </>
  );
}
