// frontend/src/components/NotificationPermission.jsx
import Icon from './Icon'
import { useState } from 'react'
import { useStockAlerts } from '../hooks/useStockAlerts'

function NotificationPermission() {
  const { notificationPermission, requestNotificationPermission } = useStockAlerts()
  const [dismissed, setDismissed] = useState(false)
  // El banner depende directamente del permiso y de la decisión temporal de
  // ocultarlo; no necesita sincronizar otro estado mediante un efecto.
  const showBanner = notificationPermission === 'default' && !dismissed

  const handleEnable = async () => {
    const granted = await requestNotificationPermission()
    if (granted) {
      setDismissed(true)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  if (!showBanner) return null

  return (
    <div
      style={{
        marginBottom: '20px',
        padding: '14px 20px',
        borderRadius: '12px',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        background: 'rgba(56, 189, 248, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        animation: 'fadeInUp 0.3s ease both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Icon name="bell" size={22} />
        <div>
          <strong style={{ color: '#eef7ff', fontSize: '14px' }}>
            Activa las notificaciones
          </strong>
          <span style={{ color: '#8ea4c4', fontSize: '13px', marginLeft: '8px' }}>
            Recibe alertas cuando el stock esté bajo
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="primary-button"
          onClick={handleEnable}
          style={{
            padding: '6px 16px',
            fontSize: '13px',
            height: 'auto',
            minWidth: 'auto',
          }}
        >
          Activar
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

export default NotificationPermission
/**
 * Propósito: solicitar y reflejar el permiso de notificaciones del navegador.
 * Responsabilidades: no solicitarlo automáticamente y mantener el estado visible al usuario.
 * Dependencias: Web Notifications API y los dashboards.
 */
