import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/guard";

// GET /api/audit - Últimos 200 logs (solo owner)
export async function GET(req: NextRequest) {
  const user = requireRole(req, ["owner"]);
  if (user instanceof NextResponse) return user;
  try {
    const res = await query(
      `SELECT a.id, a.action, a.entity, a.entity_id, a.ip, a.details, a.created_at,
              u.username as actor
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT 200`
    );
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
