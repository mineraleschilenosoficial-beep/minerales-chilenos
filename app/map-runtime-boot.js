"use client";

import { useEffect } from "react";

function loadScriptOnce(src, key, timeoutMs = 15000) {
  const attr = `data-map-runtime-${key}`;
  const existing = document.querySelector(`script[${attr}="1"]`);
  if (existing) {
    if (existing.getAttribute("data-loaded") === "true") {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`timeout loading ${src}`));
      }, timeoutMs);
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`failed to load ${src}`)), { once: true });
      existing.addEventListener("load", () => clearTimeout(timeoutId), { once: true });
      existing.addEventListener("error", () => clearTimeout(timeoutId), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute(attr, "1");
    const timeoutId = setTimeout(() => {
      reject(new Error(`timeout loading ${src}`));
    }, timeoutMs);
    script.addEventListener("load", () => {
      clearTimeout(timeoutId);
      script.setAttribute("data-loaded", "true");
      resolve();
    }, { once: true });
    script.addEventListener("error", () => {
      clearTimeout(timeoutId);
      reject(new Error(`failed to load ${src}`));
    }, { once: true });
    document.body.appendChild(script);
  });
}

function releaseInitialLoadingWithError(message) {
  document.body.classList.remove("app-loading");
  const overlay = document.getElementById("global-loading");
  if (overlay) {
    overlay.classList.remove("is-active");
    overlay.setAttribute("aria-hidden", "true");
  }
  const status = document.getElementById("status");
  if (status) {
    status.textContent = message;
  }
}

export default function MapRuntimeBoot() {
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const leafletModule = await import("leaflet");
      const L = leafletModule.default || leafletModule;
      window.L = L;
      await import("leaflet.markercluster");
      if (typeof L.markerClusterGroup !== "function") {
        throw new Error("leaflet.markercluster loaded but markerClusterGroup is missing");
      }
      window.L = L;
      if (cancelled) return;
      await loadScriptOnce("/assets/config.js", "config");
      if (cancelled) return;
      await loadScriptOnce("/assets/app.js", "app");
    };

    boot().catch((error) => {
      console.error("map runtime bootstrap failed", error);
      if (!cancelled) {
        releaseInitialLoadingWithError("No fue posible inicializar el mapa (Leaflet/MarkerCluster). Recarga la página.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
