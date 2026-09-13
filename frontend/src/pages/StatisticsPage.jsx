// frontend/src/pages/StatisticsPage.jsx
import { useState, useEffect } from 'react'
import { useProducts } from '../hooks/useProducts'
import PageHeader from '../components/PageHeader'

// Componente para animar números al cargar
function AnimatedNumber({ value, duration = 800, decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(0)
  
  useEffect(() => {
    let startTime = null
    const startValue = 0
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue + (value - startValue) * eased
      setDisplayValue(current)
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value, duration])
  
  return <>{Number(displayValue).toFixed(decimals)}</>
}

/** Presenta indicadores calculados por el backend sin alterar los datos de ventas. */
function StatisticsPage({ user, onBack, onLogout }) {
  const { products, loading, error } = useProducts()

  const totalProducts = products.length
  const totalStock = products.reduce((sum, product) => sum + Number(product.stock), 0)
  const inventoryValue = products.reduce(
    (sum, product) => sum + Number(product.stock) * Number(product.price_cup),
    0
  )
  const lowStockProducts = products.filter((product) => Number(product.stock) <= 5).length

  return (
    <main className="dashboard-page">
      <PageHeader 
        user={user}
        onBack={onBack}
        onLogout={onLogout}
        title="Estadísticas"
      />

      <section className="dashboard-content">
        <div className="inventory-heading">
          <div>
            <p className="eyebrow">ANÁLISIS DEL NEGOCIO</p>
            <h2>Estadísticas</h2>
            <p>Resumen actual del inventario.</p>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}

        {loading ? (
          <div className="empty-state">
            <strong>Cargando estadísticas...</strong>
          </div>
        ) : (
          <>
            <div className="statistics-grid">
              <div className="stat-card">
                <span>Productos</span>
                <strong>
                  {totalProducts > 0 ? (
                    <AnimatedNumber value={totalProducts} duration={600} />
                  ) : (
                    0
                  )}
                </strong>
                <small>Productos activos</small>
              </div>

              <div className="stat-card">
                <span>Stock total</span>
                <strong>
                  {totalStock > 0 ? (
                    <AnimatedNumber value={totalStock} duration={800} decimals={2} />
                  ) : (
                    '0.000'
                  )}
                </strong>
                <small>Unidades registradas</small>
              </div>

              <div className="stat-card">
                <span>Valor del inventario</span>
                <strong>
                  ${inventoryValue > 0 ? (
                    <AnimatedNumber value={inventoryValue} duration={1000} decimals={2} />
                  ) : (
                    '0.00'
                  )}
                </strong>
                <small>CUP</small>
              </div>

              <div className="stat-card warning">
                <span>Stock bajo</span>
                <strong>
                  {lowStockProducts > 0 ? (
                    <AnimatedNumber value={lowStockProducts} duration={500} />
                  ) : (
                    0
                  )}
                </strong>
                <small>Productos con ≤ 5 unidades</small>
              </div>
            </div>

            <div className="statistics-section">
              <div className="statistics-section-header">
                <div>
                  <h3>Estado del inventario</h3>
                  <p>Productos que requieren atención.</p>
                </div>
              </div>

              {products.filter((product) => Number(product.stock) <= 5).length === 0 ? (
                <div className="statistics-success">
                  <strong>✓ Inventario saludable</strong>
                  <span>No hay productos con stock bajo.</span>
                </div>
              ) : (
                <div className="low-stock-list">
                  {products
                    .filter((product) => Number(product.stock) <= 5)
                    .map((product) => (
                      <div className="low-stock-item" key={product.id}>
                        <div>
                          <strong>{product.name}</strong>
                          <span>${Number(product.price_cup).toFixed(2)} CUP</span>
                        </div>

                        <strong>
                          {product.stock} {product.unit}
                        </strong>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="statistics-section">
              <div className="statistics-section-header">
                <div>
                  <h3>Valor por producto</h3>
                  <p>Valor estimado del stock disponible.</p>
                </div>
              </div>

              <div className="statistics-product-list">
                {products.map((product) => {
                  const value = Number(product.stock) * Number(product.price_cup)

                  return (
                    <div className="statistics-product" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>
                          {product.stock} {product.unit}
                        </span>
                      </div>

                      <strong>${value.toFixed(2)}</strong>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

export default StatisticsPage
/**
 * Propósito: ofrecer análisis de rendimiento de ventas e inventario.
 * Responsabilidades: obtener métricas y delegar su representación a componentes de gráfico.
 * Dependencias: useSalesStats, SalesChart y PageHeader.
 */
