import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, signToken, checkRateLimit, getIp, ensureDefaultUsers } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // Rate limit: 5 intentos por IP cada 15 min
  if (!checkRateLimit(ip, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
      { status: 429 }
    );
  }

  // Asegurar usuarios por defecto (solo si la BD está vacía)
  await ensureDefaultUsers();

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const username = (body.username || "").trim().toLowerCase();
  const password = body.password || "";

  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 422 });
  }

  try {
    const res = await query(
      "SELECT id, username, password_hash, role FROM users WHERE LOWER(username) = $1",
      [username]
    );
    if (res.rows.length === 0) {
      await logAudit({ userId: null, action: "login_failed", entity: "user", ip, details: { username } });
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    const user = res.rows[0];
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      await logAudit({ userId: user.id, action: "login_failed", entity: "user", ip, details: { username } });
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    const token = signToken({ id: user.id, username: user.username, role: user.role });
    await logAudit({ userId: user.id, action: "login_success", entity: "user", ip });
    const res2 = NextResponse.json({
      user: { id: user.id, username: user.username, role: user.role },
      token,
    });
    return res2;
  } catch (e: any) {
    console.error("[login] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
