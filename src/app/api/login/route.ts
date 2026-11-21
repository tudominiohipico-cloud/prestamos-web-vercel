import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  verifyPassword, signToken, checkRateLimit, getIp, ensureDefaultUsers,
  setAuthCookie, sanitize,
} from "@/lib/auth";
import {
  signAdminToken, setAdminCookie, ensureSuperAdmin,
} from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

// POST /api/login — UN solo login para TODOS (clientes, dueños de casa, super admin)
// El sistema decide a qué panel mandar al usuario según la tabla donde esté.
export async function POST(req: NextRequest) {
  const ip = getIp(req);

  if (!checkRateLimit(ip, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta en 15 minutos." },
      { status: 429 }
    );
  }

  // Asegurar usuarios por defecto en ambas tablas
  await ensureSuperAdmin();
  await ensureDefaultUsers();

  let body: { username?: string; password?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const username = (body.username || "").trim().toLowerCase();
  const password = body.password || "";

  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 422 });
  }

  // 1. PRIMERO buscar en admin_users (super admin / dueño del sistema)
  try {
    const adminRes = await query(
      "SELECT id, username, password_hash, role, is_super_admin, house_id FROM admin_users WHERE LOWER(username) = $1",
      [username]
    );
    if (adminRes.rows.length > 0) {
      const admin = adminRes.rows[0];
      const ok = await verifyPassword(password, admin.password_hash);
      if (ok) {
        const token = signAdminToken({
          id: admin.id,
          username: admin.username,
          role: admin.role,
          is_super_admin: admin.is_super_admin,
          house_id: admin.house_id,
        });
        await logAudit({ userId: admin.id, action: "login_success", entity: "admin_user", ip });
        const res2 = NextResponse.json({
          user: {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            is_super_admin: admin.is_super_admin,
            house_id: admin.house_id,
          },
          token,
          user_type: "admin",
          redirect: "/admin/dashboard",
        });
        setAdminCookie(res2, token);
        return res2;
      }
      // Si la contraseña no coincide, seguimos buscando en users (no revelamos cuál tabla)
    }
  } catch (e) {
    // Si la tabla admin_users no existe todavía, ignoramos y seguimos
    console.error("[login] admin check error (continuando):", e);
  }

  // 2. DESPUÉS buscar en users (dueños de casa, cobradores, clientes)
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
      user_type: "user",
      redirect: "/dashboard",
    });
    setAuthCookie(res2, token);
    return res2;
  } catch (e: any) {
    console.error("[login] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
