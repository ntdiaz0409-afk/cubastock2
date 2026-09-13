// frontend/src/components/CreateProductModal.jsx
import { useState } from 'react'
import { apiFetch } from '../api'

function CreateProductModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [stock, setStock] = useState('')
  const [unit, setUnit] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [reorderLevel, setReorderLevel] = useState('5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !unit.trim()) {
      setError('Nombre y unidad son obligatorios.')
      return
    }

    const priceNum = Number(price)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError('El precio debe ser un número válido.')
      return
    }

    const stockNum = Number(stock) || 0
    if (stockNum < 0) {
      setError('El stock no puede ser negativo.')
      return
    }

    setLoading(true)

    try {
      const response = await apiFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          price_cup: priceNum,
          cost_cup: Number(cost) || 0,
          stock: stockNum,
          unit: unit.trim(),
          expires_at: expiresAt || null,
          reorder_level: Number(reorderLevel) || 5,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear producto.')
      }

      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo producto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Refresco Cola"
            required
          />

          <label>Precio (CUP)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ej. 500.00"
            required
          />

          <label>Costo de compra por unidad (CUP)</label>
          <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Ej. 250.00" />
          {price && cost && <p className="form-hint">Ganancia estimada: ${(Number(price) - Number(cost)).toFixed(2)} CUP por unidad</p>}

          <label>Stock inicial</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Ej. 10"
          />

          <label>Unidad</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Ej. unidad, kg, litro"
            required
          />

          <label>Fecha de vencimiento</label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />

          <label>Stock mínimo para alertar</label>
          <input type="number" min="0" step="0.001" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="primary-button full-width" disabled={loading}>
            {loading ? 'Creando...' : 'Crear producto'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateProductModal
/**
 * Propósito: formulario modal de alta de productos.
 * Responsabilidades: validar datos locales y comunicar el producto al callback del inventario.
 * Dependencias: InventoryPage y estilos de modal de App.css.
 */
