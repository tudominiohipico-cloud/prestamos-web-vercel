import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";

export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin"]);
  if (user instanceof NextResponse) return user;
  try {
    const p = await query("SELECT COALESCE(SUM(amount),0)::float as total FROM payments");
    const e = await query("SELECT COALESCE(SUM(amount),0)::float as total FROM expenses");
    const totalPayments = p.rows[0].total;
    const totalExpenses = e.rows[0].total;
    return NextResponse.json({
      total_payments: totalPayments,
      total_expenses: totalExpenses,
      net_income: totalPayments - totalExpenses,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
