import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, sanitize } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// POST /api/reset-password  { token, password }
export async function POST(req: NextRequest) {
  let body: { token?: string; password?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const token = sanitize(body.token || "").trim();
  const password = body.password || "";
  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Token inválido" }, { status: 422 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Contraseña muy corta (mínimo 8)" }, { status: 422 });
  }

  try {
    const res = await query(
      `SELECT id, username FROM users
       WHERE reset_token = $1 AND reset_expires > NOW()`,
      [token]
    );
    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Token inválido o expirado. Solicita uno nuevo." },
        { status: 401 }
      );
    }
    const user = res.rows[0];
    const hash = await hashPassword(password);
    await query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2",
      [hash, user.id]
    );
    await logAudit({
      userId: user.id,
      action: "reset_password_success",
      entity: "user",
      entityId: user.id,
      ip: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim(),
    });
    return NextResponse.json({ ok: true, message: "Contraseña restablecida" });
  } catch (e: any) {
    console.error("[reset-password] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
