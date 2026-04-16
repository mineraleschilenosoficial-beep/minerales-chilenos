import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@mantine/core/styles.css";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "Minerales Chilenos",
  description: "B2B mining supplier directory for Chile."
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
