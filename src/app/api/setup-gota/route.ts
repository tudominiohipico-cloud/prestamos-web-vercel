import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/setup-gota — crea las tablas nuevas para el módulo gota a gota
// NO toca las tablas existentes (users, clients, loans, payments, etc.)
export async function GET() {
  try {
    // 1. Tabla de motorizados (cobradores en moto)
    await query(`
      CREATE TABLE IF NOT EXISTS motorizados (
        id SERIAL PRIMARY KEY,
        house_id INTEGER,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        nombre TEXT NOT NULL,
        telefono TEXT,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Tabla de productos de préstamo (tipos: gota a gota, mensual, etc.)
    await query(`
      CREATE TABLE IF NOT EXISTS loan_products (
        id SERIAL PRIMARY KEY,
        house_id INTEGER,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'gota',
        interes_pct NUMERIC(6,2) DEFAULT 0,
        cuota_diaria NUMERIC(14,2) DEFAULT 0,
        dias_plazo INTEGER DEFAULT 24,
        cobrar_domingo BOOLEAN DEFAULT FALSE,
        mora_visita_fallida NUMERIC(14,2) DEFAULT 0,
        seguro_pct NUMERIC(6,2) DEFAULT 0,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Tabla de cobros diarios (lo que el motorizado cobra cada día)
    await query(`
      CREATE TABLE IF NOT EXISTS daily_collections (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        motorizado_id INTEGER REFERENCES motorizados(id) ON DELETE SET NULL,
        house_id INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        monto_cobrado NUMERIC(14,2) DEFAULT 0,
        tipo_cobro TEXT DEFAULT 'efectivo',
        estado TEXT DEFAULT 'pendiente',
        -- 'pendiente' = motorizado tiene el dinero
        -- 'entregado' = motorizado le entregó al dueño
        -- 'no_pago' = el cliente no pagó ese día
        -- 'aviso_no_pago' = cliente avisó que no iba a pagar
        foto_comprobante TEXT,
        observaciones TEXT,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Tabla de transacciones de capital (caja)
    await query(`
      CREATE TABLE IF NOT EXISTS capital_transactions (
        id SERIAL PRIMARY KEY,
        house_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        -- 'inyeccion' = dueño mete dinero
        -- 'retiro' = dueño saca dinero
        -- 'prestamo' = dinero sale a la calle
        -- 'cobro' = dinero vuelve a caja
        -- 'mora' = ingreso por mora
        -- 'seguro' = ingreso por seguro
        monto NUMERIC(14,2) NOT NULL,
        descripcion TEXT,
        loan_id INTEGER REFERENCES loans(id) ON DELETE SET NULL,
        motorizado_id INTEGER REFERENCES motorizados(id) ON DELETE SET NULL,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Configuración de cada casa (control de capital, país, moneda)
    await query(`
      CREATE TABLE IF NOT EXISTS house_config (
        id SERIAL PRIMARY KEY,
        house_id INTEGER UNIQUE NOT NULL,
        controlar_capital BOOLEAN DEFAULT FALSE,
        capital_inicial NUMERIC(14,2) DEFAULT 0,
        pais TEXT DEFAULT 'VE',
        moneda TEXT DEFAULT 'VES',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. Agregar campos nuevos a la tabla loans (sin tocar lo existente)
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'normal'`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS dias_plazo INTEGER DEFAULT 0`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS cuota_diaria NUMERIC(14,2) DEFAULT 0`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS total_a_cobrar NUMERIC(14,2) DEFAULT 0`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS seguro_monto NUMERIC(14,2) DEFAULT 0`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS mora_por_visita NUMERIC(14,2) DEFAULT 0`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS motorizado_id INTEGER`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS fecha_inicio TEXT`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS fecha_fin TEXT`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS creado_por INTEGER`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS cobrar_domingo BOOLEAN DEFAULT FALSE`);

    return NextResponse.json({
      ok: true,
      message: "Módulo gota a gota inicializado correctamente.",
      tablas_creadas: ["motorizados", "loan_products", "daily_collections", "capital_transactions", "house_config"],
      campos_agregados_a_loans: 11,
    });
  } catch (e: any) {
    console.error("[setup-gota] error:", e);
    return NextResponse.json(
      { ok: false, error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
