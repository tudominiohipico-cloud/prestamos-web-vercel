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
    subtitle: "Cobros del día - escanea QR o cobra en efectivo",
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="rutaBody">
              <tr><td colspan="6" class="empty-state">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal: Cobrar sin QR -->
      <div class="modal-overlay" id="cobroModal">
        <div class="modal">
          <div class="modal-header">
            <h3>Cobrar sin QR</h3>
            <button class="modal-close" onclick="closeCobroModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="cobroAlert" class="alert"></div>
            <form id="cobroForm">
              <input type="hidden" id="cobroLoanId">
              <div style="background:#f1ede4; padding:10px; border-radius:6px; margin-bottom:14px;">
                <strong>Cliente:</strong> <span id="cobroClientName">-</span><br>
                <strong>Cuota sugerida:</strong> <span id="cobroSugerido">-</span>
              </div>
              <div class="field">
                <label for="cobroMonto">Monto cobrado (Bs.) *</label>
                <input type="number" step="0.01" id="cobroMonto" required>
              </div>
              <div class="field">
                <label for="cobroMetodo">Método</label>
                <select id="cobroMetodo">
                  <option value="efectivo">Efectivo directo</option>
                  <option value="tercero">Tercero (familiar/vecino recibió el dinero)</option>
                </select>
              </div>
              <div class="field">
                <label for="cobroObs">Observaciones</label>
                <textarea id="cobroObs" rows="2" placeholder="Ej: Pagó la mamá, dejó el dinero con el vecino, etc."></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-sm" style="background:#f1ede4" onclick="closeCobroModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary btn-sm">Confirmar cobro</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Modal: No pagó -->
      <div class="modal-overlay" id="noPagoModal">
        <div class="modal">
          <div class="modal-header">
            <h3>Marcar como no pagó</h3>
            <button class="modal-close" onclick="closeNoPagoModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="noPagoAlert" class="alert"></div>
            <form id="noPagoForm">
              <input type="hidden" id="noPagoLoanId">
              <div style="background:#ffebee; padding:10px; border-radius:6px; margin-bottom:14px;">
                <strong>Cliente:</strong> <span id="noPagoClientName">-</span><br>
                <strong>Mora que se aplicará:</strong> <span id="noPagoMora">-</span>
              </div>
              <div class="field">
                <label for="noPagoMotivo">Motivo (opcional)</label>
                <textarea id="noPagoMotivo" rows="3" placeholder="Ej: Cliente no estaba, no tenía dinero, se negó a pagar, etc."></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-sm" style="background:#f1ede4" onclick="closeNoPagoModal()">Cancelar</button>
                <button type="submit" class="btn btn-danger btn-sm">Confirmar: No pagó</button>
              </div>
            </form>
          </div>
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
            return '<tr ' + moraClass + '><td>' + esc(r.client_name) + '<br><small style="color:#888;">' + esc(r.client_phone||'') + '</small></td><td>' + fmtBs(r.cuota_hoy) + '</td><td>' + (r.dias_mora > 0 ? '<strong>' + r.dias_mora + ' día(s)</strong>' : '0') + '</td><td>' + fmtBs(r.saldo_pendiente) + '</td><td>' + esc(r.motorizado_nombre||'-') + '</td><td><div style="display:flex;gap:4px;flex-wrap:wrap;"><button class="btn btn-sm btn-gold" onclick="registrarPago(' + r.loan_id + ', ' + r.cuota_hoy + ')">💰 Cobrar</button><button class="btn btn-sm" style="background:#f1ede4" onclick="openCobroSinQr(' + r.loan_id + ', ' + esc(JSON.stringify(r.client_name)) + ', ' + r.cuota_hoy + ')">📱 Sin QR</button><button class="btn btn-sm btn-danger" onclick="openNoPago(' + r.loan_id + ', ' + esc(JSON.stringify(r.client_name)) + ', ' + (r.mora_por_visita||0) + ')">❌ No pagó</button></div></td></tr>';
          }).join('');
        } catch (e) {
          body.innerHTML = '<tr><td colspan="6" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
        }
      }

      async function registrarPago(loanId, monto) {
        if (!confirm('Confirmar cobro de ' + fmtBs(monto) + ' para el préstamo #' + loanId + '?\\n\\n(Esto es el cobro normal con QR del cliente)')) return;
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

      // === Cobrar sin QR ===
      function openCobroSinQr(loanId, clientName, sugerido) {
        document.getElementById('cobroLoanId').value = loanId;
        document.getElementById('cobroClientName').textContent = clientName;
        document.getElementById('cobroSugerido').textContent = fmtBs(sugerido);
        document.getElementById('cobroMonto').value = sugerido;
        document.getElementById('cobroMetodo').value = 'efectivo';
        document.getElementById('cobroObs').value = '';
        document.getElementById('cobroModal').classList.add('show');
      }
      function closeCobroModal() { document.getElementById('cobroModal').classList.remove('show'); }
      document.getElementById('cobroForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fecha = document.getElementById('fecha').value;
        const data = {
          loan_id: Number(document.getElementById('cobroLoanId').value),
          monto: Number(document.getElementById('cobroMonto').value),
          fecha: fecha,
          metodo: document.getElementById('cobroMetodo').value,
          observaciones: document.getElementById('cobroObs').value.trim(),
        };
        try {
          const r = await api('/api/ruta/cobrar-sin-qr', 'POST', data);
          closeCobroModal();
          showAlert(r.message, 'success');
          loadRuta();
        } catch (err) { showAlert('cobroAlert', err.message); }
      });

      // === No pagó ===
      function openNoPago(loanId, clientName, mora) {
        document.getElementById('noPagoLoanId').value = loanId;
        document.getElementById('noPagoClientName').textContent = clientName;
        document.getElementById('noPagoMora').textContent = mora > 0 ? 'Bs. ' + mora + ' (se aplicará automáticamente)' : 'Sin mora (este préstamo no cobra mora)';
        document.getElementById('noPagoMotivo').value = '';
        document.getElementById('noPagoModal').classList.add('show');
      }
      function closeNoPagoModal() { document.getElementById('noPagoModal').classList.remove('show'); }
      document.getElementById('noPagoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fecha = document.getElementById('fecha').value;
        const data = {
          loan_id: Number(document.getElementById('noPagoLoanId').value),
          fecha: fecha,
          motivo: document.getElementById('noPagoMotivo').value.trim(),
        };
        try {
          const r = await api('/api/ruta/no-pago', 'POST', data);
          closeNoPagoModal();
          showAlert(r.message, 'success');
          loadRuta();
        } catch (err) { showAlert('noPagoAlert', err.message); }
      });

      loadMotorizadosSel().then(() => loadRuta());
    `,
  });
}
