// frontend/src/db/syncQueue.js
import { getData, saveData, deleteData, STORES } from './db'
import { apiFetch } from '../api'

// La cola se comparte por navegador; identificar la sesión actual evita que
// ventas pendientes de un dependiente se sincronicen usando la cuenta de otro.
function getCurrentUserId() {
  try {
    return JSON.parse(localStorage.getItem('cubastock_user'))?.id || null
  } catch {
    return null
  }
}

// Obtener todas las operaciones pendientes
export async function getPendingOperations() {
  try {
    const operations = await getData(STORES.SYNC_QUEUE)
    if (!operations) return []
    const currentUserId = getCurrentUserId()
    // Las entradas antiguas sin owner_id se mantienen para no perder datos,
    // pero las nuevas se sincronizan exclusivamente con su dueño original.
    // Las marcadas como failed (rechazo 4xx del servidor) no se reintentan:
    // requieren intervención manual y siguen contando para el administrador.
    return operations.filter((op) => !op.synced && !op.failed && (!op.owner_id || op.owner_id === currentUserId))
  } catch (error) {
    console.error('❌ Error obteniendo operaciones pendientes:', error)
    return []
  }
}

// Marcar operación como sincronizada
export async function markAsSynced(id) {
  try {
    const operations = await getData(STORES.SYNC_QUEUE)
    if (!operations) return
    
    const op = operations.find(o => o.id === id)
    if (op) {
      op.synced = true
      op.synced_at = new Date().toISOString()
      await saveData(STORES.SYNC_QUEUE, op)
    }
  } catch (error) {
    console.error('❌ Error marcando operación como sincronizada:', error)
  }
}

// ✅ Función para eliminar una operación (usa deleteData correctamente)
export async function removeFromSyncQueue(id) {
  try {
    await deleteData(STORES.SYNC_QUEUE, id)
  } catch (error) {
    console.error('❌ Error eliminando de la cola de sincronización:', error)
  }
}

// Conserva un fallo para diagnóstico y futuros reintentos; no se marca como
// sincronizada hasta que el backend confirme la mutación.
async function registerSyncFailure(operation, message) {
  operation.attempts = (operation.attempts || 0) + 1
  operation.error = message
  operation.last_attempt_at = new Date().toISOString()
  await saveData(STORES.SYNC_QUEUE, operation)
}

// Sincronizar todas las operaciones pendientes
export async function syncAllPending() {
  try {
    const pending = await getPendingOperations()
    
    if (pending.length === 0) {
      console.log('✅ No hay operaciones pendientes de sincronizar')
      return { success: true, synced: 0, failed: 0 }
    }

    console.log(`🔄 Sincronizando ${pending.length} operaciones pendientes...`)

    let synced = 0
    let failed = 0

    for (const operation of pending) {
      try {
        if (!navigator.onLine) {
          console.log('⚠️ Sin conexión, esperando...')
          break
        }

        const response = await apiFetch(operation.endpoint, {
          method: operation.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(operation.data),
        })

        if (response.ok) {
          await markAsSynced(operation.id)
          synced++
          console.log(`✅ Operación ${operation.id} sincronizada correctamente`)
        } else if ([400, 403, 404, 409, 422].includes(response.status)) {
          // El servidor rechazó la operación (p. ej. stock insuficiente al
          // sincronizar una venta offline). Reintentar no cambiará la
          // respuesta: se marca como fallida para revisión manual y deja de
          // bloquear el resto de la cola. Sigue contando como pendiente.
          operation.failed = true
          await registerSyncFailure(operation, `El servidor rechazó la operación (HTTP ${response.status})`)
          failed++
        } else {
          // Una respuesta no exitosa no confirma la operación. Mantenerla en
          // IndexedDB evita perder ventas/ajustes cuando el servidor se recupere.
          await registerSyncFailure(operation, `El servidor respondió HTTP ${response.status}`)
          failed++
        }
      } catch (error) {
        console.error(`❌ Error sincronizando operación ${operation.id}:`, error)
        // Los errores transitorios de red siguen pendientes por el mismo
        // motivo: sólo se elimina aquello confirmado por la API.
        await registerSyncFailure(operation, error.message)
        failed++
      }
    }

    // Eliminar operaciones sincronizadas
    const allPending = await getData(STORES.SYNC_QUEUE)
    if (allPending) {
      const completed = allPending.filter(op => op.synced)
      for (const op of completed) {
        await removeFromSyncQueue(op.id)
      }
    }

    console.log(`✅ Sincronización completada: ${synced} exitosas, ${failed} fallidas`)
    return { success: true, synced, failed }
  } catch (error) {
    console.error('❌ Error en syncAllPending:', error)
    return { success: false, error: error.message, synced: 0, failed: 0 }
  }
}
/**
 * Propósito: conservar y reintentar mutaciones pendientes cuando no hay red.
 * Responsabilidades: encolar, procesar en orden y eliminar únicamente operaciones confirmadas.
 * Dependencias: IndexedDB definido en db.js, API fetch y OfflineIndicator.
 */
