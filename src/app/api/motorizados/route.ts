import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/motorizados - listar motorizados de la casa
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin"]);
  if (user instanceof NextResponse) return user;
  try {
    const res = await query(`
      SELECT m.*,
        (SELECT COUNT(*) FROM loans l WHERE l.motorizado_id = m.id AND l.status = 'active') as prestamos_activos
      FROM motorizados m
      WHERE m.activo = TRUE
      ORDER BY m.id DESC
    `);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/motorizados - crear motorizado
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin"]);
  if (user instanceof NextResponse) return user;
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const nombre = sanitize(body.nombre).trim().slice(0, 100);
  const telefono = sanitize(body.telefono || "").slice(0, 30);
  if (nombre.length < 3) {
    return NextResponse.json({ error: "Nombre muy corto (mín 3)" }, { status: 422 });
  }
  try {
    const res = await query(
      "INSERT INTO motorizados (nombre, telefono, activo) VALUES ($1, $2, TRUE) RETURNING id, nombre, telefono",
      [nombre, telefono || null]
    );
    await logAudit({
      userId: user.id, action: "create_motorizado", entity: "motorizado",
      entityId: res.rows[0].id, ip: getIp(req),
      details: { nombre, telefono },
    });
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
