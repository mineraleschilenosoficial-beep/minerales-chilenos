# minerales-chilenos

Aplicación web para `MineralesChilenos.cl` preparada para desplegar en Coolify con backend Python + PostgreSQL.

## Arquitectura actual

- `api/server.py`: API HTTP y servidor de archivos estáticos.
- `assets/app.js`: frontend (mapa, filtros, modal y cache local del navegador).
- `assets/config.js`: endpoints de la API y configuración de cache/GTM.
- `scripts/storage.py`: persistencia relacional en PostgreSQL mediante ORM (SQLAlchemy).
- `scripts/daily_refresh.py`: refresca dataset.
- `scripts/validate_data.py`: valida esquema/calidad del dataset.
- `scripts/link_audit.py`: audita enlaces y genera reporte.
- `scripts/manual_overrides.sql`: plantilla SQL para correcciones manuales confiables.
- `scripts/source_extractor_rules.json`: reglas de extracción estructurada para campos mandatorios.
- `scripts/refresh_cycle.py`: ejecuta refresh + validación + auditoría.
- `Dockerfile`: imagen para despliegue en Coolify.
- `requirements.txt`: dependencias Python.

## Desarrollo local

1. Instalar dependencias:

```bash
python3 -m pip install -r requirements.txt
```

2. Definir base de datos (obligatorio):

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/minerales"
```

3. Ejecutar API:

```bash
python3 api/server.py
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
python3 scripts/daily_refresh.py
```

Opcional: cargar overrides manuales confiables antes del refresh:

```bash
psql "$DATABASE_URL" -f scripts/manual_overrides.sql
```

4. Validar dataset:

```bash
python3 scripts/validate_data.py
```

5. (Opcional) Ejecutar API local:

```bash
python3 api/server.py
```

- `http://localhost:8000`

6. Detener entorno:

```bash
docker compose -f docker-compose.local.yml down
```

## Google Tag Manager (GTM)

1. Abre `assets/config.js`.
2. Define tu contenedor real:

```js
GTM_ID: "GTM-XXXXXXX"
```

Con eso, el sitio carga automáticamente:

- script de GTM (`gtm.js`) en `<head>`,
- fallback `<noscript>` con `iframe` en `<body>`.

## Flujo de datos

La UI consume:

- `GET /api/yacimientos`
- `GET /api/link-report`

Convención de campos del dataset:

- Canónicos en inglés para almacenamiento/API (`name`, `minerals`, `latitude`, `longitude`, `site_type`, `mining_company`, `is_available_concession`).
- No hay aliases en español: todos los consumidores deben usar la convención en inglés.
- Si la DB tiene registros legacy en español, ejecutar `python3 scripts/daily_refresh.py` para migrar/reconstruir el dataset antes de levantar la API.
- En UI se prioriza mostrar datos públicamente verificables. Campos sensibles (por ejemplo salarios/ingresos/dotación por faena) pueden venir como `not_public` o `not_disclosed`.

Persistencia:

- PostgreSQL (`DATABASE_URL`) como única fuente de datos (esquema relacional normalizado; sin `app_state` JSON).

Comportamiento de lectura frontend:

- Si hay conexión, intenta cargar la versión más nueva de `/api/yacimientos`.
- Si falla o está reciente, usa cache local para mantener continuidad.
- La información de "Última actualización" se toma de `meta.updatedAt`.

### Flujo recomendado para actualizar datos

1. Ejecutar:

```bash
python3 scripts/refresh_cycle.py
```

2. Mantener estructura:
   - `meta` con `updatedAt`, `version`, `source`.
   - `meta.sources` con enlaces exactos de fuentes oficiales.
   - `items[*].sources` con fuentes específicas por pin.
   - `items` con registros de yacimientos/concesiones.
3. Verificar salida en logs y en `GET /api/yacimientos`.

## Verificación de enlaces

Audita enlaces externos de:

- `index.html` (CDN/fuentes/scripts)
- dataset almacenado en PostgreSQL (`items[*].website` y `items[*].docs[*].url`)

Ejecutar:

```bash
python3 scripts/link_audit.py
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
python3 scripts/validate_data.py
```

Chequeos incluidos:

- `meta.updatedAt`, `meta.version`, `meta.source` obligatorios.
- `items[*]` con campos mínimos (`id`, `name`, `minerals`, `latitude`, `longitude`, `region`, `site_type`, `is_available_concession`, `mining_company`, `operation_since`, `website`).
- `id` único, coordenadas válidas y URLs con formato correcto.
- `meta.sources.url` y `items[*].docs[*].url` deben ser URLs específicas (no homepage/root).
- `items[*].sources[*].url` también debe ser específica (no homepage/root).
- advertencia si `meta.updatedAt` es antiguo.

## Despliegue en Coolify

### 1) Servicio principal

- Tipo: `Dockerfile`.
- Puerto: `8000`.
- Start command: usa `CMD` de Dockerfile (`gunicorn --bind 0.0.0.0:8000 api.server:app`).
- Variables requeridas:
  - `DATABASE_URL` (PostgreSQL de Coolify o externo).
  - `DATA_JSON_SOURCE_URL` (opcional, JSON remoto con `{meta, items}` para poblar/actualizar datos).

Si no defines `DATA_JSON_SOURCE_URL` y la DB está vacía, el sistema hace scraping con la fuente integrada verificada USGS MRDS (WFS para Chile).

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
python3 scripts/refresh_cycle.py
```

### 4) Workflows de GitHub

- Se eliminó el workflow de GitHub Actions para refresh automático.
