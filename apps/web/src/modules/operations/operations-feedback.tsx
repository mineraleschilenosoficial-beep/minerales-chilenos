"use client";

import { Alert } from "@mantine/core";
import type { OperationFeedback } from "./use-operation-feedback";

type OperationsFeedbackProps = {
  feedback: OperationFeedback | null;
};

/**
 * @description Renders shared operation feedback using Mantine alert styles.
 * @param feedback Nullable feedback payload.
 * @returns Alert component when feedback exists.
 */
export function OperationsFeedback({ feedback }: OperationsFeedbackProps) {
  if (!feedback) {
    return null;
  }

  return (
    <Alert color={feedback.isError ? "red" : "green"} variant="light">
      {feedback.message}
    </Alert>
  );
}
