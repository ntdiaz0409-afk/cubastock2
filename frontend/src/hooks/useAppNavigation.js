import { useCallback, useEffect, useState } from 'react'

// Las rutas se mantienen aquí para que las dos experiencias por rol resuelvan
// la URL exactamente igual sin introducir un segundo sistema de navegación.
const VIEW_BY_PATH = {
  '/': 'dashboard',
  '/inventario': 'inventory',
  '/ventas': 'sales',
  '/estadisticas': 'statistics',
  '/dependientes': 'dependents',
  '/historial': 'history',
  '/reportes': 'reports',
  '/configuracion-negocio': 'business-settings',
}

const PATH_BY_VIEW = Object.fromEntries(
  Object.entries(VIEW_BY_PATH).map(([path, view]) => [view, path])
)

function normalizePath(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  // La ficha de producto todavía se presenta en el módulo de inventario; se
  // conserva su URL para que una futura ficha detallada no rompa enlaces.
  return /^\/productos\/[^/]+$/.test(path) ? '/inventario' : path
}

/**
 * Sincroniza los módulos de navegación heredados con la URL y el historial del navegador.
 * `availableViews` evita que un dependiente abra módulos reservados al administrador.
 */
export function useAppNavigation(availableViews) {
  const resolveView = useCallback(() => {
    const view = VIEW_BY_PATH[normalizePath(window.location.pathname)] || 'dashboard'
    return availableViews.includes(view) ? view : 'dashboard'
  }, [availableViews])

  const [view, setView] = useState(resolveView)

  useEffect(() => {
    const handlePopState = () => setView(resolveView())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [resolveView])

  const navigate = useCallback((nextView) => {
    if (!availableViews.includes(nextView)) return
    const nextPath = PATH_BY_VIEW[nextView]
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [availableViews])

  return { view, navigate }
}
