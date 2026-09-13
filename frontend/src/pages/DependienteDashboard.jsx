// frontend/src/pages/DependienteDashboard.jsx
import { lazy, Suspense } from 'react'
import { useAppNavigation } from '../hooks/useAppNavigation'
import DashboardCard from '../components/DashboardCard'
const SalesPage = lazy(() => import('./SalesPage'))
const InventoryPage = lazy(() => import('./InventoryPage'))
import PageHeader from '../components/PageHeader'
import DailySalesComparison from '../components/DailySalesComparison'
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

/** Limita el menú y las rutas internas a las operaciones permitidas al dependiente. */
function DependienteDashboard({ user, onLogout }) {
  const { view, navigate } = useAppNavigation(['dashboard', 'inventory', 'sales'])

  if (view === 'sales') {
    return <Suspense fallback={<PageLoading />}><SalesPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} /></Suspense>
  }

  if (view === 'inventory') {
    return <Suspense fallback={<PageLoading />}><InventoryPage user={user} onBack={() => navigate('dashboard')} onLogout={onLogout} /></Suspense>
  }

  return (
    <main className="dashboard-page">
      <PageHeader 
        user={user}
        onBack={null}
        onLogout={onLogout}
        title="Panel de dependiente"
        showBackButton={false}
      />

      <section className="dashboard-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <OfflineIndicator />
        </div>

        <div className="welcome">
          <p className="eyebrow">DEPENDIENTE</p>
          <h2>Bienvenido, {user.username}</h2>
          <p>Registra ventas y consulta el inventario.</p>
        </div>

        <NotificationPermission />
        <StockAlertBanner onViewLowStock={() => navigate('inventory')} />
        <DailySalesComparison />

        <div className="dashboard-grid">
          <DashboardCard
            title="Ventas"
            description="Registrar nuevas ventas."
            icon="₱"
            onClick={() => navigate('sales')}
          />

          <DashboardCard
            title="Inventario"
            description="Consultar productos y existencias."
            icon="▦"
            onClick={() => navigate('inventory')}
          />
        </div>

        <div className="permission-notice">
          <strong>🔒 Permisos limitados</strong>
          <p>
            Como dependiente, solo puedes registrar ventas y consultar el inventario. 
            No puedes modificar productos, precios ni gestionar usuarios.
          </p>
        </div>
      </section>
    </main>
  )
}

export default DependienteDashboard
/**
 * Propósito: contenedor de navegación para el rol DEPENDIENTE.
 * Responsabilidades: restringir las vistas a ventas e inventario de solo consulta.
 * Dependencias: PageHeader, SalesPage, InventoryPage y componentes de alertas.
 */
