// Gestiona una única preferencia visual para toda la aplicación y la conserva
// por navegador; no afecta autenticación, datos de ventas ni modo offline.
import { useCallback, useState } from 'react'

const THEME_KEY = 'cubastock_theme'

/** Lee el tema persistido, con tema oscuro como valor seguro para instalaciones previas. */
export function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/** Actualiza el atributo que consumen las variables CSS y el fondo canvas. */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#eaf4ff' : '#080e1a')
}

/** Proporciona el tema actual y su conmutador a componentes de interfaz. */
export function useTheme() {
  const [theme, setTheme] = useState(getSavedTheme)

  // Alterna el atributo raíz; todas las variables CSS y el fondo animado leen este valor.
  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
      applyTheme(nextTheme)
      localStorage.setItem(THEME_KEY, nextTheme)
      return nextTheme
    })
  }, [])

  return { theme, toggleTheme }
}
/**
 * Propósito: persistir y aplicar el tema claro u oscuro de CubaStock.
 * Responsabilidades: sincronizar localStorage, data-theme del documento y estado React.
 * Dependencias: App.jsx, PageHeader, AnimatedBackground y variables CSS globales.
 */
