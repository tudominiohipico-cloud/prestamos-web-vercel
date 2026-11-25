import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

// POST /api/ruta/cobrar-sin-qr — el motorizado cobra en efectivo sin escanear QR
// Body: { loan_id, monto, fecha, metodo, observaciones }
// metodo: 'efectivo' | 'tercero' (tercero = alguien recibió el dinero: familiar, vecino)
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const loanId = Number(body.loan_id);
  const monto = Number(body.monto);
  const fecha = sanitize(body.fecha).slice(0, 20);
  const metodo = ["efectivo", "tercero"].includes(body.metodo) ? body.metodo : "efectivo";
  const observaciones = sanitize(body.observaciones || "").slice(0, 300);

  if (!Number.isFinite(loanId) || loanId < 1) {
    return NextResponse.json({ error: "loan_id inválido" }, { status: 422 });
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    return NextResponse.json({ error: "monto inválido" }, { status: 422 });
  }
  if (!fecha) {
    return NextResponse.json({ error: "fecha requerido" }, { status: 422 });
  }

  try {
    // Verificar el préstamo
    const loanRes = await query(`
      SELECT l.id, l.client_id, l.motorizado_id,
             c.name as client_name, c.id as client_id
      FROM loans l
      LEFT JOIN clients c ON c.id = l.client_id
      WHERE l.id = $1
    `, [loanId]);
    if (loanRes.rows.length === 0) {
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
    }
    const loan = loanRes.rows[0];

    // Registrar el pago
    const pagoRes = await query(
      `INSERT INTO payments (loan_id, payment_date, amount, type)
       VALUES ($1, $2, $3, 'cuota_diaria') RETURNING id`,
      [loanId, fecha, monto]
    );
    const pagoId = pagoRes.rows[0].id;

    await logAudit({
      userId: user.id, action: "cobrar_sin_qr", entity: "payment",
      entityId: pagoId, ip: getIp(req),
      details: {
        loan_id: loanId, client_name: loan.client_name,
        monto, fecha, metodo, observaciones,
        motorizado: user.username,
      },
    });

    // Crear notificación al dueño
    await createNotification({
      tipo: "pago_recibido",
      titulo: `Pago cobrado sin QR: ${loan.client_name}`,
      mensaje: `El motorizado ${user.username} cobró Bs. ${monto} a ${loan.client_name} el ${fecha}. Método: ${metodo === 'efectivo' ? 'Efectivo directo' : 'Tercero (familiar/vecino)'}. ${observaciones ? 'Obs: ' + observaciones : ''}. El dinero está en poder del motorizado.`,
      clientId: loan.client_id,
    });

    return NextResponse.json({
      ok: true,
      payment_id: pagoId,
      message: `Pago registrado. Bs. ${monto} cobrado a ${loan.client_name}.`,
      quien_cobra: user.username,
      quien_tiene_dinero: "motorizado",
    });
  } catch (e: any) {
    console.error("[cobrar-sin-qr POST] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
