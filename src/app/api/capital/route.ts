import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/capital - resumen de capital de la casa
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin"]);
  if (user instanceof NextResponse) return user;
  try {
    // Capital en calle: suma de (total_a_cobrar - pagado) de préstamos activos
    const calleRes = await query(`
      SELECT COALESCE(SUM(l.total_a_cobrar - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.loan_id = l.id), 0)), 0)::float as capital_calle
      FROM loans l
      WHERE l.tipo = 'gota' AND l.status = 'active'
    `);
    const capitalCalle = calleRes.rows[0].capital_calle;

    // Cobrado hoy (por fecha de pago = hoy)
    const hoy = new Date().toISOString().slice(0, 10);
    const cobradoRes = await query(`
      SELECT COALESCE(SUM(amount), 0)::float as total
      FROM payments
      WHERE payment_date = $1
    `, [hoy]);
    const cobradoHoy = cobradoRes.rows[0].total;

    // Total prestado histórico
    const prestadoRes = await query(`
      SELECT COALESCE(SUM(amount), 0)::float as total
      FROM loans
      WHERE tipo = 'gota'
    `);
    const totalPrestado = prestadoRes.rows[0].total;

    // Total cobrado (acumulado)
    const cobradoTotalRes = await query(`
      SELECT COALESCE(SUM(amount), 0)::float as total
      FROM payments
      WHERE loan_id IN (SELECT id FROM loans WHERE tipo = 'gota')
    `);
    const cobradoTotal = cobradoTotalRes.rows[0].total;

    // Ganancia (intereses cobrados = total cobrado - capital recuperado)
    const gananciaRes = await query(`
      SELECT COALESCE(SUM(amount), 0)::float - COALESCE((SELECT SUM(amount) FROM loans WHERE tipo = 'gota'), 0) as ganancia
      FROM payments
      WHERE loan_id IN (SELECT id FROM loans WHERE tipo = 'gota')
    `);
    const ganancia = gananciaRes.rows[0].ganancia || 0;

    return NextResponse.json({
      capital_calle: capitalCalle,
      cobrado_hoy: cobradoHoy,
      total_prestado: totalPrestado,
      cobrado_total: cobradoTotal,
      ganancia: ganancia,
      fecha: hoy,
    });
  } catch (e: any) {
    console.error("[capital GET] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
