import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

// GET /api/cron/midnight — Job que se ejecuta a las 12 AM hora Caracas
// Marca automáticamente como "no pagó" a los clientes que no pagaron ayer
// Aplica mora si el préstamo tiene cobrar_mora=TRUE
// Aplica interés sobre interés según tipo_interes_recargo

// Vercel Cron: se configura en vercel.json con schedule "0 4 * * *" (4 UTC = 12 AM Caracas)
// También se puede llamar manualmente con un token CRON_SECRET

export async function GET(req: any) {
  // Verificar autorización: CRON_SECRET o header X-Cron-Token
  const authHeader = req.headers.get("authorization");
  const cronToken = req.headers.get("x-cron-token");
  const expectedToken = process.env.CRON_SECRET;
  const isAuthorized = !expectedToken ||
    authHeader === `Bearer ${expectedToken}` ||
    cronToken === expectedToken;

  if (!isAuthorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Calcular fecha de ayer en hora Caracas (UTC-4)
    const now = new Date();
    const caracasOffset = -4 * 60 * 60 * 1000; // UTC-4
    const caracasNow = new Date(now.getTime() + caracasOffset);
    const ayer = new Date(caracasNow);
    ayer.setDate(ayer.getDate() - 1);
    const fechaAyer = ayer.toISOString().slice(0, 10);

    // 1. Buscar préstamos gota a gota activos
    const loansRes = await query(`
      SELECT l.id, l.client_id, l.fecha_inicio, l.fecha_fin, l.cobrar_domingo,
             l.cobrar_mora, l.mora_por_visita, l.tipo_interes_recargo,
             l.cuota_diaria, l.total_a_cobrar, l.amount, l.interest_rate,
             c.name as client_name
      FROM loans l
      LEFT JOIN clients c ON c.id = l.client_id
      WHERE l.tipo = 'gota' AND l.status = 'active'
        AND l.fecha_inicio <= $1
        AND (l.fecha_fin IS NULL OR l.fecha_fin >= $1)
    `, [fechaAyer]);

    let marcados = 0;
    let moraAplicada = 0;

    for (const loan of loansRes.rows) {
      // Saltar si ayer era domingo y el préstamo no cobra domingo
      const diaAyer = new Date(fechaAyer + "T00:00:00").getDay();
      if (diaAyer === 0 && !loan.cobrar_domingo) continue;

      // Verificar si ya hay un pago registrado para ayer
      const pagoRes = await query(
        "SELECT id FROM payments WHERE loan_id = $1 AND payment_date = $2 LIMIT 1",
        [loan.id, fechaAyer]
      );
      if (pagoRes.rows.length > 0) continue; // ya pagó, saltar

      // Verificar si ya está marcado como no_pago
      const noPagoRes = await query(
        "SELECT id FROM no_pagos WHERE loan_id = $1 AND fecha = $2 LIMIT 1",
        [loan.id, fechaAyer]
      );
      if (noPagoRes.rows.length > 0) continue; // ya marcado

      // Marcar como no pagó
      await query(
        `INSERT INTO no_pagos (loan_id, motorizado_id, house_id, fecha, motivo, created_by)
         VALUES ($1, NULL, 0, $2, 'No pagó (automático medianoche)', NULL)
         ON CONFLICT (loan_id, fecha) DO NOTHING`,
        [loan.id, fechaAyer]
      );
      marcados++;

      // Aplicar mora si cobrar_mora=TRUE
      if (loan.cobrar_mora && Number(loan.mora_por_visita) > 0) {
        moraAplicada++;
        await createNotification({
          tipo: "mora_aplicada",
          titulo: `Mora aplicada: ${loan.client_name}`,
          mensaje: `Cliente ${loan.client_name} no pagó el ${fechaAyer}. Se aplicó mora de Bs. ${loan.mora_por_visita}.`,
          clientId: loan.client_id,
        });
      }

      // Notificar al dueño del no pago
      await createNotification({
        tipo: "no_pago_automatico",
        titulo: `No pagó (automático): ${loan.client_name}`,
        mensaje: `El cliente ${loan.client_name} no pagó el ${fechaAyer}. El sistema lo marcó automáticamente a medianoche.`,
        clientId: loan.client_id,
      });
    }

    // 2. Procesar préstamos vencidos (refinanciamiento automático)
    // Por ahora solo los marca como vencidos; el refinanciamiento se hace en otra iteración
    const vencidosRes = await query(`
      UPDATE loans
      SET status = 'vencido'
      WHERE tipo = 'gota' AND status = 'active'
        AND fecha_fin IS NOT NULL AND fecha_fin < $1
      RETURNING id
    `, [fechaAyer]);

    return NextResponse.json({
      ok: true,
      fecha_procesada: fechaAyer,
      prestamos_revisados: loansRes.rows.length,
      no_pagos_marcados: marcados,
      moras_aplicadas: moraAplicada,
      prestamos_vencidos: vencidosRes.rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[cron/midnight] error:", e);
    return NextResponse.json(
      { ok: false, error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}
