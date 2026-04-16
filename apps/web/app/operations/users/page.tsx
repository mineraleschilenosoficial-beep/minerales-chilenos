"use client";

import {
  Badge,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from "@mantine/core";
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
} from "@/modules/i18n/directory-translations";
import { OperationsFeedback } from "@/modules/operations/operations-feedback";
import { useOperationFeedback } from "@/modules/operations/use-operation-feedback";
import { OperationsShell } from "@/modules/operations/operations-shell";
import { useOperationsSession } from "@/modules/operations/use-operations-session";

type UserDraft = {
  roles: UserRole[];
  isActive: boolean;
};

const ROLE_OPTIONS: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.COMPANY_USER];

export default function OperationsUsersPage() {
  const { locale, setLocale, isAuthenticated, currentUser, handleAuthChange } =
    useOperationsSession();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [creatingUser, setCreatingUser] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createEmail, setCreateEmail] = useState<string>("");
  const [createPassword, setCreatePassword] = useState<string>("");
  const [createRoles, setCreateRoles] = useState<UserRole[]>([UserRole.COMPANY_USER]);
  const { feedback, clearFeedback, setErrorFeedback, setSuccessFeedback } = useOperationFeedback();
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
      setErrorFeedback(t.operationsUsersLoadError);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !canViewUsers) {
      return;
    }
    void loadUsers();
  }, [canViewUsers, isAuthenticated]);

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
    clearFeedback();
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
      setSuccessFeedback(t.operationsUsersCreateSuccess);
      await loadUsers();
    } catch {
      setErrorFeedback(t.operationsErrorFeedback);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSaveRoles = async (userId: string) => {
    const draft = userDrafts[userId];
    if (!draft || draft.roles.length === 0) {
      return;
    }

    clearFeedback();
    try {
      await updateAdminUserRoles(userId, {
        roles: draft.roles
      });
      setSuccessFeedback(t.operationsUsersUpdateSuccess);
      await loadUsers();
    } catch {
      setErrorFeedback(t.operationsErrorFeedback);
    }
  };

  const handleToggleActive = async (userId: string) => {
    const draft = userDrafts[userId];
    if (!draft) {
      return;
    }

    clearFeedback();
    try {
      await updateAdminUserActive(userId, {
        isActive: !draft.isActive
      });
      setSuccessFeedback(t.operationsUsersUpdateSuccess);
      await loadUsers();
    } catch {
      setErrorFeedback(t.operationsErrorFeedback);
    }
  };

  return (
    <Container size="lg" py="lg" className="ops-page">
      <Stack gap="sm">
        <Title order={1} className="ops-heading">
          {t.operationsUsersTitle}
        </Title>
        <Text className="ops-subtitle">{t.operationsUsersSubtitle}</Text>

        <OperationsShell
          locale={locale}
          setLocale={setLocale}
          onAuthChange={(authState) => {
            handleAuthChange(authState);
            if (!authState.isAuthenticated) {
              setUsers([]);
              setUserDrafts({});
            }
          }}
        />

        <OperationsFeedback feedback={feedback} />

        {isAuthenticated && !canViewUsers ? (
          <Paper withBorder p="md" className="ops-panel">
            {t.operationsUsersNoAccess}
          </Paper>
        ) : null}

        {isAuthenticated && canManageUsers ? (
          <Paper withBorder p="md" className="ops-panel">
            <Stack gap="sm">
              <Title order={3}>{t.operationsUsersCreateTitle}</Title>
              <TextInput
                id="create-name"
                label={t.operationsUsersNameLabel}
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
              />
              <TextInput
                id="create-email"
                type="email"
                label={t.operationsUsersEmailLabel}
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
              />
              <TextInput
                id="create-password"
                type="password"
                label={t.operationsUsersPasswordLabel}
                value={createPassword}
                onChange={(event) => setCreatePassword(event.target.value)}
              />
              <Text size="sm" c="dimmed">
                {t.operationsUsersRolesLabel}
              </Text>
              <Group gap="md" wrap="wrap">
                {ROLE_OPTIONS.map((role) => (
                  <Checkbox
                    key={role}
                    checked={createRoles.includes(role)}
                    onChange={() => toggleCreateRole(role)}
                    label={roleLabels[role]}
                  />
                ))}
              </Group>
              <Button loading={creatingUser} onClick={() => void handleCreateUser()}>
                {t.operationsUsersCreateAction}
              </Button>
            </Stack>
          </Paper>
        ) : null}

        {isAuthenticated && canViewUsers ? (
          <Paper withBorder p="md" className="ops-panel">
            {loadingUsers ? (
              <Text>{t.statsLoadingValue}</Text>
            ) : (
              <Table.ScrollContainer minWidth={880}>
                <Table striped highlightOnHover withTableBorder className="ops-table">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t.operationsUsersTableName}</Table.Th>
                      <Table.Th>{t.operationsUsersTableEmail}</Table.Th>
                      <Table.Th>{t.operationsUsersTableRoles}</Table.Th>
                      <Table.Th>{t.operationsUsersTableActive}</Table.Th>
                      {canManageUsers ? <Table.Th>{t.operationsApplyAction}</Table.Th> : null}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {users.map((user) => {
                      const draft = userDrafts[user.id] ?? {
                        roles: user.roles,
                        isActive: user.isActive
                      };

                      return (
                        <Table.Tr key={user.id}>
                          <Table.Td>{user.fullName}</Table.Td>
                          <Table.Td>{user.email}</Table.Td>
                          <Table.Td>
                            {canManageUsers ? (
                              <Group gap="md" wrap="wrap">
                                {ROLE_OPTIONS.map((role) => (
                                  <Checkbox
                                    key={`${user.id}_${role}`}
                                    checked={draft.roles.includes(role)}
                                    onChange={() => toggleDraftRole(user.id, role)}
                                    label={roleLabels[role]}
                                  />
                                ))}
                              </Group>
                            ) : (
                              <Group gap="xs" wrap="wrap">
                                {user.roles.map((role) => (
                                  <Badge key={`${user.id}_${role}`} variant="light">
                                    {roleLabels[role]}
                                  </Badge>
                                ))}
                              </Group>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {draft.isActive ? t.operationsUsersActiveYes : t.operationsUsersActiveNo}
                          </Table.Td>
                          {canManageUsers ? (
                            <Table.Td>
                              <Group gap="xs" wrap="wrap">
                                <Button
                                  variant="default"
                                  size="xs"
                                  onClick={() => void handleSaveRoles(user.id)}
                                >
                                  {t.operationsUsersSaveRolesAction}
                                </Button>
                                <Button
                                  variant="default"
                                  size="xs"
                                  onClick={() => void handleToggleActive(user.id)}
                                >
                                  {t.operationsUsersToggleActiveAction}
                                </Button>
                              </Group>
                            </Table.Td>
                          ) : null}
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>
        ) : null}
      </Stack>
    </Container>
  );
}
