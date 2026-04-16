"use client";

import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CompanyRequest, ReviewCompanyRequestInput } from "@minerales/contracts";
import { UserRole } from "@minerales/types";
import {
  downloadCompanyRequestsCsv,
  fetchCompanyRequests,
  reviewCompanyRequest
} from "@/modules/directory/services/directory-api.service";
import {
  directoryTranslations,
  resolveFormattingLocale
} from "@/modules/i18n/directory-translations";
import { OperationsFeedback } from "@/modules/operations/operations-feedback";
import { useOperationFeedback } from "@/modules/operations/use-operation-feedback";
import { OperationsShell } from "@/modules/operations/operations-shell";
import { useOperationsSession } from "@/modules/operations/use-operations-session";

type RequestReviewDraft = {
  status: ReviewCompanyRequestInput["status"];
  reviewNotes: string;
};

type RejectConfirmationState = {
  requestId: string;
  reviewNotes: string;
};

function getEditableStatus(
  status: CompanyRequest["status"]
): ReviewCompanyRequestInput["status"] {
  if (status === "pending") {
    return "under_review";
  }

  return status;
}

function getStatusBadgeColor(status: CompanyRequest["status"]): string {
  switch (status) {
    case "under_review":
      return "blue";
    case "approved":
      return "green";
    case "rejected":
      return "red";
    default:
      return "yellow";
  }
}

export default function OperationsRequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, setLocale, isAuthenticated, currentUser, handleAuthChange } = useOperationsSession();
  const [statusFilter, setStatusFilter] = useState<CompanyRequest["status"] | "all">("all");
  const [createdAtOrder, setCreatedAtOrder] = useState<"newest" | "oldest">("newest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string>("");
  const [pageSize] = useState<number>(8);
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, RequestReviewDraft>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [applyingRequestId, setApplyingRequestId] = useState<string | null>(null);
  const [rejectConfirmation, setRejectConfirmation] = useState<RejectConfirmationState | null>(null);
  const [filtersHydrated, setFiltersHydrated] = useState<boolean>(false);
  const hasFilterResetInitialized = useRef<boolean>(false);
  const loadSequenceRef = useRef<number>(0);
  const { feedback, clearFeedback, setErrorFeedback, setSuccessFeedback } = useOperationFeedback();
  const t = directoryTranslations[locale];
  const canOperateRequests =
    currentUser?.roles.includes(UserRole.SUPER_ADMIN) || currentUser?.roles.includes(UserRole.STAFF);
  const reviewStatusOptions = [
    { value: "under_review", label: t.operationsStatusOptionUnderReview },
    { value: "approved", label: t.operationsStatusOptionApproved },
    { value: "rejected", label: t.operationsStatusOptionRejected }
  ];

  const statusLabels = useMemo(
    () => ({
      pending: t.operationsStatusPending,
      under_review: t.operationsStatusUnderReview,
      approved: t.operationsStatusApproved,
      rejected: t.operationsStatusRejected
    }),
    [t]
  );

  useEffect(() => {
    const statusParam = searchParams.get("status");
    const orderParam = searchParams.get("createdAtOrder");
    const searchParam = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const requestIdParam = searchParams.get("requestId");

    if (
      statusParam === "pending" ||
      statusParam === "under_review" ||
      statusParam === "approved" ||
      statusParam === "rejected" ||
      statusParam === "all"
    ) {
      setStatusFilter(statusParam);
    } else {
      setStatusFilter("all");
    }

    if (orderParam === "newest" || orderParam === "oldest") {
      setCreatedAtOrder(orderParam);
    } else {
      setCreatedAtOrder("newest");
    }

    if (searchParam) {
      setSearchQuery(searchParam);
    } else {
      setSearchQuery("");
    }

    if (pageParam) {
      const parsedPage = Number.parseInt(pageParam, 10);
      if (!Number.isNaN(parsedPage) && parsedPage > 0) {
        setCurrentPage(parsedPage);
      } else {
        setCurrentPage(1);
      }
    } else {
      setCurrentPage(1);
    }

    if (requestIdParam && requestIdParam.length > 0) {
      setHighlightedRequestId(requestIdParam);
    } else {
      setHighlightedRequestId("");
    }

    setFiltersHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    const nextParams = new URLSearchParams();
    if (statusFilter !== "all") {
      nextParams.set("status", statusFilter);
    }
    if (createdAtOrder !== "newest") {
      nextParams.set("createdAtOrder", createdAtOrder);
    }
    if (searchQuery.trim().length > 0) {
      nextParams.set("search", searchQuery.trim());
    }
    if (currentPage > 1) {
      nextParams.set("page", String(currentPage));
    }
    if (highlightedRequestId.length > 0) {
      nextParams.set("requestId", highlightedRequestId);
    }

    const nextQuery = nextParams.toString();
    const targetUrl = nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
    router.replace(targetUrl, { scroll: false });
  }, [
    createdAtOrder,
    currentPage,
    filtersHydrated,
    highlightedRequestId,
    pathname,
    router,
    searchQuery,
    statusFilter
  ]);

  const loadRequests = useCallback(async () => {
    if (!isAuthenticated || !canOperateRequests) {
      return;
    }

    if (!filtersHydrated) {
      return;
    }

    const currentSequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = currentSequence;
    setLoading(true);
    try {
      const payload = await fetchCompanyRequests({
        status: statusFilter,
        createdAtOrder,
        search: searchQuery,
        page: currentPage,
        pageSize
      });
      if (currentSequence !== loadSequenceRef.current) {
        return;
      }
      setRequests(payload.items);
      setTotalPages(payload.totalPages);
      setTotalResults(payload.total);
      setReviewDrafts((currentDrafts) => {
        const nextDrafts: Record<string, RequestReviewDraft> = {};
        for (const request of payload.items) {
          const existing = currentDrafts[request.id];
          nextDrafts[request.id] = existing ?? {
            status: getEditableStatus(request.status),
            reviewNotes: request.reviewNotes ?? ""
          };
        }

        return nextDrafts;
      });
    } catch {
      if (currentSequence !== loadSequenceRef.current) {
        return;
      }
      setRequests([]);
      setTotalPages(0);
      setTotalResults(0);
      setErrorFeedback(t.operationsErrorFeedback);
    } finally {
      if (currentSequence === loadSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [
    createdAtOrder,
    currentPage,
    filtersHydrated,
    pageSize,
    searchQuery,
    statusFilter,
    canOperateRequests,
    t.operationsErrorFeedback
  ]);


  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }
    if (!hasFilterResetInitialized.current) {
      hasFilterResetInitialized.current = true;
      return;
    }
    setCurrentPage(1);
  }, [createdAtOrder, filtersHydrated, searchQuery, statusFilter]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(resolveFormattingLocale(locale), {
        dateStyle: "medium",
        timeStyle: "short"
      }),
    [locale]
  );

  const executeReview = async (
    requestId: string,
    status: ReviewCompanyRequestInput["status"],
    reviewNotes: string
  ) => {
    if (!canOperateRequests) {
      return;
    }

    const draft = reviewDrafts[requestId];
    if (!draft && reviewNotes.length === 0) {
      return;
    }

    setApplyingRequestId(requestId);
    clearFeedback();
    try {
      await reviewCompanyRequest(requestId, {
        status,
        reviewNotes: reviewNotes.trim() || undefined
      });
      setSuccessFeedback(t.operationsSuccessFeedback);
      await loadRequests();
    } catch {
      setErrorFeedback(t.operationsErrorFeedback);
    } finally {
      setApplyingRequestId(null);
    }
  };

  const handleApplyReview = async (requestId: string) => {
    const draft = reviewDrafts[requestId];
    if (!draft) {
      return;
    }

    await executeReview(requestId, draft.status, draft.reviewNotes);
  };

  const handleConfirmReject = async () => {
    if (!rejectConfirmation) {
      return;
    }

    await executeReview(rejectConfirmation.requestId, "rejected", rejectConfirmation.reviewNotes);
    setRejectConfirmation(null);
  };

  const handleExportCsv = async () => {
    if (!canOperateRequests) {
      return;
    }

    setExporting(true);
    clearFeedback();
    try {
      await downloadCompanyRequestsCsv({
        status: statusFilter,
        createdAtOrder,
        search: searchQuery
      });

      setSuccessFeedback(t.operationsExportSuccessFeedback);
    } catch {
      setErrorFeedback(t.operationsExportErrorFeedback);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Container size="lg" py="lg" className="ops-page">
      <Stack gap="sm">
        <Title order={1} className="ops-heading">
          {t.operationsTitle}
        </Title>
        <Text className="ops-subtitle">{t.operationsSubtitle}</Text>

        <OperationsShell
          locale={locale}
          setLocale={setLocale}
          onAuthChange={handleAuthChange}
        />

        {isAuthenticated && canOperateRequests ? (
          <Group align="end" gap="sm" wrap="wrap" className="ops-toolbar">
            <Button onClick={() => void loadRequests()}>
              {t.operationsRefresh}
            </Button>
            <Button variant="default" loading={exporting} onClick={() => void handleExportCsv()}>
              {exporting ? t.operationsExportingCsvAction : t.operationsExportCsvAction}
            </Button>
            <TextInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.operationsSearchPlaceholder}
              w={{ base: "100%", sm: 280 }}
            />
            <Select
              value={statusFilter}
              onChange={(value) => {
                if (
                  value === "all" ||
                  value === "pending" ||
                  value === "under_review" ||
                  value === "approved" ||
                  value === "rejected"
                ) {
                  setStatusFilter(value);
                }
              }}
              data={[
                { value: "all", label: t.operationsFilterStatusAll },
                { value: "pending", label: t.operationsStatusPending },
                { value: "under_review", label: t.operationsStatusUnderReview },
                { value: "approved", label: t.operationsStatusApproved },
                { value: "rejected", label: t.operationsStatusRejected }
              ]}
              label={t.operationsFilterStatusLabel}
              w={{ base: "100%", sm: 220 }}
              allowDeselect={false}
            />
            <Select
              value={createdAtOrder}
              onChange={(value) => {
                if (value === "newest" || value === "oldest") {
                  setCreatedAtOrder(value);
                }
              }}
              data={[
                { value: "newest", label: t.operationsSortNewest },
                { value: "oldest", label: t.operationsSortOldest }
              ]}
              label={t.operationsSortLabel}
              w={{ base: "100%", sm: 180 }}
              allowDeselect={false}
            />
          </Group>
        ) : null}

        <OperationsFeedback feedback={feedback} />
        {isAuthenticated && !canOperateRequests ? <Text>{t.operationsNoAccess}</Text> : null}

        {isAuthenticated && canOperateRequests ? <Stack gap="sm">
          {loading ? <Paper withBorder p="md" className="ops-panel">{t.statsLoadingValue}</Paper> : null}
          {!loading && requests.length === 0 ? (
            <Paper withBorder p="md" className="ops-panel">{t.operationsEmptyState}</Paper>
          ) : null}
          {!loading
            ? requests.map((request) => {
                const draft = reviewDrafts[request.id] ?? {
                  status: getEditableStatus(request.status),
                  reviewNotes: request.reviewNotes ?? ""
                };
                const isApplying = applyingRequestId === request.id;

                return (
                  <Paper
                    withBorder
                    key={request.id}
                    p="md"
                    className="ops-panel"
                    style={
                      request.id === highlightedRequestId
                        ? { borderColor: "var(--mantine-color-yellow-6)" }
                        : undefined
                    }
                  >
                    <Stack gap="sm">
                      <Title order={3}>{request.name}</Title>
                      <Stack gap={4}>
                        <Text size="sm" c="dimmed">
                          {request.email}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {request.phone}
                        </Text>
                        <Text size="sm" c="dimmed">
                        {request.city}, {request.region}
                        </Text>
                        <Badge variant="light" color={getStatusBadgeColor(request.status)} w="fit-content">
                          {statusLabels[request.status]}
                        </Badge>
                        <Text size="sm" c="dimmed">
                        {t.operationsCreatedAtLabel}: {dateFormatter.format(new Date(request.createdAt))}
                        </Text>
                      </Stack>

                      <Select
                        value={draft.status}
                        onChange={(value) =>
                          setReviewDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [request.id]: {
                              ...draft,
                              status:
                                value === "under_review" || value === "approved" || value === "rejected"
                                  ? value
                                  : draft.status
                            }
                          }))
                        }
                        data={reviewStatusOptions}
                        label={t.operationsStatusLabel}
                        allowDeselect={false}
                      />

                      <Textarea
                        rows={3}
                      value={draft.reviewNotes}
                      onChange={(event) =>
                        setReviewDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [request.id]: {
                            ...draft,
                            reviewNotes: event.target.value
                          }
                        }))
                      }
                      label={t.operationsNotesLabel}
                    />
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                          {t.operationsLatestReviewNotesLabel}
                        </Text>
                        <Text size="sm" c="dimmed">
                        {request.reviewNotes && request.reviewNotes.trim().length > 0
                          ? request.reviewNotes
                          : t.operationsNoReviewNotes}
                        </Text>
                      </Stack>

                    <Group gap="xs" wrap="wrap">
                      <Button
                        variant="default"
                        size="xs"
                        disabled={isApplying}
                        onClick={() => void executeReview(request.id, "under_review", draft.reviewNotes)}
                      >
                        {t.operationsStatusOptionUnderReview}
                      </Button>
                      <Button
                        variant="default"
                        size="xs"
                        disabled={isApplying}
                        onClick={() => void executeReview(request.id, "approved", draft.reviewNotes)}
                      >
                        {t.operationsStatusOptionApproved}
                      </Button>
                      <Button
                        variant="default"
                        size="xs"
                        disabled={isApplying}
                        onClick={() =>
                          setRejectConfirmation({
                            requestId: request.id,
                            reviewNotes: draft.reviewNotes
                          })
                        }
                      >
                        {t.operationsStatusOptionRejected}
                      </Button>
                    </Group>

                      <Button
                        disabled={isApplying}
                        onClick={() => void handleApplyReview(request.id)}
                      >
                        {isApplying ? t.operationsApplyingAction : t.operationsApplyAction}
                      </Button>
                    </Stack>
                  </Paper>
                );
              })
            : null}
        </Stack> : null}
        {isAuthenticated && canOperateRequests ? <Group gap="sm" wrap="wrap">
          <Button
            variant="default"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={loading || currentPage <= 1}
          >
            {t.operationsPaginationPrev}
          </Button>
          <Text size="sm" c="dimmed">
            {t.operationsPaginationPage} {totalPages === 0 ? 0 : currentPage}/{totalPages}
          </Text>
          <Text size="sm" c="dimmed">
            {t.operationsTotalResultsLabel}: {totalResults}
          </Text>
          <Button
            variant="default"
            onClick={() => setCurrentPage((page) => Math.min(totalPages || 1, page + 1))}
            disabled={loading || totalPages === 0 || currentPage >= totalPages}
          >
            {t.operationsPaginationNext}
          </Button>
        </Group> : null}
      </Stack>
      {rejectConfirmation ? (
        <Paper
          withBorder
          p="md"
          className="ops-panel ops-floating"
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 1000,
            maxWidth: 420
          }}
        >
          <Stack gap="sm">
            <Title order={4}>{t.operationsRejectConfirmTitle}</Title>
            <Text size="sm" c="dimmed">
              {t.operationsRejectConfirmMessage}
            </Text>
            <Group gap="xs" justify="flex-end">
              <Button variant="default" onClick={() => setRejectConfirmation(null)}>
                {t.operationsRejectCancelAction}
              </Button>
              <Button color="red" onClick={() => void handleConfirmReject()}>
                {t.operationsRejectConfirmAction}
              </Button>
            </Group>
          </Stack>
        </Paper>
      ) : null}
    </Container>
  );
}
