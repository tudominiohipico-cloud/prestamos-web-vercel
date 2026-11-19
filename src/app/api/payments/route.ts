import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/payments?loan_id=1
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  const url = new URL(req.url);
  const loanId = url.searchParams.get("loan_id");
  if (!loanId)
    return NextResponse.json({ error: "loan_id requerido" }, { status: 422 });
  try {
    const res = await query("SELECT * FROM payments WHERE loan_id = $1 ORDER BY id DESC", [loanId]);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/payments
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const loanId = Number(body.loan_id);
  const paymentDate = sanitize(body.payment_date).slice(0, 20);
  const amount = Number(body.amount);
  const type = sanitize(body.type || "cuota").slice(0, 30) || "cuota";
  if (!Number.isFinite(loanId) || loanId < 1)
    return NextResponse.json({ error: "loan_id inválido" }, { status: 422 });
  if (!paymentDate)
    return NextResponse.json({ error: "payment_date requerido" }, { status: 422 });
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "amount inválido" }, { status: 422 });
  try {
    const res = await query(
      `INSERT INTO payments (loan_id, payment_date, amount, type)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [loanId, paymentDate, amount, type]
    );
    await logAudit({
      userId: user.id, action: "create_payment", entity: "payment",
      entityId: res.rows[0].id, ip: getIp(req),
      details: { loan_id: loanId, amount, type, payment_date: paymentDate },
    });
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
