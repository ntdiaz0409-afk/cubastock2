// frontend/src/pages/SalesPage.jsx
import { useEffect, useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useOffline } from '../hooks/useOffline'
import { apiFetch } from '../api'
import PageHeader from '../components/PageHeader'
import { showToast } from '../components/Toast'
import { saveData, getData, STORES } from '../db/db'
import { getPendingOperations } from '../db/syncQueue'

/** Mantiene el carrito temporal y confirma la venta al finalizar la operación. */
function SalesPage({ user, onBack, onLogout }) {
  const { products, loading, error: productsError, loadProducts } = useProducts()
  const { isOnline, saveLocalSale } = useOffline()
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO')
  const [saving, setSaving] = useState(false)
  const [businessCardNumber, setBusinessCardNumber] = useState('')
  const [cardNumberFromCache, setCardNumberFromCache] = useState(false)
  const [confirmationPhone, setConfirmationPhone] = useState('')
  const [confirmationMessage, setConfirmationMessage] = useState('')
  const [confirmationFromCache, setConfirmationFromCache] = useState(false)

  const SETTINGS_CACHE_KEY = 'business_settings'
  const confirmationDate = getLocalDateKey(new Date())
  // El contacto se segmenta por usuario y fecha: una copia offline nunca se
  // reutiliza para otra persona ni para la planificación de otro día.
  const CONTACT_CACHE_KEY = `payment_confirmation_contact_${user.id}_${confirmationDate}`

  // Se carga una sola vez: el número de tarjeta del negocio no cambia durante
  // la sesión. Con conexión se pide al servidor y se guarda una copia local;
  // sin conexión se usa esa copia, igual que el resto de la app offline-first.
  useEffect(() => {
    let cancelled = false

    async function loadCardNumber() {
      try {
        const response = await apiFetch('/api/business-settings')
        const data = await response.json()
        if (!cancelled && response.ok && data.settings) {
          setBusinessCardNumber(data.settings.payment_card_number || '')
          setCardNumberFromCache(false)
          await saveData(STORES.SETTINGS, { key: SETTINGS_CACHE_KEY, value: data.settings })
          return
        }
        throw new Error('Respuesta no válida')
      } catch {
        const cached = await getData(STORES.SETTINGS, SETTINGS_CACHE_KEY)
        if (!cancelled && cached?.value) {
          setBusinessCardNumber(cached.value.payment_card_number || '')
          setCardNumberFromCache(true)
        }
        // Si tampoco hay copia local (primera vez sin conexión), no se muestra nada.
      }
    }

    loadCardNumber()
    return () => { cancelled = true }
  }, [])

  // El teléfono proviene de work_shifts mediante el API; el frontend no conoce
  // ni calcula horarios. La última respuesta del mismo día queda disponible
  // offline, igual que la tarjeta configurada por el negocio.
  useEffect(() => {
    let cancelled = false

    async function loadConfirmationContact() {
      try {
        const response = await apiFetch(`/api/payment-confirmation-contact?date=${confirmationDate}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'No se pudo cargar el contacto de confirmación')
        if (!cancelled) {
          setConfirmationPhone(data.phone || '')
          setConfirmationMessage(data.message || '')
          setConfirmationFromCache(false)
        }
        await saveData(STORES.SETTINGS, { key: CONTACT_CACHE_KEY, value: data })
      } catch {
        const cached = await getData(STORES.SETTINGS, CONTACT_CACHE_KEY)
        if (!cancelled && cached?.value) {
          setConfirmationPhone(cached.value.phone || '')
          setConfirmationMessage(cached.value.message || '')
          setConfirmationFromCache(true)
        } else if (!cancelled) {
          setConfirmationPhone('')
          setConfirmationMessage('Contacto no disponible sin una copia local de la planificación de hoy.')
          setConfirmationFromCache(true)
        }
      }
    }

    loadConfirmationContact()
    return () => { cancelled = true }
  }, [CONTACT_CACHE_KEY, confirmationDate])

  const selected = products.find((product) => product.id === selectedProduct)

  function addToCart() {
    if (!selected) {
      showToast('Selecciona un producto primero.', 'warning', 2500)
      return
    }

    const amount = Number(quantity)

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Introduce una cantidad válida.', 'warning', 2500)
      return
    }

    if (amount > Number(selected.stock)) {
      showToast(`Stock insuficiente. Disponible: ${selected.stock} ${selected.unit}`, 'error', 3000)
      return
    }

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.product.id === selected.id)

      if (existing) {
        const newQuantity = Number(existing.quantity) + amount

        if (newQuantity > Number(selected.stock)) {
          showToast('No hay suficiente stock para agregar más unidades.', 'error', 3000)
          return currentCart
        }

        showToast(`${amount} ${selected.unit}(s) agregados a ${selected.name}`, 'success', 2000)

        return currentCart.map((item) =>
          item.product.id === selected.id ? { ...item, quantity: newQuantity } : item
        )
      }

      showToast(`${amount} ${selected.unit}(s) de ${selected.name} agregados al carrito`, 'success', 2000)
      return [...currentCart, { product: selected, quantity: amount }]
    })

    setSelectedProduct('')
    setQuantity('')
  }

  function removeFromCart(productId) {
    const item = cart.find((i) => i.product.id === productId)
    if (item) {
      showToast(`${item.product.name} eliminado del carrito`, 'error', 2000)
    }
    setCart((currentCart) => currentCart.filter((item) => item.product.id !== productId))
  }

  function clearCart() {
    if (cart.length > 0) {
      showToast('🔄 Carrito vaciado', 'info', 2000)
    }
    setCart([])
  }

  const total = cart.reduce(
    (sum, item) => sum + Number(item.product.price_cup) * Number(item.quantity),
    0
  )

  async function confirmSale() {
    if (cart.length === 0) {
      showToast('El carrito está vacío. Agrega productos primero.', 'warning', 3000)
      return
    }

    setSaving(true)

    try {
      const saleData = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: Number(item.quantity),
          price_at_sale: Number(item.product.price_cup),
        })),
        user_id: user.id,
        total_cup: total,
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
      }

      console.log('📝 Datos de venta a guardar:', saleData)

      // 1. Con conexión, registrar primero en servidor. No se encola una venta
      // confirmada: hacerlo provocaba duplicados al sincronizar más tarde.
      if (isOnline) {
        try {
          const response = await apiFetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: saleData.items, payment_method: paymentMethod }),
          })
          const data = await response.json()
          if (response.ok) {
            showToast(`Venta registrada. Total: $${total.toFixed(2)} CUP`, 'success', 4000)
            setCart([])
            await loadProducts()
            return
          }
          // Un error de validación no debe entrar a cola: debe corregirse antes.
          if (response.status < 500) throw new Error(data.error || 'La venta fue rechazada')
        } catch (serverError) {
          if (serverError.message && !serverError.message.includes('Failed to fetch')) throw serverError
          console.warn('Servidor no disponible; se guardará la venta localmente:', serverError)
        }
      }

      // 2. Sin red o caída temporal: persistir una única vez para sincronizar después.
      const localSale = await saveLocalSale(saleData)
      if (!localSale) throw new Error('No se pudo guardar la venta localmente.')

      // Actualizar stock localmente
      const updatedProducts = cart.map(item => ({
        ...item.product,
        stock: Number(item.product.stock) - item.quantity
      }))

      for (const product of updatedProducts) {
        await saveData(STORES.PRODUCTS, product)
      }

      // 3. Confirmación de venta pendiente de sincronización.
      const pending = await getPendingOperations()

      showToast(
        `💾 Venta guardada localmente (${pending.length} pendiente${pending.length > 1 ? 's' : ''} de sincronizar). Se sincronizará automáticamente cuando haya conexión.`,
        'info',
        5000
      )

      setCart([])
      await loadProducts()

    } catch (error) {
      console.error('Error en confirmSale:', error)
      showToast(`${error.message || 'Error al procesar la venta.'}`, 'error', 4000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="dashboard-page">
      <PageHeader 
        user={user}
        onBack={onBack}
        onLogout={onLogout}
        title={isOnline ? 'Ventas' : 'Ventas (Offline)'}
      />

      <section className="dashboard-content">
        <div className="inventory-heading">
          <div>
            <p className="eyebrow">OPERACIÓN</p>
            <h2>Nueva venta</h2>
            <p>
              {isOnline 
                ? 'Selecciona productos y crea una venta.' 
                : '📡 Modo offline - Las ventas se guardarán localmente'}
            </p>
          </div>
        </div>

        {(productsError) && (
          <div className="login-error sales-error">
            <strong>Error:</strong> {productsError}
          </div>
        )}

        <div className="sales-layout">
          <section className="sales-panel">
            <div className="sales-panel-header">
              <div>
                <h3>Agregar producto</h3>
                <p>El precio se toma del inventario.</p>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <strong>Cargando productos...</strong>
              </div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <strong>No hay productos disponibles</strong>
                <p>Crea productos desde Inventario.</p>
              </div>
            ) : (
              <>
                <label>Producto</label>

                <select 
                  value={selectedProduct} 
                  onChange={(event) => {
                    setSelectedProduct(event.target.value)
                  }}
                >
                  <option value="">Selecciona un producto</option>

                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — ${Number(product.price_cup).toFixed(2)} CUP
                    </option>
                  ))}
                </select>

                {selected && (
                  <div className="sale-product-info">
                    <div>
                      <span>Precio</span>
                      <strong>${Number(selected.price_cup).toFixed(2)} CUP</strong>
                    </div>

                    <div>
                      <span>Disponible</span>
                      <strong>
                        {selected.stock} {selected.unit}
                      </strong>
                    </div>
                  </div>
                )}

                <label>Cantidad</label>

                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="Ej. 2"
                />

                <button 
                  type="button" 
                  className="primary-button full-width" 
                  onClick={addToCart}
                >
                  + Agregar al carrito
                </button>
              </>
            )}
          </section>

          <section className="sales-panel cart-panel">
            <div className="sales-panel-header">
              <div>
                <h3>Venta actual</h3>
                <p>
                  {cart.length} producto{cart.length === 1 ? '' : 's'} agregado
                  {cart.length === 1 ? '' : 's'}
                </p>
              </div>

              {cart.length > 0 && (
                <button 
                  className="secondary-button" 
                  onClick={clearCart}
                  disabled={saving}
                >
                  Vaciar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="empty-state sales-empty">
                <strong>El carrito está vacío</strong>
                <p>Agrega productos para comenzar la venta.</p>
              </div>
            ) : (
              <>
                <div className="cart-list">
                  {cart.map((item) => {
                    const subtotal = Number(item.product.price_cup) * Number(item.quantity)

                    return (
                      <div className="cart-item" key={item.product.id}>
                        <div>
                          <strong>{item.product.name}</strong>
                          <span>
                            {item.quantity} {item.product.unit} × $
                            {Number(item.product.price_cup).toFixed(2)}
                          </span>
                        </div>

                        <div className="cart-item-right">
                          <strong>${subtotal.toFixed(2)}</strong>

                          <button 
                            type="button" 
                            onClick={() => removeFromCart(item.product.id)}
                            disabled={saving}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="sale-total">
                  <span>Total</span>
                  <strong>${total.toFixed(2)} CUP</strong>
                </div>

                <label>Método de pago</label>
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={saving}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>

                {paymentMethod === 'TARJETA' && (
                  <div className="sale-product-info">
                    <div>
                      <label htmlFor="business-card-number">Tarjeta del negocio{cardNumberFromCache ? ' (sin conexión)' : ''}</label>
                      <input
                        id="business-card-number"
                        className="payment-detail-input"
                        type="text"
                        readOnly
                        value={businessCardNumber || 'No configurada — Configuración del negocio'}
                        aria-label="Tarjeta del negocio"
                      />
                    </div>
                    <div>
                      <label htmlFor="confirmation-phone">Teléfono de confirmación{confirmationFromCache ? ' (sin conexión)' : ''}</label>
                      <input
                        id="confirmation-phone"
                        className="payment-detail-input"
                        type="text"
                        readOnly
                        value={confirmationPhone || confirmationMessage || 'No disponible'}
                        aria-label="Teléfono de confirmación"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="primary-button full-width"
                  onClick={confirmSale}
                  disabled={saving || cart.length === 0}
                >
                  {saving ? 'Procesando...' : 'Confirmar venta'}
                </button>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

export default SalesPage

/** Mantiene la fecha local alineada con la planificación semanal del administrador. */
function getLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
/**
 * Propósito: registrar ventas y construir la operación antes de confirmarla.
 * Responsabilidades: gestionar carrito, disponibilidad y envío al endpoint de ventas.
 * Dependencias: useProducts, API, cola offline y PageHeader.
 */
