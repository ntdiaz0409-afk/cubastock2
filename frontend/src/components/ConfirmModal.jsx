// frontend/src/components/ConfirmModal.jsx
import Icon from './Icon'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message = '¿Estás seguro de que quieres realizar esta acción?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning', // 'warning', 'danger', 'info', 'success'
  loading = false,
}) {
  const modalRef = useRef(null)

  // Cerrar al hacer clic fuera del modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Cerrar al presionar ESC
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'alert',
          border: 'rgba(251, 113, 133, 0.3)',
          bg: 'rgba(251, 113, 133, 0.06)',
          buttonBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
          buttonHover: 'linear-gradient(135deg, #dc2626, #b91c1c)',
        }
      case 'warning':
        return {
          icon: 'alert',
          border: 'rgba(251, 191, 36, 0.3)',
          bg: 'rgba(251, 191, 36, 0.06)',
          buttonBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          buttonHover: 'linear-gradient(135deg, #d97706, #b45309)',
        }
      case 'success':
        return {
          icon: 'check',
          border: 'rgba(52, 211, 153, 0.3)',
          bg: 'rgba(52, 211, 153, 0.06)',
          buttonBg: 'linear-gradient(135deg, #10b981, #059669)',
          buttonHover: 'linear-gradient(135deg, #059669, #047857)',
        }
      default:
        return {
          icon: 'bell',
          border: 'rgba(56, 189, 248, 0.3)',
          bg: 'rgba(56, 189, 248, 0.06)',
          buttonBg: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          buttonHover: 'linear-gradient(135deg, #0284c7, #0369a1)',
        }
    }
  }

  const colors = getColors()

  return createPortal(
    <div
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
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px 28px',
          borderRadius: '16px',
          background: 'rgba(12, 22, 40, 0.92)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(56,189,248,0.05)',
          animation: 'fadeInScale 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ display: 'inline-flex', color: '#fbbf24' }}><Icon name={colors.icon} size={26} /></span>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#eef7ff' }}>
            {title}
          </h2>
        </div>

        {/* Mensaje */}
        <p style={{ 
          margin: '0 0 24px 0', 
          color: '#8ea4c4', 
          fontSize: '15px', 
          lineHeight: '1.6',
          padding: '12px 16px',
          borderRadius: '10px',
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}>
          {message}
        </p>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              color: '#8ea4c4',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.color = '#eef7ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
              e.currentTarget.style.color = '#8ea4c4'
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 0,
              background: colors.buttonBg,
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = colors.buttonHover
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = colors.buttonBg
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'
              }
            }}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmModal
/**
 * Propósito: diálogo reutilizable para confirmar acciones destructivas o sensibles.
 * Responsabilidades: presentar la decisión y delegar la acción al callback del consumidor.
 * Dependencias: páginas que controlan su apertura y estilos globales de modal.
 */
