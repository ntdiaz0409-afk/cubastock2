// frontend/src/components/StockAlertBanner.jsx
import { useState } from 'react'
import { useStockAlerts } from '../hooks/useStockAlerts'

function StockAlertBanner({ onViewLowStock }) {
  const { lowStockProducts, criticalStockProducts, loading } = useStockAlerts()
  const [dismissed, setDismissed] = useState(false)

  if (loading) return null
  if (dismissed && lowStockProducts.length === 0) return null
  if (lowStockProducts.length === 0) return null

  const criticalCount = criticalStockProducts.length
  const lowCount = lowStockProducts.length - criticalCount

  const handleDismiss = () => {
    setDismissed(true)
  }

  return (
    <div
      style={{
        marginBottom: '20px',
        padding: '14px 20px',
        borderRadius: '12px',
        border: criticalCount > 0 
          ? '1px solid rgba(251, 113, 133, 0.25)' 
          : '1px solid rgba(251, 191, 36, 0.15)',
        background: criticalCount > 0 
          ? 'rgba(251, 113, 133, 0.06)' 
          : 'rgba(251, 191, 36, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        animation: 'fadeInUp 0.3s ease both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>
          {criticalCount > 0 ? '🚨' : '⚠️'}
        </span>
        <div>
          <strong style={{ color: criticalCount > 0 ? '#fb7185' : '#fbbf24' }}>
            {criticalCount > 0 
              ? `${criticalCount} producto${criticalCount > 1 ? 's' : ''} con stock crítico` 
              : `${lowCount || lowStockProducts.length} producto${(lowCount || lowStockProducts.length) > 1 ? 's' : ''} con stock bajo`
            }
          </strong>
          <span style={{ color: '#8ea4c4', fontSize: '13px', marginLeft: '8px' }}>
            {criticalCount > 0 && lowCount > 0 && `(${lowCount} adicionales con stock bajo)`}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="secondary-button"
          onClick={onViewLowStock}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            height: 'auto',
            minWidth: 'auto',
            borderColor: criticalCount > 0 
              ? 'rgba(251, 113, 133, 0.2)' 
              : 'rgba(251, 191, 36, 0.2)',
            color: criticalCount > 0 ? '#fb7185' : '#fbbf24',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = criticalCount > 0 
              ? 'rgba(251, 113, 133, 0.4)' 
              : 'rgba(251, 191, 36, 0.4)'
            e.currentTarget.style.background = criticalCount > 0 
              ? 'rgba(251, 113, 133, 0.08)' 
              : 'rgba(251, 191, 36, 0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = criticalCount > 0 
              ? 'rgba(251, 113, 133, 0.2)' 
              : 'rgba(251, 191, 36, 0.2)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
          }}
        >
          Ver productos
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#5a6f8a',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#8ea4c4'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#5a6f8a'}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default StockAlertBanner
/**
 * Propósito: advertir productos con existencias bajo el mínimo configurado.
 * Responsabilidades: consultar alertas y dirigir al usuario al inventario cuando procede.
 * Dependencias: useStockAlerts y callback onViewLowStock de los dashboards.
 */
