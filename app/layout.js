import Script from "next/script";
import "./globals.css";

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
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.0/dist/MarkerCluster.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.0/dist/MarkerCluster.Default.css"
        />
        <link rel="stylesheet" href="/assets/site.css" />
      </head>
      <body className="bg-neutral-950 text-neutral-100 antialiased" suppressHydrationWarning>
        {children}
        <Script id="runtime-config" strategy="beforeInteractive">
          {`window.__RUNTIME_CONFIG__ = { API_BASE_URL: ${JSON.stringify(apiBaseUrl)} };`}
        </Script>
        <Script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://unpkg.com/leaflet.markercluster@1.5.0/dist/leaflet.markercluster.js"
          strategy="afterInteractive"
        />
        <Script src="/assets/config.js" strategy="afterInteractive" />
        <Script src="/assets/app.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
