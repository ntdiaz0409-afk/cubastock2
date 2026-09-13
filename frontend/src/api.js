// Cliente HTTP compartido. En desarrollo se usa una ruta relativa para que un
// móvil conectado a la LAN consulte al proxy de Vite y no a su propio localhost.
// VITE_API_URL queda disponible para despliegues que sí tengan un API externo.
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('cubastock_token')
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('cubastock_token')
    localStorage.removeItem('cubastock_user')
    window.dispatchEvent(new Event('cubastock:auth-expired'))
  }

  return response
}

/** Inspecciona el payload JWT localmente para prevenir peticiones con sesiones vencidas. */
export function tokenIsExpired(token) {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    )
    return Boolean(payload.exp && payload.exp * 1000 <= Date.now())
  } catch {
    return true
  }
}
/**
 * Propósito: centralizar el origen de la API y el manejo de expiración de JWT.
 * Responsabilidades: exponer la URL base y notificar a App cuando la sesión deja de ser válida.
 * Dependencias: VITE_API_URL, localStorage y consumidores fetch del frontend.
 */
