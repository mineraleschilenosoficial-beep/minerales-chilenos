import Script from "next/script";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "tom-select/dist/css/tom-select.css";
import MapRuntimeBoot from "./map-runtime-boot";

export const metadata = {
  title: "MineralesChilenos.cl - Mapa minero interactivo",
  description:
    "Mapa minero interactivo de Chile con yacimientos y concesiones disponibles.",
};

export default function RootLayout({ children }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/assets/site.css" />
      </head>
      <body className="bg-neutral-950 text-neutral-100 antialiased" suppressHydrationWarning>
        {children}
        <MapRuntimeBoot />
        <Script id="runtime-config" strategy="beforeInteractive">
          {`window.__RUNTIME_CONFIG__ = { API_BASE_URL: ${JSON.stringify(apiBaseUrl)} };`}
        </Script>
      </body>
    </html>
  );
}
