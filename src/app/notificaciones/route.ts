import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  return renderPage({
    req,
    activeKey: "notificaciones",
    title: "Notificaciones",
    subtitle: "Avisos del sistema (no pagos, moras, cobros)",
    content: `
      <div class="panel">
        <div class="panel-header">
          <h2>Últimas notificaciones</h2>
          <button class="btn btn-gold btn-sm" onclick="loadNotifications()">↻ Actualizar</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Título</th>
                <th>Mensaje</th>
                <th>Cliente</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody id="notifBody">
              <tr><td colspan="6" class="empty-state">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
    script: `
      async function loadNotifications() {
        const body = document.getElementById('notifBody');
        body.innerHTML = '<tr><td colspan="6" class="empty-state">Cargando...</td></tr>';
        try {
          const rows = await api('/api/notifications');
          if (rows.length === 0) {
            body.innerHTML = '<tr><td colspan="6" class="empty-state">No hay notificaciones.</td></tr>';
            return;
          }
          body.innerHTML = rows.map(n => {
            const fecha = (n.created_at || '').replace('T',' ').slice(0,19);
            const tipoLabel = {
              'no_pago': '⚠️ No pagó',
              'no_pago_automatico': '🤖 No pagó (auto)',
              'mora_aplicada': '💰 Mora aplicada',
              'pago_recibido': '✅ Pago recibido',
            }[n.tipo] || n.tipo;
            return '<tr style="' + (n.leida ? '' : 'background:#fffbe6;') + '"><td>' + esc(fecha) + '</td><td><strong>' + esc(tipoLabel) + '</strong></td><td>' + esc(n.titulo) + '</td><td style="font-size:12px;">' + esc(n.mensaje||'-') + '</td><td>' + esc(n.client_name||'-') + '</td><td>' + (n.leida ? '<span class="badge badge-active">Leída</span>' : '<span class="badge badge-pending">Nueva</span>') + '</td></tr>';
          }).join('');
        } catch (e) {
          body.innerHTML = '<tr><td colspan="6" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
        }
      }
      loadNotifications();
    `,
  });
}
