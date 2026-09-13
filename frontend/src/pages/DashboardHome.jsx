// frontend/src/pages/DashboardHome.jsx
import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import SalesChart from '../components/SalesChart'
import { showToast } from '../components/Toast'

function DashboardHome({ user }) {
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSalesData()
  }, [])

  async function loadSalesData() {
    try {
      const response = await apiFetch('/api/sales')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar ventas')
      }

      // Procesar datos para el gráfico
      const sales = data.sales || []
      
      // Agrupar por día
      const dailySales = sales.reduce((acc, sale) => {
        const date = new Date(sale.created_at)
        const day = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
        
        if (!acc[day]) {
          acc[day] = { name: day, ventas: 0, ganancias: 0 }
        }
        acc[day].ventas += 1
        acc[day].ganancias += Number(sale.total_cup)
        return acc
      }, {})

      // Convertir a array y ordenar
      const chartData = Object.values(dailySales).slice(-7) // Últimos 7 días
      
      setSalesData(chartData)
      showToast('📊 Datos cargados correctamente', 'success', 2000)
    } catch {
      // El detalle queda registrado para el usuario mediante el toast; no se
      // necesita retener una excepción que esta pantalla no va a renderizar.
      showToast('Error al cargar datos de ventas', 'error', 3000)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="empty-state">
        <strong>Cargando datos...</strong>
      </div>
    )
  }

  return (
    <>
      <div className="welcome">
        <p className="eyebrow">PANEL DE CONTROL</p>
        <h2>Bienvenido, {user.username}</h2>
        <p>Resumen general del negocio.</p>
      </div>

      <div className="statistics-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <span>Ventas totales</span>
          <strong>{salesData.reduce((sum, d) => sum + d.ventas, 0)}</strong>
          <small>Últimos 7 días</small>
        </div>
        <div className="stat-card">
          <span>Total recaudado</span>
          <strong>${salesData.reduce((sum, d) => sum + d.ganancias, 0).toFixed(2)}</strong>
          <small>CUP</small>
        </div>
        <div className="stat-card">
          <span>Promedio diario</span>
          <strong>
            ${(salesData.reduce((sum, d) => sum + d.ganancias, 0) / (salesData.length || 1)).toFixed(2)}
          </strong>
          <small>CUP</small>
        </div>
        <div className="stat-card warning">
          <span>Días con datos</span>
          <strong>{salesData.length}</strong>
          <small>Registros disponibles</small>
        </div>
      </div>

      <div className="statistics-section">
        <div className="statistics-section-header">
          <div>
            <h3>Ventas - Últimos 7 días</h3>
            <p>Evolución de ventas y ganancias.</p>
          </div>
        </div>
        <SalesChart 
          data={salesData} 
          type="area" 
          height={280}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="statistics-section">
          <div className="statistics-section-header">
            <div>
              <h3>Ventas por día</h3>
              <p>Cantidad de ventas diarias.</p>
            </div>
          </div>
          <SalesChart 
            data={salesData} 
            type="bar" 
            height={200}
          />
        </div>
        <div className="statistics-section">
          <div className="statistics-section-header">
            <div>
              <h3>Distribución</h3>
              <p>Porcentaje de ventas.</p>
            </div>
          </div>
          <SalesChart 
            data={salesData.slice(-5).map(d => ({ name: d.name, value: d.ventas }))} 
            type="pie" 
            height={200}
          />
        </div>
      </div>
    </>
  )
}

export default DashboardHome
/**
 * Propósito: vista inicial reutilizable del área de dashboard.
 * Responsabilidades: mostrar el resumen y enlaces a operaciones según los props recibidos.
 * Dependencias: componentes de tarjetas, métricas y PageHeader.
 */
