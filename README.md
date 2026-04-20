# minerales-chilenos

Sitio estático frontend de `MineralesChilenos.cl`, listo para publicar en GitHub Pages.

## Archivos principales

- `index.html`: aplicación principal (mapa interactivo + modal de detalle).
- `CNAME`: dominio personalizado (`www.mineraleschilenos.cl`).
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
