import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const motorizadoId = url.searchParams.get("motorizado_id") || "";
  const fecha = url.searchParams.get("fecha") || new Date().toISOString().slice(0, 10);

  return renderPage({
    req,
    activeKey: "motorizados",
    title: "Ruta diaria",
    subtitle: "Clientes a cobrar hoy",
    content: `
      <div class="panel">
        <div class="panel-header">
          <h2>Ruta del día</h2>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <input type="date" id="fecha" value="${fecha}" style="padding:6px; border:1px solid #e3dccc; border-radius:6px;">
            <select id="motSel" style="padding:6px; border:1px solid #e3dccc; border-radius:6px; min-width:180px;">
              <option value="">Todos</option>
            </select>
            <button class="btn btn-gold btn-sm" onclick="loadRuta()">↻ Actualizar</button>
          </div>
        </div>
        <div class="panel-body no-pad">
          <div id="rutaHeader" style="padding:14px 20px; background:#faf7f0; border-bottom:1px solid #e3dccc; font-size:13px;">
            Cargando...
          </div>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Cuota hoy</th>
                <th>Días mora</th>
                <th>Saldo pendiente</th>
                <th>Motorizado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody id="rutaBody">
              <tr><td colspan="6" class="empty-state">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
    script: `
      let initialMot = '${motorizadoId}';
      let initialFecha = '${fecha}';

      async function loadMotorizadosSel() {
        try {
          const motos = await api('/api/motorizados');
          const sel = document.getElementById('motSel');
          sel.innerHTML = '<option value="">Todos</option>' + motos.map(m => '<option value="' + m.id + '">' + esc(m.nombre) + '</option>').join('');
          if (initialMot) sel.value = initialMot;
        } catch (e) {}
      }

      async function loadRuta() {
        const fecha = document.getElementById('fecha').value;
        const mot = document.getElementById('motSel').value;
        const header = document.getElementById('rutaHeader');
        const body = document.getElementById('rutaBody');
        header.textContent = 'Cargando ruta para ' + fecha + '...';
        body.innerHTML = '<tr><td colspan="6" class="empty-state">Cargando...</td></tr>';
        try {
          const url = '/api/ruta?fecha=' + encodeURIComponent(fecha) + (mot ? '&motorizado_id=' + mot : '');
          const data = await api(url);
          header.innerHTML = '<strong>Fecha:</strong> ' + data.fecha + ' (' + data.dia_semana + ') — <strong>Total clientes:</strong> ' + data.total_clientes;
          if (data.total_clientes === 0) {
            body.innerHTML = '<tr><td colspan="6" class="empty-state">No hay clientes para cobrar este día.</td></tr>';
            return;
          }
          body.innerHTML = data.ruta.map(r => {
            const moraClass = r.dias_mora > 0 ? 'style="background:#ffebee;color:#c62828;font-weight:bold;"' : '';
            return '<tr ' + moraClass + '><td>' + esc(r.client_name) + '<br><small style="color:#888;">' + esc(r.client_phone||'') + '</small></td><td>' + fmtBs(r.cuota_hoy) + '</td><td>' + (r.dias_mora > 0 ? '<strong>' + r.dias_mora + ' día(s)</strong>' : '0') + '</td><td>' + fmtBs(r.saldo_pendiente) + '</td><td>' + esc(r.motorizado_nombre||'-') + '</td><td><button class="btn btn-sm btn-gold" onclick="registrarPago(' + r.loan_id + ', ' + r.cuota_hoy + ')">💰 Cobrar</button></td></tr>';
          }).join('');
        } catch (e) {
          body.innerHTML = '<tr><td colspan="6" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
        }
      }

      async function registrarPago(loanId, monto) {
        if (!confirm('Confirmar cobro de ' + fmtBs(monto) + ' para el préstamo #' + loanId + '?')) return;
        try {
          const fecha = document.getElementById('fecha').value;
          await api('/api/payments', 'POST', {
            loan_id: loanId,
            payment_date: fecha,
            amount: monto,
            type: 'cuota_diaria',
          });
          showAlert('Cobro registrado correctamente', 'success');
          loadRuta();
        } catch (err) { showAlert(err.message); }
      }

      loadMotorizadosSel().then(() => loadRuta());
    `,
  });
}
