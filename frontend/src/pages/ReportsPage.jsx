// frontend/src/pages/ReportsPage.jsx
import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import PageHeader from '../components/PageHeader'

// Función para formatear precios
const formatPrice = (amount) => {
  return `$${Number(amount).toFixed(2)} CUP`
}

// Obtener el lunes de la semana actual (siempre lunes de esta semana)
const getMonday = (date = new Date()) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // lunes
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Obtener el domingo de la semana actual (siempre domingo de esta semana)
const getSunday = (date = new Date()) => {
  const monday = getMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

// Rango de la semana actual (lunes a domingo completos)
const getCurrentWeekRange = () => {
  const now = new Date()
  const start = getMonday(now)
  const end = getSunday(now)
  return { start, end }
}

// Rango de la semana anterior (lunes a domingo completos)
const getPreviousWeekRange = () => {
  const now = new Date()
  const prevMonday = getMonday(now)
  prevMonday.setDate(prevMonday.getDate() - 7)
  const prevSunday = new Date(prevMonday)
  prevSunday.setDate(prevMonday.getDate() + 6)
  prevSunday.setHours(23, 59, 59, 999)
  return { start: prevMonday, end: prevSunday }
}

// Función para obtener el inicio del mes actual
const getCurrentMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

// Función para obtener el mes anterior
const getPreviousMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

// Formatear fecha corta
const formatDateShort = (date) => {
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

/** Agrupa visualmente los reportes que el backend genera para administración. */
function ReportsPage({ user, onBack, onLogout }) {
  const [loading, setLoading] = useState(true)

  const [dailyStats, setDailyStats] = useState({
    today: { total: 0, count: 0 },
    yesterday: { total: 0, count: 0 },
    difference: { amount: 0, percentage: 0, isPositive: true }
  })

  const [weeklyStats, setWeeklyStats] = useState({
    current: { total: 0, count: 0, label: '' },
    previous: { total: 0, count: 0, label: '' },
    difference: { amount: 0, percentage: 0, isPositive: true }
  })

  const [monthlyStats, setMonthlyStats] = useState({
    current: { total: 0, count: 0, label: '' },
    previous: { total: 0, count: 0, label: '' },
    difference: { amount: 0, percentage: 0, isPositive: true }
  })

  const [topProducts, setTopProducts] = useState([])
  const [stagnantProducts, setStagnantProducts] = useState([])

  useEffect(() => {
    loadReportsData()
  }, [])

  async function loadReportsData() {
    setLoading(true)

    try {
      const salesResponse = await apiFetch('/api/sales')
      const salesData = await salesResponse.json()
      if (!salesResponse.ok) throw new Error(salesData.error || 'Error al cargar ventas')
      const salesList = salesData.sales || []

      processStats(salesList)

      await loadTopProducts('weekly')
      await loadStagnantProducts('weekly')

    } catch (err) {
      // Los subreportes conservan sus estados vacíos si falla la carga; el
      // detalle se registra para poder diagnosticar sin introducir una UI nueva.
      console.error('Error al cargar datos de reportes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadTopProducts(period = 'weekly') {
    try {
      const response = await apiFetch(`/api/reports/top-products?period=${period}`)
      const data = await response.json()
      if (response.ok) setTopProducts(data.products || [])
    } catch (err) {
      console.error('Error cargando top productos:', err)
    }
  }

  async function loadStagnantProducts(period = 'weekly') {
    try {
      const response = await apiFetch(`/api/reports/stagnant-products?period=${period}`)
      const data = await response.json()
      if (response.ok) setStagnantProducts(data.products || [])
    } catch (err) {
      console.error('Error cargando productos estancados:', err)
    }
  }

  function processStats(salesList) {
    // Día vs Ayer
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const todaySales = salesList.filter(s => new Date(s.created_at) >= today)
    const yesterdaySales = salesList.filter(s => {
      const d = new Date(s.created_at)
      return d >= yesterday && d < today
    })

    const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total_cup), 0)
    const yesterdayTotal = yesterdaySales.reduce((sum, s) => sum + Number(s.total_cup), 0)
    const diffDaily = todayTotal - yesterdayTotal
    const pctDaily = yesterdayTotal > 0 ? (diffDaily / yesterdayTotal) * 100 : (todayTotal > 0 ? 100 : 0)

    setDailyStats({
      today: { total: todayTotal, count: todaySales.length },
      yesterday: { total: yesterdayTotal, count: yesterdaySales.length },
      difference: {
        amount: diffDaily,
        percentage: pctDaily,
        isPositive: diffDaily >= 0
      }
    })

    // Semana actual vs Semana anterior (rangos completos)
    const currentWeek = getCurrentWeekRange()
    const prevWeek = getPreviousWeekRange()

    const currentWeekSales = salesList.filter(s => {
      const d = new Date(s.created_at)
      return d >= currentWeek.start && d <= currentWeek.end
    })
    const prevWeekSales = salesList.filter(s => {
      const d = new Date(s.created_at)
      return d >= prevWeek.start && d <= prevWeek.end
    })

    const currentWeekTotal = currentWeekSales.reduce((sum, s) => sum + Number(s.total_cup), 0)
    const prevWeekTotal = prevWeekSales.reduce((sum, s) => sum + Number(s.total_cup), 0)
    const diffWeek = currentWeekTotal - prevWeekTotal
    const pctWeek = prevWeekTotal > 0 ? (diffWeek / prevWeekTotal) * 100 : (currentWeekTotal > 0 ? 100 : 0)

    const weekLabel = `${formatDateShort(currentWeek.start)} - ${formatDateShort(currentWeek.end)}`
    const prevWeekLabel = `${formatDateShort(prevWeek.start)} - ${formatDateShort(prevWeek.end)}`

    setWeeklyStats({
      current: { total: currentWeekTotal, count: currentWeekSales.length, label: weekLabel },
      previous: { total: prevWeekTotal, count: prevWeekSales.length, label: prevWeekLabel },
      difference: {
        amount: diffWeek,
        percentage: pctWeek,
        isPositive: diffWeek >= 0
      }
    })

    // Mes actual vs Mes anterior
    const currentMonth = getCurrentMonthRange()
    const prevMonth = getPreviousMonthRange()

    const currentMonthSales = salesList.filter(s => {
      const d = new Date(s.created_at)
      return d >= currentMonth.start && d <= currentMonth.end
    })
    const prevMonthSales = salesList.filter(s => {
      const d = new Date(s.created_at)
      return d >= prevMonth.start && d <= prevMonth.end
    })

    const currentMonthTotal = currentMonthSales.reduce((sum, s) => sum + Number(s.total_cup), 0)
    const prevMonthTotal = prevMonthSales.reduce((sum, s) => sum + Number(s.total_cup), 0)
    const diffMonth = currentMonthTotal - prevMonthTotal
    const pctMonth = prevMonthTotal > 0 ? (diffMonth / prevMonthTotal) * 100 : (currentMonthTotal > 0 ? 100 : 0)

    const monthLabel = currentMonth.start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    const prevMonthLabel = prevMonth.start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

    setMonthlyStats({
      current: { total: currentMonthTotal, count: currentMonthSales.length, label: monthLabel },
      previous: { total: prevMonthTotal, count: prevMonthSales.length, label: prevMonthLabel },
      difference: {
        amount: diffMonth,
        percentage: pctMonth,
        isPositive: diffMonth >= 0
      }
    })
  }

  const ComparisonCard = ({ title, current, previous, difference, period }) => {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div className="stat-card">
          <span>{title} actual</span>
          <strong>{formatPrice(current.total)}</strong>
          <small>{current.count} ventas · {period}</small>
        </div>
        <div className="stat-card">
          <span>{title} anterior</span>
          <strong>{formatPrice(previous.total)}</strong>
          <small>{previous.count} ventas · {period}</small>
        </div>
        <div className="stat-card" style={{
          borderColor: difference.isPositive ? 'rgba(52,211,153,0.3)' : 'rgba(251,113,133,0.3)'
        }}>
          <span>Diferencia</span>
          <strong style={{ color: difference.isPositive ? '#34d399' : '#fb7185' }}>
            {difference.isPositive ? '▲' : '▼'} {formatPrice(Math.abs(difference.amount))}
          </strong>
          <small>
            {difference.percentage > 0 ? '+' : ''}{difference.percentage.toFixed(1)}%{' '}
            {difference.isPositive ? '⬆ Mejor' : '⬇ Peor'}
          </small>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <PageHeader user={user} onBack={onBack} onLogout={onLogout} title="Reportes" />
        <section className="dashboard-content">
          <div className="empty-state"><strong>Cargando reportes...</strong></div>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard-page">
      <PageHeader user={user} onBack={onBack} onLogout={onLogout} title="Reportes" />

      <section className="dashboard-content">
        {/* Hoy vs Ayer */}
        <div className="statistics-section">
          <div className="statistics-section-header">
            <div>
              <h3>Hoy vs Ayer</h3>
              <p>Comparativa de ventas del día actual con el día anterior</p>
            </div>
          </div>
          <ComparisonCard
            title="Hoy"
            current={dailyStats.today}
            previous={dailyStats.yesterday}
            difference={dailyStats.difference}
            period="día"
          />
        </div>

        {/* Semana actual vs Semana anterior */}
        <div className="statistics-section">
          <div className="statistics-section-header">
            <div>
              <h3>📅 Semana actual vs Semana anterior</h3>
              <p>Comparativa de ventas de la semana actual ({weeklyStats.current.label}) con la semana anterior ({weeklyStats.previous.label})</p>
            </div>
          </div>
          <ComparisonCard
            title="Semana"
            current={weeklyStats.current}
            previous={weeklyStats.previous}
            difference={weeklyStats.difference}
            period="semana"
          />
        </div>

        {/* Mes actual vs Mes anterior */}
        <div className="statistics-section">
          <div className="statistics-section-header">
            <div>
              <h3>📆 Mes actual vs Mes anterior</h3>
              <p>Comparativa de ventas del mes actual ({monthlyStats.current.label}) con el mes anterior ({monthlyStats.previous.label})</p>
            </div>
          </div>
          <ComparisonCard
            title="Mes"
            current={monthlyStats.current}
            previous={monthlyStats.previous}
            difference={monthlyStats.difference}
            period="mes"
          />
        </div>

        {/* Top productos más vendidos */}
        <div className="statistics-section">
          <div className="statistics-section-header">
            <div>
              <h3>🔥 Top productos más vendidos</h3>
              <p>Los productos con mayor demanda en el período</p>
            </div>
          </div>
          {topProducts.length === 0 ? (
            <div className="empty-state"><p>Sin datos aún</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topProducts.slice(0, 10).map((p, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <span>{i+1}. {p.name}</span>
                  <strong>{Number(p.total_quantity).toFixed(1)} uds</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Productos estancados */}
        <div className="statistics-section">
          <div className="statistics-section-header">
            <div>
              <h3>❄️ Productos estancados</h3>
              <p>Los que menos se venden en el período</p>
            </div>
          </div>
          {stagnantProducts.length === 0 ? (
            <div className="empty-state"><p>Sin datos aún</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {stagnantProducts.slice(0, 10).map((p, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <span>{i+1}. {p.name}</span>
                  <strong>{Number(p.total_quantity).toFixed(1)} uds</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="secondary-button" onClick={loadReportsData} disabled={loading}>
            Actualizar reportes
          </button>
        </div>
      </section>
    </main>
  )
}

export default ReportsPage
/**
 * Propósito: presentar reportes operativos y comerciales del negocio.
 * Responsabilidades: consultar agregados y mostrar indicadores sin modificar datos de origen.
 * Dependencias: endpoints de reportes, utilidades monetarias y PageHeader.
 */
