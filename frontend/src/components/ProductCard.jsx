// frontend/src/components/ProductCard.jsx
import { useState } from 'react'
import StockModal from './StockModal'
import ConfirmModal from './ConfirmModal'
import { apiFetch } from '../api'
import { showToast } from './Toast'

function ProductCard({ product, canEdit, onUpdated }) {
  const [showStockModal, setShowStockModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false)
  const [deletingPermanently, setDeletingPermanently] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await apiFetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el producto')
      }

      showToast(`✅ ${data.message || `${product.name} eliminado correctamente`}`, 'success', 3500)
      onUpdated()
    } catch (error) {
      showToast(`❌ ${error.message}`, 'error', 3000)
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Reactiva un producto retirado sin tocar su historial ni la base de datos manualmente.
  const handleReactivate = async () => {
    try {
      const response = await apiFetch(`/api/products/${product.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo reactivar el producto')
      showToast(`✅ ${data.message}`, 'success', 3000)
      onUpdated()
    } catch (error) {
      showToast(`❌ ${error.message}`, 'error', 3500)
    }
  }

  // Elimina de verdad: borra la fila si nunca tuvo historial, o la archiva
  // (deja de aparecer, incluso para el admin) si sí lo tiene.
  const handlePermanentDelete = async () => {
    setDeletingPermanently(true)
    try {
      const response = await apiFetch(`/api/products/${product.id}/permanent`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el producto')
      }

      showToast(`✅ ${data.message}`, 'success', 3500)
      onUpdated()
    } catch (error) {
      showToast(`❌ ${error.message}`, 'error', 3500)
    } finally {
      setDeletingPermanently(false)
      setShowPermanentDeleteConfirm(false)
    }
  }

  return (
    <article className="product-card">
      <div className="product-main">
        <div className="product-icon">{product.name.charAt(0).toUpperCase()}</div>

        <div className="product-info">
          <h3>{product.name}</h3>
          <p>${Number(product.price_cup).toFixed(2)} CUP · {product.unit}</p>
          {!product.active && <small style={{ color: 'var(--warning)' }}>Retirado del catálogo</small>}
        </div>
      </div>

      <div className="stock-info">
        <span>Stock</span>
        <strong>
          {product.stock} {product.unit}
        </strong>
      </div>

      {canEdit && product.active && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="secondary-button" onClick={() => setShowStockModal(true)}>
            Modificar stock
          </button>
          <button 
            className="secondary-button" 
            onClick={() => setShowDeleteConfirm(true)}
            style={{ 
              borderColor: 'rgba(251, 113, 133, 0.2)',
              color: '#fb7185'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(251, 113, 133, 0.4)'
              e.currentTarget.style.background = 'rgba(251, 113, 133, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(251, 113, 133, 0.2)'
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
            }}
          >
            Retirar
          </button>
        </div>
      )}

      {canEdit && !product.active && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="secondary-button" onClick={handleReactivate}>↻ Reactivar</button>
          <button
            className="secondary-button"
            onClick={() => setShowPermanentDeleteConfirm(true)}
            style={{
              borderColor: 'rgba(251, 113, 133, 0.2)',
              color: '#fb7185'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(251, 113, 133, 0.4)'
              e.currentTarget.style.background = 'rgba(251, 113, 133, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(251, 113, 133, 0.2)'
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
            }}
          >
            🗑️ Eliminar
          </button>
        </div>
      )}

      {showStockModal && (
        <StockModal
          product={product}
          onClose={() => setShowStockModal(false)}
          onUpdated={onUpdated}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Retirar producto"
        message={`¿Quieres retirar "${product.name}"? Si tiene historial, se conservará de forma segura y podrás reactivarlo después.`}
        confirmText="Retirar"
        cancelText="Cancelar"
        type="danger"
        loading={deleting}
      />

      <ConfirmModal
        isOpen={showPermanentDeleteConfirm}
        onClose={() => setShowPermanentDeleteConfirm(false)}
        onConfirm={handlePermanentDelete}
        title="Eliminar permanentemente"
        message={`¿Seguro que quieres eliminar "${product.name}" de la plataforma? Ya no podrás reactivarlo. Si tiene ventas registradas, ese historial se conserva de forma interna, pero el producto no volverá a aparecer en ningún lugar.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        loading={deletingPermanently}
      />
    </article>
  )
}

export default ProductCard
/**
 * Propósito: presentar una fila/tarjeta de producto del inventario.
 * Responsabilidades: exponer existencias y acciones sin almacenar estado de negocio.
 * Dependencias: InventoryPage y callbacks de edición o ajuste de stock.
 */
