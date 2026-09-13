// frontend/src/pages/AdminDashboard.jsx
import { lazy, Suspense } from 'react'
import { useAppNavigation } from '../hooks/useAppNavigation'
import DashboardCard from '../components/DashboardCard'
// Carga diferida de los módulos: el bundle inicial solo trae lo necesario
// para entrar al panel; cada pantalla se descarga la primera vez que se abre.
// En móviles con datos limitados esto reduce mucho el tiempo de carga inicial.
const InventoryPage = lazy(() => import('./InventoryPage'))
const SalesPage = lazy(() => import('./SalesPage'))
const StatisticsPage = lazy(() => import('./StatisticsPage'))
const DependentsPage = lazy(() => import('./DependentsPage'))
const HistoryPage = lazy(() => import('./HistoryPage'))
const ReportsPage = lazy(() => import('./ReportsPage'))
const BusinessSettingsPage = lazy(() => import('./BusinessSettingsPage'))
import PageHeader from '../components/PageHeader'
import StockAlertBanner from '../components/StockAlertBanner'
import NotificationPermission from '../components/NotificationPermission'
import OfflineIndicator from '../components/OfflineIndicator'

/** Fallback mínimo mientras llega el chunk de la pantalla solicitada. */
function PageLoading() {
  return (
    <main className="dashboard-page">
      <section className="dashboard-content">
        <div className="empty-state">
          <strong>Cargando…</strong>
        </div>
      </section>
    </main>
  )
}

/** Selecciona el módulo administrativo activo sin cambiar la sesión del usuario. */
function AdminDashboard({ user, onLogout }) {
  const { view, navigate } = useAppNavigation(['dashboard', 'inventory', 'sales', 'statistics', 'dependents', 'history', 'reports', 'business-settings'])

  if (view === 'inventory') {
    return <Suspense fallback={<PageLoading />}><InventoryPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} /></Suspense>
  }

  if (view === 'sales') {
    return <Suspense fallback={<PageLoading />}><SalesPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} /></Suspense>
  }

  if (view === 'statistics') {
    return <Suspense fallback={<PageLoading />}><StatisticsPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} /></Suspense>
  }

  if (view === 'dependents') {
    return <Suspense fallback={<PageLoading />}><DependentsPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} /></Suspense>
  }

  if (view === 'history') {
    return <Suspense fallback={<PageLoading />}><HistoryPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} /></Suspense>
  }

  if (view === 'reports') {
    return <Suspense fallback={<PageLoading />}><ReportsPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} /></Suspense>
  }

  // La configuración ya existía junto a su API; este bloque la incorpora al
  // flujo real de navegación del administrador sin retirar Reportes.
  if (view === 'business-settings') {
    return <Suspense fallback={<PageLoading />}><BusinessSettingsPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} /></Suspense>
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
