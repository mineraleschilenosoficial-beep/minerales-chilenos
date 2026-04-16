"use client";

import { Alert, Button, Container, Group, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchCurrentOperator,
  hasOperatorSession,
  loginOperator
} from "@/modules/directory/services/directory-api.service";
import { directoryTranslations } from "@/modules/i18n/directory-translations";
import { useOperationsSession } from "@/modules/operations/use-operations-session";

/**
 * @description Provides dedicated login screen for admin operations access.
 * @returns Admin login page.
 */
export default function OperationsLoginPage() {
  const router = useRouter();
  const { locale, setLocale, handleAuthChange } = useOperationsSession();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const t = directoryTranslations[locale];

  useEffect(() => {
    if (!hasOperatorSession()) {
      return;
    }

    void (async () => {
      try {
        const me = await fetchCurrentOperator();
        handleAuthChange({ isAuthenticated: true, currentUser: me });
        router.replace("/operations/dashboard");
      } catch {
        // keep user in login page if token is invalid
      }
    })();
  }, [handleAuthChange, router]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      await loginOperator(email, password);
      const me = await fetchCurrentOperator();
      handleAuthChange({ isAuthenticated: true, currentUser: me });
      router.replace("/operations/dashboard");
    } catch {
      setErrorMessage(t.operationsAuthLoginError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size={520} py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <Button size="xs" variant={locale === "es" ? "filled" : "light"} onClick={() => setLocale("es")}>
              {t.localeSpanish}
            </Button>
            <Button size="xs" variant={locale === "en" ? "filled" : "light"} onClick={() => setLocale("en")}>
              {t.localeEnglish}
            </Button>
          </Group>
          <Button component={Link} href="/" size="xs" variant="default">
            {t.operationsAuthBackToDirectory}
          </Button>
        </Group>

        <Paper withBorder p="lg">
          <Stack gap="sm">
            <Title order={2}>{t.operationsAuthTitle}</Title>
            <Text c="dimmed">{t.operationsAuthSubtitle}</Text>
            <TextInput
              label={t.operationsAuthEmailLabel}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoFocus
            />
            <PasswordInput
              label={t.operationsAuthPasswordLabel}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button loading={submitting} onClick={() => void handleSubmit()}>
              {t.operationsAuthLoginAction}
            </Button>
            {errorMessage ? <Alert color="red">{errorMessage}</Alert> : null}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
