import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Acepta conexiones desde teléfonos y otros equipos de la red local.
    host: '0.0.0.0',
    // Puerto fijo: evita que Vite salte a 5177/5178 y el teléfono use una URL vieja.
    port: 5176,
    strictPort: true,
    // Permite exclusivamente la laptop y la IP LAN actual como hosts de desarrollo.
    allowedHosts: ['localhost', '127.0.0.1', '192.168.1.181' , '.trycloudflare.com' ],
    // Forzar recarga de módulos en desarrollo (útil para Service Worker)
    force: true,
    proxy: {
      '/api': {
        // El navegador pide /api al mismo host; Vite reenvía al backend del PC.
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
/**
 * Propósito: configuración de desarrollo y compilación de Vite.
 * Responsabilidades: activar React, fijar servidor LAN y redirigir /api al backend local.
 * Dependencias: variables de entorno de Vite y servidor backend de CubaStock.
 */
