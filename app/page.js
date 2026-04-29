export default function HomePage() {
  return (
    <>
      <div id="gtm-noscript" />
      <div id="app" className="relative">
        <header>
          <div className="logo font-semibold tracking-wide">
            <span className="dot" />
            MineralesChilenos.cl
          </div>
          <button id="btn-mode-toggle" className="header-mode-btn" type="button" aria-label="Cambiar mapa">
            Mapa: Minas
          </button>
          <button id="btn-mobile-panel" className="mobile-panel-btn" type="button" aria-controls="sidebar" aria-expanded="false">
            Filtros
          </button>
          <div id="health-badge" aria-live="polite" />
          <div className="top-kpis" id="topKpis" />
        </header>

        <div id="mobile-filter-bar" aria-live="polite" />

        <aside id="sidebar">
          <div className="sheet-grab" aria-hidden="true" />
          <section className="panel">
            <h2>Filtros</h2>
            <div className="field">
              <label htmlFor="q">Buscar</label>
              <input id="q" type="text" placeholder="Empresa, minera, ciudad, yacimiento o región" />
            </div>
            <div className="field">
              <label htmlFor="f-mineral">Mineral</label>
              <select id="f-mineral" />
            </div>
            <div className="field">
              <label htmlFor="f-region">Región</label>
              <select id="f-region" />
            </div>
            <div className="field">
              <label htmlFor="f-commune">Comuna</label>
              <select id="f-commune" />
            </div>
            <div className="field">
              <label htmlFor="f-company">Empresa</label>
              <select id="f-company" />
            </div>
            <div className="field">
              <label htmlFor="f-tipo">Tipo</label>
              <select id="f-tipo" />
            </div>
            <div className="field">
              <label htmlFor="f-sort">Ordenar</label>
              <select id="f-sort" defaultValue="relevancia">
                <option value="relevancia">Relevancia</option>
                <option value="nombre_asc">Nombre (A-Z)</option>
                <option value="region_asc">Región (A-Z)</option>
                <option value="empresa_asc">Empresa (A-Z)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-viewmode">Mapa</label>
              <select id="f-viewmode" defaultValue="minas">
                <option value="minas">Minas</option>
                <option value="concesiones">Concesiones</option>
              </select>
            </div>
            <div className="row">
              <button id="btn-libres" aria-pressed="false">Solo concesiones disponibles</button>
              <button id="btn-reset">Limpiar</button>
              <button id="btn-save-view">Guardar vista</button>
              <button id="btn-default-view">Vista por defecto</button>
              <button id="btn-export">Exportar CSV</button>
              <button id="btn-fit" className="btn-gold">Ajustar mapa</button>
            </div>
            <div id="status" />
          </section>

          <section className="panel">
            <h2>Resultados</h2>
            <div id="list" />
          </section>

          <section className="panel">
            <h2>Calidad Del Dataset</h2>
            <div id="quality-panel" />
          </section>
        </aside>

        <div id="map" />
      </div>
      <div id="global-loading" className="app-loading-overlay is-active" role="status" aria-live="polite" aria-atomic="true">
        <div className="app-loading-card">
          <div className="app-loading-spinner" aria-hidden="true" />
          <div id="global-loading-title" className="app-loading-title">Inicializando visualizador...</div>
          <div id="global-loading-subtitle" className="app-loading-subtitle">Cargando mapa y datos base.</div>
        </div>
      </div>

      <div id="mobile-backdrop" aria-hidden="true" />

      <aside className="legend is-collapsed" id="legend-panel">
        <div className="legend-header">
          <h3>Leyenda</h3>
          <button id="btn-legend-toggle" type="button" aria-controls="legend-list" aria-expanded="false" aria-label="Expandir leyenda">
            <span className="legend-toggle-icon" aria-hidden="true" />
          </button>
        </div>
        <div id="legend-list" />
      </aside>

      <a
        className="whatsapp-contact-float"
        href="https://wa.me/56972113436"
        target="_blank"
        rel="noreferrer"
        aria-label="Contáctanos por WhatsApp al +56 9 7211 3436"
      >
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <path d="M19.11 17.31c-.27-.14-1.59-.78-1.83-.87-.25-.09-.43-.14-.61.14-.18.27-.7.87-.86 1.05-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.2-1.34-.82-.73-1.37-1.63-1.53-1.9-.16-.27-.02-.41.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.46h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.98 2.63 1.11 2.81.14.18 1.92 2.93 4.65 4.11.65.28 1.16.45 1.56.58.66.21 1.27.18 1.75.11.53-.08 1.59-.65 1.82-1.28.23-.64.23-1.18.16-1.28-.07-.09-.25-.14-.52-.27z" />
          <path d="M16.01 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.24.58 4.42 1.68 6.35L3.2 28.8l6.59-1.73a12.75 12.75 0 0 0 6.22 1.61h.01c7.07 0 12.79-5.73 12.79-12.8S23.08 3.2 16.01 3.2zm0 23.22h-.01a10.38 10.38 0 0 1-5.29-1.45l-.38-.23-3.91 1.03 1.05-3.81-.25-.39a10.37 10.37 0 0 1-1.61-5.5c0-5.74 4.67-10.41 10.41-10.41 2.78 0 5.39 1.08 7.36 3.05a10.35 10.35 0 0 1 3.05 7.36c0 5.74-4.67 10.41-10.42 10.41z" />
        </svg>
        <span>Contáctanos</span>
      </a>

      <div id="detail-modal">
        <div className="modal-header">
          <h3 className="modal-title" id="modal-title">Detalle</h3>
          <button className="close" id="btn-close-modal" aria-label="Cerrar">x</button>
        </div>
        <div className="modal-body" id="modal-content" />
      </div>
      <div id="detail-backdrop" aria-hidden="true" />
    </>
  );
}
