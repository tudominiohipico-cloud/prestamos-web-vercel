import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/loans/gota?status=active  →  lista préstamos gota a gota
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  try {
    const res = await query(`
      SELECT l.*,
             c.name as client_name,
             c.email as client_email,
             m.nombre as motorizado_nombre
      FROM loans l
      LEFT JOIN clients c ON c.id = l.client_id
      LEFT JOIN motorizados m ON m.id = l.motorizado_id
      WHERE l.tipo = 'gota'
      ORDER BY l.id DESC
    `);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/loans/gota - crear préstamo gota a gota
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin"]);
  if (user instanceof NextResponse) return user;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const clientId = Number(body.client_id);
  const montoPrestado = Number(body.amount);
  const totalACobrar = Number(body.total_a_cobrar);
  const diasPlazo = Number(body.dias_plazo);
  const cuotaDiaria = Number(body.cuota_diaria);
  const seguroMonto = Number(body.seguro_monto || 0);
  const moraPorVisita = Number(body.mora_por_visita || 0);
  const motorizadoId = body.motorizado_id ? Number(body.motorizado_id) : null;
  const cobrarDomingo = !!body.cobrar_domingo;
  const cobrarMora = body.cobrar_mora !== undefined ? !!body.cobrar_mora : true;
  const tipoInteresRecargo = ["ninguno","solo_mora","toda_deuda","recalcular_cuota"].includes(body.tipo_interes_recargo)
    ? body.tipo_interes_recargo : "ninguno";
  const fechaInicio = sanitize(body.fecha_inicio).slice(0, 20);
  const moneda = sanitize(body.currency || "VES").slice(0, 10) || "VES";

  // Validaciones
  if (!Number.isFinite(clientId) || clientId < 1)
    return NextResponse.json({ error: "client_id inválido" }, { status: 422 });
  if (!Number.isFinite(montoPrestado) || montoPrestado <= 0)
    return NextResponse.json({ error: "Monto inválido" }, { status: 422 });
  if (!Number.isFinite(totalACobrar) || totalACobrar < montoPrestado)
    return NextResponse.json({ error: "Total a cobrar debe ser >= monto" }, { status: 422 });
  if (!Number.isFinite(diasPlazo) || diasPlazo < 1 || diasPlazo > 60)
    return NextResponse.json({ error: "Días de plazo inválido (1-60)" }, { status: 422 });
  if (!Number.isFinite(cuotaDiaria) || cuotaDiaria <= 0)
    return NextResponse.json({ error: "Cuota diaria inválida" }, { status: 422 });
  if (!fechaInicio)
    return NextResponse.json({ error: "fecha_inicio requerido" }, { status: 422 });

  // Calcular fecha de fin (sumando días hábiles: lun-sáb, o todos si cobrar_domingo=true)
  // Si último día cae domingo y no se cobra domingo, se pasa al lunes
  const fechaFin = calcularFechaFin(fechaInicio, diasPlazo, cobrarDomingo);

  try {
    // Verificar que el cliente exista
    const cliRes = await query("SELECT id, name FROM clients WHERE id = $1", [clientId]);
    if (cliRes.rows.length === 0) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Crear el préstamo gota a gota
    const res = await query(
      `INSERT INTO loans (
        client_id, contract_number, amount, interest_rate, currency, status,
        tipo, dias_plazo, cuota_diaria, total_a_cobrar, seguro_monto,
        mora_por_visita, motorizado_id, fecha_inicio, fecha_fin,
        creado_por, cobrar_domingo, cobrar_mora, tipo_interes_recargo
      ) VALUES ($1, $2, $3, $4, $5, 'active', 'gota', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id`,
      [
        clientId,
        sanitize(body.contract_number || `GOTA-${Date.now()}`).slice(0, 50),
        montoPrestado,
        Number(body.interest_rate || 0),
        moneda,
        diasPlazo,
        cuotaDiaria,
        totalACobrar,
        seguroMonto,
        moraPorVisita,
        motorizadoId,
        fechaInicio,
        fechaFin,
        user.id,
        cobrarDomingo,
        cobrarMora,
        tipoInteresRecargo,
      ]
    );
    const loanId = res.rows[0].id;

    await logAudit({
      userId: user.id, action: "create_loan_gota", entity: "loan",
      entityId: loanId, ip: getIp(req),
      details: {
        client_id: clientId, client_name: cliRes.rows[0].name,
        amount: montoPrestado, total_a_cobrar: totalACobrar,
        dias: diasPlazo, cuota_diaria: cuotaDiaria,
        seguro: seguroMonto, mora: moraPorVisita,
        motorizado_id: motorizadoId,
        fecha_inicio: fechaInicio, fecha_fin: fechaFin,
      },
    });

    return NextResponse.json({
      ok: true,
      loan_id: loanId,
      fecha_fin: fechaFin,
      message: `Préstamo gota a gota creado. Cuota diaria: ${cuotaDiaria}. Termina: ${fechaFin}`,
    });
  } catch (e: any) {
    console.error("[gota POST] error:", e);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// Función helper: calcular fecha fin (sumando días hábiles)
function calcularFechaFin(fechaInicioStr: string, diasPlazo: number, cobrarDomingo: boolean): string {
  const inicio = new Date(fechaInicioStr + "T00:00:00");
  let diasHabiles = 0;
  let actual = new Date(inicio);
  while (diasHabiles < diasPlazo) {
    actual.setDate(actual.getDate() + 1);
    const dia = actual.getDay(); // 0=domingo, 6=sábado
    if (cobrarDomingo || dia !== 0) {
      diasHabiles++;
    }
  }
  // Si el último día cae domingo y no se cobra domingo, pasar al lunes
  if (!cobrarDomingo && actual.getDay() === 0) {
    actual.setDate(actual.getDate() + 1);
  }
  return actual.toISOString().slice(0, 10);
}
