"use client";

import { Alert, Button, Container, Group, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authLoginSchema } from "@minerales/contracts";
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
  const searchParams = useSearchParams();
  const { locale, setLocale, handleAuthChange } = useOperationsSession();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const t = directoryTranslations[locale];
  const nextPathParam = searchParams.get("next");
  const targetPath =
    nextPathParam && nextPathParam.startsWith("/operations/") && nextPathParam !== "/operations/login"
      ? nextPathParam
      : "/operations/dashboard";

  useEffect(() => {
    if (!hasOperatorSession()) {
      return;
    }

    void (async () => {
      try {
        const me = await fetchCurrentOperator();
        handleAuthChange({ isAuthenticated: true, currentUser: me });
        router.replace(targetPath);
      } catch {
        // keep user in login page if token is invalid
      }
    })();
  }, [handleAuthChange, router, targetPath]);

  const handleSubmit = async () => {
    const parsedLogin = authLoginSchema.safeParse({ email, password });
    if (!parsedLogin.success) {
      const nextFieldErrors: { email?: string; password?: string } = {};
      for (const issue of parsedLogin.error.issues) {
        const pathKey = issue.path[0];
        if (pathKey !== "email" && pathKey !== "password") {
          continue;
        }

        if (issue.code === "invalid_string" && issue.validation === "email") {
          nextFieldErrors.email = t.formErrorInvalidEmail;
          continue;
        }

        if (issue.code === "too_small" && issue.minimum === 8) {
          nextFieldErrors.password = t.formErrorMinChars8;
          continue;
        }

        nextFieldErrors[pathKey] = t.formErrorRequired;
      }

      setFieldErrors(nextFieldErrors);
      setErrorMessage("");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setFieldErrors({});
    try {
      await loginOperator(email, password);
      const me = await fetchCurrentOperator();
      handleAuthChange({ isAuthenticated: true, currentUser: me });
      router.replace(targetPath);
    } catch {
      setErrorMessage(t.operationsAuthLoginError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size={520} py={{ base: "md", sm: "xl" }} className="ops-page">
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

        <Paper withBorder p="lg" className="ops-panel">
          <Stack gap="sm">
            <Title order={2} className="ops-heading">
              {t.operationsAuthTitle}
            </Title>
            <Text className="ops-subtitle">{t.operationsAuthSubtitle}</Text>
            <TextInput
              label={t.operationsAuthEmailLabel}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
              type="email"
              error={fieldErrors.email}
              autoFocus
            />
            <PasswordInput
              label={t.operationsAuthPasswordLabel}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }}
              error={fieldErrors.password}
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
