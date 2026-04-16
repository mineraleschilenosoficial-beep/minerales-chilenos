"use client";

import { useState } from "react";

export type OperationFeedback = {
  isError: boolean;
  message: string;
};

/**
 * @description Exposes operation feedback state and helper mutators.
 * @returns Feedback state plus helper actions to clear, set success and set error messages.
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
