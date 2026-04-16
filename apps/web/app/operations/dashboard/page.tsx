"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title
} from "@mantine/core";
import Link from "next/link";
import { UserRole } from "@minerales/types";
import { fetchAdminDashboard } from "@/modules/directory/services/directory-api.service";
import { directoryTranslations } from "@/modules/i18n/directory-translations";
import { OperationsFeedback } from "@/modules/operations/operations-feedback";
import { OperationsShell } from "@/modules/operations/operations-shell";
import { useOperationFeedback } from "@/modules/operations/use-operation-feedback";
import { useOperationsSession } from "@/modules/operations/use-operations-session";

export default function OperationsDashboardPage() {
  const { locale, setLocale, isAuthenticated, currentUser, handleAuthChange } = useOperationsSession();
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminDashboard>> | null>(null);
  const { feedback, clearFeedback, setErrorFeedback } = useOperationFeedback();
  const t = directoryTranslations[locale];
  const requestStatusLabels = {
    pending: t.operationsStatusPending,
    under_review: t.operationsStatusUnderReview,
    approved: t.operationsStatusApproved,
    rejected: t.operationsStatusRejected
  };
  const categoryIcons = {
    laboratory: "🔬",
    consulting: "📋",
    equipment: "⚙️",
    explosives: "💥",
    safety: "🦺",
    transport: "🚛",
    software: "💻",
    engineering: "🏗️"
  } as const;

  const toWhatsAppLink = (phone: string, companyName: string): string => {
    const digits = phone.replace(/\D/g, "");
    const message = t.operationsDashboardWhatsAppTemplate.replace("{name}", companyName);
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
    <Container size="lg" py="lg" className="ops-page">
      <Stack gap="sm">
        <Title order={1} className="ops-heading">
          {t.operationsDashboardTitle}
        </Title>
        <Text className="ops-subtitle">{t.operationsDashboardSubtitle}</Text>

        <OperationsShell locale={locale} setLocale={setLocale} onAuthChange={handleAuthChange} />
        <OperationsFeedback feedback={feedback} />
        {isAuthenticated && !canViewDashboard ? <Text>{t.operationsNoAccess}</Text> : null}

        {isAuthenticated && canViewDashboard && data ? (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
              <Paper withBorder p="md" className="ops-panel ops-kpi">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    {t.operationsDashboardActiveCompanies}
                  </Text>
                  <Button
                    component={Link}
                    href="/operations/companies?status=active"
                    variant="subtle"
                    justify="start"
                    px={0}
                    className="ops-kpi-value"
                  >
                    {data.activeCompanies}
                  </Button>
                </Stack>
              </Paper>
              <Paper withBorder p="md" className="ops-panel ops-kpi">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    {t.operationsDashboardPendingRequests}
                  </Text>
                  <Button
                    component={Link}
                    href="/operations/requests?status=pending"
                    variant="subtle"
                    justify="start"
                    px={0}
                    className="ops-kpi-value"
                  >
                    {data.pendingRequests}
                  </Button>
                </Stack>
              </Paper>
              <Paper withBorder p="md" className="ops-panel ops-kpi">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    {t.operationsDashboardPremiumCompanies}
                  </Text>
                  <Button
                    component={Link}
                    href="/operations/companies?plan=premium"
                    variant="subtle"
                    justify="start"
                    px={0}
                    className="ops-kpi-value"
                  >
                    {data.premiumCompanies}
                  </Button>
                </Stack>
              </Paper>
              <Paper withBorder p="md" className="ops-panel ops-kpi">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    {t.operationsDashboardStandardCompanies}
                  </Text>
                  <Button
                    component={Link}
                    href="/operations/companies?plan=standard"
                    variant="subtle"
                    justify="start"
                    px={0}
                    className="ops-kpi-value"
                  >
                    {data.standardCompanies}
                  </Button>
                </Stack>
              </Paper>
            </SimpleGrid>

            <Paper withBorder p="md" mt="sm" className="ops-panel">
              <Title order={3} mb="sm">
                {t.operationsDashboardRecentRequests}
              </Title>
              <Table.ScrollContainer minWidth={720}>
                <Table striped highlightOnHover withTableBorder className="ops-table">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t.operationsUsersTableName}</Table.Th>
                      <Table.Th>{t.operationsUsersTableEmail}</Table.Th>
                      <Table.Th>{t.operationsStatusLabel}</Table.Th>
                      <Table.Th>{t.operationsApplyAction}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.requestsRecent.map((request) => (
                      <Table.Tr key={request.id}>
                        <Table.Td>{request.name}</Table.Td>
                        <Table.Td>{request.email}</Table.Td>
                        <Table.Td>
                          <Badge variant="light">{requestStatusLabels[request.status]}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="wrap">
                            <Button
                              component={Link}
                              href={`/operations/requests?search=${encodeURIComponent(request.name)}&requestId=${request.id}`}
                              size="xs"
                              variant="light"
                            >
                              {t.operationsDashboardOpenRequestAction}
                            </Button>
                            <Button
                              component="a"
                              href={toWhatsAppLink(request.phone, request.name)}
                              target="_blank"
                              rel="noreferrer"
                              size="xs"
                              variant="light"
                            >
                              {t.operationsDashboardWhatsAppAction}
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>

            <Paper withBorder p="md" mt="sm" className="ops-panel">
              <Title order={3} mb="sm">
                {t.operationsDashboardCategoryBreakdown}
              </Title>
              <Table.ScrollContainer minWidth={480}>
                <Table striped highlightOnHover withTableBorder className="ops-table">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t.formCategoryLabel}</Table.Th>
                      <Table.Th>{t.operationsTotalResultsLabel}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.byCategory.map((item) => (
                      <Table.Tr key={item.category}>
                        <Table.Td>
                          <Button
                            component={Link}
                            href={`/operations/companies?category=${item.category}`}
                            size="xs"
                            variant="subtle"
                            px={0}
                          >
                            {(categoryIcons[item.category] ?? "⛏️") + " " + t.categories[item.category]}
                          </Button>
                        </Table.Td>
                        <Table.Td>{item.total}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          </>
        ) : null}

        {isAuthenticated && canViewDashboard && loading ? <Text>{t.statsLoadingValue}</Text> : null}
      </Stack>
    </Container>
  );
}
