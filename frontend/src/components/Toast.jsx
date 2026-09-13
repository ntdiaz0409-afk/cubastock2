// frontend/src/components/Toast.jsx
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from './Icon'

function Toast({ message, type = 'success', duration = 4000, onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = {
    success: 'check',
    error: 'alert',
    warning: 'alert',
    info: 'bell',
  }

  const colors = {
    success: { bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.3)', text: '#34d399' },
    error: { bg: 'rgba(251, 113, 133, 0.12)', border: 'rgba(251, 113, 133, 0.3)', text: '#fb7185' },
    warning: { bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' },
    info: { bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)', text: '#38bdf8' },
  }

  const color = colors[type] || colors.info

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'rgba(12, 22, 40, 0.92)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${color.border}`,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(0, 0, 0, 0.2)',
            maxWidth: '420px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <span style={{ display: 'inline-flex', color: color.text, flexShrink: 0 }}><Icon name={icons[type]} size={20} /></span>
          <div style={{ flex: 1 }}>
            <p style={{ 
              margin: 0, 
              color: color.text, 
              fontSize: '14px', 
              fontWeight: 500,
              lineHeight: 1.4
            }}>
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setVisible(false)
              setTimeout(onClose, 300)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0 4px',
              transition: 'color 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Sistema de notificaciones global
let toastContainer = null

export function showToast(message, type = 'success', duration = 4000) {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'toast-container'
    document.body.appendChild(toastContainer)
  }

  const id = Date.now()
  const toastElement = document.createElement('div')
  toastElement.id = `toast-${id}`

  const handleClose = () => {
    const el = document.getElementById(`toast-${id}`)
    if (el) el.remove()
  }

  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(toastElement)
    root.render(
      <Toast message={message} type={type} duration={duration} onClose={handleClose} />
    )
    toastContainer.appendChild(toastElement)
  })
}

export default Toast
/**
 * Propósito: notificación transitoria no bloqueante.
 * Responsabilidades: representar el mensaje y ejecutar el cierre programado o manual.
 * Dependencias: estado de toast administrado por las páginas consumidoras.
 */
