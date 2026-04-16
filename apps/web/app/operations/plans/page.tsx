"use client";

import { Container, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { UserRole } from "@minerales/types";
import { fetchAdminPlansSummary } from "@/modules/directory/services/directory-api.service";
import { directoryTranslations, resolveFormattingLocale } from "@/modules/i18n/directory-translations";
import { OperationsFeedback } from "@/modules/operations/operations-feedback";
import { OperationsShell } from "@/modules/operations/operations-shell";
import { useOperationFeedback } from "@/modules/operations/use-operation-feedback";
import { useOperationsSession } from "@/modules/operations/use-operations-session";

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
    <Container size="md" py="lg" className="ops-page">
      <Stack gap="sm">
        <Title order={1} className="ops-heading">
          {t.operationsPlansTitle}
        </Title>
        <Text className="ops-subtitle">{t.operationsPlansSubtitle}</Text>

        <OperationsShell locale={locale} setLocale={setLocale} onAuthChange={handleAuthChange} />
        <OperationsFeedback feedback={feedback} />
        {isAuthenticated && !canViewPlans ? <Text>{t.operationsNoAccess}</Text> : null}

        {isAuthenticated && canViewPlans && summary ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
            <Paper withBorder p="md" className="ops-panel ops-kpi">
              <Text size="xs" c="dimmed">
                {t.operationsPlansPremium}
              </Text>
              <Title order={2} className="ops-kpi-value">{summary.premiumCompanies}</Title>
            </Paper>
            <Paper withBorder p="md" className="ops-panel ops-kpi">
              <Text size="xs" c="dimmed">
                {t.operationsPlansStandard}
              </Text>
              <Title order={2} className="ops-kpi-value">{summary.standardCompanies}</Title>
            </Paper>
            <Paper withBorder p="md" className="ops-panel ops-kpi">
              <Text size="xs" c="dimmed">
                {t.operationsPlansFree}
              </Text>
              <Title order={2} className="ops-kpi-value">{summary.freeCompanies}</Title>
            </Paper>
            <Paper withBorder p="md" className="ops-panel ops-kpi">
              <Text size="xs" c="dimmed">
                {t.operationsPlansTotal}
              </Text>
              <Title order={2} className="ops-kpi-value">{summary.totalCompanies}</Title>
            </Paper>
            <Paper withBorder p="md" className="ops-panel ops-kpi">
              <Text size="xs" c="dimmed">
                {t.operationsPlansProjectedRevenue}
              </Text>
              <Title order={2} className="ops-kpi-value">
                {summary.projectedMonthlyRevenueClp.toLocaleString(resolveFormattingLocale(locale))}
              </Title>
            </Paper>
          </SimpleGrid>
        ) : null}
      </Stack>
    </Container>
  );
}
