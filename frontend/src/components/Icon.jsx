// frontend/src/components/Icon.jsx
// Sistema de iconos SVG de trazo fino (estilo Lucide/Feather) que sustituye
// a los emojis: línea consistente de 1.8px, esquinas redondeadas y heredan
// el color del texto. Cada icono es un trazado de 24x24 con viewBox fijo.

const PATHS = {
  // Ventas: billete con círculo central
  sales: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5v.01M18 14.5v.01" />
    </>
  ),
  // Inventario: caja isométrica
  box: (
    <>
      <path d="M12 2.8 21 7.6v8.8l-9 4.8-9-4.8V7.6l9-4.8Z" />
      <path d="M3.2 7.7 12 12.4l8.8-4.7" />
      <path d="M12 12.4V21" />
    </>
  ),
  // Configuración: engranaje
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
    </>
  ),
  // Historial: reloj con flecha circular
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
      <path d="M3.5 4.5v4h4" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  // Dependientes: dos personas
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3.2 20a5.8 5.8 0 0 1 11.6 0" />
      <path d="M16 5.2a3.4 3.4 0 0 1 0 6.1" />
      <path d="M17.8 14.6a5.8 5.8 0 0 1 3.5 5.4" />
    </>
  ),
  // Estadísticas: barras ascendentes
  chart: (
    <>
      <path d="M3.5 3.5v16a1 1 0 0 0 1 1H21" />
      <path d="M8 16v-5M13 16V8M18 16v-8" />
    </>
  ),
  // Tema claro: sol
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </>
  ),
  // Tema oscuro: luna
  moon: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />,
  // Soporte: chat
  chat: (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M8.5 10.5h7M8.5 13.5h4.5" />
    </>
  ),
  // Salir: puerta con flecha
  logout: (
    <>
      <path d="M9 4.5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" />
      <path d="M15 8l4 4-4 4M19 12H9.5" />
    </>
  ),
  // Atrás: flecha izquierda
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  // Adelante: flecha derecha
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  // Añadir: plus
  plus: <path d="M12 5v14M5 12h14" />,
  // Buscar: lupa
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.6-4.6" />
    </>
  ),
  // Campana de notificaciones
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9Z" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  // Tendencia/ventas del día
  trend: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  // Check
  check: <path d="m4.5 12.5 5 5 10-11" />,
  // Advertencia stock: triángulo
  alert: (
    <>
      <path d="M12 3.5 22 20H2L12 3.5Z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
}

/** Icono SVG de trazo fino. `name` elige el trazado; hereda color y tamaño. */
function Icon({ name, size = 20, strokeWidth = 1.8, className = '' }) {
  const path = PATHS[name]
  if (!path) return null
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

export default Icon
/**
 * Propósito: sistema de iconos vectorial consistente para toda la interfaz.
 * Responsabilidades: trazados de 24x24 de un solo color, heredados del texto.
 * Dependencias: ninguna; los nombres válidos viven en PATHS.
 */
