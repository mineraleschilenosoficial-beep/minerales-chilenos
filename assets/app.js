(function () {
  const cfg = window.APP_CONFIG || {};
  const DATA_URL = cfg.DATA_URL || "./data/yacimientos.json";
  const LINK_REPORT_URL = cfg.LINK_REPORT_URL || "./reports/link-check-report.json";
  const CACHE_KEY = cfg.CACHE_KEY || "mineraleschilenos:data:v1";
  const CACHE_TTL_MS = cfg.CACHE_TTL_MS || 1000 * 60 * 60 * 6;
  const MOBILE_SHEET_KEY = "mineraleschilenos:mobile-sheet-state";

  const FALLBACK_DATASET = {
    meta: {
      updatedAt: new Date().toISOString(),
      version: 0,
      source: "fallback-local"
    },
    items: [
      {
        id: 9001,
        nombre: "Punto de respaldo - Antofagasta",
        mineral: ["cobre"],
        lat: -23.65,
        lng: -70.4,
        region: "Antofagasta",
        tipo: "Referencia",
        empresa: "MineralesChilenos.cl",
        sup: "-",
        alt: "-",
        prod: "-",
        dotacion: "-",
        sueldos_promedio: "-",
        ingresos: "-",
        contrataciones_futuras: "-",
        noticias: "Carga en modo respaldo local.",
        web: "#",
        libre: false
      }
    ]
  };

  let map = null;
  let markerLayer = null;
  let mapEnabled = false;

  let allItems = [];
  let filtered = [];
  let onlyLibres = false;
  let mobileSheetState = "collapsed";
  let mobileSheetStateInitialized = false;
  const markerById = new Map();

  const els = {
    q: document.getElementById("q"),
    mineral: document.getElementById("f-mineral"),
    region: document.getElementById("f-region"),
    tipo: document.getElementById("f-tipo"),
    list: document.getElementById("list"),
    sourceLinks: document.getElementById("source-links"),
    status: document.getElementById("status"),
    topKpis: document.getElementById("topKpis"),
    btnLibres: document.getElementById("btn-libres"),
    btnReset: document.getElementById("btn-reset"),
    btnFit: document.getElementById("btn-fit"),
    btnMobilePanel: document.getElementById("btn-mobile-panel"),
    healthBadge: document.getElementById("health-badge"),
    mobileFilterBar: document.getElementById("mobile-filter-bar"),
    sidebar: document.getElementById("sidebar"),
    sheetGrab: document.querySelector(".sheet-grab"),
    mobileBackdrop: document.getElementById("mobile-backdrop"),
    mapContainer: document.getElementById("map"),
    modal: document.getElementById("detail-modal"),
    modalTitle: document.getElementById("modal-title"),
    modalContent: document.getElementById("modal-content"),
    modalClose: document.getElementById("btn-close-modal")
  };

  function colorFor(item) {
    if (item.libre) return "#2D7A4F";
    const m = ((item.mineral && item.mineral[0]) || "").toLowerCase();
    if (m.includes("litio")) return "#5B9BD5";
    if (m.includes("hierro")) return "#858585";
    return "#B87333";
  }

  function symbolFor(item) {
    if (item.libre) return "L";
    const m = ((item.mineral && item.mineral[0]) || "").toLowerCase();
    if (m.includes("litio")) return "Li";
    if (m.includes("hierro")) return "Fe";
    return "Cu";
  }

  function formatDate(iso) {
    if (!iso) return "-";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
  }

  function saveCache(payload) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), payload }));
    } catch {}
  }

  function loadFreshCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || !obj.payload) return null;
      if ((Date.now() - obj.ts) > CACHE_TTL_MS) return null;
      return obj.payload;
    } catch {
      return null;
    }
  }

  function loadAnyCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.payload) return null;
      return obj.payload;
    } catch {
      return null;
    }
  }

  async function loadData() {
    const freshCache = loadFreshCache();
    if (freshCache && Array.isArray(freshCache.items)) {
      window.__dataOrigin = "cache";
      return freshCache;
    }

    const candidates = [DATA_URL, "./data/yacimientos.json", "/data/yacimientos.json"];
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) continue;
        const json = await res.json();
        if (!json || !Array.isArray(json.items)) continue;
        saveCache(json);
        window.__dataOrigin = "remote";
        return json;
      } catch {}
    }

    const staleCache = loadAnyCache();
    if (staleCache && Array.isArray(staleCache.items)) {
      window.__dataOrigin = "cache-stale";
      return staleCache;
    }

    window.__dataOrigin = "fallback";
    return FALLBACK_DATASET;
  }

  function setTopKpis(meta, items) {
    const libres = items.filter((x) => x.libre).length;
    const activos = items.length - libres;
    els.topKpis.innerHTML = [
      `<div class="kpi">${items.length} puntos</div>`,
      `<div class="kpi">${activos} activos</div>`,
      `<div class="kpi">${libres} disponibles</div>`,
      `<div class="kpi">Actualizado: ${formatDate(meta && meta.updatedAt)}</div>`
    ].join("");
  }

  function setStatus(origin, shown, total, updatedAt) {
    const source = origin === "cache" ? "cache local"
      : origin === "cache-stale" ? "cache local (desactualizada)"
      : origin === "fallback" ? "respaldo local"
      : "fuente remota";
    els.status.textContent = `Mostrando ${shown} de ${total}. Fuente: ${source}. Ultima actualizacion: ${formatDate(updatedAt)}.`;
  }

  function setHealthBadge(statusClass, text) {
    if (!els.healthBadge) return;
    els.healthBadge.classList.remove("health-ok", "health-warn", "health-fail");
    els.healthBadge.classList.add(statusClass);
    els.healthBadge.textContent = text;
  }

  async function loadLinkHealth() {
    if (!els.healthBadge) return;
    setHealthBadge("", "Fuentes: revisando...");
    try {
      const res = await fetch(`${LINK_REPORT_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("report not available");
      const report = await res.json();
      const failed = Number(report.failed_count || 0);
      const warnings = Number(report.warning_count || 0);
      if (failed > 0) {
        setHealthBadge("health-fail", `Fuentes: ${failed} fallo(s)`);
      } else if (warnings > 0) {
        setHealthBadge("health-warn", `Fuentes: ${warnings} warning(s)`);
      } else {
        setHealthBadge("health-ok", "Fuentes: OK");
      }
    } catch {
      setHealthBadge("health-warn", "Fuentes: sin reporte");
    }
  }

  function fillSelect(selectEl, values, placeholder) {
    const options = [`<option value="">${placeholder}</option>`];
    Array.from(values).sort((a, b) => a.localeCompare(b)).forEach((v) => {
      options.push(`<option value="${v}">${v}</option>`);
    });
    selectEl.innerHTML = options.join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildMarker(item) {
    const html = [
      `<div class="marker-pin" style="background:${colorFor(item)}">`,
      `<span>${symbolFor(item)}</span>`,
      "</div>"
    ].join("");
    const icon = L.divIcon({ html, className: "", iconSize: [36, 36], iconAnchor: [18, 36] });
    const marker = L.marker([item.lat, item.lng], { icon });
    marker.on("click", () => openDetail(item));
    return marker;
  }

  function renderList() {
    if (!filtered.length) {
      els.list.innerHTML = '<div class="item"><div class="item-title">Sin resultados</div><div class="item-meta">Ajusta filtros o limpia busqueda.</div></div>';
      return;
    }

    els.list.innerHTML = filtered.map((x) => {
      return [
        `<article class="item" data-id="${x.id}">`,
        `<div class="item-title">${x.nombre}</div>`,
        `<div class="item-meta">${x.tipo} · ${x.region}</div>`,
        `<div class="item-meta">${(x.mineral || []).join(", ").toUpperCase()}</div>`,
        "</article>"
      ].join("");
    }).join("");

    els.list.querySelectorAll(".item[data-id]").forEach((node) => {
      node.addEventListener("click", () => {
        const id = Number(node.getAttribute("data-id"));
        const item = filtered.find((it) => it.id === id);
        if (!item) return;

        if (!mapEnabled || !map) {
          if (isMobileViewport()) {
            setMobilePanelOpen(false);
          }
          openDetail(item);
          return;
        }

        const marker = markerById.get(id);
        if (!marker) {
          openDetail(item);
          return;
        }

        map.flyTo([item.lat, item.lng], Math.max(7, map.getZoom()), { duration: 0.45 });
        marker.fire("click");
        if (isMobileViewport()) {
          setMobilePanelOpen(false);
        }
      });
    });
  }

  function renderMobileFilterBar() {
    if (!els.mobileFilterBar) return;

    const chips = [];
    chips.push(`<button type="button" class="mchip mchip--accent" data-action="open-panel">Filtros</button>`);
    chips.push(`<span class="mchip mchip--muted">${filtered.length} resultados</span>`);

    const q = els.q.value.trim();
    if (q) chips.push(`<span class="mchip">Buscar: ${escapeHtml(q)}</span>`);
    if (els.mineral.value) chips.push(`<span class="mchip">Mineral: ${escapeHtml(els.mineral.value)}</span>`);
    if (els.region.value) chips.push(`<span class="mchip">Region: ${escapeHtml(els.region.value)}</span>`);
    if (els.tipo.value) chips.push(`<span class="mchip">Tipo: ${escapeHtml(els.tipo.value)}</span>`);
    if (onlyLibres) chips.push(`<span class="mchip">Solo disponibles</span>`);

    const hasFilters = q || els.mineral.value || els.region.value || els.tipo.value || onlyLibres;
    if (hasFilters) {
      chips.push(`<button type="button" class="mchip" data-action="clear-filters">Limpiar</button>`);
    }

    els.mobileFilterBar.innerHTML = chips.join("");
    els.mobileFilterBar.querySelectorAll("[data-action='open-panel']").forEach((node) => {
      node.addEventListener("click", () => setMobilePanelOpen(true));
    });
    els.mobileFilterBar.querySelectorAll("[data-action='clear-filters']").forEach((node) => {
      node.addEventListener("click", () => {
        onlyLibres = false;
        els.btnLibres.classList.remove("btn-gold");
        els.q.value = "";
        els.mineral.value = "";
        els.region.value = "";
        els.tipo.value = "";
        applyFilters();
      });
    });
  }

  function renderSourceLinks(meta) {
    if (!els.sourceLinks) return;
    const fallbackSources = [
      {
        name: "Catastro Minero Nacional (SERNAGEOMIN)",
        url: "https://portalgeomin.sernageomin.cl/",
        note: "Consulta de pertenencias y catastro."
      },
      {
        name: "Concesiones Mineras (SERNAGEOMIN)",
        url: "https://www.sernageomin.cl/mineria-concesiones-mineras/",
        note: "Información oficial de concesiones."
      },
      {
        name: "CORFO - Litio",
        url: "https://www.corfo.cl/sites/cpp/convocatorias/litio-y-salares",
        note: "Programas y lineamientos públicos."
      }
    ];

    const sources = Array.isArray(meta && meta.sources) && meta.sources.length > 0
      ? meta.sources
      : fallbackSources;

    const html = sources
      .filter((src) => src && typeof src.url === "string" && src.url.startsWith("http"))
      .map((src) => {
        const name = escapeHtml(src.name || src.url);
        const url = escapeHtml(src.url);
        const note = src.note ? `<small>${escapeHtml(src.note)}</small>` : "";
        return `<a class="source-link" href="${url}" target="_blank" rel="noreferrer">${name}<small>${url}</small>${note}</a>`;
      })
      .join("");

    els.sourceLinks.innerHTML = html || '<div class="item-meta">Sin fuentes definidas.</div>';
  }

  function applyFilters() {
    const q = els.q.value.trim().toLowerCase();
    const fMineral = els.mineral.value;
    const fRegion = els.region.value;
    const fTipo = els.tipo.value;

    filtered = allItems.filter((x) => {
      if (onlyLibres && !x.libre) return false;
      if (fMineral && !(x.mineral || []).includes(fMineral)) return false;
      if (fRegion && x.region !== fRegion) return false;
      if (fTipo && x.tipo !== fTipo) return false;
      if (!q) return true;
      const haystack = `${x.nombre} ${x.region} ${x.empresa || ""} ${(x.mineral || []).join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });

    if (mapEnabled && markerLayer) {
      markerLayer.clearLayers();
      markerById.clear();
      filtered.forEach((x) => {
        const marker = buildMarker(x);
        markerById.set(x.id, marker);
        markerLayer.addLayer(marker);
      });
    }

    renderList();
    renderMobileFilterBar();
    setStatus(window.__dataOrigin || "remote", filtered.length, allItems.length, window.__dataUpdatedAt || null);
  }

  function fitToFiltered() {
    if (!mapEnabled || !map || !filtered.length) return;
    const bounds = L.latLngBounds(filtered.map((x) => [x.lat, x.lng]));
    map.fitBounds(bounds.pad(0.25), { animate: true, duration: 0.55 });
  }

  function showMapUnavailableNotice(message) {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;
    mapEl.innerHTML = [
      '<div style="height:100%;display:grid;place-items:center;padding:18px;">',
      '<div style="max-width:520px;text-align:center;border:1px solid rgba(255,255,255,.14);background:#141414;border-radius:14px;padding:18px;">',
      '<div style="font-weight:700;margin-bottom:8px;">Mapa no disponible en este entorno</div>',
      `<div style="color:#b8b8b8;font-size:14px;line-height:1.45;">${message}</div>`,
      "</div>",
      "</div>"
    ].join("");
  }

  function openDetail(item) {
    els.modalTitle.textContent = item.nombre;
    const mineralPills = (item.mineral || []).map((m) => {
      return `<span style="display:inline-block;background:${colorFor(item)};color:#111;padding:4px 10px;border-radius:999px;font-weight:700;margin-right:6px">${m.toUpperCase()}</span>`;
    }).join("");

    const freeSection = item.libre ? [
      '<div class="card" style="border-color:rgba(45,122,79,0.45);background:rgba(45,122,79,0.2)">',
      "<strong>Concesion disponible</strong><br>",
      `Potencial: ${item.potencial || "-"}<br>`,
      `Profundidad: ${item.prof || "-"}<br>`,
      `Ultimo estudio: ${(item.estudioFecha || "-")} ${(item.estudioFuente ? "· " + item.estudioFuente : "")}`,
      "</div>"
    ].join("") : "";

    const docs = Array.isArray(item.docs)
      ? item.docs.map((d) => `<a class="link-btn" style="margin-right:8px;background:#2b2b2b;color:#fff;border:1px solid var(--line)" href="${d.url}" target="_blank" rel="noreferrer">${d.n}</a>`).join("")
      : "";

    const webBtn = (item.web && item.web !== "#")
      ? `<a class="link-btn" href="${item.web}" target="_blank" rel="noreferrer">Ver pagina corporativa</a>`
      : "";

    els.modalContent.innerHTML = [
      `<div style="color:var(--gold);margin-bottom:10px">${item.tipo} · ${item.region}</div>`,
      `<div style="margin-bottom:12px">${mineralPills}</div>`,
      '<div class="card">',
      `Empresa: <strong>${item.empresa || "Disponible para concesion"}</strong><br>`,
      `Superficie: <strong>${item.sup || "-"}</strong><br>`,
      `Altitud: <strong>${item.alt || "-"}</strong><br>`,
      `Produccion: <strong>${item.prod || "-"}</strong>`,
      "</div>",
      '<div class="card">',
      `Dotacion: <strong>${item.dotacion || "-"}</strong><br>`,
      `Sueldos promedio: <strong>${item.sueldos_promedio || "-"}</strong><br>`,
      `Ingresos anuales: <strong>${item.ingresos || "-"}</strong><br>`,
      `Contrataciones futuras: <strong>${item.contrataciones_futuras || "-"}</strong>`,
      "</div>",
      freeSection,
      `<div class="card">${item.noticias || "Sin novedades por ahora."}</div>`,
      docs ? `<div style="margin-bottom:10px">${docs}</div>` : "",
      webBtn
    ].join("");

    els.modal.classList.add("open");
  }

  function closeModal() {
    els.modal.classList.remove("open");
  }

  function isMobileViewport() {
    return window.matchMedia("(max-width: 980px)").matches;
  }

  function loadPersistedMobileSheetState() {
    try {
      const saved = localStorage.getItem(MOBILE_SHEET_KEY);
      if (saved === "collapsed" || saved === "half" || saved === "full") {
        return saved;
      }
    } catch {}
    return "collapsed";
  }

  function persistMobileSheetState(state) {
    try {
      localStorage.setItem(MOBILE_SHEET_KEY, state);
    } catch {}
  }

  function setMobileSheetState(nextState) {
    if (!els.btnMobilePanel) return;
    mobileSheetState = nextState;
    const classes = ["mobile-sheet-collapsed", "mobile-sheet-half", "mobile-sheet-full"];
    document.body.classList.remove(...classes);
    document.body.classList.add(`mobile-sheet-${nextState}`);
    const isOpen = nextState !== "collapsed";
    els.btnMobilePanel.setAttribute("aria-expanded", isOpen ? "true" : "false");
    els.btnMobilePanel.textContent = isOpen ? "Cerrar panel" : "Panel";
    els.btnMobilePanel.setAttribute("aria-label", isOpen ? "Cerrar panel de filtros" : "Abrir panel de filtros");
    if (nextState === "full" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (isMobileViewport()) {
      persistMobileSheetState(nextState);
    }
    if (mapEnabled && map) {
      setTimeout(() => map.invalidateSize(), 120);
    }
  }

  function setMobilePanelOpen(isOpen) {
    setMobileSheetState(isOpen ? "half" : "collapsed");
  }

  function bindMobileSheetGestures() {
    if (!els.sheetGrab) return;
    let startY = 0;
    let moved = false;
    let startTs = 0;
    let lastY = 0;
    let lastTs = 0;
    let velocityY = 0;

    els.sheetGrab.addEventListener("pointerdown", (event) => {
      startY = event.clientY;
      moved = false;
      startTs = performance.now();
      lastY = event.clientY;
      lastTs = startTs;
      velocityY = 0;
    });

    els.sheetGrab.addEventListener("pointermove", (event) => {
      if (!startY) return;
      const delta = event.clientY - startY;
      if (Math.abs(delta) > 10) {
        moved = true;
      }
      const now = performance.now();
      const dt = Math.max(1, now - lastTs);
      const dy = event.clientY - lastY;
      velocityY = dy / dt;
      lastY = event.clientY;
      lastTs = now;
    });

    const handlePointerEnd = (event) => {
      if (!startY) return;
      const delta = event.clientY - startY;
      const elapsed = Math.max(1, performance.now() - startTs);
      const fastDown = velocityY > 0.75 || (delta > 42 && elapsed < 220);
      const fastUp = velocityY < -0.75 || (delta < -42 && elapsed < 220);

      if (!moved) {
        setMobileSheetState(mobileSheetState === "collapsed" ? "half" : "collapsed");
      } else if (fastDown || delta > 28) {
        if (mobileSheetState === "full") {
          setMobileSheetState("half");
        } else {
          setMobileSheetState("collapsed");
        }
      } else if (fastUp || delta < -28) {
        if (mobileSheetState === "collapsed") {
          setMobileSheetState("half");
        } else {
          setMobileSheetState("full");
        }
      }
      startY = 0;
      moved = false;
      startTs = 0;
      lastY = 0;
      lastTs = 0;
      velocityY = 0;
    };

    els.sheetGrab.addEventListener("pointerup", handlePointerEnd);
    els.sheetGrab.addEventListener("pointercancel", () => {
      startY = 0;
      moved = false;
      startTs = 0;
      lastY = 0;
      lastTs = 0;
      velocityY = 0;
    });
  }

  function wireUi() {
    ["input", "change"].forEach((evt) => {
      els.q.addEventListener(evt, applyFilters);
      els.mineral.addEventListener(evt, applyFilters);
      els.region.addEventListener(evt, applyFilters);
      els.tipo.addEventListener(evt, applyFilters);
    });

    els.btnLibres.addEventListener("click", () => {
      onlyLibres = !onlyLibres;
      els.btnLibres.classList.toggle("btn-gold", onlyLibres);
      applyFilters();
    });

    els.btnReset.addEventListener("click", () => {
      onlyLibres = false;
      els.btnLibres.classList.remove("btn-gold");
      els.q.value = "";
      els.mineral.value = "";
      els.region.value = "";
      els.tipo.value = "";
      applyFilters();
    });

    els.btnFit.addEventListener("click", fitToFiltered);
    els.modalClose.addEventListener("click", closeModal);

    if (els.btnMobilePanel) {
      els.btnMobilePanel.addEventListener("click", () => {
        setMobileSheetState(mobileSheetState === "collapsed" ? "half" : "collapsed");
      });
    }

    if (els.mobileBackdrop) {
      els.mobileBackdrop.addEventListener("click", () => setMobilePanelOpen(false));
    }

    if (els.mapContainer) {
      els.mapContainer.addEventListener("click", () => {
        if (isMobileViewport()) {
          setMobilePanelOpen(false);
        }
      });
    }

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setMobileSheetState("collapsed");
        closeModal();
      }
    });

    const syncMobileSheet = () => {
      if (isMobileViewport()) {
        if (!mobileSheetStateInitialized) {
          mobileSheetState = loadPersistedMobileSheetState();
          mobileSheetStateInitialized = true;
        }
        setMobileSheetState(mobileSheetState || "collapsed");
      } else {
        document.body.classList.remove("mobile-sheet-collapsed", "mobile-sheet-half", "mobile-sheet-full");
      }
    };
    window.addEventListener("resize", syncMobileSheet);
    syncMobileSheet();

    bindMobileSheetGestures();
  }

  function initMap() {
    if (!window.L) {
      throw new Error("Leaflet no esta disponible.");
    }

    map = L.map("map", { center: [-30.5, -70.2], zoom: 5, maxZoom: 19 });
    markerLayer = (typeof L.markerClusterGroup === "function")
      ? L.markerClusterGroup({ maxClusterRadius: 48, showCoverageOnHover: false })
      : L.layerGroup();
    map.addLayer(markerLayer);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    mapEnabled = true;
    setTimeout(() => map.invalidateSize(), 100);
    window.addEventListener("resize", () => map.invalidateSize());
  }

  async function bootstrap() {
    wireUi();
    els.status.textContent = "Inicializando visualizador...";
    void loadLinkHealth();

    try {
      initMap();
    } catch (mapError) {
      mapEnabled = false;
      showMapUnavailableNotice("Puedes navegar los datos desde el panel lateral. Revisa conexion o restricciones de CDN para habilitar el mapa.");
      console.error(mapError);
    }

    try {
      const payload = await loadData();
      allItems = payload.items;
      window.__dataUpdatedAt = payload.meta && payload.meta.updatedAt;

      const minerals = new Set(allItems.flatMap((x) => x.mineral || []));
      const regions = new Set(allItems.map((x) => x.region).filter(Boolean));
      const tipos = new Set(allItems.map((x) => x.tipo).filter(Boolean));

      fillSelect(els.mineral, minerals, "Todos");
      fillSelect(els.region, regions, "Todas");
      fillSelect(els.tipo, tipos, "Todos");
      setTopKpis(payload.meta || {}, allItems);
      renderSourceLinks(payload.meta || {});
      applyFilters();
      fitToFiltered();

      if (!mapEnabled) {
        els.status.textContent = "Mapa no disponible. Mostrando datos en modo listado.";
      } else if (window.__dataOrigin === "fallback") {
        els.status.textContent = "No se pudo cargar data remota. Mostrando dataset de respaldo local.";
      }
    } catch (dataError) {
      els.status.textContent = "No fue posible cargar datos. Verifica data/yacimientos.json.";
      console.error(dataError);
    }
  }

  bootstrap();
})();
