// frontend/src/hooks/useProducts.js
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import { getData, saveManyData, STORES } from '../db/db'

// includeInactive permite al administrador recuperar productos retirados sin SQL.
/** Carga el catálogo; includeInactive permite a pantallas administrativas ver productos desactivados. */
export function useProducts({ includeInactive = false } = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const query = includeInactive ? '?include_inactive=true' : ''
      const response = await apiFetch(`/api/products${query}`, {})
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los productos.')
      }

      const receivedProducts = data.products || []
      setProducts(receivedProducts)
      // Mantiene una copia local para que Inventario y Ventas sigan operando sin red.
      await saveManyData(STORES.PRODUCTS, receivedProducts)
    } catch (err) {
      // El catálogo local es el respaldo cuando falla la red o el servidor.
      const localProducts = await getData(STORES.PRODUCTS)
      if (localProducts?.length) {
        setProducts(localProducts.filter((product) => includeInactive || product.active))
        setError('Mostrando la última copia guardada. Se actualizará al recuperar conexión.')
      } else {
        setError(err.message || 'Error cargando productos.')
      }
    } finally {
      setLoading(false)
    }
  }, [includeInactive])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return { products, loading, error, loadProducts }
}
/**
 * Propósito: encapsular la carga y actualización del catálogo de productos.
 * Responsabilidades: aislar peticiones, estados de carga/error y refresco del inventario.
 * Dependencias: api.js y páginas InventoryPage/SalesPage.
 */
