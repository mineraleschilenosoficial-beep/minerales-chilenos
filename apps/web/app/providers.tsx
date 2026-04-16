"use client";

import { MantineProvider, createTheme } from "@mantine/core";
import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
};

const appTheme = createTheme({
  primaryColor: "yellow",
  defaultRadius: "md",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  components: {
    Button: {
      defaultProps: {
        radius: "md"
      }
    },
    Paper: {
      defaultProps: {
        radius: "md"
      }
    }
  }
});

/**
 * @description Registers global client-side providers and shared Mantine theme.
 * @param children App subtree rendered within provider boundaries.
 * @returns React tree wrapped by MantineProvider.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <MantineProvider theme={appTheme} defaultColorScheme="dark">
      {children}
    </MantineProvider>
  );
}
