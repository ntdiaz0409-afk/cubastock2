/**
 * Propósito: cargar un pequeño catálogo de ejemplo para revisar Inventario sin
 * crear productos manualmente desde pgAdmin.
 * Responsabilidades: insertar sólo nombres que aún no existan; no modifica ni
 * elimina productos reales, ventas ni configuración de negocio.
 * Dependencias: PostgreSQL y DATABASE_URL definidos en backend/.env.
 */
const path = require('path')
const dotenv = require('dotenv')
const { Pool } = require('pg')

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const products = [
  { name: 'Aceite de girasol 1 L', price: 1450, cost: 1180, stock: 18, unit: 'unidad', reorder: 5, expiresAt: '2027-05-30' },
  { name: 'Arroz blanco 1 kg', price: 950, cost: 760, stock: 42, unit: 'kg', reorder: 10, expiresAt: '2027-03-15' },
  { name: 'Leche en polvo 1 kg', price: 3800, cost: 3200, stock: 7, unit: 'unidad', reorder: 5, expiresAt: '2026-12-20' },
  { name: 'Detergente en polvo 340 g', price: 650, cost: 500, stock: 3, unit: 'unidad', reorder: 4, expiresAt: '2028-01-10' },
  { name: 'Pasta de tomate concentrada 400 g', price: 720, cost: 560, stock: 12, unit: 'unidad', reorder: 5, expiresAt: '2027-09-01' },
]

/** Inserta los ejemplos idempotentemente para que ejecutar el script dos veces no duplique catálogo. */
async function seedSampleProducts() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está configurada en backend/.env')
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  let inserted = 0
  try {
    for (const product of products) {
      const result = await pool.query(
        `INSERT INTO products (name, price_cup, cost_cup, stock, unit, reorder_level, expires_at)
         SELECT $1::VARCHAR, $2, $3, $4, $5, $6, $7
         WHERE NOT EXISTS (
           -- El cast explícito evita ambigüedad de tipos cuando el nombre se
           -- usa tanto para insertar como para comparar sin distinción de caso.
           SELECT 1 FROM products WHERE LOWER(name) = LOWER($1::TEXT) AND archived = FALSE
         )`,
        [product.name, product.price, product.cost, product.stock, product.unit, product.reorder, product.expiresAt]
      )
      inserted += result.rowCount
    }
    console.log(`✅ Catálogo de muestra listo: ${inserted} creado(s), ${products.length - inserted} ya existente(s).`)
  } finally {
    await pool.end()
  }
}

seedSampleProducts().catch((error) => {
  console.error('❌ No se pudo cargar el catálogo de muestra:', error.message)
  process.exitCode = 1
})
