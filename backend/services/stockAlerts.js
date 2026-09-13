/**
 * Propósito: evaluar cambios de producto y emitir alertas idempotentes de inventario.
 * Responsabilidades: clasificar stock/vencimiento, persistir su estado y evitar duplicados.
 * Dependencias: tabla telegram_alerts creada por index.js y services/telegram.js.
 */

const ALERT_TYPES = {
  LOW_STOCK: 'LOW_STOCK',
  CRITICAL_STOCK: 'CRITICAL_STOCK',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
}

const EXPIRY_WARNING_DAYS = 30

function toDateKey(value) {
  if (!value) return null
  return String(value).slice(0, 10)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

/** La criticidad se deriva del nivel de reposición para no añadir campos de negocio nuevos. */
function getCriticalLevel(reorderLevel) {
  return Math.max(1, Number(reorderLevel) / 2)
}

/** Devuelve las alertas activas de un producto; es pura y fácil de probar. */
function evaluateProductAlerts(product, today = todayKey()) {
  const stock = Number(product.stock)
  const reorderLevel = Number(product.reorder_level)
  const criticalLevel = getCriticalLevel(reorderLevel)
  const alerts = []

  if (Number.isFinite(stock) && Number.isFinite(reorderLevel) && stock <= criticalLevel) {
    alerts.push({
      type: ALERT_TYPES.CRITICAL_STOCK,
      key: String(criticalLevel),
      message: `🚨 CUBASTOCK — STOCK CRÍTICO\n\n📦 Producto: ${product.name}\n📊 Stock actual: ${stock} ${product.unit}\n🔴 Stock crítico: ${criticalLevel}`,
    })
  } else if (Number.isFinite(stock) && Number.isFinite(reorderLevel) && stock <= reorderLevel) {
    alerts.push({
      type: ALERT_TYPES.LOW_STOCK,
      key: String(reorderLevel),
      message: `⚠️ CUBASTOCK — STOCK BAJO\n\n📦 Producto: ${product.name}\n📊 Stock actual: ${stock} ${product.unit}\n🟡 Nivel de reposición: ${reorderLevel}`,
    })
  }

  const expiry = toDateKey(product.expires_at)
  if (expiry) {
    const daysUntilExpiry = Math.floor((Date.parse(`${expiry}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
    if (daysUntilExpiry < 0) {
      alerts.push({ type: ALERT_TYPES.EXPIRED, key: expiry, message: `🚨 CUBASTOCK — PRODUCTO VENCIDO\n\n📦 Producto: ${product.name}\n📅 Venció: ${expiry}` })
    } else if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) {
      alerts.push({ type: ALERT_TYPES.EXPIRING_SOON, key: expiry, message: `⏳ CUBASTOCK — PRÓXIMO A VENCER\n\n📦 Producto: ${product.name}\n📅 Vence: ${expiry}\n⏱️ Restan: ${daysUntilExpiry} día${daysUntilExpiry === 1 ? '' : 's'}` })
    }
  }

  return alerts
}

/**
 * Crea solo la primera alerta de cada condición y resuelve las que dejaron de aplicar.
 * Esta función nunca lanza hacia ventas/inventario: el llamador debe ejecutarla tras COMMIT.
 */
function createStockAlertService({ pool, sendTelegramMessage, logger = console }) {
  async function notifyProductAlerts(product) {
    try {
      const alerts = evaluateProductAlerts(product)
      const activeKeys = alerts.map((alert) => `${alert.type}:${alert.key}`)

      await pool.query(
        `UPDATE telegram_alerts SET resolved_at = NOW()
         WHERE product_id = $1 AND resolved_at IS NULL
           AND NOT (alert_type || ':' || condition_key = ANY($2::text[]))`,
        [product.id, activeKeys]
      )

      for (const alert of alerts) {
        const inserted = await pool.query(
          `INSERT INTO telegram_alerts (product_id, alert_type, condition_key)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, alert_type, condition_key) WHERE resolved_at IS NULL
           DO UPDATE SET attempts = telegram_alerts.attempts + 1
             WHERE telegram_alerts.sent_at IS NULL
           RETURNING id`,
          [product.id, alert.type, alert.key]
        )
        if (inserted.rowCount > 0) {
          try {
            await sendTelegramMessage(null, alert.message)
            await pool.query(
              `UPDATE telegram_alerts SET sent_at = NOW(), last_error = NULL WHERE id = $1`,
              [inserted.rows[0].id]
            )
          } catch (error) {
            // La operación de inventario ya terminó: se registra el problema y
            // queda pendiente de reintento en el siguiente cambio del producto.
            logger.error('Error enviando alerta de Telegram:', error.message)
            await pool.query(
              `UPDATE telegram_alerts SET last_error = $1 WHERE id = $2`,
              [error.message.slice(0, 1000), inserted.rows[0].id]
            )
          }
        }
      }
    } catch (error) {
      logger.error('Error enviando alerta de Telegram:', error.message)
    }
  }

  return { notifyProductAlerts }
}

module.exports = { ALERT_TYPES, EXPIRY_WARNING_DAYS, evaluateProductAlerts, createStockAlertService }
