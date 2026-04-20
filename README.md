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
   - `items` con registros de yacimientos/concesiones.
3. Hacer commit y push.
4. GitHub Pages publica automáticamente.

Esto permite actualizar contenido sin tocar lógica de UI.
