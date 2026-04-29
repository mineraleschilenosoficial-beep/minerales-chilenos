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

      <div id="mobile-backdrop" aria-hidden="true" />

      <aside className="legend">
        <h3>Leyenda</h3>
        <div id="legend-list" />
      </aside>

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
