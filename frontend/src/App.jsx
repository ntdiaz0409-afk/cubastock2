// frontend/src/App.jsx
import { useEffect, useState } from 'react'
import './App.css'
import { API_URL, tokenIsExpired } from './api'
import AdminDashboard from './pages/AdminDashboard'
import DependienteDashboard from './pages/DependienteDashboard'
import AnimatedBackground from './components/AnimatedBackground'
import Logo from './components/Logo'
import { applyTheme, getSavedTheme } from './hooks/useTheme'

/** Coordina el estado de sesión antes de montar el dashboard correspondiente. */
function App() {
  // Restaurar la sesión en el inicializador evita un render adicional al
  // arrancar; los tokens vencidos se descartan antes de montar un dashboard.
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('cubastock_user')
    const savedToken = localStorage.getItem('cubastock_token')
    if (!savedUser || !savedToken || tokenIsExpired(savedToken)) {
      localStorage.removeItem('cubastock_user')
      localStorage.removeItem('cubastock_token')
      return null
    }
    try {
      return JSON.parse(savedUser)
    } catch {
      localStorage.removeItem('cubastock_user')
      localStorage.removeItem('cubastock_token')
      return null
    }
  })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Aplica el último tema antes de mostrar login o cualquier panel.
  useEffect(() => {
    applyTheme(getSavedTheme())
  }, [])

  useEffect(() => {
    function handleAuthExpired() {
      setUser(null)
      setUsername('')
      setPassword('')
      setError('Tu sesión había caducado. Inicia sesión nuevamente.')
    }

    window.addEventListener('cubastock:auth-expired', handleAuthExpired)

    return () => {
      window.removeEventListener('cubastock:auth-expired', handleAuthExpired)
    }
  }, [])

  /** Envía credenciales al backend y persiste el token y usuario si la respuesta es válida. */
  async function handleLogin(event) {
    event.preventDefault()

    setError('')

    if (!username.trim() || !password) {
      setError('Introduce usuario y contraseña.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo iniciar sesión.')
      }

      localStorage.setItem('cubastock_token', data.token)
      localStorage.setItem('cubastock_user', JSON.stringify(data.user))

      setUser(data.user)
      setUsername('')
      setPassword('')
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  /** Elimina el estado de sesión local; se comparte con los dos dashboards. */
  function handleLogout() {
    localStorage.removeItem('cubastock_token')
    localStorage.removeItem('cubastock_user')

    setUser(null)
    setUsername('')
    setPassword('')
    setError('')
  }

  if (user) {
    if (user.role === 'ADMIN') {
      return <><AnimatedBackground /><AdminDashboard user={user} onLogout={handleLogout} /></>
    }

    if (user.role === 'DEPENDIENTE') {
      return <><AnimatedBackground /><DependienteDashboard user={user} onLogout={handleLogout} /></>
    }

    handleLogout()
  }

  return (
    <>
      <AnimatedBackground />
      <main className="login-page">
        <section className="login-card">
          <div className="brand">
            <Logo size={48} />

            <div>
              <h1>CubaStock</h1>
              <p>TU NEGOCIO, BAJO CONTROL.</p>
            </div>
          </div>

          <div className="login-heading">
            <h2>Iniciar sesión</h2>
            <p>Accede a tu cuenta para continuar.</p>
          </div>

          <form onSubmit={handleLogin}>
            <label htmlFor="username">Usuario</label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Introduce tu usuario"
              autoComplete="username"
              disabled={loading}
            />

            <label htmlFor="password">Contraseña</label>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Introduce tu contraseña"
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                disabled={loading}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="login-footer">CubaStock · Sistema de gestión</p>
        </section>
      </main>
    </>
  )
}

export default App
/**
 * Propósito: raíz de la interfaz y límite de autenticación del frontend.
 * Responsabilidades: restaurar sesión, gestionar inicio/cierre de sesión y enrutar por rol.
 * Dependencias: api.js, dashboards por rol, Logo y el tema persistido.
 */
