import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { sanitize, getIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// GET /api/expenses
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin"]);
  if (user instanceof NextResponse) return user;
  try {
    const res = await query("SELECT * FROM expenses ORDER BY id DESC");
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST /api/expenses
export async function POST(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin"]);
  if (user instanceof NextResponse) return user;
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const description = sanitize(body.description).slice(0, 500);
  const amount = Number(body.amount);
  const date = sanitize(body.date).slice(0, 20);
  const paidTo = sanitize(body.paid_to || "").slice(0, 100);
  if (!description) return NextResponse.json({ error: "description requerido" }, { status: 422 });
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "amount inválido" }, { status: 422 });
  if (!date) return NextResponse.json({ error: "date requerido" }, { status: 422 });
  try {
    const res = await query(
      `INSERT INTO expenses (description, amount, date, paid_to)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [description, amount, date, paidTo]
    );
    await logAudit({
      userId: user.id, action: "create_expense", entity: "expense",
      entityId: res.rows[0].id, ip: getIp(req),
      details: { description, amount, date, paid_to: paidTo },
    });
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
