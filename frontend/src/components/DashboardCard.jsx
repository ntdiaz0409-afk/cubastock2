// frontend/src/components/DashboardCard.jsx
function DashboardCard({ title, description, icon, onClick }) {
  return (
    <div className="dashboard-card" onClick={onClick}>
      <div className="card-icon">{icon}</div>
      <div>
        <h3 style={{ color: '#eef7ff', margin: '2px 0 6px', fontSize: '17px', fontWeight: 600 }}>
          {title}
        </h3>
        <p style={{ color: '#b5c7df', margin: 0, fontSize: '13px', lineHeight: '1.4' }}>
          {description}
        </p>
      </div>
      <span className="card-action">Abrir →</span>
    </div>
  )
}

export default DashboardCard
/**
 * Propósito: tarjeta de navegación reutilizable en los dashboards.
 * Responsabilidades: mostrar una acción de módulo y propagar su click.
 * Dependencias: AdminDashboard y DependienteDashboard.
 */
