"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserProfile } from "@minerales/contracts";
import { UserRole } from "@minerales/types";
import {
  createAdminUser,
  fetchAdminUsers,
  updateAdminUserActive,
  updateAdminUserRoles
} from "@/modules/directory/services/directory-api.service";
import {
  directoryTranslations,
  type SupportedLocale
} from "@/modules/i18n/directory-translations";
import { OperationsShell } from "@/modules/operations/operations-shell";
import styles from "./page.module.css";

const OPERATIONS_LOCALE_STORAGE_KEY = "mc.operations.locale";

type UserDraft = {
  roles: UserRole[];
  isActive: boolean;
};

const ROLE_OPTIONS: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.COMPANY_USER];

export default function OperationsUsersPage() {
  const [locale, setLocale] = useState<SupportedLocale>("en");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [creatingUser, setCreatingUser] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createEmail, setCreateEmail] = useState<string>("");
  const [createPassword, setCreatePassword] = useState<string>("");
  const [createRoles, setCreateRoles] = useState<UserRole[]>([UserRole.COMPANY_USER]);
  const [feedback, setFeedback] = useState<{ isError: boolean; message: string } | null>(null);
  const t = directoryTranslations[locale];

  const roleLabels = useMemo(
    () => ({
      [UserRole.SUPER_ADMIN]: t.operationsUsersRoleSuperAdmin,
      [UserRole.STAFF]: t.operationsUsersRoleStaff,
      [UserRole.COMPANY_USER]: t.operationsUsersRoleCompanyUser
    }),
    [t]
  );

  const canManageUsers = currentUser?.roles.includes(UserRole.SUPER_ADMIN) ?? false;
  const canViewUsers =
    canManageUsers || (currentUser?.roles.includes(UserRole.STAFF) ?? false);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(OPERATIONS_LOCALE_STORAGE_KEY);
    if (storedLocale === "en" || storedLocale === "es") {
      setLocale(storedLocale);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(OPERATIONS_LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetchAdminUsers();
      setUsers(response.items);
      setUserDrafts((currentDrafts) => {
        const nextDrafts: Record<string, UserDraft> = {};
        for (const user of response.items) {
          nextDrafts[user.id] = currentDrafts[user.id] ?? {
            roles: [...user.roles],
            isActive: user.isActive
          };
        }
        return nextDrafts;
      });
    } catch {
      setFeedback({ isError: true, message: t.operationsUsersLoadError });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void loadUsers();
  }, [isAuthenticated]);

  const toggleCreateRole = (role: UserRole) => {
    setCreateRoles((currentRoles) => {
      if (currentRoles.includes(role)) {
        return currentRoles.filter((item) => item !== role);
      }
      return [...currentRoles, role];
    });
  };

  const toggleDraftRole = (userId: string, role: UserRole) => {
    setUserDrafts((currentDrafts) => {
      const current = currentDrafts[userId];
      if (!current) {
        return currentDrafts;
      }

      const nextRoles = current.roles.includes(role)
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role];

      return {
        ...currentDrafts,
        [userId]: {
          ...current,
          roles: nextRoles
        }
      };
    });
  };

  const handleCreateUser = async () => {
    if (createRoles.length === 0) {
      return;
    }

    setCreatingUser(true);
    setFeedback(null);
    try {
      await createAdminUser({
        fullName: createName,
        email: createEmail,
        password: createPassword,
        roles: createRoles
      });
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRoles([UserRole.COMPANY_USER]);
      setFeedback({ isError: false, message: t.operationsUsersCreateSuccess });
      await loadUsers();
    } catch {
      setFeedback({ isError: true, message: t.operationsErrorFeedback });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSaveRoles = async (userId: string) => {
    const draft = userDrafts[userId];
    if (!draft || draft.roles.length === 0) {
      return;
    }

    setFeedback(null);
    try {
      await updateAdminUserRoles(userId, {
        roles: draft.roles
      });
      setFeedback({ isError: false, message: t.operationsUsersUpdateSuccess });
      await loadUsers();
    } catch {
      setFeedback({ isError: true, message: t.operationsErrorFeedback });
    }
  };

  const handleToggleActive = async (userId: string) => {
    const draft = userDrafts[userId];
    if (!draft) {
      return;
    }

    setFeedback(null);
    try {
      await updateAdminUserActive(userId, {
        isActive: !draft.isActive
      });
      setFeedback({ isError: false, message: t.operationsUsersUpdateSuccess });
      await loadUsers();
    } catch {
      setFeedback({ isError: true, message: t.operationsErrorFeedback });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{t.operationsUsersTitle}</h1>
            <p className={styles.subtitle}>{t.operationsUsersSubtitle}</p>
          </div>
          <div />
        </div>

        <OperationsShell
          locale={locale}
          setLocale={setLocale}
          onAuthChange={({ isAuthenticated: shellAuthenticated, currentUser: shellUser }) => {
            setIsAuthenticated(shellAuthenticated);
            setCurrentUser(shellUser);
            if (!shellAuthenticated) {
              setUsers([]);
              setUserDrafts({});
            }
          }}
        >
          {() => null}
        </OperationsShell>

        {feedback ? (
          <p className={`${styles.feedback} ${feedback.isError ? styles.feedbackError : styles.feedbackSuccess}`}>
            {feedback.message}
          </p>
        ) : null}

        {isAuthenticated && !canViewUsers ? (
          <div className={styles.panel}>{t.operationsUsersNoAccess}</div>
        ) : null}

        {isAuthenticated && canManageUsers ? (
          <div className={styles.panel}>
            <h3 className={styles.title}>{t.operationsUsersCreateTitle}</h3>
            <label className={styles.label} htmlFor="create-name">
              {t.operationsUsersNameLabel}
            </label>
            <input
              id="create-name"
              className={styles.input}
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
            />
            <label className={styles.label} htmlFor="create-email">
              {t.operationsUsersEmailLabel}
            </label>
            <input
              id="create-email"
              type="email"
              className={styles.input}
              value={createEmail}
              onChange={(event) => setCreateEmail(event.target.value)}
            />
            <label className={styles.label} htmlFor="create-password">
              {t.operationsUsersPasswordLabel}
            </label>
            <input
              id="create-password"
              type="password"
              className={styles.input}
              value={createPassword}
              onChange={(event) => setCreatePassword(event.target.value)}
            />
            <span className={styles.label}>{t.operationsUsersRolesLabel}</span>
            <div className={styles.roles}>
              {ROLE_OPTIONS.map((role) => (
                <label key={role} className={styles.roleChip}>
                  <input
                    type="checkbox"
                    checked={createRoles.includes(role)}
                    onChange={() => toggleCreateRole(role)}
                  />
                  <span>{roleLabels[role]}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              className={styles.button}
              disabled={creatingUser}
              onClick={() => void handleCreateUser()}
            >
              {creatingUser ? t.operationsApplyingAction : t.operationsUsersCreateAction}
            </button>
          </div>
        ) : null}

        {isAuthenticated && canViewUsers ? (
          <div className={styles.panel}>
            {loadingUsers ? (
              <div>{t.statsLoadingValue}</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t.operationsUsersTableName}</th>
                    <th>{t.operationsUsersTableEmail}</th>
                    <th>{t.operationsUsersTableRoles}</th>
                    <th>{t.operationsUsersTableActive}</th>
                    {canManageUsers ? <th>{t.operationsApplyAction}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const draft = userDrafts[user.id] ?? {
                      roles: user.roles,
                      isActive: user.isActive
                    };

                    return (
                      <tr key={user.id}>
                        <td>{user.fullName}</td>
                        <td>{user.email}</td>
                        <td>
                          {canManageUsers ? (
                            <div className={styles.roles}>
                              {ROLE_OPTIONS.map((role) => (
                                <label key={`${user.id}_${role}`} className={styles.roleChip}>
                                  <input
                                    type="checkbox"
                                    checked={draft.roles.includes(role)}
                                    onChange={() => toggleDraftRole(user.id, role)}
                                  />
                                  <span>{roleLabels[role]}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            user.roles.map((role) => roleLabels[role]).join(", ")
                          )}
                        </td>
                        <td>{draft.isActive ? t.operationsUsersActiveYes : t.operationsUsersActiveNo}</td>
                        {canManageUsers ? (
                          <td>
                            <div className={styles.roles}>
                              <button
                                type="button"
                                className={styles.buttonSecondary}
                                onClick={() => void handleSaveRoles(user.id)}
                              >
                                {t.operationsUsersSaveRolesAction}
                              </button>
                              <button
                                type="button"
                                className={styles.buttonSecondary}
                                onClick={() => void handleToggleActive(user.id)}
                              >
                                {t.operationsUsersToggleActiveAction}
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
