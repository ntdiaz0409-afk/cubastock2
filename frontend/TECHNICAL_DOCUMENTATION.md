# Documentación técnica de CubaStock Frontend

## Arquitectura y puntos de extensión

`src/main.jsx` monta `App.jsx`. `App` restaura la sesión y selecciona `AdminDashboard` o `DependienteDashboard` según `user.role`. Cada dashboard conserva su navegación interna mediante estado `view`; no hay enrutador externo. Las páginas llaman a la API mediante `src/api.js` y comparten los componentes, hooks y estilos de `App.css`.

Para modificar una capacidad concreta, usa este mapa:

| Área | Archivo responsable | Colaboradores principales |
| --- | --- | --- |
| Inicio de sesión y sesión | `src/App.jsx` | `src/api.js`, `hooks/useTheme.js` |
| Catálogo y existencias | `src/pages/InventoryPage.jsx` | `useProducts`, `ProductCard`, modales de producto/stock |
| Registro de ventas | `src/pages/SalesPage.jsx` | `useProducts`, `db/syncQueue.js`, API de ventas |
| Indicadores | `src/pages/StatisticsPage.jsx` | `useSalesStats`, `SalesChart` |
| Reportes | `src/pages/ReportsPage.jsx` | API de reportes y comparativas |
| Dependientes y turnos | `src/pages/DependentsPage.jsx` | API de usuarios y turnos |
| Historial | `src/pages/HistoryPage.jsx` | `SaleDetailsModal` |
| Estado sin conexión | `src/db/db.js` | `src/db/syncQueue.js`, `useOffline`, `OfflineIndicator` |
| Tema y presentación | `src/hooks/useTheme.js` | `App.css`, `AnimatedBackground` |
| Identidad visual | `public/branding/` | `components/Logo.jsx`, `index.html`, manifest y `sw.js` |

## Configuración que no admite comentarios internos

Los archivos JSON y `.env` no llevan comentarios para preservar su sintaxis y comportamiento. Su responsabilidad queda documentada aquí:

- `package.json` y `package-lock.json`: dependencias y scripts del proyecto raíz.
- `frontend/package.json` y `frontend/package-lock.json`: dependencias y comandos de la interfaz Vite/React.
- `frontend/.env`: configuración local de Vite; `VITE_API_URL` es consumida por `src/api.js`.
- `frontend/public/manifest.webmanifest`: metadatos de instalación PWA; la variante compacta centralizada es su icono.

## Branding

Todos los recursos de marca están en `public/branding/`:

- `cubastock-horizontal.jpeg`: variante principal para login, cabeceras y zonas amplias, consumida por defecto por `Logo`.
- `cubastock-icon-192.png` / `cubastock-icon-512.png`: íconos cuadrados para favicon, Apple touch icon, manifest, notificaciones y Service Worker.

El brillo de `.business-logo` se mantiene en `App.css`; `Logo.jsx` coloca la imagen dentro de ese contenedor para no cambiar el comportamiento visual de la animación.

## Backend y endpoints

El frontend conoce los endpoints por los `fetch` de cada página/hook y por la configuración de proxy de `vite.config.js`. Esta documentación describe sus consumidores del lado cliente. Para documentar contratos de petición/respuesta, validación, autorización e implementación de cada endpoint con precisión hace falta revisar también `backend/index.js` y sus servicios.

## Archivos de respaldo

No existen copias históricas (`* - copia.jsx`) en el árbol actual: se eliminaron
porque ninguna estaba importada y conservarlas desactualizadas inducía a
errores. El historial real del proyecto vive en el control de versiones.
