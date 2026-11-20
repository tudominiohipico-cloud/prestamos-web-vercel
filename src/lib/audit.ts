import { query } from "./db";
import { sanitize } from "./auth";

// Registra una acción en la bitácora de auditoría
export async function logAudit(params: {
  userId: number | null;
  action: string;
  entity?: string;
  entityId?: number | string | null;
  ip?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, ip, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        params.userId,
        sanitize(params.action).slice(0, 100),
        sanitize(params.entity || "").slice(0, 50),
        params.entityId ?? null,
        sanitize(params.ip || "unknown").slice(0, 50),
        params.details ? JSON.stringify(params.details) : null,
      ]
    );
  } catch (e) {
    console.error("[audit] Error registrando auditoría:", e);
  }
}
