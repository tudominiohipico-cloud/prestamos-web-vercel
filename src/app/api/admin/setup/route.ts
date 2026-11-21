import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSuperAdmin } from "@/lib/admin-auth";

// GET /api/admin/setup — crea la tabla admin_users + el super-admin por defecto
export async function GET() {
  try {
    // 1. Crear tabla de admin_users si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'super_admin',
        is_super_admin BOOLEAN DEFAULT FALSE,
        house_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Crear tabla de houses (casas de empeño)
    await query(`
      CREATE TABLE IF NOT EXISTS houses (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        plan TEXT DEFAULT 'fixed',
        monthly_fee NUMERIC(14,2) DEFAULT 0,
        commission_pct NUMERIC(6,2) DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Si users ya existe, agregar house_id para multi-tenant
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS house_id INTEGER`);
    await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS house_id INTEGER`);

    // 4. Crear super-admin por defecto
    await ensureSuperAdmin();

    return NextResponse.json({
      ok: true,
      message: "Panel de administración inicializado. Login: bolivar / liam1414",
      url: "/admin/login",
    });
  } catch (e: any) {
    console.error("[admin setup] error:", e);
    return NextResponse.json(
      { ok: false, error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
