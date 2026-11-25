import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";

// GET /api/notifications — lista las últimas 50 notificaciones
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  try {
    const res = await query(`
      SELECT n.*, c.name as client_name
      FROM notifications n
      LEFT JOIN clients c ON c.id = n.client_id
      ORDER BY n.created_at DESC
      LIMIT 50
    `);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/notifications/read — marcar como leída
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "id inválido" }, { status: 422 });
  }
  try {
    await query("UPDATE notifications SET leida = TRUE WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
