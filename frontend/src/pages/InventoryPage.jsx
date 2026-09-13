// frontend/src/pages/InventoryPage.jsx
import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import ProductCard from '../components/ProductCard'
import CreateProductModal from '../components/CreateProductModal'
import PageHeader from '../components/PageHeader'

/** Coordina el ciclo de consulta y modificación de productos para la vista de inventario. */
function InventoryPage({ user, onBack, onLogout }) {
  const canEdit = user.role === 'ADMIN'
  // El administrador recibe también los productos retirados para reactivarlos.
  const { products, loading, error, loadProducts } = useProducts({ includeInactive: canEdit })
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="dashboard-page">
      <PageHeader 
        user={user}
        onBack={onBack}
        onLogout={onLogout}
        title="Inventario"
      />

      <section className="dashboard-content">
        <div className="inventory-heading">
          <div>
            <p className="eyebrow">{canEdit ? 'CATÁLOGO E INVENTARIO' : 'INVENTARIO'}</p>
            <h2>{canEdit ? 'Productos e inventario' : 'Inventario'}</h2>
            <p>
              {canEdit
                ? 'Administra productos y controla las existencias del negocio.'
                : 'Consulta productos y existencias disponibles.'}
            </p>
          </div>

          {canEdit && (
            <button className="primary-button" onClick={() => setShowCreate(true)}>
              + Nuevo producto
            </button>
          )}
        </div>

        <div className="inventory-toolbar">
          <input
            className="search-input"
            type="search"
            placeholder="Buscar producto..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <button className="secondary-button" onClick={loadProducts} disabled={loading}>
            Actualizar
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        {loading ? (
          <div className="empty-state">
            <p>Cargando inventario...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <strong>No hay productos</strong>
            <p>
              {search
                ? 'No encontramos productos con esa búsqueda.'
                : 'Todavía no hay productos registrados.'}
            </p>
          </div>
        ) : (
          <div className="inventory-list">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                canEdit={canEdit} 
                onUpdated={loadProducts} 
              />
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateProductModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            loadProducts()
          }}
        />
      )}
    </main>
  )
}

export default InventoryPage
/**
 * Propósito: gestión y consulta de catálogo, existencias y movimientos.
 * Responsabilidades: cargar productos y coordinar altas, ajustes, filtros y modales.
 * Dependencias: useProducts, API, ProductCard, CreateProductModal y StockModal.
 */
