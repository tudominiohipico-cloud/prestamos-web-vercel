import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, ensureDefaultUsers } from "@/lib/auth";

// GET /api/setup — crea todas las tablas y usuarios por defecto
// Solo puede llamarse una vez (o las veces que quieras, es idempotente)
export async function GET() {
  try {
    // 1. Crear todas las tablas si no existen
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'collector',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        contract_number TEXT,
        amount NUMERIC(14,2),
        interest_rate NUMERIC(6,2),
        currency TEXT DEFAULT 'VES',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
        payment_date TEXT,
        amount NUMERIC(14,2),
        type TEXT,
        photo_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS collaterals (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
        type TEXT,
        description TEXT,
        estimated_value NUMERIC(14,2),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        description TEXT,
        amount NUMERIC(14,2),
        date TEXT,
        paid_to TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS digital_payments (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
        amount NUMERIC(14,2),
        currency TEXT,
        wallet_address TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS offline_payments (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
        amount NUMERIC(14,2),
        payment_date TEXT,
        collector_id INTEGER,
        synced INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity TEXT,
        entity_id TEXT,
        ip TEXT,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 1b. Agregar columnas nuevas a tablas existentes (si no existen)
    // Esto es para los que ya crearon la BD con la versión vieja del código
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT`);

    // 2. Crear índices
    await query("CREATE INDEX IF NOT EXISTS idx_loans_client ON loans(client_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_payments_loan ON payments(loan_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_collaterals_loan ON collaterals(loan_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)");

    // 3. Crear el usuario bolivar (siempre, sin importar si hay otros)
    const checkBolivar = await query("SELECT id FROM users WHERE LOWER(username) = 'bolivar'");
    if (checkBolivar.rows.length === 0) {
      const hash = await hashPassword("liam1414");
      await query(
        "INSERT INTO users (username, password_hash, role, email) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING",
        ["bolivar", hash, "owner", "tudominio.hipico@gmail.com"]
      );
    } else {
      // Si ya existe pero sin email, lo actualizamos
      await query(
        "UPDATE users SET email = $1 WHERE LOWER(username) = 'bolivar' AND (email IS NULL OR email = '')",
        ["tudominio.hipico@gmail.com"]
      );
    }

    // 4. Crear también los usuarios por defecto si la tabla está vacía
    await ensureDefaultUsers();

    return NextResponse.json({
      ok: true,
      message: "Base de datos inicializada correctamente. Ya puedes iniciar sesión con bolivar / liam1414",
      user: "bolivar",
      password: "liam1414",
    });
  } catch (e: any) {
    console.error("[setup] error:", e);
    return NextResponse.json(
      { ok: false, error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
