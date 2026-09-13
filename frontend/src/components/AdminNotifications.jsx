import Icon from './Icon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api'

const READ_STORAGE_KEY = 'cubastock_admin_notifications_read_at'

/** Campana del administrador que agrupa alertas operativas y estado de sincronización. */
function AdminNotifications() {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState({ notifications: [], pending_sync: [], generated_at: null })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [readAt, setReadAt] = useState(() => localStorage.getItem(READ_STORAGE_KEY) || '')

  const loadNotifications = useCallback(async () => {
    try {
      setError('')
      const response = await apiFetch('/api/admin/notifications', { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No se pudieron cargar las notificaciones')
      setData(body)
    } catch (requestError) {
      setError(requestError.message || 'No se pudieron cargar las notificaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Se difiere la primera consulta para no forzar una actualización de estado
    // durante el ciclo de montaje de React.
    const initialLoadId = window.setTimeout(loadNotifications, 0)
    const intervalId = window.setInterval(loadNotifications, 60_000)
    return () => {
      window.clearTimeout(initialLoadId)
      window.clearInterval(intervalId)
    }
  }, [loadNotifications])

  const hasUnread = useMemo(() => {
    if (!data.generated_at) return false
    return (data.notifications.length > 0 || data.pending_sync.length > 0) && data.generated_at > readAt
  }, [data, readAt])

  const togglePanel = () => {
    const opening = !isOpen
    setIsOpen(opening)
    if (opening && data.generated_at) {
      localStorage.setItem(READ_STORAGE_KEY, data.generated_at)
      setReadAt(data.generated_at)
    }
  }

  const alertCount = data.notifications.length + data.pending_sync.length

  return (
    <div className="admin-notifications">
      <button className="header-icon-button notification-button" type="button" onClick={togglePanel} aria-label={`Notificaciones${alertCount ? `: ${alertCount}` : ''}`} aria-expanded={isOpen} title="Notificaciones">
        <Icon name="bell" size={18} />{hasUnread && <span className="notification-badge" aria-label="Notificaciones sin leer" />}
      </button>

      {isOpen && (
        <section className="notification-panel" aria-label="Centro de notificaciones">
          <div className="notification-panel__header">
            <div><strong>Notificaciones</strong><span>{loading ? 'Actualizando…' : `${alertCount} alerta${alertCount === 1 ? '' : 's'}`}</span></div>
            <button type="button" className="notification-panel__refresh" onClick={loadNotifications} aria-label="Actualizar notificaciones">↻</button>
          </div>
          {error && <p className="notification-panel__error">{error}</p>}
          {!loading && !error && alertCount === 0 && <p className="notification-panel__empty">No hay alertas pendientes.</p>}
          {data.notifications.map((notification) => (
            <article className={`notification-item notification-item--${notification.type.toLowerCase()}`} key={notification.id}>
              <span className="notification-type-icon">{notification.type === 'EXPIRY' ? <Icon name="history" size={16} /> : <Icon name="alert" size={16} />}</span>
              <div><strong>{notification.title}</strong><p>{notification.message}</p></div>
            </article>
          ))}
          {data.pending_sync.length > 0 && (
            <div className="notification-sync-section">
              <strong>Sincronización de dependientes</strong>
              {data.pending_sync.map((item) => <p key={item.id}><b>{item.username}</b>: {item.pending_count} operación{item.pending_count === 1 ? '' : 'es'} pendiente{item.pending_count === 1 ? '' : 's'}.</p>)}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default AdminNotifications
