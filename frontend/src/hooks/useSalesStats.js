// frontend/src/hooks/useSalesStats.js
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'

/** Obtiene estadísticas y expone su estado de carga para evitar duplicar fetch en la UI. */
export function useSalesStats() {
  const [stats, setStats] = useState({
    today: { total: 0, count: 0 },
    yesterday: { total: 0, count: 0 },
    difference: { amount: 0, percentage: 0, isPositive: true },
    loading: true,
    error: null
  })

  const loadStats = useCallback(async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }))

      const response = await apiFetch('/api/sales')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar ventas')
      }

      const sales = data.sales || []
      
      // Obtener fechas
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      // Filtrar ventas de hoy
      const todaySales = sales.filter(sale => {
        const saleDate = new Date(sale.created_at)
        return saleDate >= today
      })

      // Filtrar ventas de ayer
      const yesterdaySales = sales.filter(sale => {
        const saleDate = new Date(sale.created_at)
        return saleDate >= yesterday && saleDate < today
      })

      const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total_cup), 0)
      const yesterdayTotal = yesterdaySales.reduce((sum, s) => sum + Number(s.total_cup), 0)
      
      const difference = todayTotal - yesterdayTotal
      const percentage = yesterdayTotal > 0 ? (difference / yesterdayTotal) * 100 : (todayTotal > 0 ? 100 : 0)

      setStats({
        today: { total: todayTotal, count: todaySales.length },
        yesterday: { total: yesterdayTotal, count: yesterdaySales.length },
        difference: {
          amount: difference,
          percentage: percentage,
          isPositive: difference >= 0
        },
        loading: false,
        error: null
      })

    } catch (error) {
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al cargar estadísticas'
      }))
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return { stats, loadStats, refresh: loadStats }
}
/**
 * Propósito: obtener métricas de ventas reutilizables por dashboards y gráficos.
 * Responsabilidades: solicitar, normalizar el estado asíncrono y exponer el recargado.
 * Dependencias: endpoint de estadísticas y componentes de visualización.
 */
