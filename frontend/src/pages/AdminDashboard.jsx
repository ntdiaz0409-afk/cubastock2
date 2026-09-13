// frontend/src/pages/AdminDashboard.jsx
import { useAppNavigation } from '../hooks/useAppNavigation'
import DashboardCard from '../components/DashboardCard'
import InventoryPage from './InventoryPage'
import SalesPage from './SalesPage'
import StatisticsPage from './StatisticsPage'
import DependentsPage from './DependentsPage'
import HistoryPage from './HistoryPage'
import ReportsPage from './ReportsPage'
import BusinessSettingsPage from './BusinessSettingsPage'
import PageHeader from '../components/PageHeader'
import StockAlertBanner from '../components/StockAlertBanner'
import NotificationPermission from '../components/NotificationPermission'
import OfflineIndicator from '../components/OfflineIndicator'

/** Selecciona el módulo administrativo activo sin cambiar la sesión del usuario. */
function AdminDashboard({ user, onLogout }) {
  const { view, navigate } = useAppNavigation(['dashboard', 'inventory', 'sales', 'statistics', 'dependents', 'history', 'reports', 'business-settings'])

  if (view === 'inventory') {
    return <InventoryPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} />
  }

  if (view === 'sales') {
    return <SalesPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} />
  }

  if (view === 'statistics') {
    return <StatisticsPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} />
  }

  if (view === 'dependents') {
    return <DependentsPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} />
  }

  if (view === 'history') {
    return <HistoryPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} />
  }

  if (view === 'reports') {
    return <ReportsPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} />
  }

  // La configuración ya existía junto a su API; este bloque la incorpora al
  // flujo real de navegación del administrador sin retirar Reportes.
  if (view === 'business-settings') {
    return <BusinessSettingsPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} />
  }

  return (
    <main className="dashboard-page">
      <PageHeader 
        user={user}
        onBack={null}
        onLogout={onLogout}
        title="Panel administrativo"
        showBackButton={false}
      />

      <section className="dashboard-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <OfflineIndicator />
        </div>

        <div className="welcome">
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h2>Bienvenido, {user.username}</h2>
          <p>Administra inventario, ventas y usuarios desde aquí.</p>
        </div>

        {/* 🔔 Permiso de notificaciones */}
        <NotificationPermission />

        {/* ⚠️ Alertas de stock bajo */}
        <StockAlertBanner onViewLowStock={() => navigate('inventory')} />

        <div className="dashboard-grid">
          <DashboardCard
            title="Ventas"
            description="Registrar y consultar ventas."
            icon="💰"
            onClick={() => navigate('sales')}
          />

          <DashboardCard
            title="Inventario"
            description="Existencias y movimientos del inventario."
            icon="📦"
            onClick={() => navigate('inventory')}
          />

          {/* Sustituye el acceso principal a Reportes por la configuración que
              requiere el negocio; Reportes conserva su componente y ruta. */}
          <DashboardCard
            title="Configuración del negocio"
            description="Datos, tarjeta de cobro y moneda principal."
            icon="⚙️"
            onClick={() => navigate('business-settings')}
          />

          <DashboardCard
            title="Historial"
            description="Consultar operaciones realizadas."
            icon="🔄"
            onClick={() => navigate('history')}
          />

          <DashboardCard
            title="Dependientes"
            description="Gestionar usuarios y permisos."
            icon="👥"
            onClick={() => navigate('dependents')}
          />

          <DashboardCard
            title="Estadísticas"
            description="Ingresos y rendimiento del negocio."
            icon="📊"
            onClick={() => navigate('statistics')}
          />
        </div>
      </section>
    </main>
  )
}

export default AdminDashboard
/**
 * Propósito: contenedor de navegación para las capacidades del administrador.
 * Responsabilidades: seleccionar la vista activa y suministrar sesión/cierre a sus subpáginas.
 * Dependencias: PageHeader, módulos de administración y alertas/notificaciones globales.
 */
