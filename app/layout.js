import Script from "next/script";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "tom-select/dist/css/tom-select.css";
import MapRuntimeBoot from "./map-runtime-boot";

export const metadata = {
  metadataBase: new URL("https://www.mineraleschilenos.cl"),
  title: {
    default: "MineralesChilenos.cl | Mapa Minero Interactivo de Chile",
    template: "%s | MineralesChilenos.cl",
  },
  description:
    "Explora el mapa minero interactivo de Chile con yacimientos y concesiones, filtros por región/comuna/empresa y visualización georreferenciada.",
  applicationName: "MineralesChilenos.cl",
  keywords: [
    "mapa minero chile",
    "minería chile",
    "concesiones mineras chile",
    "yacimientos chile",
    "minerales chilenos",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "https://www.mineraleschilenos.cl/",
    siteName: "MineralesChilenos.cl",
    title: "MineralesChilenos.cl | Mapa Minero Interactivo de Chile",
    description:
      "Visualiza minas y concesiones en Chile con filtros avanzados por mineral, región, comuna y empresa.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MineralesChilenos.cl | Mapa Minero Interactivo de Chile",
    description:
      "Mapa georreferenciado de minas y concesiones en Chile, con filtros y exportación de datos.",
  },
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
