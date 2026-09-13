// frontend/src/components/DashboardCard.jsx
import Icon from './Icon'

/**
 * Tarjeta de navegación de módulo. El icono es un nombre del sistema SVG
 * (Icon.jsx): trazo fino y consistente en lugar de emojis.
 */
function DashboardCard({ title, description, icon, onClick }) {
  return (
    <div className="dashboard-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onClick() }}>
      <div className="card-icon">
        <Icon name={icon} size={22} />
      </div>
      <div className="dashboard-card-body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="card-action">
        Abrir
        <Icon name="arrowRight" size={14} className="card-action-arrow" />
      </span>
    </div>
  )
}

export default DashboardCard
/**
 * Propósito: tarjeta de navegación reutilizable en los dashboards.
 * Responsabilidades: mostrar una acción de módulo y propagar su click.
 * Dependencias: Icon y los dashboards por rol.
 */
