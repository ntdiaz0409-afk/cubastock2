// frontend/src/components/PageHeader.jsx
import Logo from './Logo'
import { useTheme } from '../hooks/useTheme'
import AdminNotifications from './AdminNotifications'

/** Muestra controles de navegación compartidos y respeta las acciones autorizadas por el rol. */
function PageHeader({ user, onBack, onLogout, title, showBackButton = true }) {
  const { theme, toggleTheme } = useTheme()
  const isAdmin = user.role === 'ADMIN'

  return (
    <header className="dashboard-header">
      <div className="dashboard-brand">
        {showBackButton && (
          <button className="back-button" onClick={onBack}>
            ←
          </button>
        )}

        {/* Logo de la aplicación */}
        <Logo size={40} />

        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            CubaStock
          </h1>
          <span style={{ display: 'block', marginTop: '2px', color: 'var(--text-muted)', fontSize: '12px' }}>
            {title}
          </span>
        </div>
        {isAdmin && <AdminNotifications />}
      </div>

      <div className="user-area">
        <div className="user-info">
          <strong>{user.username}</strong>
          <span>{user.role}</span>
        </div>

        {/* Ajuste visual disponible para todos los usuarios de la plataforma. */}
        <button className="header-icon-button" onClick={toggleTheme} title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`} aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {isAdmin && (
          <>
            {/* Soporte abre WhatsApp en otra pestaña y no abandona CubaStock. */}
            <a className="support-button" href="https://wa.me/+5358780497?text=Hola%2C%20necesito%20ayuda%20con%20CubaStock" target="_blank" rel="noreferrer" title="Contactar soporte por WhatsApp">
              💬 <span>Soporte</span>
            </a>
          </>
        )}

        <button className="logout-button" onClick={onLogout}>
          Salir
        </button>
      </div>
    </header>
  )
}

export default PageHeader
/**
 * Propósito: cabecera uniforme de las vistas autenticadas.
 * Responsabilidades: identidad visual, navegación atrás, tema, soporte y cierre de sesión.
 * Dependencias: Logo, useTheme y callbacks entregados por cada página/dashboard.
 */
