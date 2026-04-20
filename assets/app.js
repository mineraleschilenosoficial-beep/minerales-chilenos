(function () {
  const cfg = window.APP_CONFIG || {};
  const DATA_URL = cfg.DATA_URL || "./data/yacimientos.json";
  const CACHE_KEY = cfg.CACHE_KEY || "mineraleschilenos:data:v1";
  const CACHE_TTL_MS = cfg.CACHE_TTL_MS || 1000 * 60 * 60 * 6;

  const LEAFLET_JS = [
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"
  ];
  const LEAFLET_CSS = [
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"
  ];
  const CLUSTER_JS = [
    "https://unpkg.com/leaflet.markercluster@1.5.0/dist/leaflet.markercluster.js",
    "https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.0/dist/leaflet.markercluster.js"
  ];
  const CLUSTER_CSS = [
    "https://unpkg.com/leaflet.markercluster@1.5.0/dist/MarkerCluster.css",
    "https://unpkg.com/leaflet.markercluster@1.5.0/dist/MarkerCluster.Default.css",
    "https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.0/dist/MarkerCluster.css",
    "https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.0/dist/MarkerCluster.Default.css"
  ];

  function injectStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error(`No se pudo cargar script: ${src}`));
      document.head.appendChild(s);
    });
  }

  async function ensureLeaflet() {
    LEAFLET_CSS.forEach(injectStyle);
    if (!window.L) {
      for (const src of LEAFLET_JS) {
        try {
          await loadScript(src);
          if (window.L) break;
        } catch {}
      }
    }
    if (!window.L) {
      throw new Error("Leaflet no pudo cargarse desde CDN.");
    }
  }

  async function ensureCluster() {
    CLUSTER_CSS.forEach(injectStyle);
    if (typeof L.markerClusterGroup !== "function") {
      for (const src of CLUSTER_JS) {
        try {
          await loadScript(src);
          if (typeof L.markerClusterGroup === "function") break;
        } catch {}
      }
    }
  }

  function addBaseTileLayer(targetMap) {
    const providers = [
      {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        opts: {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap"
        }
      },
      {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        opts: {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap &copy; CARTO"
        }
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        opts: {
          maxZoom: 19,
          attribution: "Tiles &copy; Esri"
        }
      }
    ];

    let index = 0;
    let layer = null;

    const mount = () => {
      if (layer) {
        targetMap.removeLayer(layer);
      }
      const current = providers[index];
      layer = L.tileLayer(current.url, current.opts);
      layer.once("tileerror", () => {
        if (index < providers.length - 1) {
          index += 1;
          mount();
        }
      });
      layer.addTo(targetMap);
    };

    mount();
  }

  let map = null;
  let cluster = null;

  let allItems = [];
  let filtered = [];
  let onlyLibres = false;
  const markerById = new Map();

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

  function setTopKpis(meta, items) {
    const libres = items.filter((x) => x.libre).length;
    const activos = items.length - libres;
    const html = [
      `<div class="kpi">${items.length} puntos</div>`,
      `<div class="kpi">${activos} activos</div>`,
      `<div class="kpi">${libres} disponibles</div>`,
      `<div class="kpi">Actualizado: ${formatDate(meta && meta.updatedAt)}</div>`
    ].join("");
    els.topKpis.innerHTML = html;
  }

  function setStatus(origin, totalShown, totalAll, updatedAt) {
    const label = origin === "cache" ? "cache local" : "fuente remota";
    els.status.textContent = `Mostrando ${totalShown} de ${totalAll}. Fuente: ${label}. Ultima actualizacion: ${formatDate(updatedAt)}.`;
  }

  function fillSelect(selectEl, values, placeholder) {
    const options = [`<option value="">${placeholder}</option>`];
    Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .forEach((v) => {
        options.push(`<option value="${v}">${v}</option>`);
      });
    selectEl.innerHTML = options.join("");
  }

  function buildMarker(item) {
    const html = [
      `<div class="marker-pin" style="background:${colorFor(item)}">`,
      `<span>${symbolFor(item)}</span>`,
      "</div>"
    ].join("");
    const icon = L.divIcon({
      html,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });
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
        const marker = markerById.get(id);
        if (!marker) return;
        map.flyTo([item.lat, item.lng], Math.max(7, map.getZoom()), { duration: 0.45 });
        marker.fire("click");
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

    cluster.clearLayers();
    markerById.clear();
    filtered.forEach((x) => {
      const marker = buildMarker(x);
      markerById.set(x.id, marker);
      cluster.addLayer(marker);
    });

    renderList();
    setStatus(window.__dataOrigin || "remote", filtered.length, allItems.length, window.__dataUpdatedAt || null);
  }

  function fitToFiltered() {
    if (!filtered.length) return;
    const bounds = L.latLngBounds(filtered.map((x) => [x.lat, x.lng]));
    map.fitBounds(bounds.pad(0.25), { animate: true, duration: 0.55 });
  }

  function saveCache(payload) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), payload }));
    } catch {}
  }

  function loadCache() {
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

  async function loadData() {
    const cache = loadCache();
    if (cache && Array.isArray(cache.items)) {
      window.__dataOrigin = "cache";
      return cache;
    }
    const res = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar data.");
    const json = await res.json();
    if (!json || !Array.isArray(json.items)) throw new Error("Formato de data invalido.");
    saveCache(json);
    window.__dataOrigin = "remote";
    return json;
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
      ? item.docs.map((d) => {
          return `<a class="link-btn" style="margin-right:8px;background:#2b2b2b;color:#fff;border:1px solid var(--line)" href="${d.url}" target="_blank" rel="noreferrer">${d.n}</a>`;
        }).join("")
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
  }

  async function bootstrap() {
    wireUi();
    try {
      await ensureLeaflet();
      await ensureCluster();
      map = L.map("map", { center: [-30.5, -70.2], zoom: 5 });
      cluster = (typeof L.markerClusterGroup === "function")
        ? L.markerClusterGroup({ maxClusterRadius: 48, showCoverageOnHover: false })
        : L.layerGroup();
      map.addLayer(cluster);
      addBaseTileLayer(map);

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
      applyFilters();
      fitToFiltered();
      setTimeout(() => map.invalidateSize(), 100);
      window.addEventListener("resize", () => map.invalidateSize());
    } catch (error) {
      els.status.textContent = "No fue posible cargar mapa o datos. Revisa conexion/CDN y data/yacimientos.json.";
      console.error(error);
    }
  }

  bootstrap();
})();
