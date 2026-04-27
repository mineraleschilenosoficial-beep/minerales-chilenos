(function () {
  const cfg = window.APP_CONFIG || {};
  const DATA_URL = cfg.DATA_URL || "/api/yacimientos";
  const LINK_REPORT_URL = cfg.LINK_REPORT_URL || "/api/link-report";
  const GTM_ID = (cfg.GTM_ID || "").trim();
  const CACHE_KEY = cfg.CACHE_KEY || "mineraleschilenos:data:v2";
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
  let selectedMarkerId = null;

  const els = {
    q: document.getElementById("q"),
    mineral: document.getElementById("f-mineral"),
    region: document.getElementById("f-region"),
    tipo: document.getElementById("f-tipo"),
    list: document.getElementById("list"),
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
    detailBackdrop: document.getElementById("detail-backdrop"),
    modalTitle: document.getElementById("modal-title"),
    modalContent: document.getElementById("modal-content"),
    modalClose: document.getElementById("btn-close-modal"),
    legendList: document.getElementById("legend-list")
  };

  const MINERAL_STYLES = [
    { key: "cobre", label: "Cobre", color: "#B87333", symbol: "Cu" },
    { key: "litio", label: "Litio", color: "#5B9BD5", symbol: "Li" },
    { key: "hierro", label: "Hierro", color: "#858585", symbol: "Fe" },
    { key: "oro", label: "Oro", color: "#D4AF37", symbol: "Au" },
    { key: "plata", label: "Plata", color: "#C0C0C0", symbol: "Ag" },
    { key: "zinc", label: "Zinc", color: "#7E9FB3", symbol: "Zn" },
    { key: "plomo", label: "Plomo", color: "#5A5A66", symbol: "Pb" },
    { key: "molibdeno", label: "Molibdeno", color: "#4E7A73", symbol: "Mo" },
    { key: "manganeso", label: "Manganeso", color: "#7D6A56", symbol: "Mn" },
    { key: "desconocido", label: "Sin clasificar", color: "#9A8C6E", symbol: "?" }
  ];

  function initGtm() {
    if (!/^GTM-[A-Z0-9]+$/i.test(GTM_ID)) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js"
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
    document.head.appendChild(script);

    const noscriptHost = document.getElementById("gtm-noscript");
    if (noscriptHost) {
      noscriptHost.innerHTML = [
        "<noscript>",
        `<iframe src="https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(GTM_ID)}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        "</noscript>"
      ].join("");
    }
  }

  function normalizeMineral(value) {
    return String(value || "").trim().toLocaleLowerCase("es-CL");
  }

  function mineralStyle(value) {
    const normalized = normalizeMineral(value);
    for (const style of MINERAL_STYLES) {
      if (normalized.includes(style.key)) return style;
    }
    return MINERAL_STYLES[MINERAL_STYLES.length - 1];
  }

  function colorFor(item) {
    if (item.libre) return "#2D7A4F";
    const primary = (item.mineral && item.mineral[0]) || "desconocido";
    return mineralStyle(primary).color;
  }

  function symbolFor(item) {
    if (item.libre) return "L";
    const primary = (item.mineral && item.mineral[0]) || "desconocido";
    return mineralStyle(primary).symbol;
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
    const candidates = [DATA_URL, "/api/yacimientos"];
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

    const freshCache = loadFreshCache();
    if (freshCache && Array.isArray(freshCache.items)) {
      window.__dataOrigin = "cache";
      return freshCache;
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
    els.status.textContent = `Mostrando ${shown} de ${total}. Fuente: ${source}. Última actualización: ${formatDate(updatedAt)}.`;
  }

  function setHealthBadge(statusClass, text) {
    if (!els.healthBadge) return;
    els.healthBadge.classList.remove("health-ok", "health-warn", "health-fail");
    els.healthBadge.classList.add(statusClass);
    els.healthBadge.textContent = text;
  }

  function renderLegend() {
    if (!els.legendList) return;
    const rows = [
      ...MINERAL_STYLES
        .filter((style) => style.key !== "desconocido")
        .map((style) => {
          return `<div class="legend-row"><span class="sw" style="background:${style.color}"></span> ${style.label}</div>`;
        }),
      '<div class="legend-row"><span class="sw" style="background:#2D7A4F"></span> Concesion disponible</div>'
    ];
    els.legendList.innerHTML = rows.join("");
  }

  function pluralize(value, singular, plural) {
    return `${value} ${value === 1 ? singular : plural}`;
  }

  function toTitleCase(value) {
    return String(value || "")
      .replaceAll("_", " ")
      .trim()
      .toLocaleLowerCase("es-CL")
      .replace(/\b\p{L}/gu, (m) => m.toLocaleUpperCase("es-CL"));
  }

  function prettyTypeLabel(value) {
    const raw = String(value || "").trim();
    const normalized = raw.toLocaleLowerCase("es-CL");
    const map = {
      producer: "Productor",
      "past producer": "Ex productor",
      prospect: "Prospecto",
      occurrence: "Ocurrencia mineral",
      deposit: "Yacimiento",
      mine: "Mina",
      plant: "Planta",
      refinery: "Refineria"
    };
    return map[normalized] || toTitleCase(raw);
  }

  async function loadLinkHealth() {
    if (!els.healthBadge) return;
    setHealthBadge("", "Fuentes: verificando...");
    try {
      const res = await fetch(`${LINK_REPORT_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("report not available");
      const report = await res.json();
      const failed = Number(report.failed_count || 0);
      const warnings = Number(report.warning_count || 0);
      if (failed > 0) {
        setHealthBadge("health-fail", `Fuentes: ${pluralize(failed, "error", "errores")}`);
      } else if (warnings > 0) {
        setHealthBadge("health-warn", `Fuentes: ${pluralize(warnings, "advertencia", "advertencias")}`);
      } else {
        setHealthBadge("health-ok", "Fuentes: verificadas");
      }
    } catch {
      setHealthBadge("health-warn", "Fuentes: sin reporte");
    }
  }

  function fillSelect(selectEl, values, placeholder, labelFormatter = (v) => String(v)) {
    const options = [`<option value="">${placeholder}</option>`];
    Array.from(values)
      .sort((a, b) => labelFormatter(a).localeCompare(labelFormatter(b), "es"))
      .forEach((v) => {
      const label = labelFormatter(v);
      options.push(`<option value="${escapeHtml(v)}">${escapeHtml(label)}</option>`);
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
    marker.on("click", () => {
      setSelectedMarker(item.id);
      openDetail(item);
    });
    return marker;
  }

  function setSelectedMarker(id) {
    const previousId = selectedMarkerId;
    selectedMarkerId = id ?? null;

    if (previousId !== null) {
      const previousMarker = markerById.get(previousId);
      const previousPin = previousMarker?.getElement()?.querySelector(".marker-pin");
      if (previousPin) {
        previousPin.classList.remove("is-selected");
      }
    }

    if (selectedMarkerId !== null) {
      const currentMarker = markerById.get(selectedMarkerId);
      const currentPin = currentMarker?.getElement()?.querySelector(".marker-pin");
      if (currentPin) {
        currentPin.classList.add("is-selected");
      }
    }
  }

  function renderList() {
    if (!filtered.length) {
      els.list.innerHTML = '<div class="item"><div class="item-title">Sin resultados</div><div class="item-meta">Ajusta filtros o limpia búsqueda.</div></div>';
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
    if (els.mineral.value) chips.push(`<span class="mchip">Mineral: ${escapeHtml(toTitleCase(els.mineral.value))}</span>`);
    if (els.region.value) chips.push(`<span class="mchip">Región: ${escapeHtml(els.region.value)}</span>`);
    if (els.tipo.value) chips.push(`<span class="mchip">Tipo: ${escapeHtml(prettyTypeLabel(els.tipo.value))}</span>`);
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
      if (selectedMarkerId !== null && !markerById.has(selectedMarkerId)) {
        selectedMarkerId = null;
      } else if (selectedMarkerId !== null) {
        setSelectedMarker(selectedMarkerId);
      }
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
      const style = mineralStyle(m);
      return [
        `<span class="mineral-pill" style="--mineral-color:${style.color}">`,
        `<span class="marker-pin marker-pin--mini" style="background:${style.color}"><span>${style.symbol}</span></span>`,
        `<span>${escapeHtml(toTitleCase(m))}</span>`,
        "</span>"
      ].join("");
    }).join("");

    const freeSection = item.libre ? [
      '<div class="card" style="border-color:rgba(45,122,79,0.45);background:rgba(45,122,79,0.2)">',
      "<strong>Concesión disponible</strong><br>",
      `Potencial: ${item.potencial || "-"}<br>`,
      `Profundidad: ${item.prof || "-"}<br>`,
      `Ultimo estudio: ${(item.estudioFecha || "-")} ${(item.estudioFuente ? "· " + item.estudioFuente : "")}`,
      "</div>"
    ].join("") : "";

    const docs = Array.isArray(item.docs)
      ? item.docs.map((d) => `<a class="link-btn" style="margin-right:8px;background:#2b2b2b;color:#fff;border:1px solid var(--line)" href="${d.url}" target="_blank" rel="noreferrer">${d.n}</a>`).join("")
      : "";

    const pinSources = Array.isArray(item.sources) ? item.sources : [];
    const sourcesHtml = pinSources
      .filter((src) => src && typeof src.url === "string" && src.url.startsWith("http"))
      .map((src) => {
        const name = escapeHtml(src.name || src.url);
        const url = escapeHtml(src.url);
        const note = src.note ? `<small>${escapeHtml(src.note)}</small>` : "";
        return `<a class="source-link" href="${url}" target="_blank" rel="noreferrer">${name}<small>${url}</small>${note}</a>`;
      })
      .join("");

    const webBtn = (item.web && item.web !== "#")
      ? `<a class="link-btn" href="${item.web}" target="_blank" rel="noreferrer">Ver página corporativa</a>`
      : "";

    const operationHtml = [
      `Empresa: <strong>${item.empresa || "Disponible para concesión"}</strong><br>`,
      `Superficie: <strong>${item.sup || "-"}</strong><br>`,
      `Altitud: <strong>${item.alt || "-"}</strong><br>`,
      `Produccion: <strong>${item.prod || "-"}</strong>`
    ].join("");

    const marketHtml = [
      `Dotacion: <strong>${item.dotacion || "-"}</strong><br>`,
      `Sueldos promedio: <strong>${item.sueldos_promedio || "-"}</strong><br>`,
      `Ingresos anuales: <strong>${item.ingresos || "-"}</strong><br>`,
      `Contrataciones futuras: <strong>${item.contrataciones_futuras || "-"}</strong>`
    ].join("");

    els.modalContent.innerHTML = [
      `<div style="color:var(--gold);margin-bottom:10px">${item.tipo} · ${item.region}</div>`,
      `<div class="mineral-pill-row">${mineralPills}</div>`,
      `<details class="detail-group" open><summary>Resumen de operación</summary><div class="detail-group-body">${operationHtml}</div></details>`,
      `<details class="detail-group"><summary>Mercado laboral y económico</summary><div class="detail-group-body">${marketHtml}</div></details>`,
      freeSection,
      `<details class="detail-group"><summary>Notas y noticias</summary><div class="detail-group-body">${item.noticias || "Sin novedades por ahora."}</div></details>`,
      sourcesHtml ? `<details class="detail-group" open><summary>Fuentes del pin</summary><div class="detail-group-body"><div id="pin-source-links" style="display:grid;gap:8px;">${sourcesHtml}</div></div></details>` : "",
      docs ? `<details class="detail-group"><summary>Documentos técnicos</summary><div class="detail-group-body">${docs}</div></details>` : "",
      webBtn
    ].join("");

    els.modal.classList.add("open");
    document.body.classList.add("detail-open");
  }

  function closeModal() {
    els.modal.classList.remove("open");
    document.body.classList.remove("detail-open");
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
    els.btnMobilePanel.textContent = isOpen ? "Cerrar filtros" : "Filtros";
    els.btnMobilePanel.setAttribute("aria-label", isOpen ? "Cerrar filtros" : "Abrir filtros");
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
    if (els.detailBackdrop) {
      els.detailBackdrop.addEventListener("click", closeModal);
    }

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
      throw new Error("Leaflet no está disponible.");
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
    initGtm();
    renderLegend();
    wireUi();
    els.status.textContent = "Inicializando visualizador...";
    void loadLinkHealth();

    try {
      initMap();
    } catch (mapError) {
      mapEnabled = false;
      showMapUnavailableNotice("Puedes navegar los datos desde el panel lateral. Revisa la conexión o restricciones de CDN para habilitar el mapa.");
      console.error(mapError);
    }

    try {
      const payload = await loadData();
      allItems = payload.items;
      window.__dataUpdatedAt = payload.meta && payload.meta.updatedAt;

      const minerals = new Set(allItems.flatMap((x) => x.mineral || []));
      const regions = new Set(allItems.map((x) => x.region).filter(Boolean));
      const tipos = new Set(allItems.map((x) => x.tipo).filter(Boolean));

      fillSelect(els.mineral, minerals, "Todos", toTitleCase);
      fillSelect(els.region, regions, "Todas", toTitleCase);
      fillSelect(els.tipo, tipos, "Todos", prettyTypeLabel);
      setTopKpis(payload.meta || {}, allItems);
      applyFilters();
      fitToFiltered();

      if (!mapEnabled) {
        els.status.textContent = "Mapa no disponible. Mostrando datos en modo listado.";
      } else if (window.__dataOrigin === "fallback") {
        els.status.textContent = "No se pudieron cargar los datos remotos. Mostrando respaldo local.";
      }
    } catch (dataError) {
      els.status.textContent = "No fue posible cargar los datos. Verifica la conexión a la API y PostgreSQL.";
      console.error(dataError);
    }
  }

  bootstrap();
})();
