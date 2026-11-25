import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

// GET /api/clients - Listar todos los clientes
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  try {
    const res = await query(`
      SELECT id, name, email, phone, cedula, direccion,
             ref_personal_nombre, ref_personal_tel,
             ref_familiar_nombre, ref_familiar_tel,
             lugar_trabajo, ingreso_mensual, qr_token,
             created_at
      FROM clients ORDER BY id DESC
    `);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/clients - Crear cliente (con ficha completa)
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const name = sanitize(body.name).trim();
  const email = sanitize(body.email || "").trim().slice(0, 100);
  const phone = sanitize(body.phone || "").trim().slice(0, 30);
  const cedula = sanitize(body.cedula || "").trim().slice(0, 20);
  const direccion = sanitize(body.direccion || "").trim().slice(0, 300);
  const refPersonalNombre = sanitize(body.ref_personal_nombre || "").trim().slice(0, 100);
  const refPersonalTel = sanitize(body.ref_personal_tel || "").trim().slice(0, 30);
  const refFamiliarNombre = sanitize(body.ref_familiar_nombre || "").trim().slice(0, 100);
  const refFamiliarTel = sanitize(body.ref_familiar_tel || "").trim().slice(0, 30);
  const lugarTrabajo = sanitize(body.lugar_trabajo || "").trim().slice(0, 150);
  const ingresoMensual = Number(body.ingreso_mensual) || 0;

  if (name.length < 2) {
    return NextResponse.json({ error: "Nombre muy corto" }, { status: 422 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 422 });
  }

  // Generar QR token único
  const qrToken = crypto.randomBytes(16).toString("hex");

  try {
    const res = await query(
      `INSERT INTO clients (
        name, email, phone, cedula, direccion,
        ref_personal_nombre, ref_personal_tel,
        ref_familiar_nombre, ref_familiar_tel,
        lugar_trabajo, ingreso_mensual, qr_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, name, email, phone, qr_token`,
      [name, email || null, phone || null, cedula || null, direccion || null,
       refPersonalNombre || null, refPersonalTel || null,
       refFamiliarNombre || null, refFamiliarTel || null,
       lugarTrabajo || null, ingresoMensual, qrToken]
    );
    await logAudit({
      userId: user.id, action: "create_client", entity: "client",
      entityId: res.rows[0].id, ip: getIp(req),
      details: { name, cedula, phone },
    });
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
