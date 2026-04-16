"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Group } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserProfile } from "@minerales/contracts";
import {
  AUTH_SESSION_INVALID_EVENT,
  fetchCurrentOperator,
  hasOperatorSession,
  logoutOperator
} from "@/modules/directory/services/directory-api.service";
import { directoryTranslations, type SupportedLocale } from "@/modules/i18n/directory-translations";

type OperationsShellProps = {
  locale: SupportedLocale;
  setLocale: (nextLocale: SupportedLocale) => void;
  onAuthChange?: (authState: { isAuthenticated: boolean; currentUser: UserProfile | null }) => void;
};

/**
 * @description Renders the shared operations shell with locale switch, auth form, and navigation links.
 * @param locale Current locale value used for translations.
 * @param setLocale Locale setter callback.
 * @param onAuthChange Optional callback notified when auth state changes.
 * @returns Shared operations navigation and authentication shell.
 */
export function OperationsShell({ locale, setLocale, onAuthChange }: OperationsShellProps) {
  const pathname = usePathname();
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

  const handleLogout = () => {
    logoutOperator();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  return (
    <>
      <Group gap="xs" mb="sm" wrap="wrap" className="ops-toolbar">
        <Button
          size="xs"
          variant={locale === "en" ? "filled" : "light"}
          onClick={() => setLocale("en")}
        >
          {t.localeEnglish}
        </Button>
        <Button
          size="xs"
          variant={locale === "es" ? "filled" : "light"}
          onClick={() => setLocale("es")}
        >
          {t.localeSpanish}
        </Button>
        <Button
          size="xs"
          component={Link}
          href="/operations/dashboard"
          variant={pathname === "/operations/dashboard" ? "filled" : "light"}
        >
          {t.operationsNavDashboard}
        </Button>
        <Button
          size="xs"
          component={Link}
          href="/operations/companies"
          variant={pathname === "/operations/companies" ? "filled" : "light"}
        >
          {t.operationsNavCompanies}
        </Button>
        <Button
          size="xs"
          component={Link}
          href="/operations/requests"
          variant={pathname === "/operations/requests" ? "filled" : "light"}
        >
          {t.operationsNavRequests}
        </Button>
        <Button
          size="xs"
          component={Link}
          href="/operations/users"
          variant={pathname === "/operations/users" ? "filled" : "light"}
        >
          {t.operationsNavUsers}
        </Button>
        <Button
          size="xs"
          component={Link}
          href="/operations/plans"
          variant={pathname === "/operations/plans" ? "filled" : "light"}
        >
          {t.operationsNavPlans}
        </Button>
        {isAuthenticated ? (
          <Button size="xs" variant="default" onClick={handleLogout}>
            {t.operationsAuthLogoutAction}
          </Button>
        ) : null}
      </Group>

      {!isAuthenticated ? (
        <Alert color="yellow" variant="light" mb="md">
          {t.operationsAuthLoginPageHint}{" "}
          <Button size="xs" variant="subtle" component={Link} href="/operations/login">
            {t.operationsAuthGoToLogin}
          </Button>
        </Alert>
      ) : null}

      {authErrorMessage.length > 0 ? (
        <Alert color="red" variant="light" mb="md">
          {authErrorMessage}
        </Alert>
      ) : null}
    </>
  );
}
