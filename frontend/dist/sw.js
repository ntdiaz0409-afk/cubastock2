// frontend/public/sw.js
// Service Worker para CubaStock - Offline First
// Este archivo permite que la app funcione sin conexión a Internet

// v6: se eliminó el soporte de Web Push (nunca hubo backend que enviara
// notificaciones push; las alertas son locales del navegador + Telegram) y se
// corrigió el foco de ventanas en clientes LAN. Subir la versión fuerza a los
// dispositivos que ya tenían la app instalada a descargar los assets nuevos.
const CACHE_NAME = 'cubastock-v6'

// Recursos que se cachearán para funcionar offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/branding/cubastock-horizontal.jpeg',
  '/branding/cubastock-icon-192.png',
  '/branding/cubastock-icon-512.png',
]

// Recursos dinámicos que se cachearán bajo demanda (JS, CSS)
const DYNAMIC_CACHE_NAME = 'cubastock-dynamic-v4'

// URLs de API que NO deben cachearse (para evitar datos obsoletos)
const API_URLS_TO_BYPASS = [
  '/api/auth/login',
  '/api/sales',
  '/api/products',
  '/api/users',
  '/api/stock-movements',
]

// ==============================================
// INSTALACIÓN
// ==============================================

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cacheando recursos estáticos...')
        return cache.addAll(ASSETS_TO_CACHE)
      })
      .then(() => {
        console.log('✅ Service Worker instalado correctamente')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Error instalando Service Worker:', error)
      })
  )
})

// ==============================================
// ACTIVACIÓN
// ==============================================

self.addEventListener('activate', (event) => {
  console.log('🔧 Service Worker: Activando...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Eliminar caches antiguos
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log(`🗑️ Eliminando cache antiguo: ${cacheName}`)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker activado correctamente')
        return self.clients.claim()
      })
  )
})

// ==============================================
// INTERCEPTAR PETICIONES
// ==============================================

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url)

  // Vite sirve módulos cambiantes desde /src y /@vite. Nunca se cachean: una
  // copia antigua podría conservar localhost:3000 y fallar en un teléfono LAN.
  const isViteDevelopmentAsset = requestUrl.pathname.startsWith('/src/') ||
    requestUrl.pathname.startsWith('/@vite/') || requestUrl.pathname.startsWith('/node_modules/.vite/')
  if (isViteDevelopmentAsset) {
    event.respondWith(fetch(event.request))
    return
  }
  
  // Verificar si es una petición a la API
  const isAPIRequest = requestUrl.pathname.startsWith('/api')
  // Las mutaciones nunca se guardan en caché; una respuesta vieja de ventas o
  // inventario podría presentar datos inválidos al recuperar conexión.
  const bypassApiCache = API_URLS_TO_BYPASS.some((path) => requestUrl.pathname === path)
  
  // Verificar si es una petición de navegación (HTML)
  const isNavigationRequest = event.request.mode === 'navigate'
  
  // Verificar si es un archivo estático (JS, CSS, imágenes)
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/.test(requestUrl.pathname)
  
  // Estrategia: Network First para API, Cache First para estáticos, Network First para navegación
  
  // ==============================================
  // 1. PETICIONES A LA API
  // ==============================================
  
  if (isAPIRequest) {
    // Intentar siempre obtener de la red primero (datos frescos)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Solo cachear respuestas exitosas de APIs que no son de autenticación
          if (response.ok && !bypassApiCache) {
            const clonedResponse = response.clone()
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                // Cachear solo GET requests
                if (event.request.method === 'GET') {
                  cache.put(event.request, clonedResponse)
                }
              })
              .catch((err) => console.warn('⚠️ Error cacheando API:', err))
          }
          return response
        })
        .catch(() => {
          // Si falla la red, intentar obtener del cache (offline)
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('📡 API respondida desde cache (offline)')
                return cachedResponse
              }
              
              // Si no hay cache, devolver un error amigable
              return new Response(
                JSON.stringify({
                  error: 'Sin conexión a Internet',
                  offline: true,
                  message: 'No se pudo conectar al servidor. Revisa tu conexión.'
                }),
                {
                  status: 503,
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              )
            })
        })
    )
    return
  }
  
  // ==============================================
  // 2. PETICIONES DE NAVEGACIÓN (HTML)
  // ==============================================
  
  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cachear la página principal
          if (response.ok) {
            const clonedResponse = response.clone()
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, clonedResponse)
              })
              .catch((err) => console.warn('⚠️ Error cacheando página:', err))
          }
          return response
        })
        .catch(() => {
          // Si falla, mostrar la página offline
          return caches.match('/')
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('📄 Página principal servida desde cache (offline)')
                return cachedResponse
              }
              // Si no hay cache, devolver un mensaje básico
              return new Response(
                `
                <!DOCTYPE html>
                <html lang="es">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>CubaStock - Offline</title>
                    <style>
                      body {
                        margin: 0;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #080e1a;
                        color: #eef7ff;
                        font-family: Inter, system-ui, sans-serif;
                        padding: 20px;
                        text-align: center;
                      }
                      .offline-box {
                        max-width: 400px;
                        padding: 40px;
                        border: 1px solid rgba(56, 189, 248, 0.2);
                        border-radius: 16px;
                        background: rgba(12, 22, 40, 0.8);
                        backdrop-filter: blur(10px);
                      }
                      .offline-box h1 { font-size: 28px; margin-bottom: 12px; }
                      .offline-box p { color: #8ea4c4; line-height: 1.6; }
                      .offline-box .icon { font-size: 48px; margin-bottom: 16px; }
                      .offline-box .retry-btn {
                        margin-top: 16px;
                        padding: 10px 24px;
                        border: 1px solid rgba(56, 189, 248, 0.3);
                        border-radius: 10px;
                        background: rgba(56, 189, 248, 0.08);
                        color: #38bdf8;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.3s;
                      }
                      .offline-box .retry-btn:hover {
                        background: rgba(56, 189, 248, 0.15);
                        border-color: rgba(56, 189, 248, 0.5);
                      }
                    </style>
                  </head>
                  <body>
                    <div class="offline-box">
                      <div class="icon">📡</div>
                      <h1>Sin conexión</h1>
                      <p>No hay conexión a Internet. CubaStock está funcionando en modo offline.</p>
                      <p style="font-size: 13px; color: #5a6f8a;">Las ventas se guardarán localmente y se sincronizarán automáticamente.</p>
                      <button class="retry-btn" onclick="location.reload()">Reintentar</button>
                    </div>
                  </body>
                </html>
                `,
                {
                  status: 503,
                  headers: {
                    'Content-Type': 'text/html',
                  },
                }
              )
            })
        })
    )
    return
  }
  
  // ==============================================
  // 3. ARCHIVOS ESTÁTICOS (JS, CSS, IMÁGENES)
  // ==============================================
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log(`📦 Archivo servido desde cache: ${requestUrl.pathname}`)
            return cachedResponse
          }
          
          // Si no está en cache, intentar descargar de la red
          return fetch(event.request)
            .then((response) => {
              if (response.ok) {
                const clonedResponse = response.clone()
                caches.open(DYNAMIC_CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, clonedResponse)
                  })
                  .catch((err) => console.warn('⚠️ Error cacheando asset:', err))
              }
              return response
            })
            .catch(() => {
              // Si falla todo, devolver un 404 básico
              console.warn(`⚠️ No se pudo cargar: ${requestUrl.pathname}`)
              return new Response('Recurso no disponible offline', { status: 404 })
            })
        })
    )
    return
  }
  
  // ==============================================
  // 4. OTROS RECURSOS (por defecto: Network First)
  // ==============================================
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear algunas respuestas exitosas
        if (response.ok && event.request.method === 'GET') {
          const clonedResponse = response.clone()
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, clonedResponse)
            })
            .catch((err) => console.warn('⚠️ Error cacheando recurso:', err))
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Recurso no disponible offline
            return new Response('Recurso no disponible offline', { status: 404 })
          })
      })
  )
})

// ==============================================
// MENSAJES
// ==============================================

self.addEventListener('message', (event) => {
  const data = event.data
  
  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (data && data.type === 'CLEAR_CACHE') {
    console.log('🗑️ Limpiando cache...')
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName)
          })
        )
      })
      .then(() => {
        console.log('✅ Cache limpiado correctamente')
        event.ports[0].postMessage({ success: true })
      })
      .catch((error) => {
        console.error('❌ Error limpiando cache:', error)
        event.ports[0].postMessage({ success: false, error: error.message })
      })
  }
})

// ==============================================
// SINCRONIZACIÓN EN SEGUNDO PLANO (Background Sync)
// ==============================================

// Registrar sincronización en segundo plano cuando hay conexión
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sales') {
    console.log('🔄 Ejecutando sincronización en segundo plano...')
    event.waitUntil(
      // Esta función intentará sincronizar las ventas pendientes
      syncPendingSales()
        .then(() => {
          console.log('✅ Sincronización en segundo plano completada')
        })
        .catch((error) => {
          console.error('❌ Error en sincronización en segundo plano:', error)
        })
    )
  }
})

// Función para sincronizar ventas pendientes (simplificada)
async function syncPendingSales() {
  try {
    // Obtener el cache de IndexedDB desde el cliente
    const clients = await self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window'
    })
    
    if (clients.length === 0) {
      console.log('⚠️ No hay clientes disponibles para sincronizar')
      return
    }
    
    // Enviar mensaje al cliente para que ejecute la sincronización
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_SALES',
        timestamp: new Date().toISOString()
      })
    }
    
    console.log('📤 Mensaje de sincronización enviado a los clientes')
  } catch (error) {
    console.error('❌ Error en syncPendingSales:', error)
  }
}

// =============================================
// NOTIFICACIONES
// =============================================

// Las notificaciones de CubaStock son locales: las crea la propia página con
// la API Notification (ver hooks/useStockAlerts.js) y las alertas críticas se
// envían por Telegram desde el backend. No hay Web Push: se eliminaron los
// listeners 'push' y 'notificationclick' porque ningún servidor enviaba
// eventos push y quedaban como código muerto. Si en el futuro se implementa
// push de verdad, habrá que añadir suscripciones VAPID en el backend y
// reintroducir ambos listeners aquí.

console.log('🚀 CubaStock Service Worker cargado correctamente')
/**
 * Propósito: habilitar operación offline y sincronización en producción.
 * Responsabilidades: precachear la app, evitar respuestas obsoletas de API y procesar sincronización en segundo plano.
 * Dependencias: main.jsx, endpoints del backend y recursos bajo public/branding.
 */
