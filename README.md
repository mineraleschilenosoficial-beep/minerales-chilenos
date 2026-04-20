# minerales-chilenos

Sitio estático frontend de `MineralesChilenos.cl`, listo para publicar en GitHub Pages.

## Archivos principales

- `index.html`: composición de UI y carga de recursos.
- `assets/site.css`: estilos y responsive.
- `assets/app.js`: lógica de mapa, filtros, modal y cache local.
- `assets/config.js`: configuración central (data URL y cache).
- `CNAME`: dominio personalizado (`www.mineraleschilenos.cl`).
- `data/yacimientos.json`: fuente de datos editable del mapa (sin backend).
- `404.html`: página de error para navegación rota.
- `robots.txt`: reglas para motores de búsqueda.
- `sitemap.xml`: sitemap básico del sitio.

## Publicación en GitHub Pages

1. Ve a `Settings > Pages` en el repositorio.
2. En `Source`, selecciona `Deploy from a branch`.
3. Elige la rama publicada y carpeta `/ (root)`.
4. Guarda y espera la publicación.
5. Verifica que el dominio personalizado esté activo con `CNAME`.

## Desarrollo local

Como es estático, puedes abrir `index.html` directamente o servirlo con cualquier servidor simple.

Ejemplo con Python:

```bash
python3 -m http.server 8080
```

## Actualización automática (frontend-only)

El sitio carga datos desde `data/yacimientos.json` y usa cache local temporal del navegador:

- Si hay conexión, intenta cargar la versión más nueva de `data/yacimientos.json`.
- Si falla o está reciente, usa cache local para mantener continuidad.
- La información de "Última actualización" se toma de `meta.updatedAt`.

### Flujo sugerido para mantener datos organizados

1. Editar solo `data/yacimientos.json`.
2. Mantener estructura:
   - `meta` con `updatedAt`, `version`, `source`.
   - `meta.sources` con enlaces exactos de fuentes oficiales.
   - `items` con registros de yacimientos/concesiones.
3. Hacer commit y push.
4. GitHub Pages publica automáticamente.

Esto permite actualizar contenido sin tocar lógica de UI.

## Verificación de enlaces

Audita enlaces externos de:

- `index.html` (CDN/fuentes/scripts)
- `data/yacimientos.json` (`web` y `docs.url`)

Ejecutar:

```bash
python3 scripts/link_audit.py
```

Resultado:

- `reports/link-check-report.json`

Notas:

- Los enlaces de `preconnect` se marcan como `skipped` porque no están pensados para responder `200`.
- Códigos `401/403` se consideran "existentes pero restringidos".
- Problemas de certificado SSL externo se marcan como `ssl_warning` (warning no bloqueante).

## Validación de datos

Valida esquema y calidad mínima de `data/yacimientos.json`:

```bash
python3 scripts/validate_data.py
```

Chequeos incluidos:

- `meta.updatedAt`, `meta.version`, `meta.source` obligatorios.
- `items[*]` con campos mínimos (`id`, `nombre`, `mineral`, `lat`, `lng`, `region`, `tipo`, `libre`).
- `id` único, coordenadas válidas y URLs con formato correcto.
- advertencia si `meta.updatedAt` es antiguo.

## Actualización diaria automática

Se incluyó workflow de GitHub Actions:

- `.github/workflows/daily-data-refresh.yml`

Qué hace diariamente:

1. Ejecuta `scripts/daily_refresh.py`.
2. Ejecuta `scripts/validate_data.py`.
3. Ejecuta `scripts/link_audit.py`.
4. Si hay cambios, hace commit y push automático.

Opcional (fuente remota de datos):

- Define el secreto `DATA_JSON_SOURCE_URL` con una URL JSON pública que entregue:
  - `{ "meta": {...}, "items": [...] }`

Si no defines ese secreto, se mantiene `items` local y solo se actualizan metadatos de verificación.
