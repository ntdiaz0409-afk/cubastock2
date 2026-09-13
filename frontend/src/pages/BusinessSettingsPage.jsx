// frontend/src/pages/BusinessSettingsPage.jsx
import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import PageHeader from '../components/PageHeader'
import { showToast } from '../components/Toast'
import { getData, saveData, STORES } from '../db/db'

const SETTINGS_CACHE_KEY = 'business_settings'

/** Configuración única del negocio: datos de contacto, tarjeta de pagos y moneda principal. */
function BusinessSettingsPage({ user, onBack, onLogout }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [businessUid, setBusinessUid] = useState('')
  const [address, setAddress] = useState('')
  const [paymentCardNumber, setPaymentCardNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [mainCurrency, setMainCurrency] = useState('CUP')
  const [error, setError] = useState('')

  function applySettings(settings) {
    setBusinessUid(settings.business_uid || '')
    setAddress(settings.address || '')
    setPaymentCardNumber(settings.payment_card_number || '')
    setOwnerName(settings.owner_name || '')
    setEmail(settings.email || '')
    setMainCurrency(settings.main_currency || 'CUP')
  }

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        const response = await apiFetch('/api/business-settings')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'No se pudo cargar la configuración')

        if (!cancelled && data.settings) {
          applySettings(data.settings)
          setFromCache(false)
          // Se guarda una copia local para poder mostrarla si la próxima vez no hay conexión.
          await saveData(STORES.SETTINGS, { key: SETTINGS_CACHE_KEY, value: data.settings })
        }
      } catch (err) {
        // Sin conexión (u otro fallo): se intenta mostrar la última copia guardada
        // en vez de dejar la pantalla vacía, igual que hace el resto de la app offline-first.
        const cached = await getData(STORES.SETTINGS, SETTINGS_CACHE_KEY)
        if (!cancelled && cached?.value) {
          applySettings(cached.value)
          setFromCache(true)
        } else if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSettings()
    return () => { cancelled = true }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('El correo electrónico no es válido.')
      return
    }

    setSaving(true)
    try {
      const response = await apiFetch('/api/business-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          payment_card_number: paymentCardNumber.trim(),
          owner_name: ownerName.trim(),
          email: email.trim(),
          main_currency: mainCurrency.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la configuración')

      // La pantalla siempre refleja lo que el servidor confirmó guardado, no lo que
      // se envió: evita que un campo se vea "vacío" en pantalla si el servidor
      // conservó un valor anterior (ej. moneda principal, que nunca se vacía).
      applySettings(data.settings)
      setFromCache(false)
      await saveData(STORES.SETTINGS, { key: SETTINGS_CACHE_KEY, value: data.settings })

      showToast('Configuración del negocio guardada', 'success', 3000)
    } catch (err) {
      const message = err.message?.includes('Failed to fetch')
        ? 'No hay conexión. Esta pantalla necesita Internet para guardar cambios.'
        : err.message
      setError(message)
      showToast(`${message}`, 'error', 4000)
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
        title="Configuración del negocio"
      />

      <section className="dashboard-content">
        <div className="inventory-heading">
          <div>
            <p className="eyebrow">ADMINISTRACIÓN</p>
            <h2>Configuración del negocio</h2>
            <p>Estos datos se usan en toda la app: por ejemplo, el número de tarjeta se muestra al cobrar una venta con Tarjeta.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <strong>Cargando configuración...</strong>
          </div>
        ) : (
          <section className="sales-panel" style={{ maxWidth: 520 }}>
            {fromCache && (
              <div className="login-error sales-error">
                📡 Sin conexión — mostrando la última copia guardada en este dispositivo. Los cambios no se pueden guardar hasta que vuelva la conexión.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label>Dirección del negocio</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej. Calle 23 #456, Vedado, La Habana"
              />

              <label>Número de tarjeta para recibir pagos</label>
              <input
                type="text"
                value={paymentCardNumber}
                onChange={(e) => setPaymentCardNumber(e.target.value)}
                placeholder="Ej. 9205 0000 0000 0000"
                maxLength={50}
              />

              <label>Titular del negocio</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ej. Nombre y apellidos"
              />

              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej. negocio@correo.com"
              />
              <p className="form-hint">Se usará más adelante para enviar el resumen diario de ventas y notificaciones relevantes.</p>

              <label>Moneda principal</label>
              <input
                type="text"
                value={mainCurrency}
                onChange={(e) => setMainCurrency(e.target.value)}
                placeholder="Ej. CUP"
              />
              <p className="form-hint">No puede quedar vacía: si se deja en blanco, se conserva la moneda anterior.</p>

              <label>ID único del negocio</label>
              <input type="text" value={businessUid} readOnly disabled />
              <p className="form-hint">Se genera automáticamente y no se puede editar.</p>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="primary-button full-width" disabled={saving || fromCache}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </section>
        )}
      </section>
    </main>
  )
}

export default BusinessSettingsPage
/**
 * Propósito: administrar los datos únicos de configuración del negocio.
 * Responsabilidades: cargar y guardar dirección, tarjeta de pagos, titular, correo, moneda e ID del negocio,
 * con una copia local en IndexedDB para poder mostrarla sin conexión.
 * Dependencias: endpoint /api/business-settings, PageHeader, Toast y db/db.js.
 */