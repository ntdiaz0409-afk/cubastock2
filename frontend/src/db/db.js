// frontend/src/db/db.js
// Configuración de IndexedDB para almacenamiento local

const DB_NAME = 'CubaStockDB'
const DB_VERSION = 1

// Definir stores (tablas)
export const STORES = {
  PRODUCTS: 'products',
  SALES: 'sales',
  SYNC_QUEUE: 'syncQueue',
  SETTINGS: 'settings',
}

let db = null

// Abrir/crear la base de datos
/** Abre/migra la base local en el único punto de acceso a IndexedDB. */
export function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      console.error('❌ Error abriendo IndexedDB:', event.target.error)
      reject(event.target.error)
    }

    request.onsuccess = (event) => {
      db = event.target.result
      console.log('✅ IndexedDB abierta correctamente')
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      console.log('🔄 Creando/actualizando estructura de IndexedDB...')

      // Store: products
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' })
        productStore.createIndex('name', 'name', { unique: false })
        productStore.createIndex('active', 'active', { unique: false })
        console.log('✅ Store "products" creada')
      }

      // Store: sales
      if (!db.objectStoreNames.contains(STORES.SALES)) {
        const saleStore = db.createObjectStore(STORES.SALES, { keyPath: 'id' })
        saleStore.createIndex('created_at', 'created_at', { unique: false })
        saleStore.createIndex('synced', 'synced', { unique: false })
        console.log('✅ Store "sales" creada')
      }

      // Store: syncQueue
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { 
          keyPath: 'id',
          autoIncrement: true 
        })
        syncStore.createIndex('type', 'type', { unique: false })
        syncStore.createIndex('created_at', 'created_at', { unique: false })
        syncStore.createIndex('synced', 'synced', { unique: false })
        console.log('✅ Store "syncQueue" creada')
      }

      // Store: settings
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' })
        console.log('✅ Store "settings" creada')
      }
    }
  })
}

// Función genérica para obtener datos
export async function getData(storeName, id = null) {
  try {
    const db = await openDB()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = id ? store.get(id) : store.getAll()
      
      request.onsuccess = () => {
        resolve(request.result)
      }
      
      request.onerror = () => {
        console.error(`❌ Error en getData(${storeName}):`, request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`❌ Error obteniendo datos de ${storeName}:`, error)
    return id ? null : []
  }
}

// Función genérica para guardar datos
export async function saveData(storeName, data) {
  try {
    const db = await openDB()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.put(data)
      
      request.onsuccess = () => {
        resolve(request.result)
      }
      
      request.onerror = () => {
        console.error(`❌ Error en saveData(${storeName}):`, request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`❌ Error guardando datos en ${storeName}:`, error)
    return null
  }
}

// Función para guardar múltiples datos
export async function saveManyData(storeName, dataArray) {
  try {
    const db = await openDB()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      let completed = 0
      const total = dataArray.length
      const results = []

      if (total === 0) {
        resolve([])
        return
      }

      dataArray.forEach((data, index) => {
        const request = store.put(data)
        
        request.onsuccess = () => {
          completed++
          results[index] = request.result
          if (completed === total) {
            resolve(results)
          }
        }
        
        request.onerror = () => {
          console.error(`❌ Error en saveManyData item ${index}:`, request.error)
          reject(request.error)
        }
      })
    })
  } catch (error) {
    console.error(`❌ Error guardando múltiples datos en ${storeName}:`, error)
    return []
  }
}

// ✅ Función para eliminar datos (EXPORTADA CORRECTAMENTE)
export async function deleteData(storeName, id) {
  try {
    const db = await openDB()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      
      request.onsuccess = () => {
        resolve(true)
      }
      
      request.onerror = () => {
        console.error(`❌ Error en deleteData(${storeName}):`, request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`❌ Error eliminando datos de ${storeName}:`, error)
    return false
  }
}

// Función para limpiar un store completo
export async function clearStore(storeName) {
  try {
    const db = await openDB()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.clear()
      
      request.onsuccess = () => {
        resolve(true)
      }
      
      request.onerror = () => {
        console.error(`❌ Error en clearStore(${storeName}):`, request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error(`❌ Error limpiando store ${storeName}:`, error)
    return false
  }
}
/**
 * Propósito: definir el almacenamiento IndexedDB local usado por el modo offline.
 * Responsabilidades: versionar tablas y tipos de registros sin contener UI.
 * Dependencias: Dexie, syncQueue y componentes que operan sin conexión.
 */
