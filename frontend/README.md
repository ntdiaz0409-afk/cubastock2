# CubaStock 2.0 — Frontend

Aplicación web mobile-first (PWA) de gestión de inventario y ventas para
pequeños negocios en Cuba. Offline-first: si hay conexión sincroniza; si no,
sigue trabajando con IndexedDB y reintenta automáticamente.

## Stack

- React 19 + Vite 8
- Recharts (gráficos de estadísticas)
- framer-motion (animaciones)
- Service Worker (`public/sw.js`) para modo offline y caché
- IndexedDB para catálogo, ventas y cola de sincronización

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo (puerto 5176, accesible por LAN)
npm run build      # compilación de producción → dist/
npm run lint       # ESLint
npm run preview    # servir la compilación de producción
```

En desarrollo, `/api` se reenvía al backend de Express en
`http://127.0.0.1:3000` (ver `vite.config.js`).

## Estructura

| Ruta | Responsabilidad |
| --- | --- |
| `src/App.jsx` | Login, sesión y enrutado por rol (ADMIN / DEPENDIENTE) |
| `src/api.js` | Cliente HTTP: URL base, JWT y expiración de sesión |
| `src/db/` | IndexedDB (`db.js`) y cola de sincronización (`syncQueue.js`) |
| `src/hooks/` | `useProducts`, `useOffline`, `useStockAlerts`, `useSalesStats`, `useTheme` |
| `src/pages/` | Dashboards y módulos (ventas, inventario, reportes, historial, dependientes, estadísticas, ajustes) |
| `src/components/` | Componentes reutilizables (modales, tarjetas, toasts, banners) |
| `public/sw.js` | Service Worker: caché offline, bypass de API y sincronización en segundo plano |
| `public/branding/` | Recursos de marca (logo horizontal e íconos 192/512) |

## Notas

- El Service Worker solo se registra en producción (`import.meta.env.PROD`).
- Las notificaciones son locales (API Notification de la página) y las alertas
  críticas llegan por Telegram desde el backend. No hay Web Push.
- El contrato completo de la API vive en `../backend/index.js`.
