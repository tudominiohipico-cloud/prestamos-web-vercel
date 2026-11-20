import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/clients - Listar todos los clientes
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  try {
    const res = await query("SELECT id, name, created_at FROM clients ORDER BY id DESC");
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/clients - Crear cliente
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  let body: { name?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const name = sanitize(body.name).trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Nombre muy corto" }, { status: 422 });
  }
  try {
    const res = await query(
      "INSERT INTO clients (name) VALUES ($1) RETURNING id, name",
      [name]
    );
    await logAudit({
      userId: user.id,
      action: "create_client",
      entity: "client",
      entityId: res.rows[0].id,
      ip: getIp(req),
      details: { name },
    });
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
