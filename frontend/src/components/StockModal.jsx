// frontend/src/components/StockModal.jsx
import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '../api'
import { showToast } from './Toast'

function StockModal({ product, onClose, onUpdated }) {
  const [quantity, setQuantity] = useState('')
  const [type, setType] = useState('ADMIN_INCREASE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const inputRef = useRef(null)
  const confirmModalRef = useRef(null)

  // Auto-focus al input cuando se abre el modal
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 150)
    }
    document.body.style.overflow = 'hidden'
    document.body.style.pointerEvents = 'none'
    
    return () => {
      document.body.style.overflow = 'unset'
      document.body.style.pointerEvents = 'auto'
    }
  }, [])

  const getTypeDescription = () => {
    const amount = Number(quantity) || 0
    const currentStock = Number(product.stock)
    let newStock
    let actionText

    switch (type) {
      case 'ADMIN_INCREASE':
        newStock = currentStock + amount
        actionText = `Agregar ${amount} unidades`
        break
      case 'ADMIN_DECREASE':
        newStock = currentStock - amount
        actionText = `Quitar ${amount} unidades`
        break
      case 'ADMIN_CORRECTION':
        newStock = amount
        actionText = `Corregir stock a ${amount} unidades`
        break
      default:
        return ''
    }

    return `${actionText} → ${currentStock} → ${newStock}`
  }

  const getNewStock = () => {
    const amount = Number(quantity) || 0
    const currentStock = Number(product.stock)

    switch (type) {
      case 'ADMIN_INCREASE':
        return currentStock + amount
      case 'ADMIN_DECREASE':
        return currentStock - amount
      case 'ADMIN_CORRECTION':
        return amount
      default:
        return currentStock
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const amount = Number(quantity)
    
    if (isNaN(amount) || amount <= 0) {
      setError('La cantidad debe ser un número positivo.')
      return
    }

    if (type === 'ADMIN_DECREASE' && amount > Number(product.stock)) {
      setError(`No puedes quitar más stock del que hay. Disponible: ${product.stock}`)
      return
    }

    if (type === 'ADMIN_CORRECTION' && amount < 0) {
      setError('La cantidad no puede ser negativa.')
      return
    }

    // Mostrar modal de confirmación
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    setShowConfirm(false)

    try {
      const response = await apiFetch(`/api/products/${product.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quantity: Number(quantity), 
          type 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al modificar stock.')
      }

      showToast(`✅ Stock de ${product.name} actualizado`, 'success', 3000)
      onUpdated()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTypeChange = (e) => {
    setType(e.target.value)
    setQuantity('')
    setError('')
    setShowConfirm(false)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Cerrar confirmación al hacer clic fuera
  const handleConfirmOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowConfirm(false)
    }
  }

  return (
    <>
      {/* Overlay principal */}
      <div 
        className="modal-overlay" 
        onClick={handleOverlayClick}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: 'rgba(2, 8, 18, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeInUp 0.25s ease both',
          pointerEvents: 'auto',
          cursor: 'default',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Modal principal */}
        <div 
          className="modal-card" 
          style={{
            width: '100%',
            maxWidth: '460px',
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
            padding: '28px 30px',
            borderRadius: '16px',
            background: 'rgba(12, 22, 40, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(56,189,248,0.08)',
            animation: 'fadeInScale 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 100000,
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <div className="modal-header" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px' 
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#eef7ff' }}>
              Modificar stock
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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

          <form onSubmit={handleSubmit} style={{ pointerEvents: 'auto' }}>
            <p style={{ color: '#8ea4c4', fontSize: '14px', marginBottom: '16px' }}>
              <strong style={{ color: '#eef7ff' }}>{product.name}</strong>
            </p>

            <div className="current-stock" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              marginBottom: '18px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.04)',
              border: '1px solid rgba(56, 189, 248, 0.08)',
            }}>
              <span style={{ color: '#8ea4c4', fontSize: '13px' }}>Stock actual</span>
              <strong style={{ color: '#38bdf8', fontSize: '16px' }}>
                {Number(product.stock).toFixed(3)} {product.unit}
              </strong>
            </div>

            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              color: '#8ea4c4', 
              fontSize: '13px', 
              fontWeight: 600 
            }}>
              Tipo de operación
            </label>
            <select 
              value={type} 
              onChange={handleTypeChange}
              style={{
                width: '100%',
                height: '48px',
                padding: '0 14px',
                marginBottom: '18px',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                color: '#eef7ff',
                fontSize: '15px',
                outline: 'none',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            >
              <option value="ADMIN_INCREASE">➕ Agregar stock</option>
              <option value="ADMIN_DECREASE">➖ Quitar stock</option>
              <option value="ADMIN_CORRECTION">✏️ Corregir (cantidad exacta)</option>
            </select>

            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              color: '#8ea4c4', 
              fontSize: '13px', 
              fontWeight: 600 
            }}>
              Cantidad
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => {
                const value = e.target.value
                if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                  setQuantity(value)
                  setError('')
                  setShowConfirm(false)
                }
              }}
              placeholder={
                type === 'ADMIN_CORRECTION' 
                  ? 'Ej. 10 (stock final deseado)' 
                  : 'Ej. 5 (cantidad a agregar/quitar)'
              }
              style={{
                fontSize: '18px',
                padding: '12px 14px',
                height: '56px',
                width: '100%',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                color: '#eef7ff',
                outline: 'none',
                transition: 'all 0.3s',
                marginBottom: '16px',
                pointerEvents: 'auto',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(56, 189, 248, 0.4)'
                e.target.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.08)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.06)'
                e.target.style.boxShadow = 'none'
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />

            {quantity && Number(quantity) > 0 && !showConfirm && (
              <div style={{
                padding: '12px 16px',
                marginBottom: '16px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.1)',
                color: '#8ea4c4',
                fontSize: '14px',
                fontWeight: '500',
              }}>
                {getTypeDescription()}
              </div>
            )}

            {error && (
              <div className="login-error" style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="primary-button full-width"
              disabled={!quantity || Number(quantity) <= 0 || loading}
              style={{
                width: '100%',
                height: '48px',
                border: 0,
                borderRadius: '10px',
                background: (!quantity || Number(quantity) <= 0 || loading) 
                  ? 'rgba(255,255,255,0.05)' 
                  : 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                color: (!quantity || Number(quantity) <= 0 || loading) ? '#5a6f8a' : '#03101c',
                fontWeight: 700,
                fontSize: '15px',
                cursor: (!quantity || Number(quantity) <= 0 || loading) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                opacity: (!quantity || Number(quantity) <= 0 || loading) ? 0.5 : 1,
                pointerEvents: 'auto',
              }}
            >
              {loading ? 'Procesando...' : 'Resumen'}
            </button>
          </form>
        </div>
      </div>

      {/* Modal de confirmación - con z-index MÁS ALTO */}
      {showConfirm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'rgba(2, 8, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeInUp 0.25s ease both',
            pointerEvents: 'auto',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          onClick={handleConfirmOverlayClick}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <div 
            ref={confirmModalRef}
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '32px 28px',
              borderRadius: '16px',
              background: 'rgba(12, 22, 40, 0.98)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(251,191,36,0.05)',
              animation: 'fadeInScale 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 200001,
              userSelect: 'text',
              WebkitUserSelect: 'text',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#eef7ff' }}>
                Confirmar modificación
              </h2>
            </div>

            <div style={{
              padding: '14px 16px',
              marginBottom: '20px',
              borderRadius: '10px',
              background: 'rgba(251, 191, 36, 0.04)',
              border: '1px solid rgba(251, 191, 36, 0.08)',
              color: '#8ea4c4',
              fontSize: '14px',
              lineHeight: '1.6',
            }}>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong style={{ color: '#eef7ff' }}>Producto:</strong> {product.name}
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong style={{ color: '#eef7ff' }}>Operación:</strong> {getTypeDescription()}
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#eef7ff' }}>Nuevo stock:</strong> {getNewStock().toFixed(3)} {product.unit}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setError('')
                }}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#8ea4c4',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  pointerEvents: 'auto',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.color = '#eef7ff'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  e.currentTarget.style.color = '#8ea4c4'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 0,
                  background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: loading ? '#5a6f8a' : '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(0,0,0,0.2)',
                  opacity: loading ? 0.5 : 1,
                  pointerEvents: 'auto',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #d97706, #b45309)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
              >
                {loading ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default StockModal
/**
 * Propósito: registrar un ajuste de existencias para un producto.
 * Responsabilidades: recoger la operación y delegar persistencia al consumidor.
 * Dependencias: InventoryPage, API de movimientos y estilos de modal.
 */
