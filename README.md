# minerales-chilenos

Aplicación web para `MineralesChilenos.cl` preparada para desplegar en Coolify con frontend Next.js + backend FastAPI + PostgreSQL y pipeline Python de refresh.

## Arquitectura actual

- `app/page.js`: shell frontend servido por Next.js.
- `public/assets/app.js`: frontend (mapa, filtros, modal y cache local del navegador).
- `next.config.js`: rewrite de `/api/*` hacia FastAPI.
- `api/server.py`: backend FastAPI (`/api/minas`, `/api/concesiones`, `/api/yacimientos`, `/api/link-report`, `/api/health`).
- `scripts/storage.py`: persistencia relacional en PostgreSQL mediante ORM (SQLAlchemy).
- `scripts/daily_refresh.py`: refresca dataset.
- `scripts/refresh/sernageomin_source.py`: ingesta oficial de concesiones desde Catastro Minero SERNAGEOMIN (FeatureServer), con normalización de comuna/región y descarte de outliers geográficos.
- `scripts/tools/validate_data.py`: valida esquema/calidad del dataset.
- `scripts/tools/link_audit.py`: audita enlaces y genera reporte.
- `scripts/tools/bootstrap_runtime.py`: migración automática de esquema al iniciar runtime.
- `scripts/tools/refresh_cycle.py`: ejecuta refresh + validación + auditoría.
- `Dockerfile`: imagen para despliegue en Coolify.
- `requirements.txt`: dependencias Python.

## Desarrollo local

Arranque rapido (un comando):

```bash
.venv/bin/python scripts/tools/run_local.py --docker-db --quick
```

- `--docker-db`: levanta PostgreSQL local con `docker compose`.
- `--inject-data`: ejecuta inyección de datos (`refresh_cycle`) antes de iniciar servicios.
- `--no-inject-data`: inicia servicios sin inyección de datos.
- `--refresh`: alias legacy de `--inject-data`.
- `--fast`: con `--refresh`, omite `link_audit` para iterar mas rapido.
- `--quick`: modo rapido real para desarrollo (omite validacion y limita filas de ingesta).
- `--max-records N`: limite opcional de filas SERNAGEOMIN para acelerar refresh local.

Ejemplos directos:

```bash
# con inyección de datos
.venv/bin/python scripts/tools/run_local.py --docker-db --inject-data

# sin inyección de datos
.venv/bin/python scripts/tools/run_local.py --docker-db --no-inject-data
```

1. Crear entorno local con `uv` (recomendado, una sola vez):

```bash
uv venv .venv
uv pip install --python .venv/bin/python -r requirements.txt
```

2. Definir base de datos (obligatorio):

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/minerales"
```

3. Ejecutar servicio web+api:

```bash
.venv/bin/python scripts/tools/run_service.py --port 8000 --api-port 8001
```

Opcional (producción o proxy externo):

```bash
export NEXT_PUBLIC_API_BASE_URL="https://api.tu-dominio.cl"
```

4. Abrir:

- `http://localhost:8000`

## Desarrollo local con Docker

1. Levantar solo PostgreSQL:

```bash
docker compose -f docker-compose.local.yml up -d
```

2. Definir conexión local a PostgreSQL:

```bash
export DATABASE_URL="postgresql://minerales:minerales@localhost:5432/minerales"
```

3. Inicializar/actualizar dataset desde tu entorno local:

```bash
.venv/bin/python scripts/daily_refresh.py
```

Notas:
- El refresh usa una sola fuente oficial: Catastro Minero SERNAGEOMIN.
- Variables opcionales: `SERNAGEOMIN_CONCESSION_LAYER_URL`, `SERNAGEOMIN_CONCESSION_TIMEOUT_SECONDS`, `SERNAGEOMIN_CONCESSION_PAGE_SIZE`.

4. Validar dataset:

```bash
.venv/bin/python scripts/tools/validate_data.py
```

5. (Opcional) Ejecutar servicio web+api local:

```bash
.venv/bin/python scripts/tools/run_service.py --port 8000 --api-port 8001
```

- `http://localhost:8000`

6. Detener entorno:

```bash
docker compose -f docker-compose.local.yml down
```

## Google Tag Manager (GTM)

1. Abre `public/assets/config.js`.
2. Define tu contenedor real:

```js
GTM_ID: "GTM-XXXXXXX"
```

Con eso, el sitio carga automáticamente:

- script de GTM (`gtm.js`) en `<head>`,
- fallback `<noscript>` con `iframe` en `<body>`.

## Flujo de datos

La UI consume:

- `GET /api/minas`
- `GET /api/concesiones`
- `GET /api/yacimientos` (compatibilidad/backward)
- `GET /api/link-report`

Convención de campos del dataset:

- Canónicos en inglés para almacenamiento/API (`name`, `minerals`, `latitude`, `longitude`, `site_type`, `mining_company`, `is_available_concession`).
- No hay aliases en español: todos los consumidores deben usar la convención en inglés.
- Si la DB tiene registros legacy en español, ejecutar `.venv/bin/python scripts/daily_refresh.py` para migrar/reconstruir el dataset antes de levantar la API.
- En UI se prioriza mostrar datos públicamente verificables. Campos sensibles (por ejemplo salarios/ingresos/dotación por faena) pueden venir como `not_public` o `not_disclosed`.
- `meta.scrapeStats` publica totales por estado de concesión (`CONSTITUIDA`, `EN TRAMITE`, `ELIMINADA`) y conteos de disponibilidad.
- El refresh normaliza `commune`, deriva `region` por coordenadas y persiste campos accesorios (`concession_type`, `concession_status`, `concession_role`, `concession_id`, `concession_commune_code`).
- Se descartan puntos fuera del bounding de Chile y outliers geográficos por comuna para evitar registros inconsistentes.
- En cada refresh se registra `field_provenance` para `is_available_concession` y, cuando exista, para `mining_company` y `operation_since`.
- Regla actual de `is_available_concession`: `true` cuando `SITUACION_CONCESION=ELIMINADA`; en otros estados `false`.

Persistencia:

- PostgreSQL (`DATABASE_URL`) como única fuente de datos (esquema relacional normalizado; sin `app_state` JSON).

Comportamiento de lectura frontend:

- Selector `Mapa`:
  - `Minas`: carga `/api/minas` desde fuente dedicada `Datos Abiertos Chile - Faenas en Chile (CSV)`.
  - `Concesiones`: carga `/api/concesiones` (catastro oficial completo).
- Filtros principales en UI: `Región`, `Comuna` y `Empresa` (además de búsqueda y tipo).
- Si hay conexión, intenta cargar la versión más nueva del endpoint correspondiente al mapa activo.
- Si falla o está reciente, usa cache local para mantener continuidad.
- La información de "Última actualización" se toma de `meta.updatedAt`.
- En `Minas` se descartan pines con coordenadas inválidas, fuera de Chile, con región inconsistente por bounds, o outliers por comuna (distancia al centro comunal).

### Flujo recomendado para actualizar datos

1. Ejecutar:

```bash
.venv/bin/python scripts/tools/refresh_cycle.py
```

Modo rápido local (iteraciones de desarrollo):

```bash
FAST_LOCAL_MODE=true .venv/bin/python scripts/tools/refresh_cycle.py
```

Este modo desactiva `link_audit` para acelerar iteraciones locales.

2. Mantener estructura:
   - `meta` con `updatedAt`, `version`, `source`.
   - `meta.sources` con enlaces exactos de fuentes oficiales.
   - `items[*].sources` con fuentes específicas por pin.
   - `items` con registros de yacimientos/concesiones.
3. Verificar salida en logs y en `GET /api/concesiones` (y `GET /api/minas` para vista minera).

## Verificación de enlaces

Audita enlaces externos de:

- `app/layout.js` (CDN/fuentes/scripts cargados por Next.js)
- dataset almacenado en PostgreSQL (`items[*].website` y `items[*].docs[*].url`)

Ejecutar:

```bash
.venv/bin/python scripts/tools/link_audit.py
```

Resultado:

- reporte persistido en tablas relacionales (`link_report_runs` / `link_report_results`).

Notas:

- Los enlaces de `preconnect` se marcan como `skipped` porque no están pensados para responder `200`.
- Códigos `401/403` se consideran "existentes pero restringidos".
- Problemas de certificado SSL externo se marcan como `ssl_warning` (warning no bloqueante).

## Validación de datos

Valida esquema y calidad mínima del dataset en PostgreSQL:

```bash
.venv/bin/python scripts/tools/validate_data.py
```

Chequeos incluidos:

- `meta.updatedAt`, `meta.version`, `meta.source` obligatorios.
- `items[*]` con campos mínimos (`id`, `name`, `minerals`, `latitude`, `longitude`, `region`, `site_type`, `is_available_concession`, `mining_company`, `operation_since`, `website`).
- `id` único, coordenadas válidas y URLs con formato correcto.
- `meta.sources.url` y `items[*].docs[*].url` deben ser URLs específicas (no homepage/root).
- `items[*].sources[*].url` también debe ser específica (no homepage/root).
- Gate opcional de cobertura mandatoria con `MANDATORY_FIELD_COVERAGE_MIN` (`0..1`).
- Si un campo mandatorio viene informado, debe tener URL de fuente válida (`field_provenance` para campos escalares y URL válida en listas documentales).
- Valores `inferred` de baja confianza en campos mandatorios se mantienen en cola de curación manual para revisión.
- Ventana de frescura de fuentes validable con `SOURCE_FRESHNESS_MAX_DAYS` (por defecto `7`) usando `source_catalog.last_checked_at`.
- Se registra auditoría inmutable por campo en `mine_field_audit` con `old_value`, `new_value`, `source_type`, `source_url`, `process_name` y `changed_at`.
- Cada registro ahora expone `record_status` (`complete`/`incomplete`) y `mandatory_gaps`; el estado solo puede ser `complete` si todos los campos mandatorios tienen fuente y fecha de actualización válidas.
- advertencia si `meta.updatedAt` es antiguo.

## Despliegue en Coolify

### 1) Servicio principal

- Tipo: `Dockerfile`.
- Puerto: `8000`.
- Start command: usa `CMD` de Dockerfile (`python3 scripts/tools/bootstrap_runtime.py && python3 -m uvicorn api.server:app --host 0.0.0.0 --port 8001 & yarn start --port 8000`).
- Variables requeridas:
  - `DATABASE_URL` (PostgreSQL de Coolify o externo).
- Variables opcionales de bootstrap:
  - `AUTO_BOOTSTRAP_DATASET` (`true` por defecto): si no hay dataset, ejecuta refresh+validate al iniciar.

Si la DB está vacía, el sistema construye dataset desde la fuente oficial SERNAGEOMIN integrada en el refresh.
Antes de levantar API, el runtime ejecuta migraciones de esquema automáticamente.

### 2) Base de datos PostgreSQL

- Crear servicio PostgreSQL en Coolify.
- Conectar su URL al `DATABASE_URL` del servicio principal.
- Las tablas relacionales se crean automáticamente al primer uso (sin almacenamiento JSON legacy).

### 3) Cronjob en Coolify (cada 4 horas)

- Crear Cron Job en Coolify contra el mismo repositorio/imagen.
- Schedule:

```cron
0 */4 * * *
```

- Command:

```bash
python3 scripts/tools/refresh_cycle.py
```

### 4) Workflows de GitHub

- Se eliminó el workflow de GitHub Actions para refresh automático.
