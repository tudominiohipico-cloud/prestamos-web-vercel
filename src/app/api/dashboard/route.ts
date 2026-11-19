import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";

export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner", "admin"]);
  if (user instanceof NextResponse) return user;
  try {
    const clients = await query("SELECT COUNT(*)::int as n FROM clients");
    const loans = await query("SELECT COUNT(*)::int as n FROM loans WHERE status = 'active'");
    return NextResponse.json({
      total_clients: clients.rows[0].n,
      total_active_loans: loans.rows[0].n,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
