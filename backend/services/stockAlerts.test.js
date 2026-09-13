/**
 * Propósito: pruebas reproducibles del clasificador e idempotencia de alertas Telegram.
 * Responsabilidades: verificar condiciones de stock/vencimiento y que fallos externos no propaguen.
 * Dependencias: node:test y services/stockAlerts.js; no usa base de datos ni Telegram reales.
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const { ALERT_TYPES, createStockAlertService, evaluateProductAlerts } = require('./stockAlerts')

const product = { id: 'product-1', name: 'Aceite', stock: 2, unit: 'L', reorder_level: 6, expires_at: '2026-10-01' }

test('clasifica stock crítico, bajo, próximo a vencer y vencido', () => {
  assert.equal(evaluateProductAlerts(product, '2026-09-06').some((item) => item.type === ALERT_TYPES.CRITICAL_STOCK), true)
  assert.equal(evaluateProductAlerts({ ...product, stock: 4, expires_at: null }, '2026-09-06')[0].type, ALERT_TYPES.LOW_STOCK)
  assert.equal(evaluateProductAlerts({ ...product, stock: 20 }, '2026-09-06').some((item) => item.type === ALERT_TYPES.EXPIRING_SOON), true)
  assert.equal(evaluateProductAlerts({ ...product, stock: 20, expires_at: '2026-09-05' }, '2026-09-06')[0].type, ALERT_TYPES.EXPIRED)
})

test('no reenvía una alerta cuya condición ya fue entregada', async () => {
  let sendCount = 0
  const pool = {
    query: async (sql) => {
      if (sql.includes('INSERT INTO telegram_alerts')) return { rowCount: sendCount === 0 ? 1 : 0, rows: [{ id: 1 }] }
      return { rowCount: 1, rows: [] }
    },
  }
  const service = createStockAlertService({ pool, sendTelegramMessage: async () => { sendCount += 1 } })
  await service.notifyProductAlerts({ ...product, expires_at: null })
  await service.notifyProductAlerts({ ...product, expires_at: null })
  assert.equal(sendCount, 1)
})

test('un error de Telegram se registra y no interrumpe la operación llamadora', async () => {
  const queries = []
  const pool = {
    query: async (sql) => {
      queries.push(sql)
      if (sql.includes('INSERT INTO telegram_alerts')) return { rowCount: 1, rows: [{ id: 9 }] }
      return { rowCount: 1, rows: [] }
    },
  }
  const service = createStockAlertService({ pool, sendTelegramMessage: async () => { throw new Error('Telegram no responde') }, logger: { error: () => {} } })
  await assert.doesNotReject(() => service.notifyProductAlerts({ ...product, expires_at: null }))
  assert.equal(queries.some((sql) => sql.includes('last_error')), true)
})
