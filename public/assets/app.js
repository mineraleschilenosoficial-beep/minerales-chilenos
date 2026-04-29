(function () {
  const cfg = window.APP_CONFIG || {};
  const MINES_URL = cfg.MINES_URL || "/api/minas";
  const CONCESSIONS_URL = cfg.CONCESSIONS_URL || "/api/concesiones";
  const LINK_REPORT_URL = cfg.LINK_REPORT_URL || "/api/link-report";
  const GTM_ID = (cfg.GTM_ID || "").trim();
  const CACHE_KEY_BASE = cfg.CACHE_KEY || "mineraleschilenos:data:v3";
  const CACHE_KEY_MINES = cfg.CACHE_KEY_MINES || `${CACHE_KEY_BASE}:minas`;
  const CACHE_KEY_CONCESSIONS = cfg.CACHE_KEY_CONCESSIONS || `${CACHE_KEY_BASE}:concesiones`;
  const FILTER_STATE_KEY = "mineraleschilenos:filters:v1";
  const FILTER_PINNED_KEY = "mineraleschilenos:filters:pinned:v1";
  const ENABLE_VIEW_STATE_PERSISTENCE = false;
  const LEGACY_VIEW_STATE_PURGE_MARKER_KEY = "mineraleschilenos:viewstate:purged:v1";
  const CACHE_TTL_MS = cfg.CACHE_TTL_MS || 1000 * 60 * 60 * 6;
  const FETCH_TIMEOUT_MS = cfg.FETCH_TIMEOUT_MS || 12000;
  const FETCH_TIMEOUT_MS_CONCESSIONS = cfg.FETCH_TIMEOUT_MS_CONCESSIONS || 120000;
  const MOBILE_SHEET_KEY = "mineraleschilenos:mobile-sheet-state";

  const FALLBACK_CONCESSIONS_DATASET = {
    meta: {
      updatedAt: new Date().toISOString(),
      version: 0,
      source: "fallback-local-concessions"
    },
    items: [
      {
        id: 9001,
        name: "Punto de respaldo - Antofagasta",
        minerals: ["cobre"],
        latitude: -23.65,
        longitude: -70.4,
        region: "Antofagasta",
        site_type: "Referencia",
        mining_company: "MineralesChilenos.cl",
        surface: "-",
        altitude: "-",
        production: "-",
        workforce: "-",
        average_salary: "-",
        annual_revenue: "-",
        future_hirings: "-",
        notes: "Carga en modo respaldo local.",
        website: "#",
        is_available_concession: false
      }
    ]
  };
  const FALLBACK_MINES_DATASET = {
    meta: {
      updatedAt: new Date().toISOString(),
      version: 0,
      source: "fallback-local-mines"
    },
    items: [
      {
        id: 9101,
        name: "Mina de respaldo - Atacama",
        minerals: ["cobre"],
        latitude: -27.36,
        longitude: -70.33,
        region: "Atacama",
        site_type: "Mina",
        mining_company: "MineralesChilenos.cl",
        surface: "-",
        altitude: "-",
        production: "-",
        workforce: "-",
        average_salary: "-",
        annual_revenue: "-",
        future_hirings: "-",
        notes: "Carga en modo respaldo local.",
        website: "#",
        is_available_concession: false
      }
    ]
  };

  let map = null;
  let markerLayer = null;
  let mapEnabled = false;

  let allItems = [];
  let filtered = [];
  let onlyLibres = false;
  let pinViewMode = "minas";
  let mobileSheetState = "collapsed";
  let mobileSheetStateInitialized = false;
  const LIST_PAGE_SIZE_DESKTOP = 80;
  const LIST_PAGE_SIZE_MOBILE = 35;
  let listRenderLimit = LIST_PAGE_SIZE_DESKTOP;
  let mobileAutoLoadPending = false;
  let listAutoLoading = false;
  let loadRequestSeq = 0;
  let modeSwitchInFlight = false;
  let queuedModeSwitch = null;
  const sessionDatasetCache = { minas: null, concesiones: null };
  const prefetchInFlight = { minas: null, concesiones: null };
  const markerById = new Map();
  const itemById = new Map();
  const mineralIndex = new Map();
  const regionIndex = new Map();
  const communeIndex = new Map();
  const companyIndex = new Map();
  const tipoIndex = new Map();
  let libresItems = [];
  let markerRenderVersion = 0;
  let selectedMarkerId = null;

  const els = {
    q: document.getElementById("q"),
    mineral: document.getElementById("f-mineral"),
    region: document.getElementById("f-region"),
    commune: document.getElementById("f-commune"),
    company: document.getElementById("f-company"),
    tipo: document.getElementById("f-tipo"),
    sort: document.getElementById("f-sort"),
    viewMode: document.getElementById("f-viewmode"),
    list: document.getElementById("list"),
    status: document.getElementById("status"),
    qualityPanel: document.getElementById("quality-panel"),
    topKpis: document.getElementById("topKpis"),
    btnModeToggle: document.getElementById("btn-mode-toggle"),
    btnLibres: document.getElementById("btn-libres"),
    btnReset: document.getElementById("btn-reset"),
    btnSaveView: document.getElementById("btn-save-view"),
    btnDefaultView: document.getElementById("btn-default-view"),
    btnExport: document.getElementById("btn-export"),
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
    { key: "calcio", label: "Calcio", color: "#A7B86C", symbol: "Ca" },
    { key: "silice", label: "Silice", color: "#8792B4", symbol: "Si" },
    { key: "boro", label: "Boro", color: "#B08BB7", symbol: "B" },
    { key: "sodio", label: "Sodio", color: "#6F9CB3", symbol: "Na" },
    { key: "fosfato", label: "Fosfato", color: "#8AA36F", symbol: "P" },
    { key: "azufre", label: "Azufre", color: "#CCB34A", symbol: "S" },
    { key: "yodo", label: "Yodo", color: "#7C6CA5", symbol: "I" },
    { key: "arcilla", label: "Arcilla", color: "#A6785D", symbol: "Ar" },
    { key: "rocas", label: "Rocas industriales", color: "#7F8C8D", symbol: "Ri" },
    { key: "metalicos", label: "Recursos metalicos", color: "#6D7D8B", symbol: "Rm" },
    { key: "energeticos", label: "Recursos energeticos", color: "#8A6E5A", symbol: "Re" },
    { key: "desconocido", label: "Sin clasificar", color: "#9A8C6E", symbol: "SD" }
  ];
  const MINERAL_KEYWORDS = [
    ["cu", "cobre"],
    ["cupr", "cobre"],
    ["li", "litio"],
    ["liti", "litio"],
    ["fe", "hierro"],
    ["fierro", "hierro"],
    ["hematita", "hierro"],
    ["magnetita", "hierro"],
    ["au", "oro"],
    ["argent", "plata"],
    ["ag", "plata"],
    ["zn", "zinc"],
    ["pb", "plomo"],
    ["mo", "molibdeno"],
    ["mn", "manganeso"],
    ["manganeso", "manganeso"],
    ["yodo", "yodo"],
    ["caliche", "yodo"],
    ["carbonato de calcio", "calcio"],
    ["calcita", "calcio"],
    ["caliza", "calcio"],
    ["coquina", "calcio"],
    ["cuarzo", "silice"],
    ["silice", "silice"],
    ["arena silicea", "silice"],
    ["diatomita", "silice"],
    ["compuestos de boro", "boro"],
    ["ulexita", "boro"],
    ["borato", "boro"],
    ["salmuera", "sodio"],
    ["sulfato de sodio", "sodio"],
    ["compuestos de sodio", "sodio"],
    ["fosforita", "fosfato"],
    ["rocas fosforicas", "fosfato"],
    ["apatita", "fosfato"],
    ["azufre", "azufre"],
    ["arcilla", "arcilla"],
    ["bentonita", "arcilla"],
    ["caolin", "arcilla"],
    ["rocas y minerales industriales", "rocas"],
    ["rocas ornamentales", "rocas"],
    ["granito", "rocas"],
    ["marmol", "rocas"],
    ["recursos minerales metalicos", "metalicos"],
    ["polimetalico", "metalicos"],
    ["recursos energeticos", "energeticos"],
    ["carbon", "energeticos"]
  ];
  const MINERAL_DYNAMIC_COLORS = [
    "#6D8AA8", "#8C6D62", "#6D8F71", "#8B7BAE", "#A07C5F",
    "#6F7FA3", "#7E8E5A", "#8E6F88", "#5F8B8E", "#9A7E58"
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

  function normalizeSearchValue(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-CL")
      .trim();
  }

  function normalizeConcessionAvailability(value) {
    if (value === true || value === false) return value;
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
      return null;
    }
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLocaleLowerCase("es-CL");
    if (!normalized) return null;
    if (["true", "1", "yes", "si", "sí", "available", "disponible", "libre"].includes(normalized)) return true;
    if (["false", "0", "no", "unavailable", "not_available", "no disponible", "ocupada"].includes(normalized)) return false;
    return null;
  }

  async function fetchJsonWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json || !Array.isArray(json.items)) return null;
      return json;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function fetchFirstAvailableDataset(candidates, timeoutMs = FETCH_TIMEOUT_MS) {
    const unique = Array.from(new Set((Array.isArray(candidates) ? candidates : []).filter(Boolean)));
    if (!unique.length) return null;
    const stamp = Date.now();
    return await new Promise((resolve) => {
      let pending = unique.length;
      let resolved = false;
      for (const baseUrl of unique) {
        fetchJsonWithTimeout(`${baseUrl}?v=${stamp}`, timeoutMs)
          .then((json) => {
            if (resolved || !json) return;
            resolved = true;
            resolve(json);
          })
          .catch(() => {})
          .finally(() => {
            pending -= 1;
            if (!resolved && pending <= 0) {
              resolve(null);
            }
          });
      }
    });
  }

  function mineralStyle(value) {
    const normalized = normalizeMineral(value);
    if (!normalized) return MINERAL_STYLES[MINERAL_STYLES.length - 1];
    for (const [token, styleKey] of MINERAL_KEYWORDS) {
      if (!normalized.includes(token)) continue;
      const matched = MINERAL_STYLES.find((s) => s.key === styleKey);
      if (matched) return matched;
    }
    for (const style of MINERAL_STYLES) {
      if (normalized.includes(style.key)) return style;
    }
    const symbol = fallbackMineralSymbol(value);
    const color = dynamicMineralColor(normalized);
    return {
      key: `dyn-${normalized.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "custom"}`,
      label: toTitleCase(value || "Sin clasificar"),
      color,
      symbol
    };
  }

  function fallbackMineralSymbol(value) {
    const normalized = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\s]/gu, " ")
      .trim()
      .toLocaleUpperCase("es-CL");
    if (!normalized) return "SD";
    const tokens = normalized.split(/\s+/).filter(Boolean);
    if (!tokens.length) return "SD";
    if (tokens.length >= 2) {
      return `${tokens[0][0]}${tokens[1][0]}`.slice(0, 2);
    }
    return tokens[0].slice(0, 2);
  }

  function dynamicMineralColor(normalizedMineral) {
    let hash = 0;
    for (const ch of normalizedMineral) {
      hash = ((hash << 5) - hash) + ch.charCodeAt(0);
      hash |= 0;
    }
    const idx = Math.abs(hash) % MINERAL_DYNAMIC_COLORS.length;
    return MINERAL_DYNAMIC_COLORS[idx];
  }

  function primaryMineral(item) {
    const minerals = Array.isArray(item && item.minerals) ? item.minerals : [];
    for (const mineral of minerals) {
      const style = mineralStyle(mineral);
      if (style.key !== "desconocido") return mineral;
    }
    return (minerals && minerals[0]) || "desconocido";
  }

  function colorFor(item) {
    if (pinViewMode === "concesiones") {
      if (item.is_available_concession === true) return "#2D7A4F";
      if (item.is_available_concession === false) return "#B55656";
      return "#9A8C6E";
    }
    const primary = primaryMineral(item);
    return mineralStyle(primary).color;
  }

  function symbolFor(item) {
    if (pinViewMode === "concesiones") {
      if (item.is_available_concession === true) return "L";
      if (item.is_available_concession === false) return "N";
      return "S";
    }
    const primary = primaryMineral(item);
    const style = mineralStyle(primary);
    if (style.key !== "desconocido") return style.symbol;
    return fallbackMineralSymbol(primary);
  }

  function formatDate(iso) {
    if (!iso) return "-";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
  }

  function saveCache(cacheKey, payload) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), payload }));
    } catch {}
  }

  function purgeLegacyViewStateStorageOnce() {
    if (ENABLE_VIEW_STATE_PERSISTENCE) return;
    try {
      const alreadyPurged = localStorage.getItem(LEGACY_VIEW_STATE_PURGE_MARKER_KEY);
      if (alreadyPurged === "1") return;
      localStorage.removeItem(FILTER_STATE_KEY);
      localStorage.removeItem(FILTER_PINNED_KEY);
      localStorage.removeItem(MOBILE_SHEET_KEY);
      localStorage.setItem(LEGACY_VIEW_STATE_PURGE_MARKER_KEY, "1");
    } catch {}
  }

  function loadFreshCache(cacheKey) {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || !obj.payload) return null;
      if ((Date.now() - obj.ts) > CACHE_TTL_MS) return null;
      return obj.payload;
    } catch {
      return null;
    }
  }

  function loadFilterStore() {
    if (!ENABLE_VIEW_STATE_PERSISTENCE) {
      return { lastMode: "minas", modes: {} };
    }
    try {
      const raw = localStorage.getItem(FILTER_STATE_KEY);
      if (!raw) return { lastMode: "minas", modes: {} };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return { lastMode: "minas", modes: {} };
      return {
        lastMode: parsed.lastMode === "concesiones" ? "concesiones" : "minas",
        modes: parsed.modes && typeof parsed.modes === "object" ? parsed.modes : {}
      };
    } catch {
      return { lastMode: "minas", modes: {} };
    }
  }

  function saveFilterStore(store) {
    if (!ENABLE_VIEW_STATE_PERSISTENCE) return;
    try {
      localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(store));
    } catch {}
  }

  function loadPinnedFilterStore() {
    if (!ENABLE_VIEW_STATE_PERSISTENCE) {
      return { modes: {} };
    }
    try {
      const raw = localStorage.getItem(FILTER_PINNED_KEY);
      if (!raw) return { modes: {} };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return { modes: {} };
      return { modes: parsed.modes && typeof parsed.modes === "object" ? parsed.modes : {} };
    } catch {
      return { modes: {} };
    }
  }

  function savePinnedFilterStore(store) {
    if (!ENABLE_VIEW_STATE_PERSISTENCE) return;
    try {
      localStorage.setItem(FILTER_PINNED_KEY, JSON.stringify(store));
    } catch {}
  }

  function captureCurrentFilterState() {
    return {
      q: String(els.q.value || ""),
      mineral: String(els.mineral.value || ""),
      region: String(els.region.value || ""),
      commune: String(els.commune.value || ""),
      company: String(els.company.value || ""),
      tipo: String(els.tipo.value || ""),
      sort: String(els.sort.value || "relevancia"),
      onlyLibres: Boolean(onlyLibres)
    };
  }

  function optionExists(selectEl, value) {
    if (!selectEl || !value) return false;
    return Array.from(selectEl.options || []).some((opt) => opt.value === value);
  }

  function applyFilterStateToControls(state) {
    if (!state || typeof state !== "object") return;
    els.q.value = String(state.q || "");
    els.mineral.value = optionExists(els.mineral, state.mineral) ? state.mineral : "";
    els.region.value = optionExists(els.region, state.region) ? state.region : "";
    els.commune.value = optionExists(els.commune, state.commune) ? state.commune : "";
    els.company.value = optionExists(els.company, state.company) ? state.company : "";
    els.tipo.value = optionExists(els.tipo, state.tipo) ? state.tipo : "";
    els.sort.value = optionExists(els.sort, state.sort) ? state.sort : "relevancia";
    onlyLibres = pinViewMode === "concesiones" ? Boolean(state.onlyLibres) : false;
  }

  function persistCurrentModeFilters() {
    const mode = getCurrentDatasetMode();
    const store = loadFilterStore();
    store.lastMode = mode;
    store.modes[mode] = captureCurrentFilterState();
    saveFilterStore(store);
  }

  function clearCurrentModeFilters() {
    const mode = getCurrentDatasetMode();
    const store = loadFilterStore();
    if (store.modes && typeof store.modes === "object") {
      delete store.modes[mode];
    }
    saveFilterStore(store);
    const pinned = loadPinnedFilterStore();
    if (pinned.modes && typeof pinned.modes === "object") {
      delete pinned.modes[mode];
    }
    savePinnedFilterStore(pinned);
  }

  function saveCurrentModePinnedView() {
    const mode = getCurrentDatasetMode();
    const pinned = loadPinnedFilterStore();
    pinned.modes[mode] = captureCurrentFilterState();
    savePinnedFilterStore(pinned);
    els.status.textContent = `Vista de ${getModeLabel(mode).toLowerCase()} guardada.`;
  }

  function restoreModeDefaultView() {
    clearCurrentModeFilters();
    onlyLibres = false;
    els.q.value = "";
    els.mineral.value = "";
    els.region.value = "";
    els.commune.value = "";
    els.company.value = "";
    els.tipo.value = "";
    els.sort.value = "relevancia";
    applyFilters();
    els.status.textContent = `Vista por defecto restaurada para ${getModeLabel(getCurrentDatasetMode()).toLowerCase()}.`;
  }

  function loadAnyCache(cacheKey) {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.payload) return null;
      return obj.payload;
    } catch {
      return null;
    }
  }

  function getCurrentDatasetMode() {
    return pinViewMode === "concesiones" ? "concesiones" : "minas";
  }

  function getModeLabel(mode) {
    return mode === "concesiones" ? "Concesiones" : "Minas";
  }

  function syncModeControls() {
    const mode = getCurrentDatasetMode();
    if (els.viewMode && els.viewMode.value !== mode) {
      els.viewMode.value = mode;
    }
    if (els.btnModeToggle) {
      const nextMode = mode === "concesiones" ? "minas" : "concesiones";
      els.btnModeToggle.textContent = `Mapa: ${getModeLabel(mode)}`;
      els.btnModeToggle.setAttribute("aria-label", `Cambiar a ${getModeLabel(nextMode)}`);
      els.btnModeToggle.title = `Cambiar a ${getModeLabel(nextMode)}`;
    }
  }

  function setModeSwitchBusy(isBusy, nextMode = null) {
    if (els.viewMode) {
      els.viewMode.disabled = Boolean(isBusy);
      els.viewMode.setAttribute("aria-busy", isBusy ? "true" : "false");
    }
    if (els.btnModeToggle) {
      els.btnModeToggle.disabled = Boolean(isBusy);
      els.btnModeToggle.setAttribute("aria-busy", isBusy ? "true" : "false");
      if (isBusy) {
        const targetLabel = getModeLabel(nextMode || getCurrentDatasetMode());
        els.btnModeToggle.textContent = `Cargando ${targetLabel}...`;
      } else {
        syncModeControls();
      }
    }
  }

  async function changeMode(nextModeRaw) {
    const nextMode = nextModeRaw === "concesiones" ? "concesiones" : "minas";
    const prevMode = getCurrentDatasetMode();
    if (modeSwitchInFlight) {
      queuedModeSwitch = nextMode;
      return false;
    }
    if (prevMode === nextMode) {
      syncModeControls();
      syncLibresButton();
      renderMobileFilterBar();
      return true;
    }

    modeSwitchInFlight = true;
    setModeSwitchBusy(true, nextMode);
    pinViewMode = nextMode;
    onlyLibres = false;
    const store = loadFilterStore();
    store.lastMode = nextMode;
    saveFilterStore(store);
    syncModeControls();
    syncLibresButton();
    renderMobileFilterBar();
    els.status.textContent = `Cambiando a mapa ${getModeLabel(nextMode).toLowerCase()}...`;

    try {
      let applied = await loadAndRenderCurrentMode();
      // Frontend safety: if first render gets superseded by another in-flight load,
      // force one more pass so mode switch always updates visible data.
      if (!applied) {
        applied = await loadAndRenderCurrentMode();
      }
      if (applied) {
        fitToFiltered();
        return true;
      }
      throw new Error("mode switch render did not apply");
    } catch (error) {
      // Keep mode switch responsive: fallback to built-in dataset instead of rolling back mode.
      try {
        sessionDatasetCache[nextMode] = getFallbackDataset(nextMode);
        const fallbackApplied = await loadAndRenderCurrentMode();
        if (fallbackApplied) {
          fitToFiltered();
          els.status.textContent = `Mapa ${getModeLabel(nextMode)} cargado con respaldo local por error remoto.`;
          console.error(error);
          return true;
        }
      } catch (fallbackError) {
        console.error("fallback render failed", fallbackError);
      }

      pinViewMode = prevMode;
      const rollbackStore = loadFilterStore();
      rollbackStore.lastMode = prevMode;
      saveFilterStore(rollbackStore);
      syncModeControls();
      syncLibresButton();
      renderMobileFilterBar();
      els.status.textContent = `No fue posible cargar el mapa de ${getModeLabel(nextMode).toLowerCase()}.`;
      console.error(error);
      return false;
    } finally {
      modeSwitchInFlight = false;
      setModeSwitchBusy(false);
      if (queuedModeSwitch) {
        const queued = queuedModeSwitch;
        queuedModeSwitch = null;
        if (queued !== getCurrentDatasetMode()) {
          await changeMode(queued);
        }
      }
    }
  }

  function getDatasetCandidates(mode) {
    const rawCandidates = mode === "concesiones"
      ? [CONCESSIONS_URL]
      : [MINES_URL];
    return rawCandidates.filter((url) => typeof url === "string" && url.trim().length > 0);
  }

  function getDatasetCacheKey(mode) {
    return mode === "concesiones" ? CACHE_KEY_CONCESSIONS : CACHE_KEY_MINES;
  }

  function getFallbackDataset(mode) {
    return mode === "concesiones" ? FALLBACK_CONCESSIONS_DATASET : FALLBACK_MINES_DATASET;
  }

  async function prefetchMode(mode) {
    if (sessionDatasetCache[mode] && Array.isArray(sessionDatasetCache[mode].items)) {
      return;
    }
    if (prefetchInFlight[mode]) {
      await prefetchInFlight[mode];
      return;
    }
    prefetchInFlight[mode] = (async () => {
      const candidates = getDatasetCandidates(mode);
      const cacheKey = getDatasetCacheKey(mode);
      const timeoutMs = mode === "concesiones" ? FETCH_TIMEOUT_MS_CONCESSIONS : FETCH_TIMEOUT_MS;
      const remotePayload = await fetchFirstAvailableDataset(candidates, timeoutMs);
      if (remotePayload) {
        sessionDatasetCache[mode] = remotePayload;
        saveCache(cacheKey, remotePayload);
        return;
      }
      const freshCache = loadFreshCache(cacheKey);
      if (freshCache && Array.isArray(freshCache.items)) {
        sessionDatasetCache[mode] = freshCache;
        return;
      }
      const staleCache = loadAnyCache(cacheKey);
      if (staleCache && Array.isArray(staleCache.items)) {
        sessionDatasetCache[mode] = staleCache;
      }
    })()
      .finally(() => {
        prefetchInFlight[mode] = null;
      });
    await prefetchInFlight[mode];
  }

  async function loadData(mode) {
    if (sessionDatasetCache[mode] && Array.isArray(sessionDatasetCache[mode].items)) {
      window.__dataOrigin = "session-cache";
      return sessionDatasetCache[mode];
    }
    // Do not await prefetch here: it can stall bootstrap if a request hangs.
    const candidates = getDatasetCandidates(mode);
    const cacheKey = getDatasetCacheKey(mode);
    const fallbackDataset = getFallbackDataset(mode);
    const timeoutMs = mode === "concesiones" ? FETCH_TIMEOUT_MS_CONCESSIONS : FETCH_TIMEOUT_MS;
    const remotePayload = await fetchFirstAvailableDataset(candidates, timeoutMs);
    if (remotePayload) {
      saveCache(cacheKey, remotePayload);
      sessionDatasetCache[mode] = remotePayload;
      window.__dataOrigin = "remote";
      return remotePayload;
    }

    const freshCache = loadFreshCache(cacheKey);
    if (freshCache && Array.isArray(freshCache.items)) {
      sessionDatasetCache[mode] = freshCache;
      window.__dataOrigin = "cache";
      return freshCache;
    }

    const staleCache = loadAnyCache(cacheKey);
    if (staleCache && Array.isArray(staleCache.items)) {
      sessionDatasetCache[mode] = staleCache;
      window.__dataOrigin = "cache-stale";
      return staleCache;
    }

    window.__dataOrigin = "fallback";
    sessionDatasetCache[mode] = fallbackDataset;
    return fallbackDataset;
  }

  function setTopKpis(meta, items) {
    const mode = getCurrentDatasetMode();
    const libres = items.filter((x) => x.is_available_concession === true).length;
    const activos = items.length - libres;
    if (mode === "concesiones") {
      els.topKpis.innerHTML = [
        `<div class="kpi">${items.length} concesiones</div>`,
        `<div class="kpi">${activos} activas/no libres</div>`,
        `<div class="kpi">${libres} disponibles</div>`,
        `<div class="kpi">Actualizado: ${formatDate(meta && meta.updatedAt)}</div>`
      ].join("");
      return;
    }
    const withMineral = items.filter((x) => Array.isArray(x.minerals) && x.minerals.some((m) => normalizeMineral(m) !== "desconocido")).length;
    els.topKpis.innerHTML = [
      `<div class="kpi">${items.length} minas</div>`,
      `<div class="kpi">${withMineral} con mineral identificado</div>`,
      `<div class="kpi">${items.length - withMineral} sin clasificar</div>`,
      `<div class="kpi">Actualizado: ${formatDate(meta && meta.updatedAt)}</div>`
    ].join("");
  }

  function setStatus(origin, shown, total, updatedAt) {
    const source = origin === "cache" ? "cache local"
      : origin === "cache-stale" ? "cache local (desactualizada)"
      : origin === "fallback" ? "respaldo local"
      : "fuente remota";
    const modeText = getModeLabel(getCurrentDatasetMode());
    els.status.textContent = `Mapa ${modeText}: mostrando ${shown} de ${total}. Fuente: ${source}. Última actualización: ${formatDate(updatedAt)}.`;
  }

  function metricLabel(key) {
    const map = {
      sourceRecordsRaw: "Registros fuente",
      sourceRecordsKept: "Registros válidos",
      sourceRecordsMissingContextFields: "Registros con campos faltantes (no descartados)",
      sourceRecordsDroppedInvalidCoordinates: "Descartes por coordenadas inválidas",
      sourceRecordsDroppedOutsideChileBounds: "Descartes fuera de Chile",
      sourceRecordsRegionMismatchDetected: "Región inconsistente detectada",
      sourceRecordsRegionRelabeledFromCoordinates: "Región corregida por coordenadas",
      sourceRecordsDroppedCommuneOutlier: "Descartes por outlier comunal",
      sourceRecordsDroppedNoCoords: "Descartes sin coordenadas",
      sourceRecordsDroppedOutOfChileBounds: "Descartes fuera de Chile",
      concessionStatusConstituida: "Concesiones constituidas",
      concessionStatusEnTramite: "Concesiones en trámite",
      concessionStatusEliminada: "Concesiones eliminadas",
      availableConcessionTrueCount: "Concesiones disponibles",
      availableConcessionFalseCount: "Concesiones no disponibles",
      derivedMineItems: "Minas derivadas",
      derivedMineItemsWithRegionCommuneCompany: "Minas con empresa/región/comuna"
    };
    return map[key] || key;
  }

  function setQualityPanel(meta) {
    if (!els.qualityPanel) return;
    const stats = meta && typeof meta === "object" ? meta.scrapeStats : null;
    if (!stats || typeof stats !== "object") {
      els.qualityPanel.innerHTML = '<div class="quality-note">Sin métricas de calidad disponibles para este dataset.</div>';
      return;
    }

    const mode = getCurrentDatasetMode();
    const preferred = mode === "concesiones"
      ? [
          "sourceRecordsRaw",
          "sourceRecordsKept",
          "sourceRecordsDroppedNoCoords",
          "sourceRecordsDroppedOutOfChileBounds",
          "sourceRecordsDroppedCommuneOutlier",
          "concessionStatusConstituida",
          "concessionStatusEnTramite",
          "concessionStatusEliminada",
          "availableConcessionTrueCount",
          "availableConcessionFalseCount"
        ]
      : [
          "sourceRecordsRaw",
          "sourceRecordsKept",
          "sourceRecordsMissingContextFields",
          "sourceRecordsDroppedInvalidCoordinates",
          "sourceRecordsDroppedOutsideChileBounds",
          "sourceRecordsRegionMismatchDetected",
          "sourceRecordsRegionRelabeledFromCoordinates",
          "sourceRecordsDroppedCommuneOutlier"
        ];

    const keys = preferred.filter((key) => Number.isFinite(Number(stats[key])));
    if (!keys.length) {
      els.qualityPanel.innerHTML = '<div class="quality-note">Sin métricas de calidad numéricas para el mapa actual.</div>';
      return;
    }

    const cards = keys.map((key) => {
      const value = Number(stats[key]);
      return [
        '<div class="quality-card">',
        `<strong>${escapeHtml(value.toLocaleString("es-CL"))}</strong>`,
        `<span>${escapeHtml(metricLabel(key))}</span>`,
        "</div>"
      ].join("");
    });
    els.qualityPanel.innerHTML = `<div class="quality-grid">${cards.join("")}</div>`;
  }

  function setHealthBadge(statusClass, text) {
    if (!els.healthBadge) return;
    els.healthBadge.classList.remove("health-ok", "health-warn", "health-fail");
    if (statusClass) {
      els.healthBadge.classList.add(statusClass);
    }
    els.healthBadge.textContent = text;
  }

  function renderLegend() {
    if (!els.legendList) return;
    const rows = pinViewMode === "concesiones"
      ? [
        '<div class="legend-row"><span class="sw" style="background:#2D7A4F"></span> Concesión disponible</div>',
        '<div class="legend-row"><span class="sw" style="background:#B55656"></span> Concesión no disponible</div>',
        '<div class="legend-row"><span class="sw" style="background:#9A8C6E"></span> Sin dato de concesión</div>'
      ]
      : [
        ...MINERAL_STYLES
          .filter((style) => style.key !== "desconocido")
          .map((style) => {
            return `<div class="legend-row"><span class="sw" style="background:${style.color}"></span> ${style.label}</div>`;
          })
      ];
    els.legendList.innerHTML = rows.join("");
  }

  function pluralize(value, singular, plural) {
    return `${value} ${value === 1 ? singular : plural}`;
  }

  function toTitleCase(value) {
    const normalized = String(value || "")
      .replaceAll("_", " ")
      .trim()
      .toLocaleLowerCase("es-CL");
    // Avoid \b because JS word boundaries are not Unicode-aware for accented letters.
    return normalized.replace(/(^|[\s\-\/('])(\p{L})/gu, (_full, prefix, letter) => {
      return `${prefix}${letter.toLocaleUpperCase("es-CL")}`;
    });
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

  function prettyMineralList(values) {
    if (!Array.isArray(values) || !values.length) return "-";
    return values.map((value) => toTitleCase(value)).join(", ");
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
    const primary = primaryMineral(item);
    const style = mineralStyle(primary);
    const mineralCount = Array.isArray(item.minerals) ? item.minerals.length : 0;
    const extraCount = mineralCount > 1 ? mineralCount - 1 : 0;
    const html = [
      `<div class="marker-pin marker-pin--${escapeHtml(style.key)}" style="background:${colorFor(item)}" title="${escapeHtml(style.label)}">`,
      `<span>${symbolFor(item)}</span>`,
      extraCount > 0 ? `<small class="marker-extra">+${extraCount}</small>` : "",
      "</div>"
    ].join("");
    const icon = L.divIcon({ html, className: "", iconSize: [36, 36], iconAnchor: [18, 36] });
    const marker = L.marker([item.latitude, item.longitude], { icon });
    marker.on("click", () => {
      setSelectedMarker(item.id);
      openDetail(item);
    });
    return marker;
  }

  function addToIndex(indexMap, key, item) {
    if (!key) return;
    const list = indexMap.get(key);
    if (list) {
      list.push(item);
      return;
    }
    indexMap.set(key, [item]);
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
    const visibleItems = filtered.slice(0, listRenderLimit);
    const htmlRows = visibleItems.map((x) => {
      const company = String(x.mining_company || "").trim();
      const commune = String(x.commune || "").trim();
      const concession = x.is_available_concession === true
        ? "Concesión disponible"
        : x.is_available_concession === false
          ? "Concesión no disponible"
          : "Concesión sin dato";
      return [
        `<article class="item" data-id="${x.id}">`,
        `<div class="item-title">${x.name}</div>`,
        `<div class="item-meta">${x.site_type} · ${x.region}</div>`,
        commune ? `<div class="item-meta">Comuna: ${escapeHtml(commune)}</div>` : "",
        company && company !== "-" ? `<div class="item-meta">Empresa: ${escapeHtml(company)}</div>` : "",
        `<div><span class="item-pill">${escapeHtml(concession)}</span></div>`,
        `<div class="item-meta">${prettyMineralList(x.minerals || [])}</div>`,
        "</article>"
      ].join("");
    });
    if (filtered.length > listRenderLimit) {
      const isMobile = isMobileViewport();
      htmlRows.push([
        '<div class="item">',
        `<div class="item-title">Mostrando ${visibleItems.length} de ${filtered.length}</div>`,
        '<div class="item-meta">Carga incremental activa para mejorar rendimiento.</div>',
        isMobile
          ? `<div class="item-meta">${listAutoLoading ? '<span class="list-loading">Cargando más resultados...</span>' : "Desliza hacia abajo para cargar más automáticamente."}</div>`
          : '<div class="item-meta"><button id="btn-more-results" type="button">Ver más resultados</button></div>',
        "</div>"
      ].join(""));
    }
    els.list.innerHTML = htmlRows.join("");
    const moreBtn = document.getElementById("btn-more-results");
    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        const pageSize = isMobileViewport() ? LIST_PAGE_SIZE_MOBILE : LIST_PAGE_SIZE_DESKTOP;
        listRenderLimit = Math.min(filtered.length, listRenderLimit + pageSize);
        renderList();
      });
    }
  }

  function maybeLoadMoreOnMobileScroll() {
    if (!isMobileViewport()) return;
    if (mobileAutoLoadPending) return;
    if (!els.list) return;
    if (filtered.length <= listRenderLimit) return;

    const thresholdPx = 120;
    const distanceToBottom = els.list.scrollHeight - (els.list.scrollTop + els.list.clientHeight);
    if (distanceToBottom > thresholdPx) return;

    mobileAutoLoadPending = true;
    listAutoLoading = true;
    renderList();
    setTimeout(() => {
      const nextLimit = Math.min(filtered.length, listRenderLimit + LIST_PAGE_SIZE_MOBILE);
      if (nextLimit > listRenderLimit) {
        listRenderLimit = nextLimit;
      }
      listAutoLoading = false;
      renderList();
      mobileAutoLoadPending = false;
    }, 120);
  }

  function exportFilteredToCsv() {
    const rows = filtered.map((item) => ({
      id: item.id,
      nombre: item.name || "",
      tipo: item.site_type || "",
      empresa: item.mining_company || "",
      region: item.region || "",
      comuna: item.commune || "",
      minerales: Array.isArray(item.minerals) ? item.minerals.join(", ") : "",
      latitud: item.latitude ?? "",
      longitud: item.longitude ?? "",
      concesion_disponible: item.is_available_concession === true ? "si" : item.is_available_concession === false ? "no" : "sin_dato"
    }));
    if (!rows.length) {
      els.status.textContent = "No hay resultados filtrados para exportar.";
      return;
    }
    const headers = Object.keys(rows[0]);
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [headers.join(",")]
      .concat(rows.map((row) => headers.map((h) => esc(row[h])).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const mode = getCurrentDatasetMode();
    a.href = url;
    a.download = `mineraleschilenos_${mode}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
    if (els.commune.value) chips.push(`<span class="mchip">Comuna: ${escapeHtml(els.commune.value)}</span>`);
    if (els.company.value) chips.push(`<span class="mchip">Empresa: ${escapeHtml(els.company.value)}</span>`);
    if (els.tipo.value) chips.push(`<span class="mchip">Tipo: ${escapeHtml(prettyTypeLabel(els.tipo.value))}</span>`);
    if (els.sort.value && els.sort.value !== "relevancia") chips.push(`<span class="mchip">Orden: ${escapeHtml(els.sort.options[els.sort.selectedIndex].text || "Personalizado")}</span>`);
    chips.push(`<span class="mchip">Mapa: ${getModeLabel(getCurrentDatasetMode())}</span>`);
    if (onlyLibres) chips.push(`<span class="mchip">Solo disponibles</span>`);

    const hasFilters = q || els.mineral.value || els.region.value || els.commune.value || els.company.value || els.tipo.value || (els.sort.value && els.sort.value !== "relevancia") || onlyLibres;
    if (hasFilters) {
      chips.push(`<button type="button" class="mchip" data-action="clear-filters">Limpiar</button>`);
    }

    els.mobileFilterBar.innerHTML = chips.join("");
    els.mobileFilterBar.querySelectorAll("[data-action='open-panel']").forEach((node) => {
      node.addEventListener("click", () => setMobilePanelOpen(true));
    });
    els.mobileFilterBar.querySelectorAll("[data-action='clear-filters']").forEach((node) => {
      node.addEventListener("click", () => {
        resetFiltersAndApply();
      });
    });
  }

  function resetFiltersAndApply() {
    onlyLibres = false;
    syncLibresButton();
    els.q.value = "";
    els.mineral.value = "";
    els.region.value = "";
    els.commune.value = "";
    els.company.value = "";
    els.tipo.value = "";
    els.sort.value = "relevancia";
    applyFilters();
  }

  function syncLibresButton() {
    if (!els.btnLibres) return;
    const concessionsMode = pinViewMode === "concesiones";
    if (!concessionsMode) {
      onlyLibres = false;
      els.btnLibres.disabled = true;
      els.btnLibres.setAttribute("aria-disabled", "true");
      els.btnLibres.classList.remove("btn-gold", "is-active");
      els.btnLibres.setAttribute("aria-pressed", "false");
      els.btnLibres.title = "Disponible solo en mapa de concesiones";
      els.btnLibres.textContent = "Disponible solo en mapa de concesiones";
      return;
    }
    els.btnLibres.disabled = false;
    els.btnLibres.setAttribute("aria-disabled", "false");
    els.btnLibres.title = "";
    const active = Boolean(onlyLibres);
    els.btnLibres.classList.toggle("btn-gold", active);
    els.btnLibres.classList.toggle("is-active", active);
    els.btnLibres.setAttribute("aria-pressed", active ? "true" : "false");
    els.btnLibres.textContent = active
      ? "Solo concesiones disponibles (activo)"
      : "Solo concesiones disponibles (mostrar solo disponibles)";
  }

  function concessionSortRank(item) {
    if (item.is_available_concession === false) return 0;
    if (item.is_available_concession === null) return 1;
    if (item.is_available_concession === true) return 2;
    return 3;
  }

  function debounce(fn, waitMs) {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), waitMs);
    };
  }

  function renderMarkersForFiltered(items) {
    if (!mapEnabled || !markerLayer) return;
    markerRenderVersion += 1;
    const currentVersion = markerRenderVersion;
    markerLayer.clearLayers();
    markerById.clear();

    const chunkSize = 600;
    let cursor = 0;

    const pushChunk = () => {
      if (currentVersion !== markerRenderVersion) return;
      const chunkMarkers = [];
      const end = Math.min(cursor + chunkSize, items.length);
      for (; cursor < end; cursor += 1) {
        const item = items[cursor];
        const marker = buildMarker(item);
        markerById.set(item.id, marker);
        chunkMarkers.push(marker);
      }

      if (chunkMarkers.length) {
        if (typeof markerLayer.addLayers === "function") {
          markerLayer.addLayers(chunkMarkers);
        } else {
          chunkMarkers.forEach((marker) => markerLayer.addLayer(marker));
        }
      }

      if (cursor < items.length) {
        requestAnimationFrame(pushChunk);
        return;
      }

      if (selectedMarkerId !== null && !markerById.has(selectedMarkerId)) {
        selectedMarkerId = null;
      } else if (selectedMarkerId !== null) {
        requestAnimationFrame(() => setSelectedMarker(selectedMarkerId));
      }
    };

    requestAnimationFrame(pushChunk);
  }

  function resolveBaseItems(fMineral, fRegion, fCommune, fCompany, fTipo) {
    const candidateBuckets = [];
    if (fMineral) candidateBuckets.push(mineralIndex.get(fMineral) || []);
    if (fRegion) candidateBuckets.push(regionIndex.get(fRegion) || []);
    if (fCommune) candidateBuckets.push(communeIndex.get(fCommune) || []);
    if (fCompany) candidateBuckets.push(companyIndex.get(fCompany) || []);
    if (fTipo) candidateBuckets.push(tipoIndex.get(fTipo) || []);
    if (pinViewMode === "concesiones" && onlyLibres) candidateBuckets.push(libresItems);
    return candidateBuckets.length
      ? candidateBuckets.reduce((best, bucket) => (bucket.length < best.length ? bucket : best))
      : allItems;
  }

  function matchesQueryTokens(item, queryTokens) {
    if (!queryTokens.length) return true;
    const haystack = item._searchText;
    return queryTokens.every((token) => haystack.includes(token));
  }

  function matchesStructuredFilters(item, fMineral, fRegion, fCommune, fCompany, fTipo) {
    if (pinViewMode === "concesiones" && onlyLibres && item.is_available_concession !== true) return false;
    if (fMineral && !(item.minerals || []).includes(fMineral)) return false;
    if (fRegion && item.region !== fRegion) return false;
    if (fCommune && item.commune !== fCommune) return false;
    if (fCompany && item.mining_company !== fCompany) return false;
    if (fTipo && item.site_type !== fTipo) return false;
    return true;
  }

  function applyFilters() {
    const q = normalizeSearchValue(els.q.value);
    const queryTokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const fMineral = els.mineral.value;
    const fRegion = els.region.value;
    const fCommune = els.commune.value;
    const fCompany = els.company.value;
    const fTipo = els.tipo.value;
    const fSort = els.sort.value;
    const baseItems = resolveBaseItems(fMineral, fRegion, fCommune, fCompany, fTipo);

    const nextFiltered = [];
    for (let i = 0; i < baseItems.length; i += 1) {
      const item = baseItems[i];
      if (!matchesStructuredFilters(item, fMineral, fRegion, fCommune, fCompany, fTipo)) continue;
      if (!matchesQueryTokens(item, queryTokens)) continue;
      nextFiltered.push(item);
    }
    if (fSort === "nombre_asc") {
      nextFiltered.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"));
    } else if (fSort === "region_asc") {
      nextFiltered.sort((a, b) => {
        const byRegion = String(a.region || "").localeCompare(String(b.region || ""), "es");
        if (byRegion !== 0) return byRegion;
        return String(a.name || "").localeCompare(String(b.name || ""), "es");
      });
    } else if (fSort === "empresa_asc") {
      nextFiltered.sort((a, b) => {
        const byCompany = String(a.mining_company || "").localeCompare(String(b.mining_company || ""), "es");
        if (byCompany !== 0) return byCompany;
        return String(a.name || "").localeCompare(String(b.name || ""), "es");
      });
    } else if (pinViewMode === "concesiones" && !onlyLibres) {
      nextFiltered.sort((a, b) => {
        const byConcession = concessionSortRank(a) - concessionSortRank(b);
        if (byConcession !== 0) return byConcession;
        return String(a.name || "").localeCompare(String(b.name || ""), "es");
      });
    }
    filtered = nextFiltered;
    listRenderLimit = isMobileViewport() ? LIST_PAGE_SIZE_MOBILE : LIST_PAGE_SIZE_DESKTOP;

    renderMarkersForFiltered(filtered);

    renderList();
    renderMobileFilterBar();
    setStatus(window.__dataOrigin || "remote", filtered.length, allItems.length, window.__dataUpdatedAt || null);
    persistCurrentModeFilters();
  }

  async function loadAndRenderCurrentMode() {
    const mode = getCurrentDatasetMode();
    const requestId = ++loadRequestSeq;
    const payload = await loadData(mode);
    if (requestId !== loadRequestSeq) return false;
    allItems = normalizeDatasetItems(payload.items);
    window.__dataUpdatedAt = payload.meta && payload.meta.updatedAt;
    rebuildIndexes(allItems);

    const minerals = new Set(allItems.flatMap((x) => x.minerals || []));
    const regions = new Set(allItems.map((x) => x.region).filter(Boolean));
    const communes = new Set(allItems.map((x) => x.commune).filter(Boolean));
    const companies = new Set(allItems.map((x) => x.mining_company).filter((x) => String(x || "").trim() && String(x).trim() !== "-"));
    const tipos = new Set(allItems.map((x) => x.site_type).filter(Boolean));

    fillSelect(els.mineral, minerals, "Todos", toTitleCase);
    fillSelect(els.region, regions, "Todas", toTitleCase);
    fillSelect(els.commune, communes, "Todas", toTitleCase);
    fillSelect(els.company, companies, "Todas", toTitleCase);
    fillSelect(els.tipo, tipos, "Todos", prettyTypeLabel);
    const store = loadFilterStore();
    const pinned = loadPinnedFilterStore();
    const pinnedState = pinned.modes && pinned.modes[mode];
    const autoState = store.modes && store.modes[mode];
    applyFilterStateToControls(pinnedState || autoState);
    setTopKpis(payload.meta || {}, allItems);
    setQualityPanel(payload.meta || {});
    syncLibresButton();
    renderLegend();
    applyFilters();
    const otherMode = mode === "concesiones" ? "minas" : "concesiones";
    void prefetchMode(otherMode);
    return true;
  }

  function fitToFiltered() {
    if (!mapEnabled || !map || !filtered.length) return;
    const bounds = L.latLngBounds(filtered.map((x) => [x.latitude, x.longitude]));
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

  function isMeaningfulValue(value) {
    const text = String(value ?? "").trim();
    return Boolean(text && text !== "-" && text.toLocaleLowerCase("es-CL") !== "n/a");
  }

  function textOrUnavailable(value) {
    const text = String(value ?? "").trim();
    return text && text !== "-" ? escapeHtml(text) : "<em>No disponible</em>";
  }

  function buildMineralPillsHtml(item) {
    return (item.minerals || []).map((mineral) => {
      const style = mineralStyle(mineral);
      return [
        `<span class="mineral-pill" style="--mineral-color:${style.color}">`,
        `<span class="marker-pin marker-pin--mini" style="background:${style.color}"><span>${style.symbol}</span></span>`,
        `<span>${escapeHtml(toTitleCase(mineral))}</span>`,
        "</span>"
      ].join("");
    }).join("");
  }

  function getConcessionReliability(item) {
    const provenance = Array.isArray(item.field_provenance) ? item.field_provenance : [];
    const concessionRows = provenance.filter((row) => row && row.field_name === "is_available_concession");
    const hasManual = concessionRows.some((row) => String(row.source_type || "").toLowerCase() === "manual");
    const hasOfficial = concessionRows.some((row) => String(row.source_type || "").toLowerCase() === "official");
    const hasAuth = Array.isArray(item.operating_authorizations) && item.operating_authorizations.length > 0;

    if (hasManual || hasOfficial) {
      return {
        className: "reliability-high",
        label: "Confiabilidad alta",
        note: "Estado respaldado por fuente manual/oficial trazable."
      };
    }
    if (hasAuth) {
      return {
        className: "reliability-medium",
        label: "Confiabilidad media",
        note: "Derivado de autorizaciones de operación disponibles."
      };
    }
    return {
      className: "reliability-low",
      label: "Confiabilidad baja",
      note: "Sin evidencia oficial/manual suficiente para confirmar estado."
    };
  }

  function buildConcessionEvidenceHtml(item) {
    const concessionValueLabel = item.is_available_concession === true
      ? "Disponible"
      : item.is_available_concession === false
        ? "No disponible"
        : "Sin dato";
    const provenance = Array.isArray(item.field_provenance) ? item.field_provenance : [];
    const rows = provenance.filter((row) => row && row.field_name === "is_available_concession");
    const latest = rows.length ? rows[rows.length - 1] : null;
    const srcType = latest ? String(latest.source_type || "").trim() : "";
    const srcUrl = latest ? String(latest.source_url || "").trim() : "";
    const srcNote = latest ? String(latest.note || "").trim() : "";
    const sourceText = srcUrl && srcUrl.startsWith("http")
      ? `<a class="inline-link-soft" href="${escapeHtml(srcUrl)}" target="_blank" rel="noreferrer">${escapeHtml(srcUrl)}</a>`
      : (srcType ? escapeHtml(srcType) : "<em>Sin fuente trazable</em>");
    return [
      `Valor concesión: <strong>${escapeHtml(concessionValueLabel)}</strong>`,
      `Fuente: ${sourceText}`,
      srcNote ? `Nota: ${escapeHtml(srcNote)}` : ""
    ].filter(Boolean).join("<br>");
  }

  function renderResourceLinks(resources) {
    const rows = (Array.isArray(resources) ? resources : [])
      .map((entry) => {
        if (typeof entry === "string") {
          if (!entry.startsWith("http")) return "";
          return `<a class="source-link" href="${escapeHtml(entry)}" target="_blank" rel="noreferrer">${escapeHtml(entry)}</a>`;
        }
        if (!entry || typeof entry !== "object") return "";
        const url = typeof entry.url === "string" ? entry.url : "";
        if (!url.startsWith("http")) return "";
        const name = escapeHtml(entry.name || url);
        const note = entry.note ? `<small>${escapeHtml(entry.note)}</small>` : "";
        return `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${name}<small>${escapeHtml(url)}</small>${note}</a>`;
      })
      .filter(Boolean);
    return rows.length ? rows.join("") : '<div class="item-meta">No disponible.</div>';
  }

  function docsByType(docsList, docType) {
    const normalizedType = String(docType || "").trim().toLocaleLowerCase("es-CL");
    return docsList.filter((doc) => String(doc && doc.doc_type || "").trim().toLocaleLowerCase("es-CL") === normalizedType);
  }

  function buildConcessionExtraSection(item) {
    const hasConcessionExtra =
      isMeaningfulValue(item.potential) ||
      isMeaningfulValue(item.depth) ||
      isMeaningfulValue(item.study_date) ||
      isMeaningfulValue(item.study_source);
    if (!(item.is_available_concession === true && hasConcessionExtra)) {
      return "";
    }
    return [
      '<div class="card" style="border-color:rgba(45,122,79,0.45);background:rgba(45,122,79,0.2)">',
      "<strong>Concesión disponible</strong><br>",
      isMeaningfulValue(item.potential) ? `Potencial: ${escapeHtml(item.potential)}<br>` : "",
      isMeaningfulValue(item.depth) ? `Profundidad: ${escapeHtml(item.depth)}<br>` : "",
      (isMeaningfulValue(item.study_date) || isMeaningfulValue(item.study_source))
        ? `Ultimo estudio: ${isMeaningfulValue(item.study_date) ? escapeHtml(item.study_date) : "-"} ${isMeaningfulValue(item.study_source) ? "· " + escapeHtml(item.study_source) : ""}`
        : "",
      "</div>"
    ].join("");
  }

  function buildUsefulInfoHtml(item) {
    const usefulRows = [];
    const pushUseful = (label, value) => {
      if (value === null || value === undefined) return;
      const text = String(value).trim();
      if (!text || text === "-" || text.toLowerCase() === "n/a") return;
      usefulRows.push(`${label}: <strong>${escapeHtml(text)}</strong>`);
    };
    pushUseful("Tipo", prettyTypeLabel(item.site_type));
    pushUseful("Región", item.region);
    pushUseful("Empresa", item.mining_company);
    if (typeof item.latitude === "number" && typeof item.longitude === "number") {
      pushUseful("Coordenadas", `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`);
    }
    pushUseful("Producción", item.production);
    pushUseful("Superficie", item.surface);
    pushUseful("Altitud", item.altitude);
    return usefulRows.length
      ? usefulRows.join("<br>")
      : "Sin datos operativos adicionales útiles para este registro.";
  }

  function buildMandatoryInfoHtml(item) {
    const website = item.website && item.website !== "#"
      ? `<a class="inline-link-soft" href="${escapeHtml(item.website)}" target="_blank" rel="noreferrer">${escapeHtml(item.website)}</a>`
      : "<em>No disponible</em>";
    return [
      `Empresa operadora: <strong>${textOrUnavailable(item.mining_company)}</strong>`,
      `Desde cuándo opera: <strong>${textOrUnavailable(item.operation_since)}</strong>`,
      `Página web oficial: ${website}`
    ].join("<br>");
  }

  function openDetail(item) {
    els.modalTitle.textContent = item.name;
    const mineralPills = buildMineralPillsHtml(item);
    const freeSection = buildConcessionExtraSection(item);
    const concessionReliability = getConcessionReliability(item);
    const concessionEvidence = buildConcessionEvidenceHtml(item);
    const docsList = Array.isArray(item.docs) ? item.docs : [];
    const docs = docsList.length
      ? docsList
        .filter((doc) => doc && typeof doc.url === "string" && doc.url.startsWith("http"))
        .map((doc) => {
          const url = escapeHtml(doc.url);
          const name = escapeHtml(doc.name || doc.url);
          return `<a class="link-btn" style="margin-right:8px;background:#2b2b2b;color:#fff;border:1px solid var(--line)" href="${url}" target="_blank" rel="noreferrer">${name}</a>`;
        })
        .join("")
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

    const webBtn = (item.website && item.website !== "#")
      ? `<a class="link-btn" href="${item.website}" target="_blank" rel="noreferrer">Ver página corporativa</a>`
      : "";
    const environmentalReports = (Array.isArray(item.environmental_reports) && item.environmental_reports.length)
      ? item.environmental_reports
      : docsByType(docsList, "environmental_report");
    const operatingAuthorizations = (Array.isArray(item.operating_authorizations) && item.operating_authorizations.length)
      ? item.operating_authorizations
      : docsByType(docsList, "operating_authorization");
    const geologyStudies = (Array.isArray(item.geology_studies) && item.geology_studies.length)
      ? item.geology_studies
      : docsByType(docsList, "geology_study");
    const mineralLifeStudies = (Array.isArray(item.mineral_life_studies) && item.mineral_life_studies.length)
      ? item.mineral_life_studies
      : docsByType(docsList, "mineral_life_study");
    const mitigationStudies = (Array.isArray(item.mitigation_studies) && item.mitigation_studies.length)
      ? item.mitigation_studies
      : docsByType(docsList, "environmental_mitigation_study");
    const usefulHtml = buildUsefulInfoHtml(item);
    const mandatoryInfoHtml = buildMandatoryInfoHtml(item);

    els.modalContent.innerHTML = [
      `<div style="color:var(--gold);margin-bottom:10px">${item.site_type} · ${item.region}</div>`,
      `<div class="mineral-pill-row">${mineralPills}</div>`,
      `<div class="reliability-badge ${concessionReliability.className}">${concessionReliability.label}</div>`,
      `<div class="item-meta" style="margin:-4px 0 10px">${escapeHtml(concessionReliability.note)}</div>`,
      `<details class="detail-group" open><summary>Concesión (valor y fuente)</summary><div class="detail-group-body">${concessionEvidence}</div></details>`,
      `<details class="detail-group" open><summary>Datos públicos disponibles</summary><div class="detail-group-body">${mandatoryInfoHtml}</div></details>`,
      `<details class="detail-group" open><summary>Ficha del yacimiento</summary><div class="detail-group-body">${usefulHtml}</div></details>`,
      freeSection,
      `<details class="detail-group"><summary>Informes ambientales</summary><div class="detail-group-body"><div id="pin-source-links" style="display:grid;gap:8px;">${renderResourceLinks(environmentalReports)}</div></div></details>`,
      `<details class="detail-group"><summary>Autorizaciones de operación</summary><div class="detail-group-body"><div id="pin-source-links" style="display:grid;gap:8px;">${renderResourceLinks(operatingAuthorizations)}</div></div></details>`,
      `<details class="detail-group"><summary>Estudios geológicos y duración del mineral</summary><div class="detail-group-body"><div id="pin-source-links" style="display:grid;gap:8px;">${renderResourceLinks([...geologyStudies, ...mineralLifeStudies])}</div></div></details>`,
      `<details class="detail-group"><summary>Estudios de mitigación ambiental</summary><div class="detail-group-body"><div id="pin-source-links" style="display:grid;gap:8px;">${renderResourceLinks(mitigationStudies)}</div></div></details>`,
      `<details class="detail-group"><summary>Notas y noticias</summary><div class="detail-group-body">${item.notes || "Sin novedades por ahora."}</div></details>`,
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
    if (!ENABLE_VIEW_STATE_PERSISTENCE) return "collapsed";
    try {
      const saved = localStorage.getItem(MOBILE_SHEET_KEY);
      if (saved === "collapsed" || saved === "half" || saved === "full") {
        return saved;
      }
    } catch {}
    return "collapsed";
  }

  function persistMobileSheetState(state) {
    if (!ENABLE_VIEW_STATE_PERSISTENCE) return;
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
    const resetGestureState = () => {
      startY = 0;
      moved = false;
      startTs = 0;
      lastY = 0;
      lastTs = 0;
      velocityY = 0;
    };

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
      resetGestureState();
    };

    els.sheetGrab.addEventListener("pointerup", handlePointerEnd);
    els.sheetGrab.addEventListener("pointercancel", resetGestureState);
  }

  function wireUi() {
    const debouncedApply = debounce(applyFilters, 160);
    els.q.addEventListener("input", debouncedApply);
    els.q.addEventListener("change", applyFilters);
    els.mineral.addEventListener("change", applyFilters);
    els.region.addEventListener("change", applyFilters);
    els.commune.addEventListener("change", applyFilters);
    els.company.addEventListener("change", applyFilters);
    els.tipo.addEventListener("change", applyFilters);
    if (els.sort) els.sort.addEventListener("change", applyFilters);
    if (els.viewMode) {
      els.viewMode.addEventListener("change", async () => {
        await changeMode(els.viewMode.value);
      });
    }
    if (els.btnModeToggle) {
      els.btnModeToggle.addEventListener("click", async () => {
        const nextMode = getCurrentDatasetMode() === "concesiones" ? "minas" : "concesiones";
        await changeMode(nextMode);
      });
    }

    els.btnLibres.addEventListener("click", () => {
      if (pinViewMode !== "concesiones") return;
      onlyLibres = !onlyLibres;
      syncLibresButton();
      applyFilters();
    });

    els.btnReset.addEventListener("click", () => {
      resetFiltersAndApply();
    });
    if (!ENABLE_VIEW_STATE_PERSISTENCE) {
      if (els.btnSaveView) els.btnSaveView.style.display = "none";
      if (els.btnDefaultView) els.btnDefaultView.style.display = "none";
    } else if (els.btnSaveView) {
      els.btnSaveView.addEventListener("click", saveCurrentModePinnedView);
    }
    if (ENABLE_VIEW_STATE_PERSISTENCE && els.btnDefaultView) {
      els.btnDefaultView.addEventListener("click", restoreModeDefaultView);
    }
    if (els.btnExport) {
      els.btnExport.addEventListener("click", exportFilteredToCsv);
    }

    els.btnFit.addEventListener("click", fitToFiltered);
    els.list.addEventListener("scroll", maybeLoadMoreOnMobileScroll);
    els.list.addEventListener("click", (event) => {
      const node = event.target instanceof HTMLElement ? event.target.closest(".item[data-id]") : null;
      if (!node) return;
      const id = Number(node.getAttribute("data-id"));
      const item = itemById.get(id);
      if (!item) return;

      if (!mapEnabled || !map) {
        setSelectedMarker(id);
        if (isMobileViewport()) {
          setMobilePanelOpen(false);
        }
        openDetail(item);
        return;
      }

      const marker = markerById.get(id);
      if (!marker) {
        setSelectedMarker(id);
        openDetail(item);
        return;
      }

      map.flyTo([item.latitude, item.longitude], Math.max(7, map.getZoom()), { duration: 0.45 });
      marker.fire("click");
      if (isMobileViewport()) {
        setMobilePanelOpen(false);
      }
    });
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
      const targetLimit = isMobileViewport() ? LIST_PAGE_SIZE_MOBILE : LIST_PAGE_SIZE_DESKTOP;
      if (listRenderLimit > targetLimit * 3) {
        listRenderLimit = targetLimit;
        renderList();
      }
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
      ? L.markerClusterGroup({
        maxClusterRadius: 48,
        showCoverageOnHover: false,
        chunkedLoading: true,
        chunkInterval: 45,
        chunkDelay: 15,
        removeOutsideVisibleBounds: true,
        animate: false,
        animateAddingMarkers: false
      })
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

  async function waitForLeaflet(maxWaitMs = 12000) {
    if (window.L) return true;
    const startedAt = Date.now();
    return await new Promise((resolve) => {
      const probe = () => {
        if (window.L) {
          resolve(true);
          return;
        }
        if ((Date.now() - startedAt) >= maxWaitMs) {
          resolve(false);
          return;
        }
        setTimeout(probe, 50);
      };
      probe();
    });
  }

  function buildItemSearchText(item) {
    const locationParts = [
      item.region,
      item.city,
      item.commune,
      item.province,
      item.locality,
      item.location,
      item.operation_site,
      item.address
    ];
    return normalizeSearchValue([
      item.name || "",
      item.mining_company || "",
      item.site_type || "",
      ...(item.minerals || []),
      ...locationParts.filter(Boolean)
    ].join(" "));
  }

  function normalizeDatasetItems(items) {
    return items.map((item) => ({
      ...item,
      is_available_concession: normalizeConcessionAvailability(item.is_available_concession),
      _searchText: buildItemSearchText(item)
    }));
  }

  function rebuildIndexes(items) {
    itemById.clear();
    mineralIndex.clear();
    regionIndex.clear();
    communeIndex.clear();
    companyIndex.clear();
    tipoIndex.clear();
    libresItems = [];
    items.forEach((item) => {
      itemById.set(item.id, item);
      if (item.is_available_concession === true) libresItems.push(item);
      addToIndex(regionIndex, item.region, item);
      addToIndex(communeIndex, item.commune, item);
      addToIndex(companyIndex, item.mining_company, item);
      addToIndex(tipoIndex, item.site_type, item);
      (item.minerals || []).forEach((mineral) => addToIndex(mineralIndex, mineral, item));
    });
  }

  async function bootstrap() {
    purgeLegacyViewStateStorageOnce();
    initGtm();
    renderLegend();
    wireUi();
    els.status.textContent = "Inicializando visualizador...";
    void loadLinkHealth();

    try {
      const leafletReady = await waitForLeaflet();
      if (!leafletReady) {
        throw new Error("Leaflet no está disponible.");
      }
      initMap();
    } catch (mapError) {
      mapEnabled = false;
      showMapUnavailableNotice("Puedes navegar los datos desde el panel lateral. Revisa la conexión o restricciones de CDN para habilitar el mapa.");
      console.error(mapError);
    }

    try {
      const store = loadFilterStore();
      const preferredMode = store.lastMode === "concesiones" ? "concesiones" : "minas";
      pinViewMode = preferredMode;
      syncModeControls();
      syncLibresButton();
      // Warm both datasets in parallel to speed mode switching.
      void Promise.allSettled([prefetchMode("minas"), prefetchMode("concesiones")]);
      await loadAndRenderCurrentMode();
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
