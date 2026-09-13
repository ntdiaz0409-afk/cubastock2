// Carga backend/.env sin depender del directorio de trabajo desde el que se
// arranca el proceso (npm run dev en la raíz, node backend/index.js, etc.).
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Pool } = require('pg')
const {sendTelegramMessage}= require ('./services/telegram')
const { createStockAlertService } = require('./services/stockAlerts')

// ==============================================
// DEFINIR APP
// ==============================================
const app = express()
const PORT = process.env.PORT || 3000
// Escucha en la interfaz de red para soportar acceso LAN y el proxy de Vite.
const HOST = process.env.HOST || '0.0.0.0'

// ==============================================
// POSTGRESQL
// ==============================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const stockAlertService = createStockAlertService({ pool, sendTelegramMessage })

// Las notificaciones se programan después de confirmar la transacción. Un
// proveedor externo nunca debe revertir una venta ni un ajuste de inventario.
function notifyProductState(product) {
  void stockAlertService.notifyProductAlerts(product)
}

const SHIFT_TYPES = {
  // LIBRE se guarda explícitamente para que el horario conserve la decisión del administrador.
  LIBRE: { startsAt: null, endsAt: null },
  'MAÑANA': { startsAt: '08:00', endsAt: '12:00' },
  TARDE: { startsAt: '12:00', endsAt: '18:00' },
  COMPLETO: { startsAt: '08:00', endsAt: '18:00' },
}

// Ajustes de stock permitidos. Cualquier otro valor se rechaza para que el
// historial de movimientos solo contenga tipos conocidos.
const VALID_STOCK_TYPES = ['ADMIN_INCREASE', 'ADMIN_DECREASE', 'SET']

// ==============================================
// FUNCIÓN PARA AGREGAR CAMPOS NUEVOS (EJECUTADA AL INICIO)
// ==============================================

async function ensureBusinessFields() {
  // Esquema base idempotente: una instalación nueva puede arrancar sin crear
  // tablas desde pgAdmin. Las tablas ya existentes no se modifican aquí.
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'DEPENDIENTE')),
      active BOOLEAN DEFAULT TRUE,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      full_name VARCHAR(180), phone VARCHAR(50), turn_number VARCHAR(50), identity_card VARCHAR(50)
    );
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(180) NOT NULL,
      price_cup NUMERIC(12,2) NOT NULL DEFAULT 0, stock NUMERIC(12,3) NOT NULL DEFAULT 0,
      unit VARCHAR(50) NOT NULL, active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id),
      total_cup NUMERIC(12,2) NOT NULL, created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sale_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sale_id UUID NOT NULL REFERENCES sales(id),
      product_id UUID NOT NULL REFERENCES products(id), quantity NUMERIC(12,3) NOT NULL,
      unit_price_cup NUMERIC(12,2) NOT NULL, subtotal_cup NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS stock_movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES products(id),
      user_id UUID NOT NULL REFERENCES users(id), type VARCHAR(50) NOT NULL, quantity NUMERIC(12,3) NOT NULL,
      previous_stock NUMERIC(12,3) NOT NULL, new_stock NUMERIC(12,3) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sync_status (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      pending_count INTEGER NOT NULL DEFAULT 0 CHECK (pending_count >= 0),
      reported_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS telegram_alerts (
      id BIGSERIAL PRIMARY KEY,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      alert_type VARCHAR(40) NOT NULL,
      condition_key VARCHAR(80) NOT NULL,
      sent_at TIMESTAMP,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    -- Fila única: id BOOLEAN con CHECK(id) obliga a que solo pueda existir la
    -- fila TRUE. Un solo negocio por instalación no necesita una tabla completa.
    CREATE TABLE IF NOT EXISTS business_settings (
      id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
      business_uid UUID NOT NULL DEFAULT gen_random_uuid(),
      address TEXT,
      payment_card_number VARCHAR(50),
      owner_name VARCHAR(180),
      email VARCHAR(180),
      main_currency VARCHAR(10) NOT NULL DEFAULT 'CUP',
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)

  // Agregar columnas a products
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_cup NUMERIC(12,2) NOT NULL DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS expires_at DATE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(12,3) NOT NULL DEFAULT 5;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
  `)

  // Agregar columna payment_method a sales
  await pool.query(`
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'EFECTIVO';
  `)

  // Garantizar que la fila única de configuración del negocio exista siempre,
  // así el GET nunca encuentra la tabla vacía en una instalación nueva.
  await pool.query(`
    INSERT INTO business_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;
  `)

  // Crear tabla work_shifts con user_id UUID (CORREGIDO)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_shifts (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      work_date DATE NOT NULL,
      shift_name TEXT NOT NULL,
      starts_at TIME,
      ends_at TIME,
      UNIQUE(user_id, work_date)
    );
  `)

  // Índices para las consultas de historial, reportes y productos. Mantenerlos
  // aquí hace que instalaciones existentes se actualicen sin pasos manuales SQL.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sales_user_created_at ON sales (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items (product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created_at ON stock_movements (product_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_user_created_at ON stock_movements (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_active_name ON products (active, name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_alerts_active_condition
      ON telegram_alerts (product_id, alert_type, condition_key) WHERE resolved_at IS NULL;
  `)

  console.log('✅ Campos de negocio preparados correctamente')
}

// Evalúa también el inventario existente tras un reinicio; la tabla de alertas
// evita repetir mensajes que ya se entregaron para la misma condición.
async function notifyExistingProductAlerts() {
  const result = await pool.query(
    `SELECT id, name, stock, unit, reorder_level, expires_at
     FROM products WHERE active = TRUE AND archived = FALSE`
  )
  for (const product of result.rows) notifyProductState(product)
}

// ==============================================
// MIDDLEWARES
// ==============================================

// CORS: abierto por defecto para soportar los clientes de la LAN. Si se
// define CORS_ORIGIN (lista separada por comas) se restringe a esos orígenes.
const CORS_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors(CORS_ORIGINS.length > 0 ? { origin: CORS_ORIGINS } : {}))
app.use(express.json())

// =============================================
// RATE LIMITING EN MEMORIA (LOGIN)
// =============================================

// Límite simple sin dependencias: 5 intentos fallidos por IP+usuario en 10
// minutos. En una instalación de un solo negocio es suficiente y no requiere
// Redis ni librerías externas.
const LOGIN_WINDOW_MS = 10 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5
const loginAttempts = new Map()

function loginRateLimiter(req, res, next) {
  const key = `${req.ip}|${String(req.body?.username || '').toLowerCase()}`
  const now = Date.now()
  const record = loginAttempts.get(key)

  if (record && now - record.firstAttempt < LOGIN_WINDOW_MS && record.count >= LOGIN_MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' })
  }

  req.recordFailedLoginAttempt = () => {
    const current = loginAttempts.get(key)
    if (!current || now - current.firstAttempt >= LOGIN_WINDOW_MS) {
      loginAttempts.set(key, { firstAttempt: now, count: 1 })
    } else {
      current.count += 1
    }
    // Limpieza perezosa para que el mapa no crezca sin control.
    if (loginAttempts.size > 5000) {
      for (const [entryKey, entry] of loginAttempts) {
        if (now - entry.firstAttempt >= LOGIN_WINDOW_MS) loginAttempts.delete(entryKey)
      }
    }
  }

  next()
}

// ==============================================
// UTILIDADES
// ==============================================

function createToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

// ==============================================
// MIDDLEWARES DE AUTENTICACIÓN
// ==============================================

function authenticateToken(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  const token = auth.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Se requieren permisos de ADMIN' })
  }
  next()
}

function requireStaff(req, res, next) {
  if (!req.user || !['ADMIN', 'DEPENDIENTE'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Permisos insuficientes' })
  }
  next()
}

// ==============================================
// HEALTH CHECK
// ==============================================

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', message: 'CubaStock2.0 funcionando' })
  } catch {
    res.status(500).json({ status: 'error', message: 'PostgreSQL no responde' })
  }
})

// ==============================================
// PRUEBA TELEGRAM
// ==============================================

app.post('/api/telegram/test', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { chat_id = null } = req.body

    const message = `📦 CubaStock — Prueba de conexión

La conexión con Telegram se ha configurado correctamente.

Este grupo recibirá las alertas de inventario de CubaStock.`

    await sendTelegramMessage(chat_id, message)

    res.json({
      success: true,
      message: 'Mensaje enviado correctamente a Telegram',
    })
  } catch (error) {
    console.error('Error enviando mensaje a Telegram:', error)

    res.status(500).json({
      error: error.message || 'No se pudo enviar el mensaje a Telegram',
    })
  }
})

// ==============================================
// LOGIN
// ==============================================

app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' })
    }

    const result = await pool.query(
      `SELECT id, username, password_hash, role, active FROM users WHERE username = $1`,
      [username.trim()]
    )

    if (result.rows.length === 0) {
      req.recordFailedLoginAttempt?.()
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
    }

    const user = result.rows[0]

    if (!user.active) {
      return res.status(403).json({ error: 'La cuenta está desactivada' })
    }

    const passwordCorrect = await bcrypt.compare(password, user.password_hash)

    if (!passwordCorrect) {
      req.recordFailedLoginAttempt?.()
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
    }

    // Actualizar last_login_at. La columna ya existe siempre (se crea en
    // ensureBusinessFields al arrancar), así que un fallo aquí es una señal real
    // de un problema (ej. conexión). Se registra el error pero no bloquea el login:
    // no tiene sentido impedir que alguien entre solo porque falló este campo informativo.
    try {
      await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id])
    } catch (error) {
      console.error('Error actualizando last_login_at:', error.message)
    }

    const token = createToken(user)

    res.json({
      message: 'Login correcto',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    })
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ==============================================
// USUARIOS - OBTENER TODOS (CON NUEVOS CAMPOS)
// ==============================================

app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        username, 
        role, 
        active, 
        full_name, 
        phone, 
        turn_number, 
        identity_card, 
        last_login_at, 
        created_at 
      FROM users 
      ORDER BY username ASC`
    )
    res.json({ users: result.rows })
  } catch (error) {
    console.error('Error obteniendo usuarios:', error)
    res.status(500).json({ error: 'No se pudieron obtener los usuarios' })
  }
})

// ==============================================
// CREAR DEPENDIENTE - SOLO ADMIN
// ==============================================

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      username, 
      password, 
      full_name, 
      phone, 
      turn_number, 
      identity_card 
    } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username.trim()]
    )

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'El usuario ya existe' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO users (
        username, 
        password_hash, 
        role, 
        active, 
        full_name, 
        phone, 
        turn_number, 
        identity_card
      ) VALUES ($1, $2, 'DEPENDIENTE', true, $3, $4, $5, $6)
      RETURNING 
        id, 
        username, 
        role, 
        active, 
        full_name, 
        phone, 
        turn_number, 
        identity_card,
        created_at`,
      [
        username.trim(), 
        passwordHash, 
        full_name || null, 
        phone || null, 
        turn_number || null, 
        identity_card || null
      ]
    )

    res.status(201).json({
      message: 'Dependiente creado correctamente',
      user: result.rows[0]
    })
  } catch (error) {
    console.error('Error creando dependiente:', error)
    res.status(500).json({ error: 'No se pudo crear el dependiente' })
  }
})

// ==============================================
// EDITAR DEPENDIENTE - SOLO ADMIN
// ==============================================

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { 
      username, 
      full_name, 
      phone, 
      turn_number, 
      identity_card,
      active 
    } = req.body

    const userCheck = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    )

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const user = userCheck.rows[0]

    if (user.role === 'ADMIN' && user.id !== req.user.id) {
      return res.status(403).json({ error: 'No puedes editar a otro administrador' })
    }

    if (username) {
      const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username.trim(), id]
      )
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'El nombre de usuario ya está en uso' })
      }
    }

    const result = await pool.query(
      `UPDATE users SET
        username = COALESCE($1, username),
        full_name = COALESCE($2, full_name),
        phone = COALESCE($3, phone),
        turn_number = COALESCE($4, turn_number),
        identity_card = COALESCE($5, identity_card),
        active = COALESCE($6, active)
      WHERE id = $7
      RETURNING 
        id, 
        username, 
        role, 
        active, 
        full_name, 
        phone, 
        turn_number, 
        identity_card,
        last_login_at,
        created_at`,
      [
        username || null, 
        full_name || null, 
        phone || null, 
        turn_number || null, 
        identity_card || null, 
        active !== undefined ? active : null,
        id
      ]
    )

    res.json({
      message: 'Dependiente actualizado correctamente',
      user: result.rows[0]
    })
  } catch (error) {
    console.error('Error actualizando dependiente:', error)
    res.status(500).json({ error: 'No se pudo actualizar el dependiente' })
  }
})

// ==============================================
// RESETEAR CONTRASEÑA - SOLO ADMIN
// ==============================================

app.patch('/api/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    const userCheck = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    )

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (userCheck.rows[0].role === 'ADMIN') {
      return res.status(403).json({ error: 'No puedes resetear la contraseña de un administrador' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, id]
    )

    res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    console.error('Error reseteando contraseña:', error)
    res.status(500).json({ error: 'No se pudo resetear la contraseña' })
  }
})

// ==============================================
// TOGGLE USER - SOLO ADMIN
// ==============================================

app.patch('/api/users/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { active } = req.body

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'El campo active debe ser booleano' })
    }

    const userCheck = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [id]
    )

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const user = userCheck.rows[0]

    if (user.id === req.user.id) {
      return res.status(403).json({ error: 'No puedes desactivar tu propia cuenta' })
    }

    if (user.role === 'ADMIN') {
      return res.status(403).json({ error: 'No puedes modificar el estado de otro administrador' })
    }

    const result = await pool.query(
      `UPDATE users SET active = $1 WHERE id = $2 RETURNING id, username, role, active`,
      [active, id]
    )

    res.json({
      message: `Usuario ${active ? 'activado' : 'desactivado'} correctamente`,
      user: result.rows[0]
    })
  } catch (error) {
    console.error('Error toggling user:', error)
    res.status(500).json({ error: 'No se pudo cambiar el estado del usuario' })
  }
})

// ==============================================
// ELIMINAR DEPENDIENTE - SOLO ADMIN
// ==============================================

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params

    const userCheck = await client.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [id]
    )

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const user = userCheck.rows[0]

    if (user.role === 'ADMIN') {
      return res.status(403).json({ error: 'No puedes eliminar a otro administrador' })
    }

    if (user.id === req.user.id) {
      return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta' })
    }

    // El historial de ventas y movimientos es contable. Si existe, se desactiva
    // la cuenta en vez de destruir registros que después necesitará el negocio.
    const historyCheck = await client.query(
      `SELECT
        (SELECT COUNT(*) FROM sales WHERE user_id = $1) AS sales_count,
        (SELECT COUNT(*) FROM stock_movements WHERE user_id = $1) AS movement_count`,
      [id]
    )
    const hasHistory = Number(historyCheck.rows[0].sales_count) > 0 || Number(historyCheck.rows[0].movement_count) > 0

    if (hasHistory) {
      const result = await client.query(
        `UPDATE users SET active = FALSE WHERE id = $1 RETURNING id, username`,
        [id]
      )
      return res.json({
        message: `Usuario "${result.rows[0].username}" desactivado; su historial se conserva`,
        deactivated: result.rows[0],
      })
    }

    await client.query('BEGIN')

    const result = await client.query(
      `DELETE FROM users WHERE id = $1 RETURNING id, username`,
      [id]
    )

    await client.query('COMMIT')

    res.json({
      message: `Usuario "${result.rows[0].username}" eliminado correctamente`,
      deleted: result.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error eliminando dependiente:', error)
    res.status(500).json({ error: 'No se pudo eliminar el dependiente' })
  } finally {
    client.release()
  }
})

// ==============================================
// PRODUCTOS
// ==============================================

app.get('/api/products', authenticateToken, requireStaff, async (req, res) => {
  try {
    // Solo ADMIN puede consultar retirados para poder reactivarlos sin usar pgAdmin.
    const includeInactive = req.user.role === 'ADMIN' && req.query.include_inactive === 'true'
    const result = await pool.query(
      `SELECT id, name, price_cup, cost_cup, stock, unit, expires_at, reorder_level, active, created_at, updated_at
       FROM products WHERE archived = false AND ($1::boolean = TRUE OR active = TRUE) ORDER BY active DESC, name ASC`,
      [includeInactive]
    )
    // El costo es información del administrador: los dependientes solo necesitan
    // nombre, precio de venta y stock para operar el punto de venta.
    const products = req.user.role === 'ADMIN'
      ? result.rows
      : result.rows.map(({ cost_cup, ...product }) => product)
    res.json({ products })
  } catch (error) {
    console.error('Error obteniendo productos:', error)
    res.status(500).json({ error: 'No se pudieron obtener los productos' })
  }
})

// ==============================================
// CREAR PRODUCTO - SOLO ADMIN
// ==============================================

app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    const { name, price_cup, cost_cup = 0, stock, unit, expires_at = null, reorder_level = 5 } = req.body

    if (!name || !unit) {
      return res.status(400).json({ error: 'Nombre y unidad son obligatorios' })
    }

    const price = Number(price_cup) || 0
    const initialStock = Number(stock) || 0

    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO products (name, price_cup, cost_cup, stock, unit, expires_at, reorder_level) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, name, price_cup, cost_cup, stock, unit, expires_at, reorder_level, active, created_at, updated_at`,
      [name.trim(), price, Number(cost_cup) || 0, initialStock, unit.trim(), expires_at || null, Number(reorder_level) || 5]
    )

    const product = result.rows[0]

    if (initialStock > 0) {
      await client.query(
        `INSERT INTO stock_movements (product_id, user_id, type, quantity, previous_stock, new_stock)
         VALUES ($1, $2, 'ADMIN_INCREASE', $3, 0, $3)`,
        [product.id, req.user.id, initialStock]
      )
    }

    await client.query('COMMIT')
    notifyProductState(product)
    res.status(201).json({ message: 'Producto creado', product })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error creando producto:', error)
    res.status(500).json({ error: 'No se pudo crear el producto' })
  } finally {
    client.release()
  }
})

// ==============================================
// ELIMINAR PRODUCTO - SOLO ADMIN
// ==============================================

app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params

    const productCheck = await client.query(
      `SELECT id, name FROM products WHERE id = $1`,
      [id]
    )

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    await client.query('BEGIN')

    // Las ventas y movimientos son un historial contable: si existen, retirar
    // el producto es seguro; borrarlo físicamente rompería sus claves foráneas.
    const historyCheck = await client.query(
      `SELECT
        (SELECT COUNT(*) FROM sale_items WHERE product_id = $1) AS sales_count,
        (SELECT COUNT(*) FROM stock_movements WHERE product_id = $1) AS movement_count`,
      [id]
    )

    const hasHistory = Number(historyCheck.rows[0].sales_count) > 0 || Number(historyCheck.rows[0].movement_count) > 0

    if (hasHistory) {
      await client.query(
        `UPDATE products SET active = false, updated_at = NOW() WHERE id = $1`,
        [id]
      )
      await client.query('COMMIT')
      return res.json({ 
        message: 'Producto retirado del catálogo; su historial se conserva',
        deactivated: true
      })
    } else {
      await client.query(
        `DELETE FROM products WHERE id = $1`,
        [id]
      )
      await client.query('COMMIT')
      return res.json({ 
        message: 'Producto eliminado correctamente',
        deleted: true
      })
    }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error eliminando producto:', error)
    res.status(500).json({ error: 'No se pudo eliminar el producto' })
  } finally {
    client.release()
  }
})

// ==============================================
// ELIMINAR PRODUCTO PERMANENTEMENTE - SOLO ADMIN
// Solo aplica a productos ya retirados (active = false). Si el producto
// nunca tuvo ventas ni movimientos, se borra la fila de verdad. Si sí tiene
// historial, no se puede borrar sin romper reportes de ventas pasadas: en
// vez de eso se "archiva" para que deje de aparecer en la plataforma.
// ==============================================

app.delete('/api/products/:id/permanent', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params

    const productCheck = await client.query(
      `SELECT id, name, active FROM products WHERE id = $1`,
      [id]
    )

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    if (productCheck.rows[0].active) {
      return res.status(400).json({ error: 'Primero retira el producto del catálogo antes de eliminarlo permanentemente' })
    }

    await client.query('BEGIN')

    const historyCheck = await client.query(
      `SELECT
        (SELECT COUNT(*) FROM sale_items WHERE product_id = $1) AS sales_count,
        (SELECT COUNT(*) FROM stock_movements WHERE product_id = $1) AS movement_count`,
      [id]
    )

    const hasHistory = Number(historyCheck.rows[0].sales_count) > 0 || Number(historyCheck.rows[0].movement_count) > 0

    if (hasHistory) {
      await client.query(
        `UPDATE products SET archived = true, updated_at = NOW() WHERE id = $1`,
        [id]
      )
      await client.query('COMMIT')
      return res.json({
        message: 'Producto eliminado de la plataforma. Su historial de ventas se conserva de forma interna.',
        archived: true,
      })
    } else {
      await client.query(`DELETE FROM products WHERE id = $1`, [id])
      await client.query('COMMIT')
      return res.json({
        message: 'Producto eliminado permanentemente',
        deleted: true,
      })
    }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error eliminando producto permanentemente:', error)
    res.status(500).json({ error: 'No se pudo eliminar el producto' })
  } finally {
    client.release()
  }
})

// ==============================================
// MODIFICAR STOCK - SOLO ADMIN
// ==============================================

app.patch('/api/products/:id/stock', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    const { quantity, type, cost_cup, price_cup, expires_at } = req.body

    if (!VALID_STOCK_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Tipo de ajuste inválido. Usa: ADMIN_INCREASE, ADMIN_DECREASE o SET' })
    }

    const amount = Number(quantity)
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ error: 'La cantidad debe ser un número diferente de 0' })
    }

    await client.query('BEGIN')

    const productResult = await client.query(
      `SELECT id, name, stock, unit, reorder_level, expires_at FROM products WHERE id = $1 FOR UPDATE`,
      [id]
    )

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    const product = productResult.rows[0]
    let newStock

    if (type === 'ADMIN_INCREASE') {
      newStock = Number(product.stock) + Math.abs(amount)
    } else if (type === 'ADMIN_DECREASE') {
      newStock = Number(product.stock) - Math.abs(amount)
    } else {
      newStock = amount
    }

    if (newStock < 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'El stock no puede ser negativo' })
    }

    // expires_at: solo se toca cuando el cliente lo envía explícitamente; así
    // enviar null realmente borra la fecha de vencimiento en vez de conservarla.
    const expiresAtProvided = Object.hasOwn(req.body, 'expires_at')

    const updateResult = await client.query(
      `UPDATE products SET stock = $1, cost_cup = COALESCE($2, cost_cup), price_cup = COALESCE($3, price_cup),
       expires_at = CASE WHEN $6 THEN $4 ELSE expires_at END, updated_at = NOW() WHERE id = $5
       RETURNING id, name, price_cup, cost_cup, stock, unit, expires_at, reorder_level, active, created_at, updated_at`,
      [newStock, Number.isFinite(Number(cost_cup)) ? Number(cost_cup) : null, Number.isFinite(Number(price_cup)) ? Number(price_cup) : null, expires_at || null, id, expiresAtProvided]
    )

    await client.query(
      `INSERT INTO stock_movements (product_id, user_id, type, quantity, previous_stock, new_stock)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, req.user.id, type, Math.abs(amount), Number(product.stock), newStock]
    )

    await client.query('COMMIT')
    const updatedProduct = updateResult.rows[0]
    notifyProductState(updatedProduct)
    res.json({ message: 'Stock actualizado', product: updatedProduct })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error modificando stock:', error)
    res.status(500).json({ error: 'No se pudo modificar el stock' })
  } finally {
    client.release()
  }
})

// ==============================================
// REGISTRAR VENTA
// ==============================================

app.post('/api/sales', authenticateToken, requireStaff, async (req, res) => {
  const client = await pool.connect()
  try {
    const { items, user_id, payment_method = 'EFECTIVO' } = req.body

    if (!['EFECTIVO', 'TARJETA'].includes(payment_method)) {
      return res.status(400).json({ error: 'Método de pago inválido' })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe contener al menos un producto' })
    }

    let targetUserId = req.user.id
    if (user_id && user_id !== req.user.id) {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'No tienes permiso para registrar ventas en nombre de otro usuario' })
      }
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [user_id])
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' })
      }
      targetUserId = user_id
    }

    await client.query('BEGIN')

    let total = 0
    const processedItems = []

    for (const item of items) {
      const productId = item.product_id
      const quantity = Number(item.quantity)

      if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('Producto o cantidad inválida')
      }

      const productResult = await client.query(
        `SELECT id, name, price_cup, stock, unit, reorder_level, expires_at FROM products WHERE id = $1 AND active = TRUE FOR UPDATE`,
        [productId]
      )

      if (productResult.rows.length === 0) {
        throw new Error('Producto no encontrado')
      }

      const product = productResult.rows[0]
      const currentStock = Number(product.stock)

      if (quantity > currentStock) {
        throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${currentStock}`)
      }

      const unitPrice = Number(product.price_cup)
      const subtotal = unitPrice * quantity
      total += subtotal

      processedItems.push({ product, quantity, unitPrice, subtotal })
    }

    const saleResult = await client.query(
      `INSERT INTO sales (user_id, total_cup, payment_method) VALUES ($1, $2, $3) RETURNING id, user_id, total_cup, payment_method, created_at`,
      [targetUserId, total.toFixed(2), payment_method]
    )

    const sale = saleResult.rows[0]

    for (const item of processedItems) {
      const previousStock = Number(item.product.stock)
      const newStock = previousStock - item.quantity

      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price_cup, subtotal_cup)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale.id, item.product.id, item.quantity, item.unitPrice, item.subtotal.toFixed(2)]
      )

      await client.query(
        `UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2`,
        [newStock, item.product.id]
      )

      await client.query(
        `INSERT INTO stock_movements (product_id, user_id, type, quantity, previous_stock, new_stock)
         VALUES ($1, $2, 'SALE', $3, $4, $5)`,
        [item.product.id, targetUserId, item.quantity, previousStock, newStock]
      )
    }

    await client.query('COMMIT')
    for (const item of processedItems) {
      notifyProductState({ ...item.product, stock: Number(item.product.stock) - item.quantity })
    }
    res.status(201).json({ message: 'Venta registrada', sale })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error registrando venta:', error)
    res.status(400).json({ error: error.message || 'No se pudo registrar la venta' })
  } finally {
    client.release()
  }
})

// ==============================================
// OBTENER VENTAS
// ==============================================

app.get('/api/sales', authenticateToken, requireStaff, async (req, res) => {
  try {
    // Un dependiente solo consulta sus ventas; el administrador ve el negocio completo.
    const isAdmin = req.user.role === 'ADMIN'
    const result = await pool.query(
      `SELECT s.id, s.user_id, u.username, s.total_cup, s.payment_method, s.created_at 
       FROM sales s INNER JOIN users u ON u.id = s.user_id 
       WHERE ($1::boolean = TRUE OR s.user_id = $2)
       ORDER BY s.created_at DESC`,
      [isAdmin, req.user.id]
    )
    res.json({ sales: result.rows })
  } catch (error) {
    console.error('Error obteniendo ventas:', error)
    res.status(500).json({ error: 'No se pudieron obtener las ventas' })
  }
})

// ==============================================
// DETALLES DE VENTA
// ==============================================

app.get('/api/sales/:id/details', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    const saleResult = await pool.query(
      `
      SELECT 
        s.id,
        s.user_id,
        u.username,
        s.total_cup,
        s.created_at
      FROM sales s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND ($2::boolean = TRUE OR s.user_id = $3)
      `,
      [id, req.user.role === 'ADMIN', req.user.id]
    )

    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' })
    }

    const sale = saleResult.rows[0]

    const itemsResult = await pool.query(
      `
      SELECT 
        si.id,
        si.quantity,
        si.unit_price_cup,
        si.subtotal_cup,
        p.id AS product_id,
        p.name AS product_name,
        p.unit
      FROM sale_items si
      INNER JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = $1
      `,
      [id]
    )

    res.json({
      sale: {
        id: sale.id,
        username: sale.username,
        total_cup: sale.total_cup,
        created_at: sale.created_at,
      },
      items: itemsResult.rows.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price_cup: item.unit_price_cup,
        subtotal_cup: item.subtotal_cup,
      })),
    })
  } catch (error) {
    console.error('Error obteniendo detalles de venta:', error)
    res.status(500).json({ error: 'No se pudieron obtener los detalles de la venta' })
  }
})

// ==============================================
// HISTORIAL DE MOVIMIENTOS - SOLO ADMIN
// ==============================================

app.get('/api/stock-movements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sm.id, sm.type, sm.quantity, sm.previous_stock, sm.new_stock, sm.created_at,
              p.id AS product_id, p.name AS product_name, p.unit,
              u.id AS user_id, u.username
       FROM stock_movements sm
       INNER JOIN products p ON p.id = sm.product_id
       INNER JOIN users u ON u.id = sm.user_id
       ORDER BY sm.created_at DESC`
    )
    res.json({ movements: result.rows })
  } catch (error) {
    console.error('Error obteniendo movimientos:', error)
    res.status(500).json({ error: 'No se pudieron obtener los movimientos' })
  }
})

// ==============================================
// REPORTES - TOP PRODUCTOS MÁS VENDIDOS (SEMANAL/MENSUAL)
// ==============================================

app.get('/api/reports/top-products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'weekly' } = req.query

    let days
    if (period === 'weekly') days = 7
    else if (period === 'monthly') days = 30
    else return res.status(400).json({ error: 'Periodo inválido. Use weekly o monthly' })

    const query = `
      SELECT 
        p.id,
        p.name,
        COALESCE(SUM(si.quantity), 0) AS total_quantity
      FROM products p
      LEFT JOIN sale_items si ON si.product_id = p.id
      LEFT JOIN sales s ON s.id = si.sale_id
      WHERE p.archived = false
        AND (s.created_at >= NOW() - INTERVAL '${days} days' OR si.id IS NULL)
      GROUP BY p.id, p.name
      ORDER BY total_quantity DESC
      LIMIT 10
    `

    const result = await pool.query(query)
    res.json({ products: result.rows })
  } catch (error) {
    console.error('Error obteniendo top productos:', error)
    res.status(500).json({ error: 'No se pudieron obtener los productos más vendidos' })
  }
})

// ==============================================
// REPORTES - PRODUCTOS ESTANCADOS (SEMANAL/MENSUAL)
// ==============================================

app.get('/api/reports/stagnant-products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'weekly' } = req.query

    let days
    if (period === 'weekly') days = 7
    else if (period === 'monthly') days = 30
    else return res.status(400).json({ error: 'Periodo inválido. Use weekly o monthly' })

    const query = `
      SELECT 
        p.id,
        p.name,
        COALESCE(SUM(si.quantity), 0) AS total_quantity
      FROM products p
      LEFT JOIN sale_items si ON si.product_id = p.id
      LEFT JOIN sales s ON s.id = si.sale_id
      WHERE p.archived = false
        AND (s.created_at >= NOW() - INTERVAL '${days} days' OR si.id IS NULL)
      GROUP BY p.id, p.name
      ORDER BY total_quantity ASC
      LIMIT 10
    `

    const result = await pool.query(query)
    res.json({ products: result.rows })
  } catch (error) {
    console.error('Error obteniendo productos estancados:', error)
    res.status(500).json({ error: 'No se pudieron obtener los productos estancados' })
  }
})

// ==============================================
// TURNOS SEMANALES (EDITABLES POR ADMIN)
// ==============================================

app.get('/api/shifts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query
    const result = await pool.query(
      `SELECT ws.*, u.username, u.full_name 
       FROM work_shifts ws 
       JOIN users u ON u.id = ws.user_id
       WHERE ($1::date IS NULL OR ws.work_date >= $1) 
         AND ($2::date IS NULL OR ws.work_date <= $2) 
       ORDER BY ws.work_date, u.username`,
      [from || null, to || null]
    )
    res.json({ shifts: result.rows })
  } catch (error) {
    console.error('Error obteniendo turnos:', error)
    res.status(500).json({ error: 'No se pudieron obtener los turnos' })
  }
})

app.put('/api/shifts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { user_id, work_date, shift_name, starts_at = null, ends_at = null } = req.body
    if (!user_id || !work_date || !shift_name) {
      return res.status(400).json({ error: 'Empleado, fecha y turno son obligatorios' })
    }

    if (!Object.hasOwn(SHIFT_TYPES, shift_name)) {
      return res.status(400).json({ error: 'Tipo de turno inválido. Usa: Libre, Mañana, Tarde o Completo' })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date) || Number.isNaN(Date.parse(`${work_date}T00:00:00`))) {
      return res.status(400).json({ error: 'La fecha del turno no es válida' })
    }

    // Solo los dependientes pueden recibir turnos de trabajo.
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'DEPENDIENTE'",
      [user_id]
    )
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dependiente no encontrado' })
    }

    const predefinedShift = SHIFT_TYPES[shift_name]
    const result = await pool.query(
      `INSERT INTO work_shifts (user_id, work_date, shift_name, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (user_id, work_date) DO UPDATE 
       SET shift_name = EXCLUDED.shift_name, 
           starts_at = EXCLUDED.starts_at, 
           ends_at = EXCLUDED.ends_at 
       RETURNING *`,
      [
        user_id,
        work_date,
        shift_name,
        starts_at || predefinedShift.startsAt,
        ends_at || predefinedShift.endsAt,
      ]
    )
    res.json({ shift: result.rows[0] })
  } catch (error) {
    console.error('Error guardando turno:', error)
    res.status(500).json({ error: 'No se pudo guardar el turno' })
  }
})

// Cambia el estado del catálogo sin perder el historial. Sustituye la necesidad
// de editar la tabla products manualmente desde pgAdmin.
app.patch('/api/products/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { active } = req.body
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'El campo active debe ser booleano' })

    const result = await pool.query(
      `UPDATE products SET active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, active`,
      [active, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' })

    res.json({
      message: `Producto ${active ? 'reactivado' : 'retirado'} correctamente`,
      product: result.rows[0],
    })
  } catch (error) {
    console.error('Error actualizando estado del producto:', error)
    res.status(500).json({ error: 'No se pudo actualizar el estado del producto' })
  }
})

app.delete('/api/shifts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { user_id, work_date } = req.body

    if (!user_id || !work_date || !/^\d{4}-\d{2}-\d{2}$/.test(work_date)) {
      return res.status(400).json({ error: 'Empleado y fecha válida son obligatorios' })
    }

    await pool.query(
      `DELETE FROM work_shifts
       WHERE user_id = $1 AND work_date = $2
         AND user_id IN (SELECT id FROM users WHERE role = 'DEPENDIENTE')`,
      [user_id, work_date]
    )

    res.status(204).send()
  } catch (error) {
    console.error('Error eliminando turno:', error)
    res.status(500).json({ error: 'No se pudo quitar el turno' })
  }
})

// ==============================================
// CONTACTO DE CONFIRMACIÓN PARA PAGOS CON TARJETA
// ==============================================

// Consulta la planificación ya existente por fecha. No usa starts_at/ends_at:
// una asignación en work_shifts significa que el dependiente está planificado
// para ese día, independientemente del tipo de turno guardado.
app.get('/api/payment-confirmation-contact', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { date } = req.query
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) {
      return res.status(400).json({ error: 'date debe tener el formato YYYY-MM-DD' })
    }

    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.phone
       FROM work_shifts ws
       JOIN users u ON u.id = ws.user_id
       WHERE ws.work_date = $1
         AND ws.shift_name <> 'LIBRE'
         AND u.role = 'DEPENDIENTE'
         AND u.active = TRUE
       ORDER BY u.username`,
      [date]
    )

    // El dependiente autenticado tiene prioridad porque es quien registra su
    // propia venta. Para un administrador sólo se devuelve el contacto si la
    // planificación identifica a una única persona; nunca se adivina por hora.
    const currentDependent = result.rows.find((dependent) => dependent.id === req.user.id)
    const dependent = currentDependent || (result.rows.length === 1 ? result.rows[0] : null)

    if (!dependent) {
      const multipleAssignments = result.rows.length > 1
      return res.json({
        date,
        status: multipleAssignments ? 'AMBIGUOUS_ASSIGNMENT' : 'NO_ASSIGNMENT',
        dependent: null,
        phone: '',
        message: multipleAssignments
          ? 'Hay varios dependientes planificados para esta fecha; no se selecciona uno por horario.'
          : 'No hay un dependiente planificado para esta fecha.',
      })
    }

    res.json({
      date,
      status: dependent.phone ? 'AVAILABLE' : 'MISSING_PHONE',
      dependent: { id: dependent.id, username: dependent.username, full_name: dependent.full_name },
      phone: dependent.phone || '',
      message: dependent.phone ? '' : 'El dependiente planificado no tiene teléfono registrado.',
    })
  } catch (error) {
    console.error('Error obteniendo contacto de confirmación:', error)
    res.status(500).json({ error: 'No se pudo obtener el teléfono de confirmación' })
  }
})

// ==============================================
// ESTADO DE SINCRONIZACIÓN Y NOTIFICACIONES
// ==============================================

// Cada dispositivo reporta su cola cuando vuelve a tener conexión. No intenta
// inventar datos de una venta creada sin red: esa información no abandona el
// navegador hasta que exista conectividad real.
app.post('/api/sync-status', authenticateToken, requireStaff, async (req, res) => {
  const pendingCount = Number(req.body.pending_count)
  if (!Number.isInteger(pendingCount) || pendingCount < 0 || pendingCount > 100000) {
    return res.status(400).json({ error: 'pending_count debe ser un entero válido' })
  }

  try {
    await pool.query(
      `INSERT INTO sync_status (user_id, pending_count, reported_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET pending_count = EXCLUDED.pending_count, reported_at = NOW()`,
      [req.user.id, pendingCount]
    )
    res.status(204).send()
  } catch (error) {
    console.error('Error reportando estado de sincronización:', error)
    res.status(500).json({ error: 'No se pudo reportar el estado de sincronización' })
  }
})

// Un único contrato para la campana administrativa. Los identificadores son
// estables para que el frontend pueda distinguir alertas leídas de nuevas.
app.get('/api/admin/notifications', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [stockResult, expiryResult, pendingResult] = await Promise.all([
      pool.query(
        `SELECT id, name, stock, unit, reorder_level
         FROM products
         WHERE active = TRUE AND archived = FALSE AND stock <= reorder_level
         ORDER BY stock ASC, name ASC`
      ),
      pool.query(
        `SELECT id, name, expires_at
         FROM products
         WHERE active = TRUE AND archived = FALSE
           AND expires_at IS NOT NULL
           AND expires_at <= CURRENT_DATE + INTERVAL '30 days'
         ORDER BY expires_at ASC, name ASC`
      ),
      pool.query(
        `SELECT u.id, u.username, s.pending_count, s.reported_at
         FROM sync_status s
         INNER JOIN users u ON u.id = s.user_id
         WHERE u.role = 'DEPENDIENTE' AND s.pending_count > 0
         ORDER BY s.reported_at DESC, u.username ASC`
      ),
    ])

    const notifications = [
      ...stockResult.rows.map((product) => ({
        id: `stock:${product.id}`,
        type: 'LOW_STOCK',
        title: 'Stock bajo',
        message: `${product.name}: ${product.stock} ${product.unit} disponibles (mínimo ${product.reorder_level}).`,
      })),
      ...expiryResult.rows.map((product) => ({
        id: `expiry:${product.id}:${product.expires_at}`,
        type: 'EXPIRY',
        title: 'Producto próximo a vencer',
        message: `${product.name} vence el ${product.expires_at}.`,
      })),
    ]

    res.json({
      notifications,
      pending_sync: pendingResult.rows,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error obteniendo notificaciones administrativas:', error)
    res.status(500).json({ error: 'No se pudieron cargar las notificaciones' })
  }
})

// ==============================================
// CONFIGURACIÓN DEL NEGOCIO
// ==============================================

// Cualquier miembro del staff puede leerla: los dependientes necesitan el
// número de tarjeta al cobrar una venta pagada con Tarjeta.
app.get('/api/business-settings', authenticateToken, requireStaff, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM business_settings WHERE id = TRUE')
    res.json({ settings: result.rows[0] || null })
  } catch (error) {
    console.error('Error obteniendo configuración del negocio:', error)
    res.status(500).json({ error: 'No se pudo obtener la configuración del negocio' })
  }
})

// Solo el administrador puede modificarla. business_uid nunca se acepta desde
// el body: es un identificador estable generado una única vez por instalación.
app.put('/api/business-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { address, payment_card_number, owner_name, email, main_currency } = req.body

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'El correo electrónico no es válido' })
    }

    // address/payment_card_number/owner_name/email se sobrescriben siempre
    // (enviar '' los vacía a propósito). main_currency es la única excepción:
    // no tiene sentido un negocio sin moneda, así que un valor vacío conserva
    // el anterior en vez de dejarlo en blanco.
    const result = await pool.query(
      `UPDATE business_settings SET
        address = $1,
        payment_card_number = $2,
        owner_name = $3,
        email = $4,
        main_currency = COALESCE(NULLIF($5, ''), main_currency),
        updated_at = NOW()
      WHERE id = TRUE
      RETURNING *`,
      [
        address?.trim() || null,
        payment_card_number?.trim() || null,
        owner_name?.trim() || null,
        email?.trim() || null,
        main_currency?.trim() || '',
      ]
    )

    res.json({
      message: 'Configuración del negocio actualizada correctamente',
      settings: result.rows[0],
    })
  } catch (error) {
    console.error('Error actualizando configuración del negocio:', error)
    res.status(500).json({ error: 'No se pudo actualizar la configuración del negocio' })
  }
})

// ==============================================
// SERVIR FRONTEND COMPILADO (mismo origen que la API)
// ==============================================
// En producción el backend también sirve el frontend compilado: un solo
// origen significa cero problemas de CORS, de service worker cross-origin y
// de configuración de API_URL. Debe registrarse ANTES del catch-all 404 de
// abajo. Las rutas /api/* se registran antes y no se ven afectadas; cualquier
// otra ruta devuelve la SPA para el enrutado del lado del cliente.
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

// ==============================================
// 404
// ==============================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
  })
})

// ==============================================
// ERROR GENERAL
// ==============================================

app.use((error, req, res, next) => {
  console.error('Error general:', error)
  res.status(500).json({
    error: 'Error interno del servidor',
  })
})

// ==============================================
// ADMIN INICIAL (OPT-IN VÍA ENTORNO)
// ==============================================

// En despliegues nuevos (p. ej. Render) no siempre es posible ejecutar scripts
// interactivos contra la base de datos. Si BOOTSTRAP_ADMIN_PASSWORD está
// definido y la tabla de usuarios está vacía, se crea el administrador inicial
// una única vez. Es opt-in: sin la variable no hace nada.
async function ensureInitialAdmin() {
  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD
  if (!bootstrapPassword) return

  const result = await pool.query('SELECT COUNT(*)::int AS count FROM users')
  if (result.rows[0].count > 0) return

  if (bootstrapPassword.length < 10) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 10 caracteres')
  }

  const passwordHash = await bcrypt.hash(bootstrapPassword, 12)
  await pool.query(
    `INSERT INTO users (username, password_hash, role, active) VALUES ('admin', $1, 'ADMIN', true)`,
    [passwordHash]
  )
  console.log('✅ Usuario administrador inicial "admin" creado (borra BOOTSTRAP_ADMIN_PASSWORD tras el primer arranque)')
}

// ==============================================
// INICIAR SERVIDOR
// ==============================================

// Espera las migraciones antes de atender peticiones. Así no existe una ventana
// en la que frontend pueda usar tablas o columnas que aún no se han preparado.
async function startServer() {
  await ensureBusinessFields()
  await ensureInitialAdmin()
  await notifyExistingProductAlerts()
  app.listen(PORT, HOST, () => {
    console.log(`🚀 CubaStock2.0 backend en http://${HOST}:${PORT}`)
  })
}

startServer().catch((error) => {
  console.error('❌ No se pudo iniciar CubaStock:', error.message)
  process.exit(1)
})
