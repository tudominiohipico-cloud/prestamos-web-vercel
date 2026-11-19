// scripts/init-db.js
// Ejecutar con: node scripts/init-db.js
// Crea todas las tablas necesarias en PostgreSQL (Neon)
require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("ERROR: Define DATABASE_URL en .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'collector',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
  payment_date TEXT,
  amount NUMERIC(14,2),
  type TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collaterals (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
  type TEXT,
  description TEXT,
  estimated_value NUMERIC(14,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  description TEXT,
  amount NUMERIC(14,2),
  date TEXT,
  paid_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_payments (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
  amount NUMERIC(14,2),
  currency TEXT,
  wallet_address TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offline_payments (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
  amount NUMERIC(14,2),
  payment_date TEXT,
  collector_id INTEGER,
  synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_loans_client ON loans(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_loan ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_collaterals_loan ON collaterals(loan_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
`;

async function main() {
  console.log("[init-db] Conectando a PostgreSQL...");
  const client = await pool.connect();
  try {
    console.log("[init-db] Creando tablas...");
    await client.query(SCHEMA);
    console.log("[init-db] OK - todas las tablas creadas");

    // Verificar
    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log("[init-db] Tablas en la base de datos:");
    res.rows.forEach((r) => console.log("  - " + r.table_name));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[init-db] ERROR:", err.message);
  process.exit(1);
});
