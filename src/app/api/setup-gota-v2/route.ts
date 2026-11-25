import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";

// GET /api/setup-gota-v2 — agrega campos nuevos (ficha cliente + condiciones + notifications)
// NO toca nada de lo que ya existe
export async function GET() {
  try {
    // 1. Campos nuevos en clients (ficha del cliente)
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS cedula TEXT`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS direccion TEXT`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ref_personal_nombre TEXT`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ref_personal_tel TEXT`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ref_familiar_nombre TEXT`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ref_familiar_tel TEXT`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS lugar_trabajo TEXT`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ingreso_mensual NUMERIC(14,2) DEFAULT 0`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id INTEGER`);

    // 2. Campos nuevos en loans (condiciones del préstamo)
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS cobrar_mora BOOLEAN DEFAULT TRUE`);
    await query(`ALTER TABLE loans ADD COLUMN IF NOT EXISTS tipo_interes_recargo TEXT DEFAULT 'ninguno'`);
    // Valores posibles: 'ninguno', 'solo_mora', 'toda_deuda', 'recalcular_cuota'

    // 3. Tabla de notificaciones
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        house_id INTEGER,
        user_id INTEGER,
        client_id INTEGER,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        mensaje TEXT,
        leida BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Tabla de "no pagos" registrados (para auditoría del motorizado)
    await query(`
      CREATE TABLE IF NOT EXISTS no_pagos (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        motorizado_id INTEGER REFERENCES motorizados(id) ON DELETE SET NULL,
        house_id INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        motivo TEXT,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(loan_id, fecha)
      );
    `);

    // 5. Generar QR tokens para clientes que no tengan
    const clientsRes = await query("SELECT id FROM clients WHERE qr_token IS NULL OR qr_token = ''");
    for (const c of clientsRes.rows) {
      const token = crypto.randomBytes(16).toString("hex");
      await query("UPDATE clients SET qr_token = $1 WHERE id = $2", [token, c.id]);
    }

    return NextResponse.json({
      ok: true,
      message: "Setup v2 completado: ficha cliente + condiciones + notifications + no_pagos",
      campos_clients_agregados: 10,
      campos_loans_agregados: 2,
      tablas_creadas: ["notifications", "no_pagos"],
      qr_tokens_generados: clientsRes.rows.length,
    });
  } catch (e: any) {
    console.error("[setup-gota-v2] error:", e);
    return NextResponse.json(
      { ok: false, error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
