import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/loans?status=active  →  lista todos los préstamos
// GET /api/loans?client_id=1   →  lista préstamos de un cliente
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const clientId = url.searchParams.get("client_id");
  try {
    if (clientId) {
      const res = await query("SELECT * FROM loans WHERE client_id = $1 ORDER BY id DESC", [clientId]);
      return NextResponse.json(res.rows);
    }
    if (status) {
      const res = await query("SELECT * FROM loans WHERE status = $1 ORDER BY id DESC", [status]);
      return NextResponse.json(res.rows);
    }
    const res = await query("SELECT * FROM loans ORDER BY id DESC");
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/loans - Crear préstamo
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const clientId = Number(body.client_id);
  const contractNumber = sanitize(body.contract_number).slice(0, 50);
  const amount = Number(body.amount);
  const interestRate = Number(body.interest_rate);
  const currency = sanitize(body.currency || "VES").slice(0, 10) || "VES";
  if (!Number.isFinite(clientId) || clientId < 1)
    return NextResponse.json({ error: "client_id inválido" }, { status: 422 });
  if (!contractNumber)
    return NextResponse.json({ error: "contract_number requerido" }, { status: 422 });
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "amount inválido" }, { status: 422 });
  if (!Number.isFinite(interestRate) || interestRate < 0)
    return NextResponse.json({ error: "interest_rate inválido" }, { status: 422 });
  try {
    const res = await query(
      `INSERT INTO loans (client_id, contract_number, amount, interest_rate, currency)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [clientId, contractNumber, amount, interestRate, currency]
    );
    await logAudit({
      userId: user.id, action: "create_loan", entity: "loan",
      entityId: res.rows[0].id, ip: getIp(req),
      details: { client_id: clientId, contract_number: contractNumber, amount, currency },
    });
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
