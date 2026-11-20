import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  return renderPage({
    req,
    activeKey: "audit",
    title: "Auditoría",
    subtitle: "Bitácora de acciones (últimos 200 registros)",
    allowedRoles: ["owner"],
    content: `
      <div class="panel">
        <div class="panel-header"><h2>Últimos eventos</h2>
          <button class="btn btn-gold btn-sm" onclick="loadAudit()">↻ Actualizar</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead><tr><th>ID</th><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>IP</th><th>Detalles</th></tr></thead>
            <tbody id="auditBody"><tr><td colspan="7" class="empty-state">Cargando...</td></tr></tbody>
          </table>
        </div>
      </div>
    `,
    script: `
      async function loadAudit() {
        const body = document.getElementById('auditBody');
        body.innerHTML = '<tr><td colspan="7" class="empty-state">Cargando...</td></tr>';
        try {
          const rows = await api('/api/audit');
          if (rows.length === 0) {
            body.innerHTML = '<tr><td colspan="7" class="empty-state">Sin eventos.</td></tr>';
            return;
          }
          body.innerHTML = rows.map(a => {
            let details = '';
            try { details = JSON.stringify(a.details); } catch {}
            return '<tr><td>' + a.id + '</td><td>' + esc((a.created_at||'').replace('T',' ').slice(0,19)) + '</td><td>' + esc(a.actor||'-') + '</td><td>' + esc(a.action) + '</td><td>' + esc(a.entity||'-') + '</td><td>' + esc(a.ip||'-') + '</td><td style="font-size:11px;font-family:monospace;">' + esc(details) + '</td></tr>';
          }).join('');
        } catch (err) {
          body.innerHTML = '<tr><td colspan="7" class="empty-state">Error: ' + esc(err.message) + '</td></tr>';
        }
      }
      loadAudit();
    `,
  });
}
