"use client";

import type { OperationFeedback } from "./use-operation-feedback";
import styles from "./operations-feedback.module.css";

type OperationsFeedbackProps = {
  feedback: OperationFeedback | null;
};

/**
 * Shared feedback renderer for operations screens.
 */
export function OperationsFeedback({ feedback }: OperationsFeedbackProps) {
  if (!feedback) {
    return null;
  }

  return (
    <p className={`${styles.feedback} ${feedback.isError ? styles.error : styles.success}`}>
      {feedback.message}
    </p>
  );
}
