import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, signAdminToken, checkRateLimit, getIpAdmin, ensureSuperAdmin, setAdminCookie } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const ip = getIpAdmin(req);

  if (!checkRateLimit(ip, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta en 15 min." },
      { status: 429 }
    );
  }

  await ensureSuperAdmin();

  let body: { username?: string; password?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const username = (body.username || "").trim().toLowerCase();
  const password = body.password || "";

  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 422 });
  }

  try {
    const res = await query(
      "SELECT id, username, password_hash, role, is_super_admin, house_id FROM admin_users WHERE LOWER(username) = $1",
      [username]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    const user = res.rows[0];
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    const token = signAdminToken({
      id: user.id,
      username: user.username,
      role: user.role,
      is_super_admin: user.is_super_admin,
      house_id: user.house_id,
    });
    const res2 = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        is_super_admin: user.is_super_admin,
        house_id: user.house_id,
      },
      token,
    });
    setAdminCookie(res2, token);
    return res2;
  } catch (e: any) {
    console.error("[admin login] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
