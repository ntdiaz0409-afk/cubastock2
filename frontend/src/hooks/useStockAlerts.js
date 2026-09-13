// frontend/src/hooks/useStockAlerts.js
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'

const STORAGE_KEY = 'cubastock_stock_alerts'
const NOTIFICATION_KEY = 'cubastock_notification_permission'

/** Detecta alertas y notifica una única vez por producto hasta que su condición cambie. */
export function useStockAlerts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [criticalStockProducts, setCriticalStockProducts] = useState([])
  const [alertedProducts, setAlertedProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [notificationPermission, setNotificationPermission] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_KEY)
      return saved || 'default'
    } catch {
      return 'default'
    }
  })

  const THRESHOLD = 5 // Stock bajo cuando es menor o igual a 5
  const CRITICAL_THRESHOLD = 2 // Stock crítico cuando es menor o igual a 2

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/products')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar productos')
      }

      setProducts(data.products || [])
    } catch (error) {
      console.error('Error cargando productos para alertas:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Actualizar productos con stock bajo
  useEffect(() => {
    const low = products.filter(p => Number(p.stock) <= THRESHOLD && Number(p.stock) > 0)
    const critical = products.filter(p => Number(p.stock) <= CRITICAL_THRESHOLD && Number(p.stock) > 0)
    setLowStockProducts(low)
    setCriticalStockProducts(critical)
  }, [products])

  // Verificar y enviar notificaciones
  useEffect(() => {
    if (loading || products.length === 0) return

    const now = new Date().toISOString()
    const updatedAlerts = { ...alertedProducts }

    // Verificar productos con stock crítico (0 o muy bajo)
    const criticalProducts = products.filter(p => Number(p.stock) <= CRITICAL_THRESHOLD)

    criticalProducts.forEach(product => {
      const lastAlert = alertedProducts[product.id]
      const stock = Number(product.stock)

      // Si no se ha enviado alerta o el stock ha cambiado
      if (!lastAlert || lastAlert.stock !== stock || 
          (Date.now() - Date.parse(lastAlert.timestamp) > 3600000)) { // 1 hora
        updatedAlerts[product.id] = {
          stock: stock,
          timestamp: now,
          notified: false
        }
      }
    })

    setAlertedProducts(updatedAlerts)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlerts))
  }, [products, loading])

  // Enviar notificaciones push
  const sendNotification = useCallback((title, body, data = {}) => {
    if (!('Notification' in window)) {
      console.log('⚠️ Este navegador no soporta notificaciones')
      return
    }

    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: '/branding/cubastock-icon-192.png',
          tag: data.productId || 'stock-alert',
          requireInteraction: true,
          data: data,
        })

        // Cerrar después de 10 segundos
        setTimeout(() => notification.close(), 10000)

        return notification
      } catch (error) {
        console.error('Error enviando notificación:', error)
      }
    }
  }, [])

  // Solicitar permiso de notificaciones
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('⚠️ Este navegador no soporta notificaciones')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      localStorage.setItem(NOTIFICATION_KEY, permission)

      if (permission === 'granted') {
        console.log('✅ Permiso de notificaciones concedido')
        // Enviar notificación de prueba
        sendNotification(
          '🔔 CubaStock',
          'Las notificaciones de stock bajo están activas'
        )
        return true
      } else {
        console.log('❌ Permiso de notificaciones denegado')
        return false
      }
    } catch (error) {
      console.error('Error solicitando permiso:', error)
      return false
    }
  }, [sendNotification])

  // Verificar alertas pendientes
  const checkAlerts = useCallback(() => {
    const pendingAlerts = []

    Object.entries(alertedProducts).forEach(([productId, alert]) => {
      if (!alert.notified) {
        const product = products.find(p => p.id === productId)
        if (product) {
          pendingAlerts.push({
            product,
            stock: alert.stock,
            timestamp: alert.timestamp
          })
        }
      }
    })

    return pendingAlerts
  }, [alertedProducts, products])

  // Marcar alerta como notificada
  const markAlertAsNotified = useCallback((productId) => {
    const updated = { ...alertedProducts }
    if (updated[productId]) {
      updated[productId] = {
        ...updated[productId],
        notified: true
      }
      setAlertedProducts(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  }, [alertedProducts])

  // Verificar y enviar alertas automáticamente
  useEffect(() => {
    if (loading || products.length === 0) return

    const pending = checkAlerts()
    
    pending.forEach(({ product, stock }) => {
      const productName = product.name
      const stockDisplay = Number(stock).toFixed(3)
      const unit = product.unit

      let title = '⚠️ Stock bajo'
      let body = `${productName} tiene ${stockDisplay} ${unit} en stock`

      if (stock === 0) {
        title = '🚨 ¡Sin stock!'
        body = `${productName} está agotado (0 ${unit})`
      } else if (stock <= CRITICAL_THRESHOLD) {
        title = '🔴 ¡Stock crítico!'
        body = `${productName} tiene solo ${stockDisplay} ${unit} disponibles`
      }

      // Solo enviar si no se ha notificado recientemente
      const lastAlert = alertedProducts[product.id]
      if (!lastAlert?.notified) {
        sendNotification(title, body, { productId: product.id })
        markAlertAsNotified(product.id)
      }
    })
  }, [products, loading, checkAlerts, sendNotification, markAlertAsNotified, alertedProducts])

  // Cargar productos al iniciar
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Recargar cada 30 segundos (opcional)
  useEffect(() => {
    const interval = setInterval(() => {
      loadProducts()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadProducts])

  return {
    products,
    loading,
    lowStockProducts,
    criticalStockProducts,
    notificationPermission,
    requestNotificationPermission,
    sendNotification,
    checkAlerts,
    loadProducts,
    THRESHOLD,
    CRITICAL_THRESHOLD,
  }
}
/**
 * Propósito: centralizar el cálculo/consulta de productos con stock bajo.
 * Responsabilidades: publicar alertas, carga y error para banners y vistas de inventario.
 * Dependencias: API de productos y StockAlertBanner.
 */
