import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

// POST /api/recover-password  { email }
// Genera un token de reseteo y lo guarda en la BD.
// Por ahora imprimimos el link en la consola del servidor (Vercel logs).
// En el futuro, integrar Resend / SendGrid para enviar por correo real.
export async function POST(req: NextRequest) {
  let body: { email?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const email = sanitize(body.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 422 });
  }

  try {
    const res = await query(
      "SELECT id, username, email FROM users WHERE LOWER(COALESCE(email,'')) = $1",
      [email]
    );
    if (res.rows.length === 0) {
      // No revelamos si el email existe o no (anti-enumeración)
      await logAudit({
        userId: null, action: "recover_password_unknown_email",
        entity: "user", ip: getIp(req), details: { email },
      });
      // Respondemos OK igualmente para no filtrar
      return NextResponse.json({
        ok: true,
        preview_note: "(no se encontró ese correo registrado)",
      });
    }
    const user = res.rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await query(
      "UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3",
      [token, expires, user.id]
    );
    await logAudit({
      userId: user.id, action: "recover_password_request",
      entity: "user", entityId: user.id, ip: getIp(req),
    });

    // Construir el link de reseteo
    const host = req.headers.get("host") || "prestamos-web-eight.vercel.app";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const resetLink = `${protocol}://${host}/reset-password?token=${token}`;

    // Por ahora logueamos el link (visible en Vercel > Functions > Logs)
    console.log("[recover-password] Link de reseteo para " + user.username + ": " + resetLink);

    return NextResponse.json({
      ok: true,
      preview_note: "(en modo demo, el link se imprime en los logs del servidor. Pronto: envío por email real)",
    });
  } catch (e: any) {
    console.error("[recover-password] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
