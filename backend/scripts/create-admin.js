// backend/scripts/create-admin.js
// Crea el primer usuario ADMINISTRADOR. Funciona desde cualquier directorio de
// trabajo y asegura el esquema mínimo para no depender de que el servidor ya
// haya arrancado alguna vez.
const path = require('path')
const readline = require('readline')
const bcrypt = require('bcryptjs')
const { Pool } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function createAdmin() {
  try {
    console.log('\n🔐 Crear usuario ADMINISTRADOR\n')

    const username = (await ask('Usuario ADMIN: ')).trim()
    const password = await ask('Contraseña ADMIN: ')

    if (!username || !password) {
      throw new Error('Usuario y contraseña son obligatorios.')
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.')
    }

    // Esquema mínimo idempotente: igual que ensureBusinessFields del servidor.
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
    `)

    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    )

    if (existing.rowCount > 0) {
      throw new Error(`El usuario "${username}" ya existe.`)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `
      INSERT INTO users (
        username,
        password_hash,
        role,
        active
      )
      VALUES ($1, $2, 'ADMIN', true)
      RETURNING id, username, role
      `,
      [username, passwordHash]
    )

    console.log('\n✅ ADMINISTRADOR creado correctamente:')
    console.log(`   Usuario: ${result.rows[0].username}`)
    console.log(`   Rol: ${result.rows[0].role}`)
    console.log(`   ID: ${result.rows[0].id}`)
    console.log('\n🔑 Credenciales:')
    console.log(`   Usuario: ${username}`)
    console.log(`   Contraseña: ${password}`)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
    rl.close()
  }
}

createAdmin()
