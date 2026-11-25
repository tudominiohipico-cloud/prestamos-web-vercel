import { query } from "./db";
import { sanitize } from "./auth";

// Crea una notificación y la asocia a un usuario y/o casa
export async function createNotification(params: {
  houseId?: number | null;
  userId?: number | null;   // usuario del sistema que debe ver la notif
  clientId?: number | null; // cliente relacionado (para auditoría)
  tipo: string;             // 'no_pago', 'mora_aplicada', 'pago_recibido', etc.
  titulo: string;
  mensaje?: string;
}) {
  try {
    await query(
      `INSERT INTO notifications (house_id, user_id, client_id, tipo, titulo, mensaje)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.houseId ?? null,
        params.userId ?? null,
        params.clientId ?? null,
        sanitize(params.tipo).slice(0, 50),
        sanitize(params.titulo).slice(0, 200),
        params.mensaje ? sanitize(params.mensaje).slice(0, 1000) : null,
      ]
    );
  } catch (e) {
    console.error("[notifications] error creando:", e);
  }
}
