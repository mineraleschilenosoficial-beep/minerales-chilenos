"use client";

import { MantineProvider, createTheme } from "@mantine/core";
import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
};

const appTheme = createTheme({
  primaryColor: "yellow"
});

/**
 * Registers global client-side providers for the web app.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <MantineProvider theme={appTheme} defaultColorScheme="dark">
      {children}
    </MantineProvider>
  );
}
