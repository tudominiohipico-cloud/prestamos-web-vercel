import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";

// GET /api/ruta?fecha=2026-11-21  →  lista la ruta del día para el motorizado
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const fecha = url.searchParams.get("fecha") || new Date().toISOString().slice(0, 10);
  const motorizadoId = url.searchParams.get("motorizado_id");

  const diaSemana = new Date(fecha + "T00:00:00").getDay(); // 0=domingo

  try {
    // 1. Obtener préstamos activos gota a gota
    let q = `
      SELECT l.id as loan_id, l.client_id, l.amount, l.cuota_diaria, l.dias_plazo,
             l.fecha_inicio, l.fecha_fin, l.total_a_cobrar, l.mora_por_visita,
             l.cobrar_domingo,
             c.name as client_name, c.email as client_email, c.phone as client_phone,
             m.nombre as motorizado_nombre
      FROM loans l
      LEFT JOIN clients c ON c.id = l.client_id
      LEFT JOIN motorizados m ON m.id = l.motorizado_id
      WHERE l.tipo = 'gota' AND l.status = 'active'
    `;
    const params: any[] = [];
    if (motorizadoId) {
      q += " AND l.motorizado_id = $1";
      params.push(Number(motorizadoId));
    }
    q += " ORDER BY m.nombre, c.name";
    const res = await query(q, params);

    // 2. Para cada préstamo, calcular el estado del día
    const ruta = [];
    for (const l of res.rows) {
      const loan = l as any;
      // Saltar si el préstamo ya terminó (fechaFin < fecha)
      if (loan.fecha_fin && loan.fecha_fin < fecha) continue;
      // Saltar si el préstamo aún no empieza (fechaInicio > fecha)
      if (loan.fecha_inicio && loan.fecha_inicio > fecha) continue;

      // Filtrar domingo si no se cobra
      if (diaSemana === 0 && !loan.cobrar_domingo) continue;

      // Calcular total pagado
      const pagoRes = await query(
        "SELECT COALESCE(SUM(amount), 0)::float as total FROM payments WHERE loan_id = $1",
        [loan.loan_id]
      );
      const totalPagado = pagoRes.rows[0].total;
      const totalACobrar = Number(loan.total_a_cobrar) || 0;
      const saldoPendiente = totalACobrar - totalPagado;

      // Si ya pagó todo, saltar
      if (saldoPendiente <= 0) continue;

      // Calcular días de mora: contar días hábiles (sin domingo) entre fechaInicio y fecha
      // en los que NO se registró pago
      const diasMora = await calcularDiasMora(loan.loan_id, loan.fecha_inicio, fecha, loan.cobrar_domingo);

      // Cuota hoy = cuota diaria + (días_mora * mora_por_visita)
      const cuotaHoy = Number(loan.cuota_diaria) + (diasMora * Number(loan.mora_por_visita || 0));

      ruta.push({
        ...loan,
        saldo_pendiente: saldoPendiente,
        dias_mora: diasMora,
        cuota_hoy: cuotaHoy,
        total_pagado: totalPagado,
      });
    }

    return NextResponse.json({
      fecha,
      dia_semana: ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"][diaSemana],
      total_clientes: ruta.length,
      ruta,
    });
  } catch (e: any) {
    console.error("[ruta GET] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// Calcular días de mora: días hábiles sin pago desde la fecha de inicio
async function calcularDiasMora(loanId: number, fechaInicio: string, fechaHoy: string, cobrarDomingo: boolean): Promise<number> {
  // Obtener todas las fechas en las que se registró pago para este préstamo
  const pagosRes = await query(
    "SELECT DISTINCT payment_date FROM payments WHERE loan_id = $1 ORDER BY payment_date",
    [loanId]
  );
  const fechasPagadas = new Set(pagosRes.rows.map((r: any) => r.payment_date));

  // Contar días hábiles (lun-sáb, o todos si cobrarDomingo) entre inicio y hoy sin pago
  let diasMora = 0;
  const inicio = new Date(fechaInicio + "T00:00:00");
  const hoy = new Date(fechaHoy + "T00:00:00");
  const actual = new Date(inicio);
  while (actual <= hoy) {
    const dia = actual.getDay();
    const fechaStr = actual.toISOString().slice(0, 10);
    // ¿Es día de cobro?
    const esDiaCobro = cobrarDomingo || dia !== 0;
    if (esDiaCobro && !fechasPagadas.has(fechaStr)) {
      diasMora++;
    }
    actual.setDate(actual.getDate() + 1);
  }
  return diasMora;
}
