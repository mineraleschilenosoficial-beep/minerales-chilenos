"use client";

import { useState } from "react";

export type OperationFeedback = {
  isError: boolean;
  message: string;
};

/**
 * Shared feedback state helper for operations screens.
 */
export function useOperationFeedback() {
  const [feedback, setFeedback] = useState<OperationFeedback | null>(null);

  return {
    feedback,
    clearFeedback: () => setFeedback(null),
    setErrorFeedback: (message: string) => setFeedback({ isError: true, message }),
    setSuccessFeedback: (message: string) => setFeedback({ isError: false, message })
  };
}
