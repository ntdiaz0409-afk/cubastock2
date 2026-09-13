// frontend/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './App.css'

// El Service Worker se registra solo en producción. Cachear módulos de Vite en
// desarrollo puede servir código viejo al teléfono y mantener URLs obsoletas.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado correctamente')
        // Busca una versión nueva del worker en cada arranque de la versión publicada.
        return registration.update()
      })
      .catch((error) => {
        console.log('❌ Error registrando Service Worker:', error)
      })
  })
} else if ('serviceWorker' in navigator) {
  // Limpia workers de pruebas anteriores al abrir Vite, para que no cacheen /src/*.jsx.
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch((error) => console.warn('No se pudo limpiar el Service Worker de desarrollo:', error))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
/**
 * Propósito: punto de arranque de React y ciclo de vida del Service Worker.
 * Responsabilidades: montar App y mantener el caché offline solo en producción.
 * Dependencias: App.jsx, App.css y public/sw.js.
 */
