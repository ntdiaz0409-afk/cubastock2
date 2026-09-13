// frontend/src/pages/HistoryPage.jsx
import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import PageHeader from '../components/PageHeader'
import SaleDetailsModal from '../components/SaleDetailsModal'

/** Carga operaciones históricas y controla la selección cuyo detalle se muestra en modal. */
function HistoryPage({ user, onBack, onLogout }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState(null)

  async function loadSales() {
    try {
      setLoading(true)
      setError('')

      const response = await apiFetch('/api/sales')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar las ventas.')
      }

      setSales(data.sales || [])
    } catch (err) {
      setError(err.message || 'Error cargando historial.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [])

  function formatDate(value) {
    if (!value) return 'N/A'
    return new Date(value).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatCurrency(value) {
    return Number(value).toFixed(2)
  }

  return (
    <main className="dashboard-page">
      <PageHeader 
        user={user}
        onBack={onBack}
        onLogout={onLogout}
        title="Historial"
      />

      <section className="dashboard-content">
        <div className="inventory-heading">
          <div>
            <p className="eyebrow">REGISTRO DE OPERACIONES</p>
            <h2>Historial de ventas</h2>
            <p>Todas las ventas realizadas en el negocio.</p>
          </div>

          <button 
            className="secondary-button" 
            onClick={loadSales} 
            disabled={loading}
          >
            Actualizar
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        {loading ? (
          <div className="empty-state">
            <strong>Cargando historial...</strong>
          </div>
        ) : sales.length === 0 ? (
          <div className="empty-state">
            <strong>No hay ventas registradas</strong>
            <p>Todavía no se ha realizado ninguna venta.</p>
          </div>
        ) : (
          <div className="history-list">
            <div className="history-header">
              <span># Venta</span>
              <span>Usuario</span>
              <span>Total</span>
              <span>Fecha</span>
              <span style={{ textAlign: 'center' }}>Acciones</span>
            </div>

            {sales.map((sale) => (
              <div className="history-item" key={sale.id}>
                <span className="history-id">#{String(sale.id).slice(0, 8)}</span>
                <span className="history-user">{sale.username}</span>
                <span className="history-total">${formatCurrency(sale.total_cup)} CUP</span>
                <span className="history-date">{formatDate(sale.created_at)}</span>
                <span style={{ textAlign: 'center' }}>
                  <button
                    className="secondary-button"
                    onClick={() => setSelectedSaleId(sale.id)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      height: '32px',
                      minWidth: '70px',
                      borderColor: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)'
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.15)'
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                    }}
                  >
                    Detalles
                  </button>
                </span>
              </div>
            ))}

            <div className="history-footer">
              <strong>Total de ventas: {sales.length}</strong>
              <strong>
                Total recaudado: $
                {formatCurrency(
                  sales.reduce((sum, sale) => sum + Number(sale.total_cup), 0)
                )} CUP
              </strong>
            </div>
          </div>
        )}
      </section>

      {/* Modal de detalles */}
      {selectedSaleId && (
        <SaleDetailsModal
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
        />
      )}
    </main>
  )
}

export default HistoryPage
/**
 * Propósito: consultar el historial de operaciones y sus detalles.
 * Responsabilidades: paginar/filtrar resultados y abrir SaleDetailsModal cuando corresponde.
 * Dependencias: API de ventas/movimientos, PageHeader y SaleDetailsModal.
 */
