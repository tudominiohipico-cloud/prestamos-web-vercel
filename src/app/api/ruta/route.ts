import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/ruta?fecha=2026-11-21  →  lista la ruta del día para el motorizado
// (o para el dueño/admin ver todas las rutas)
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;

  const url = new URL(req.url);
  const fecha = url.searchParams.get("fecha") || new Date().toISOString().slice(0, 10);
  const motorizadoId = url.searchParams.get("motorizado_id");

  // Si es domingo y el préstamo no cobra domingo, no hay ruta
  const diaSemana = new Date(fecha + "T00:00:00").getDay(); // 0=domingo

  try {
    let q = `
      SELECT l.id as loan_id, l.client_id, l.amount, l.cuota_diaria, l.dias_plazo,
             l.fecha_inicio, l.fecha_fin, l.total_a_cobrar, l.mora_por_visita,
             l.cobrar_domingo,
             c.name as client_name, c.email as client_email, c.phone as client_phone,
             m.nombre as motorizado_nombre,
             (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.loan_id = l.id) as total_pagado,
             (SELECT COUNT(*) FROM daily_collections dc WHERE dc.loan_id = l.id AND dc.fecha = $1 AND dc.estado IN ('no_pago','aviso_no_pago')) as dias_mora
      FROM loans l
      LEFT JOIN clients c ON c.id = l.client_id
      LEFT JOIN motorizados m ON m.id = l.motorizado_id
      WHERE l.tipo = 'gota' AND l.status = 'active'
    `;
    const params: any[] = [fecha];
    if (motorizadoId) {
      q += " AND l.motorizado_id = $2";
      params.push(Number(motorizadoId));
    }
    q += " ORDER BY m.nombre, c.name";

    const res = await query(q, params);

    // Filtrar: si es domingo y el préstamo no cobra domingo, excluir
    const filtrados = res.rows.filter((l: any) => {
      if (diaSemana === 0 && !l.cobrar_domingo) return false;
      return true;
    });

    // Para cada préstamo, calcular estado del día
    const ruta = filtrados.map((l: any) => {
      const totalPagado = Number(l.total_pagado) || 0;
      const totalACobrar = Number(l.total_a_cobrar) || 0;
      const saldoPendiente = totalACobrar - totalPagado;
      const diasMora = Number(l.dias_mora) || 0;
      // Si tiene mora, hoy debe pagar cuota + mora acumulada
      const cuotaHoy = Number(l.cuota_diaria) + (diasMora * Number(l.mora_por_visita || 0));
      return {
        ...l,
        saldo_pendiente: saldoPendiente,
        dias_mora: diasMora,
        cuota_hoy: cuotaHoy,
      };
    });

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
