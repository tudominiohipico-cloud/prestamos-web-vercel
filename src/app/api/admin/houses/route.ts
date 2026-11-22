import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminFromRequest, sanitizeAdmin, getIpAdmin, hashPassword } from "@/lib/admin-auth";

// GET /api/admin/houses - listar todas las casas
export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!admin.is_super_admin) {
    return NextResponse.json({ error: "Solo el dueño del sistema puede hacer esto" }, { status: 403 });
  }
  try {
    const res = await query(`
      SELECT h.id, h.name, h.slug, h.plan, h.monthly_fee, h.commission_pct, h.status, h.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.house_id = h.id) as user_count,
        (SELECT COUNT(*) FROM clients c WHERE c.house_id = h.id) as client_count
      FROM houses h
      ORDER BY h.id DESC
    `);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    console.error("[admin houses GET] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/admin/houses - crear nueva casa
export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!admin.is_super_admin) {
    return NextResponse.json({ error: "Solo el dueño del sistema puede hacer esto" }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = sanitizeAdmin(body.name).trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Nombre muy corto" }, { status: 422 });
  }
  const slug = sanitizeAdmin(body.slug || name.toLowerCase().replace(/\s+/g, "_")).trim().slice(0, 50);
  const plan = ["fixed", "commission"].includes(body.plan) ? body.plan : "fixed";
  const monthlyFee = Number(body.monthly_fee) || 0;
  const commissionPct = Number(body.commission_pct) || 0;

  // Datos del dueño de la casa (usuario inicial)
  const ownerUsername = sanitizeAdmin(body.owner_username).trim().toLowerCase().slice(0, 50);
  const ownerPassword = body.owner_password || "";

  if (!ownerUsername || ownerUsername.length < 3) {
    return NextResponse.json({ error: "Usuario del dueño muy corto (mín 3)" }, { status: 422 });
  }
  if (ownerPassword.length < 6) {
    return NextResponse.json({ error: "Contraseña del dueño muy corta (mín 6)" }, { status: 422 });
  }

  try {
    // 1. Crear la casa
    const houseRes = await query(
      `INSERT INTO houses (name, slug, plan, monthly_fee, commission_pct, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, name, slug, plan, monthly_fee, commission_pct, status`,
      [name, slug, plan, monthlyFee, commissionPct]
    );
    const house = houseRes.rows[0];

    // 2. Crear el usuario dueño de esa casa en la tabla users
    const hash = await hashPassword(ownerPassword);
    await query(
      `INSERT INTO users (username, password_hash, role, house_id, email)
       VALUES ($1, $2, 'owner', $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      [ownerUsername, hash, house.id, body.owner_email ? sanitizeAdmin(body.owner_email).slice(0, 100) : null]
    );

    return NextResponse.json({
      ok: true,
      house: house,
      owner_username: ownerUsername,
      message: `Casa "${name}" creada. Dueño: ${ownerUsername}`,
    });
  } catch (e: any) {
    if (e.code === "23505") {
      return NextResponse.json({ error: "Ya existe una casa con ese slug o un usuario con ese nombre" }, { status: 409 });
    }
    console.error("[admin houses POST] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
