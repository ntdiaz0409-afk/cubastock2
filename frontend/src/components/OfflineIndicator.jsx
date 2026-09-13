// Indicador visual del estado confirmado por useOffline.
import { useOffline } from '../hooks/useOffline'

function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, triggerSync } = useOffline()

  // Prioriza falta de red, después sincronización, operaciones pendientes y estado estable.
  if (!isOnline) {
    return <div className="connection-indicator connection-indicator--offline">
      <span aria-hidden="true">●</span><span>Offline</span>
      {pendingCount > 0 && <span className="connection-indicator__pending">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>}
    </div>
  }
  if (isSyncing) {
    return <div className="connection-indicator connection-indicator--syncing">
      <span className="connection-indicator__spinner" aria-hidden="true">⟳</span><span>Sincronizando...</span>
    </div>
  }
  if (pendingCount > 0) {
    return <button className="connection-indicator connection-indicator--pending" onClick={triggerSync} title="Intentar sincronizar ahora">
      <span aria-hidden="true">⏳</span><span>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
    </button>
  }
  return <div className="connection-indicator connection-indicator--online"><span aria-hidden="true">●</span><span>Online</span></div>
}

export default OfflineIndicator
/**
 * Propósito: indicar conectividad y operaciones pendientes de sincronización.
 * Responsabilidades: combinar el estado de red con la cola local y disparar su reintento.
 * Dependencias: useOffline y db/syncQueue.
 */
