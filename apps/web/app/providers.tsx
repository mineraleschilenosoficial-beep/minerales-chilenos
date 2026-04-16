"use client";

import { MantineProvider, createTheme } from "@mantine/core";
import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
};

const appTheme = createTheme({
  primaryColor: "yellow",
  defaultRadius: "sm",
  fontFamily: "Barlow, system-ui, -apple-system, sans-serif",
  headings: {
    fontFamily: "Bebas Neue, Barlow, system-ui, sans-serif",
    fontWeight: "400"
  },
  components: {
    Button: {
      defaultProps: {
        radius: "sm"
      }
    },
    Paper: {
      defaultProps: {
        radius: "sm",
        bg: "var(--mc-color-surface-1)"
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
