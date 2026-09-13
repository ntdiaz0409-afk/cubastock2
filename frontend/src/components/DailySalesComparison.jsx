// frontend/src/components/DailySalesComparison.jsx
import { useSalesStats } from '../hooks/useSalesStats'

function DailySalesComparison() {
  const { stats, refresh } = useSalesStats()

  if (stats.loading) {
    return (
      <div className="daily-comparison loading" style={{
        padding: '20px',
        border: '1px solid rgba(56, 189, 248, 0.08)',
        borderRadius: '16px',
        background: 'rgba(12, 22, 40, 0.4)',
        backdropFilter: 'blur(8px)',
        marginBottom: '24px',
        textAlign: 'center',
        color: '#8ea4c4'
      }}>
        <p>Cargando estadísticas...</p>
      </div>
    )
  }

  if (stats.error) {
    return (
      <div className="daily-comparison error" style={{
        padding: '20px',
        border: '1px solid rgba(251, 113, 133, 0.15)',
        borderRadius: '16px',
        background: 'rgba(251, 113, 133, 0.04)',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#fb7185', fontSize: '14px' }}>⚠️ {stats.error}</p>
        <button className="secondary-button" onClick={refresh} style={{ marginTop: '8px' }}>
          Reintentar
        </button>
      </div>
    )
  }

  const { today, yesterday, difference } = stats

  // Formatear precio en CUP
  const formatPrice = (amount) => {
    return `$${Number(amount).toFixed(2)} CUP`
  }

  return (
    <div className="daily-comparison" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
      padding: '20px',
      border: '1px solid rgba(56, 189, 248, 0.08)',
      borderRadius: '16px',
      background: 'rgba(12, 22, 40, 0.4)',
      backdropFilter: 'blur(8px)',
      marginBottom: '24px',
    }}>
      {/* Hoy */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#8ea4c4', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          📊 Hoy
        </p>
        <strong style={{ fontSize: '22px', color: '#eef7ff', display: 'block' }}>
          {formatPrice(today.total)}
        </strong>
        <span style={{ color: '#5a6f8a', fontSize: '12px' }}>
          {today.count} venta{today.count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Ayer */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#8ea4c4', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          📅 Ayer
        </p>
        <strong style={{ fontSize: '22px', color: '#8ea4c4', display: 'block' }}>
          {formatPrice(yesterday.total)}
        </strong>
        <span style={{ color: '#5a6f8a', fontSize: '12px' }}>
          {yesterday.count} venta{yesterday.count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Diferencia */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#8ea4c4', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          🔄 Diferencia
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '22px',
            fontWeight: '700',
            color: difference.isPositive ? '#34d399' : '#fb7185',
          }}>
            {difference.isPositive ? '▲' : '▼'} {formatPrice(Math.abs(difference.amount))}
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            padding: '2px 10px',
            borderRadius: '20px',
            background: difference.isPositive ? 'rgba(52, 211, 153, 0.12)' : 'rgba(251, 113, 133, 0.12)',
            color: difference.isPositive ? '#34d399' : '#fb7185',
          }}>
            {difference.percentage > 0 ? '+' : ''}{difference.percentage.toFixed(1)}%
          </span>
        </div>
        <span style={{ color: '#5a6f8a', fontSize: '12px' }}>
          {difference.isPositive ? '⬆️ Mejor que ayer' : '⬇️ Peor que ayer'}
        </span>
      </div>
    </div>
  )
}

export default DailySalesComparison
/**
 * Propósito: resumir la comparación de ventas diarias para dependientes.
 * Responsabilidades: consultar métricas y presentar la variación relevante.
 * Dependencias: API configurada en api.js y el dashboard de dependiente.
 */
