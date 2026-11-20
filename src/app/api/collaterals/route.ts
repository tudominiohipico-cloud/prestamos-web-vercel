import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/collaterals?loan_id=1
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  const url = new URL(req.url);
  const loanId = url.searchParams.get("loan_id");
  if (!loanId)
    return NextResponse.json({ error: "loan_id requerido" }, { status: 422 });
  try {
    const res = await query("SELECT * FROM collaterals WHERE loan_id = $1 ORDER BY id DESC", [loanId]);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/collaterals
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin", "collector"]);
  if (user instanceof NextResponse) return user;
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const loanId = Number(body.loan_id);
  const type = sanitize(body.type || "otro").slice(0, 30) || "otro";
  const description = sanitize(body.description).slice(0, 500);
  const estimatedValue = Number(body.estimated_value);
  if (!Number.isFinite(loanId) || loanId < 1)
    return NextResponse.json({ error: "loan_id inválido" }, { status: 422 });
  if (!description)
    return NextResponse.json({ error: "description requerido" }, { status: 422 });
  if (!Number.isFinite(estimatedValue) || estimatedValue < 0)
    return NextResponse.json({ error: "estimated_value inválido" }, { status: 422 });
  try {
    const res = await query(
      `INSERT INTO collaterals (loan_id, type, description, estimated_value)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [loanId, type, description, estimatedValue]
    );
    await logAudit({
      userId: user.id, action: "create_collateral", entity: "collateral",
      entityId: res.rows[0].id, ip: getIp(req),
      details: { loan_id: loanId, type, estimated_value: estimatedValue },
    });
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
