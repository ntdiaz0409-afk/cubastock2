// frontend/src/components/SaleDetailsModal.jsx
import { useEffect, useState } from 'react'
import { apiFetch } from '../api'

function SaleDetailsModal({ saleId, onClose }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true)
        setError('')

        const response = await apiFetch(`/api/sales/${saleId}/details`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar los detalles')
        }

        setDetails(data)
      } catch (err) {
        setError(err.message || 'Error al cargar detalles')
      } finally {
        setLoading(false)
      }
    }

    if (saleId) {
      loadDetails()
    }
  }, [saleId])

  // Cerrar al presionar ESC
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  const formatDate = (value) => {
    if (!value) return 'N/A'
    return new Date(value).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(2, 8, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeInUp 0.25s ease both',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          padding: '28px 30px',
          borderRadius: '16px',
          background: 'rgba(12, 22, 40, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(56,189,248,0.05)',
          animation: 'fadeInScale 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        <div className="modal-header" style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#eef7ff' }}>
            📋 Detalles de la venta
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              background: 'transparent',
              color: '#8ea4c4',
              fontSize: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(251, 113, 133, 0.2)'
              e.currentTarget.style.background = 'rgba(251, 113, 133, 0.06)'
              e.currentTarget.style.color = '#fb7185'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#8ea4c4'
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <strong>Cargando detalles...</strong>
          </div>
        ) : error ? (
          <div className="login-error" style={{ marginBottom: '0' }}>
            ❌ {error}
          </div>
        ) : details ? (
          <>
            {/* Encabezado de la venta */}
            <div style={{
              padding: '14px 16px',
              marginBottom: '16px',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.04)',
              border: '1px solid rgba(56, 189, 248, 0.08)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ color: '#8ea4c4', fontSize: '13px' }}>
                  Venta #{String(details.sale?.id || saleId).slice(0, 8)}
                </span>
                <span style={{ color: '#8ea4c4', fontSize: '13px' }}>
                  {formatDate(details.sale?.created_at)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ color: '#8ea4c4', fontSize: '13px' }}>
                  👤 {details.sale?.username || 'Usuario'}
                </span>
                <strong style={{ color: '#34d399', fontSize: '18px' }}>
                  ${Number(details.sale?.total_cup || 0).toFixed(2)} CUP
                </strong>
              </div>
            </div>

            {/* Lista de productos */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#8ea4c4', fontSize: '13px', marginBottom: '10px', fontWeight: 600 }}>
                Productos vendidos
              </p>

              {details.items && details.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {details.items.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#eef7ff', fontSize: '14px' }}>
                          {item.product_name || item.name || 'Producto'}
                        </strong>
                        <span style={{ color: '#5a6f8a', fontSize: '12px', marginLeft: '8px' }}>
                          × {Number(item.quantity).toFixed(3)} {item.unit || ''}
                        </span>
                      </div>
                      <strong style={{ color: '#eef7ff', fontSize: '14px' }}>
                        ${Number(item.subtotal_cup || item.subtotal || 0).toFixed(2)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '20px' }}>
                  <p style={{ color: '#5a6f8a', fontSize: '13px' }}>No hay productos en esta venta</p>
                </div>
              )}
            </div>

            {/* Total */}
            <div style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'rgba(52, 211, 153, 0.04)',
              border: '1px solid rgba(52, 211, 153, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: '#8ea4c4', fontSize: '14px', fontWeight: 600 }}>
                Total
              </span>
              <strong style={{ color: '#34d399', fontSize: '20px' }}>
                ${Number(details.sale?.total_cup || 0).toFixed(2)} CUP
              </strong>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default SaleDetailsModal
/**
 * Propósito: mostrar el desglose inmutable de una venta ya registrada.
 * Responsabilidades: formatear artículos, importes y metadatos de la operación.
 * Dependencias: HistoryPage y utilidades de moneda.
 */
