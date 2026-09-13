// frontend/src/pages/DependentsPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api'
import PageHeader from '../components/PageHeader'

const SHIFT_OPTIONS = [
  { value: 'LIBRE', label: 'Libre' },
  { value: 'MAÑANA', label: 'Mañana' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'COMPLETO', label: 'Completo' },
]

/** Centraliza el ciclo CRUD de dependientes y la planificación semanal de turnos. */
function DependentsPage({ user, onBack, onLogout }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    phone: '',
    turn_number: '',
    identity_card: '',
  })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [shifts, setShifts] = useState([])
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [scheduleError, setScheduleError] = useState('')
  const [updatingShift, setUpdatingShift] = useState('')

  async function loadUsers() {
    try {
      setLoading(true)
      setError('')
      const response = await apiFetch('/api/users')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al cargar usuarios')
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + offset)
    return date
  }), [weekStart])

  useEffect(() => {
    loadShifts()
  }, [weekStart])

  async function loadShifts() {
    const from = toDateKey(weekStart)
    const to = new Date(weekStart)
    to.setDate(to.getDate() + 6)

    try {
      setScheduleLoading(true)
      setScheduleError('')
      const response = await apiFetch(`/api/shifts?from=${from}&to=${toDateKey(to)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el horario')
      setShifts(data.shifts || [])
    } catch (err) {
      setScheduleError(err.message)
    } finally {
      setScheduleLoading(false)
    }
  }

  const getShiftType = (userId, date) => {
    const shift = shifts.find(
      (item) => item.user_id === userId && item.work_date?.slice(0, 10) === toDateKey(date)
    )
    // Mantiene legibles los turnos creados antes de incorporar los tipos.
    return SHIFT_OPTIONS.some((option) => option.value === shift?.shift_name)
      ? shift.shift_name
      : shift ? 'COMPLETO' : 'LIBRE'
  }

  const updateShift = async (dependent, date, shiftType) => {
    const dateKey = toDateKey(date)
    const key = `${dependent.id}-${dateKey}`
    setUpdatingShift(key)
    setScheduleError('')

    try {
      // Se usa PUT incluso para "Libre": así funciona también en servidores
      // que todavía no disponen de la ruta DELETE y queda guardada la decisión.
      const response = await apiFetch('/api/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: dependent.id, work_date: dateKey, shift_name: shiftType }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'No se pudo actualizar el horario')
      }
      await loadShifts()
    } catch (err) {
      setScheduleError(err.message)
    } finally {
      setUpdatingShift('')
    }
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({ username: '', password: '', full_name: '', phone: '', turn_number: '', identity_card: '' })
    setShowModal(true)
  }

  const openEditModal = (u) => {
    setEditingUser(u)
    setFormData({
      username: u.username || '',
      password: '',
      full_name: u.full_name || '',
      phone: u.phone || '',
      turn_number: u.turn_number || '',
      identity_card: u.identity_card || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      let url = '/api/users'
      let method = 'POST'
      let body = { ...formData }

      if (editingUser) {
        url = `/api/users/${editingUser.id}`
        method = 'PUT'
        if (!body.password) delete body.password
      } else {
        if (!body.password || body.password.length < 6) {
          alert('La contraseña debe tener al menos 6 caracteres.')
          setSaving(false)
          return
        }
      }

      if (!body.username.trim()) {
        alert('El usuario es obligatorio.')
        setSaving(false)
        return
      }

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar')
      }

      alert(editingUser ? '✅ Usuario actualizado' : '✅ Usuario creado')
      setShowModal(false)
      loadUsers()
    } catch (err) {
      alert('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (u) => {
    if (!confirm(`⚠️ ¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE a "${u.username}"?\n\nSe eliminarán:\n- Todas sus ventas\n- Todos sus movimientos de stock\n- Todos sus datos personales\n\nEsta acción NO se puede deshacer.`)) {
      return
    }

    setDeletingId(u.id)

    try {
      const response = await apiFetch(`/api/users/${u.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar')
      }

      alert(`✅ ${data.message}`)
      loadUsers()
    } catch (err) {
      alert('❌ ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const resetPassword = async (u) => {
    const newPass = prompt(`Nueva contraseña para "${u.username}":`)
    if (!newPass || newPass.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    try {
      const response = await apiFetch(`/api/users/${u.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPass }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      alert('✅ Contraseña actualizada')
    } catch (err) {
      alert('❌ ' + err.message)
    }
  }

  const formatDate = (value) => {
    if (!value) return 'Nunca'
    return new Date(value).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <PageHeader user={user} onBack={onBack} onLogout={onLogout} title="Dependientes" />
        <section className="dashboard-content">
          <div className="empty-state"><strong>Cargando...</strong></div>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard-page">
      <PageHeader user={user} onBack={onBack} onLogout={onLogout} title="Dependientes" />

      <section className="dashboard-content">
        <div className="inventory-heading">
          <div>
            <p className="eyebrow">USUARIOS CON ACCESO</p>
            <h2>Dependientes</h2>
            <p>Gestiona usuarios, permisos y datos personales.</p>
          </div>
          <button className="primary-button" onClick={openCreateModal}>
            + Nuevo dependiente
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        {users.length === 0 ? (
          <div className="empty-state"><strong>No hay dependientes</strong><p>Crea tu primer dependiente.</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8ea4c4' }}>Usuario</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8ea4c4' }}>Nombre</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8ea4c4' }}>Teléfono</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8ea4c4' }}>Turno</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8ea4c4' }}>Carnet</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', color: '#8ea4c4' }}>Estado</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8ea4c4' }}>Última conexión</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', color: '#8ea4c4' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{u.username}</td>
                    <td style={{ padding: '10px 12px' }}>{u.full_name || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{u.phone || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{u.turn_number || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>{u.identity_card || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: u.active ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
                        color: u.active ? '#34d399' : '#fb7185',
                      }}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                      {u.role === 'ADMIN' && <span style={{ marginLeft: '4px', fontSize: '9px', color: '#38bdf8' }}>ADMIN</span>}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#5a6f8a', fontSize: '12px' }}>{formatDate(u.last_login_at)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {u.role === 'DEPENDIENTE' && (
                          <>
                            <button className="secondary-button" onClick={() => openEditModal(u)} style={{ padding: '4px 8px', fontSize: '12px', height: 'auto' }} title="Editar">✏️</button>
                            <button className="secondary-button" onClick={() => resetPassword(u)} style={{ padding: '4px 8px', fontSize: '12px', height: 'auto' }} title="Resetear contraseña">🔑</button>
                            <button className="secondary-button" onClick={() => deleteUser(u)} disabled={deletingId === u.id} style={{ padding: '4px 8px', fontSize: '12px', height: 'auto', borderColor: 'rgba(251,113,133,0.3)', color: '#fb7185', opacity: deletingId === u.id ? 0.5 : 1 }} title="Eliminar permanentemente">
                              {deletingId === u.id ? '⏳' : '🗑️'}
                            </button>
                          </>
                        )}
                        {u.role === 'ADMIN' && <span style={{ color: '#5a6f8a', fontSize: '11px' }}>Admin</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="weekly-schedule" aria-labelledby="weekly-schedule-title">
          <div className="schedule-header">
            <div>
              <p className="eyebrow">PLANIFICACIÓN DEL EQUIPO</p>
              <h2 id="weekly-schedule-title">Horario semanal</h2>
              <p>Marca los días en que cada dependiente debe trabajar. Los cambios se guardan al instante.</p>
            </div>
            <div className="week-controls">
              <button className="secondary-button" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semana anterior">←</button>
              <button className="secondary-button" onClick={() => setWeekStart(getMonday(new Date()))}>Esta semana</button>
              <button className="secondary-button" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Semana siguiente">→</button>
            </div>
          </div>

          {scheduleError && <div className="login-error">{scheduleError}</div>}
          {scheduleLoading ? (
            <div className="schedule-loading">Cargando horario...</div>
          ) : users.filter((u) => u.role === 'DEPENDIENTE').length === 0 ? (
            <div className="schedule-loading">Crea un dependiente para poder asignar su horario.</div>
          ) : (
            <div className="schedule-table-wrap">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th scope="col">Dependiente</th>
                    {weekDays.map((day) => <th scope="col" key={toDateKey(day)}>{formatDay(day)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.filter((u) => u.role === 'DEPENDIENTE').map((dependent) => (
                    <tr key={dependent.id}>
                      <th scope="row">
                        <span>{dependent.full_name || dependent.username}</span>
                        <small>@{dependent.username}</small>
                      </th>
                      {weekDays.map((day) => {
                        const key = `${dependent.id}-${toDateKey(day)}`
                        const shiftType = getShiftType(dependent.id, day)
                        return <td key={key}>
                          <select
                            className={`shift-select ${shiftType !== 'LIBRE' ? 'is-assigned' : ''}`}
                            value={shiftType}
                            onChange={(event) => updateShift(dependent, day, event.target.value)}
                            disabled={updatingShift === key}
                            aria-label={`Turno de ${dependent.username} el ${formatDay(day)}`}
                          >
                            {updatingShift === key ? <option value={shiftType}>Guardando...</option> : SHIFT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Editar dependiente' : 'Nuevo dependiente'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <label>Usuario *</label>
              <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="Ej. pedro" required disabled={!!editingUser} />

              {!editingUser && (
                <>
                  <label>Contraseña *</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Mínimo 6 caracteres" required />
                </>
              )}

              <label>Nombre completo</label>
              <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Ej. Pedro Pérez" />

              <label>Teléfono</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Ej. 555-1234" />

              <label>Número de turno</label>
              <input type="text" value={formData.turn_number} onChange={(e) => setFormData({ ...formData, turn_number: e.target.value })} placeholder="Ej. T-001" />

              <label>Carnet de identidad</label>
              <input type="text" value={formData.identity_card} onChange={(e) => setFormData({ ...formData, identity_card: e.target.value })} placeholder="Ej. 12345678901" />

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonday(date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}

function addDays(date, amount) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function formatDay(date) {
  const label = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '')
}

export default DependentsPage
/**
 * Propósito: administración de usuarios dependientes y sus turnos.
 * Responsabilidades: consultar, crear/editar dependientes y gestionar asignaciones autorizadas.
 * Dependencias: API de usuarios/turnos, PageHeader y dashboard administrativo.
 */
