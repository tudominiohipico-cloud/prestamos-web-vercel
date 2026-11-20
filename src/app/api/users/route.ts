import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, hashPassword, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/users - Listar usuarios (solo owner)
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner"]);
  if (user instanceof NextResponse) return user;
  try {
    const res = await query("SELECT id, username, role, created_at FROM users ORDER BY id");
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/users - Crear usuario (solo owner)
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner"]);
  if (user instanceof NextResponse) return user;
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const username = sanitize(body.username).slice(0, 50).toLowerCase();
  const password = body.password || "";
  const role = sanitize(body.role || "collector").slice(0, 20);
  if (!username || username.length < 3)
    return NextResponse.json({ error: "Usuario muy corto (mín 3)" }, { status: 422 });
  if (password.length < 8)
    return NextResponse.json({ error: "Contraseña muy corta (mín 8)" }, { status: 422 });
  if (!["owner", "admin", "collector"].includes(role))
    return NextResponse.json({ error: "Rol inválido" }, { status: 422 });
  try {
    const hash = await hashPassword(password);
    const res = await query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role",
      [username, hash, role]
    );
    await logAudit({
      userId: user.id, action: "create_user", entity: "user",
      entityId: res.rows[0].id, ip: getIp(req),
      details: { username, role },
    });
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    if (e.code === "23505")
      return NextResponse.json({ error: "Usuario ya existe" }, { status: 409 });
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
