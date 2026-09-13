// Centraliza el modo offline-first: valida acceso real al backend, conserva la
// cola de IndexedDB y sincroniza las ventas al recuperar la conexión.
import { useCallback, useEffect, useRef, useState } from 'react'
import { API_URL, apiFetch } from '../api'
import { getData, openDB, saveData, saveManyData, STORES } from '../db/db'

const CONNECTION_CHECK_INTERVAL = 20_000
const CONNECTION_TIMEOUT = 5_000

/** Devuelve conectividad, cola pendiente y acciones de sincronización para la UI. */
export function useOffline() {
  // navigator.onLine puede ser true sin Internet; solo declaramos Online tras el health-check.
  const [isOnline, setIsOnline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSync, setLastSync] = useState(null)
  const syncInProgress = useRef(false)

  // Comprueba el navegador y el API real para evitar falsos positivos de conexión.
  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false)
      return false
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), CONNECTION_TIMEOUT)
    try {
      const response = await fetch(`${API_URL}/api/health`, { cache: 'no-store', signal: controller.signal })
      setIsOnline(response.ok)
      return response.ok
    } catch {
      setIsOnline(false)
      return false
    } finally {
      window.clearTimeout(timeoutId)
    }
  }, [])

  // Actualiza la insignia con operaciones todavía guardadas localmente.
  const updatePendingCount = useCallback(async () => {
    try {
      const operations = await getData(STORES.SYNC_QUEUE)
      const count = operations ? operations.filter((operation) => !operation.synced).length : 0
      setPendingCount(count)
      return count
    } catch {
      setPendingCount(0)
      return 0
    }
  }, [])

  // El administrador solo puede conocer una cola de otro dispositivo cuando
  // este vuelve a tener red y reporta su estado autenticado al servidor.
  const reportPendingCount = useCallback(async (count) => {
    if (!navigator.onLine) return
    try {
      await apiFetch('/api/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_count: count }),
      })
    } catch {
      // No interrumpir ventas ni la sincronización si el reporte auxiliar falla.
    }
  }, [])

  // Sincroniza solo si el backend responde. La ref evita ejecuciones simultáneas.
  const triggerSync = useCallback(async () => {
    if (!(await checkConnection()) || syncInProgress.current) return { success: false, offline: true }

    syncInProgress.current = true
    setIsSyncing(true)
    try {
      const pendingBeforeSync = await updatePendingCount()
      await reportPendingCount(pendingBeforeSync)
      const { syncAllPending } = await import('../db/syncQueue')
      const result = await syncAllPending()
      setLastSync(new Date().toISOString())
      const pendingAfterSync = await updatePendingCount()
      await reportPendingCount(pendingAfterSync)
      return result
    } catch (error) {
      console.error('Error en sincronización:', error)
      return { success: false, error: error.message }
    } finally {
      syncInProgress.current = false
      setIsSyncing(false)
    }
  }, [checkConnection, reportPendingCount, updatePendingCount])

  // Atiende eventos del navegador y confirma que el servidor está disponible.
  useEffect(() => {
    const handleOnline = async () => {
      if (await checkConnection()) await triggerSync()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    checkConnection()
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [checkConnection, triggerSync])

  // Detecta caídas del servidor aunque el navegador no dispare un evento offline.
  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      if (await checkConnection()) await triggerSync()
    }, CONNECTION_CHECK_INTERVAL)
    return () => window.clearInterval(intervalId)
  }, [checkConnection, triggerSync])

  // Prepara IndexedDB y carga el total de operaciones pendientes al arrancar.
  useEffect(() => {
    openDB().then(updatePendingCount).catch((error) => console.error('Error inicializando IndexedDB:', error))
  }, [updatePendingCount])

  // Lee el catálogo ya disponible en el dispositivo para las pantallas offline.
  const getLocalProducts = useCallback(async () => {
    try {
      return (await getData(STORES.PRODUCTS)) || []
    } catch (error) {
      console.error('Error cargando productos locales:', error)
      return []
    }
  }, [])

  // Guarda una copia local del catálogo recibido desde el API.
  const saveLocalProducts = useCallback(async (products) => {
    try {
      if (!products?.length) return false
      await saveManyData(STORES.PRODUCTS, products)
      return true
    } catch (error) {
      console.error('Error guardando productos localmente:', error)
      return false
    }
  }, [])

  // Persiste una venta y su trabajo de sincronización para no perder ventas offline.
  const saveLocalSale = useCallback(async (saleData) => {
    try {
      await openDB()
      const sale = { id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...saleData, synced: false, created_at: new Date().toISOString() }
      await saveData(STORES.SALES, sale)
      // La cola conserva el método de pago y el dueño de la venta; así una
      // operación offline no cambia de tarjeta a efectivo ni otro usuario la envía.
      await saveData(STORES.SYNC_QUEUE, {
        type: 'SALE',
        owner_id: saleData.user_id,
        data: { items: saleData.items, payment_method: saleData.payment_method },
        endpoint: '/api/sales', method: 'POST', created_at: new Date().toISOString(), synced: false, attempts: 0,
      })
      await updatePendingCount()
      return sale
    } catch (error) {
      console.error('Error guardando venta local:', error)
      return null
    }
  }, [updatePendingCount])

  // Devuelve el historial local para que ventas pueda consultarlo sin red.
  const getLocalSales = useCallback(async () => {
    try {
      return (await getData(STORES.SALES)) || []
    } catch (error) {
      console.error('Error cargando ventas locales:', error)
      return []
    }
  }, [])

  return { isOnline, isSyncing, pendingCount, lastSync, triggerSync, getLocalProducts, saveLocalProducts, saveLocalSale, getLocalSales, updatePendingCount }
}
/**
 * Propósito: exponer el estado de conectividad del navegador a componentes React.
 * Responsabilidades: suscribirse a eventos online/offline y limpiar listeners al desmontar.
 * Dependencias: Online Status API y consumidores como OfflineIndicator.
 */
