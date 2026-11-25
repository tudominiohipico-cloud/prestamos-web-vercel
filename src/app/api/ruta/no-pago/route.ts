import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

// POST /api/ruta/no-pago — el motorizado marca que el cliente no pagó
// Body: { loan_id, fecha, motivo }
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const loanId = Number(body.loan_id);
  const fecha = sanitize(body.fecha).slice(0, 20);
  const motivo = sanitize(body.motivo || "").slice(0, 300);

  if (!Number.isFinite(loanId) || loanId < 1) {
    return NextResponse.json({ error: "loan_id inválido" }, { status: 422 });
  }
  if (!fecha) {
    return NextResponse.json({ error: "fecha requerido" }, { status: 422 });
  }

  try {
    // Verificar que el préstamo exista y obtener info
    const loanRes = await query(`
      SELECT l.id, l.client_id, l.motorizado_id, l.cobrar_mora, l.mora_por_visita,
             c.name as client_name, c.id as client_id
      FROM loans l
      LEFT JOIN clients c ON c.id = l.client_id
      WHERE l.id = $1
    `, [loanId]);
    if (loanRes.rows.length === 0) {
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
    }
    const loan = loanRes.rows[0];

    // Insertar registro de no pago (usar ON CONFLICT para evitar duplicados)
    // house_id puede ser NULL por ahora (no lo trackeamos en esta versión)
    await query(
      `INSERT INTO no_pagos (loan_id, motorizado_id, house_id, fecha, motivo, created_by)
       VALUES ($1, $2, 0, $3, $4, $5)
       ON CONFLICT (loan_id, fecha) DO UPDATE SET motivo = $4, created_by = $5`,
      [loanId, loan.motorizado_id, fecha, motivo || null, user.id]
    );

    await logAudit({
      userId: user.id, action: "mark_no_pago", entity: "loan",
      entityId: loanId, ip: getIp(req),
      details: { fecha, motivo, client_name: loan.client_name },
    });

    // Crear notificación al dueño/admin de la casa
    await createNotification({
      tipo: "no_pago",
      titulo: `Cliente no pagó: ${loan.client_name}`,
      mensaje: `El cliente ${loan.client_name} no pagó el ${fecha}. Motivo: ${motivo || "No especificado"}. ${loan.cobrar_mora ? "Se aplicará mora de Bs. " + loan.mora_por_visita : "Sin mora"}.`,
      clientId: loan.client_id,
    });

    return NextResponse.json({
      ok: true,
      message: `Marcado como no pagó. ${loan.cobrar_mora ? "Se aplicará mora de Bs. " + loan.mora_por_visita : "Sin mora (préstamo sin cobro de mora)"}.`,
      client_name: loan.client_name,
      mora_aplicada: loan.cobrar_mora,
      monto_mora: loan.cobrar_mora ? Number(loan.mora_por_visita) : 0,
    });
  } catch (e: any) {
    console.error("[no-pago POST] error:", e);
    return NextResponse.json({ error: "Error del servidor: " + e.message }, { status: 500 });
  }
}
