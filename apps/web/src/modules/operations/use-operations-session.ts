"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@minerales/contracts";
import type { SupportedLocale } from "@/modules/i18n/directory-translations";

const OPERATIONS_LOCALE_STORAGE_KEY = "mc.operations.locale";

/**
 * @description Manages operations locale preference and shared authentication state snapshot.
 * @returns Session state plus locale setter and auth change handler for operations pages.
 */
export function useOperationsSession() {
  const [locale, setLocale] = useState<SupportedLocale>("en");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(OPERATIONS_LOCALE_STORAGE_KEY);
    if (storedLocale === "en" || storedLocale === "es") {
      setLocale(storedLocale);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(OPERATIONS_LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const handleAuthChange = (authState: {
    isAuthenticated: boolean;
    currentUser: UserProfile | null;
  }) => {
    setIsAuthenticated(authState.isAuthenticated);
    setCurrentUser(authState.currentUser);
  };

  return {
    locale,
    setLocale,
    isAuthenticated,
    currentUser,
    handleAuthChange
  };
}
