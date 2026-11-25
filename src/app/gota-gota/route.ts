import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  return renderPage({
    req,
    activeKey: "gota-gota",
    title: "Préstamos Gota a Gota",
    subtitle: "Préstamos con cobro diario de lunes a sábado",
    content: `
      <div class="panel">
        <div class="panel-header">
          <h2>Todos los préstamos gota a gota</h2>
          <button class="btn btn-gold btn-sm" onclick="openModal()">+ Nuevo préstamo</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Total a cobrar</th>
                <th>Cuota/día</th>
                <th>Días</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Motorizado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody id="loansBody">
              <tr><td colspan="10" class="empty-state">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" id="modal">
        <div class="modal" style="max-width:600px;">
          <div class="modal-header">
            <h3>Nuevo préstamo gota a gota</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="modalAlert" class="alert"></div>
            <form id="loanForm">
              <div class="field">
                <label for="client_id">Cliente *</label>
                <select id="client_id" required></select>
              </div>
              <div class="form-grid">
                <div class="field">
                  <label for="amount">Monto prestado *</label>
                  <input type="number" step="0.01" id="amount" required placeholder="1000" oninput="calcular()">
                </div>
                <div class="field">
                  <label for="dias_plazo">Días de plazo *</label>
                  <input type="number" id="dias_plazo" required value="24" min="1" max="60" oninput="calcular()">
                </div>
              </div>
              <div class="form-grid">
                <div class="field">
                  <label for="total_a_cobrar">Total a cobrar *</label>
                  <input type="number" step="0.01" id="total_a_cobrar" required placeholder="1200" oninput="calcularCuota()">
                </div>
                <div class="field">
                  <label for="cuota_diaria">Cuota diaria (auto)</label>
                  <input type="number" step="0.01" id="cuota_diaria" readonly>
                </div>
              </div>
              <div class="form-grid">
                <div class="field">
                  <label for="seguro_monto">Seguro de préstamo (opcional)</label>
                  <input type="number" step="0.01" id="seguro_monto" value="0" placeholder="100">
                </div>
                <div class="field">
                  <label for="mora_por_visita">Mora por visita fallida (Bs.)</label>
                  <input type="number" step="0.01" id="mora_por_visita" value="5" placeholder="5">
                </div>
              </div>
              <div class="form-grid">
                <div class="field">
                  <label for="motorizado_id">Motorizado asignado</label>
                  <select id="motorizado_id"></select>
                </div>
                <div class="field">
                  <label for="fecha_inicio">Fecha de inicio *</label>
                  <input type="date" id="fecha_inicio" required>
                </div>
              </div>
              <div class="field">
                <label>
                  <input type="checkbox" id="cobrar_domingo"> Cobrar también los domingos
                </label>
              </div>

              <h4 style="margin:20px 0 10px;color:#0b2545;font-size:14px;border-bottom:1px solid #e3dccc;padding-bottom:6px;">Condiciones del préstamo</h4>
              <div class="form-grid">
                <div class="field">
                  <label>
                    <input type="checkbox" id="cobrar_mora" checked> Cobrar mora por visita fallida
                  </label>
                  <p style="font-size:11px;color:#888;margin-top:4px;">Si está activo, se cobran los Bs. de mora cuando el motorizado va y no le pagan.</p>
                </div>
                <div class="field">
                  <label for="tipo_interes_recargo">Interés sobre interés (recargo)</label>
                  <select id="tipo_interes_recargo">
                    <option value="ninguno">Ninguno (no recalcular)</option>
                    <option value="solo_mora">Solo sobre la mora acumulada</option>
                    <option value="toda_deuda">Sobre toda la deuda (mora + cuotas atrasadas)</option>
                    <option value="recalcular_cuota">Recalcular la cuota diaria</option>
                  </select>
                  <p style="font-size:11px;color:#888;margin-top:4px;">Cómo aplicar el interés cuando el cliente se atrasa.</p>
                </div>
              </div>

              <div class="field">
                <label for="contract_number">Número de contrato (opcional)</label>
                <input type="text" id="contract_number" placeholder="Se genera solo si lo dejas vacío">
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-sm" style="background:#f1ede4" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary btn-sm">Crear préstamo</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `,
    script: `
      async function loadData() {
        try {
          const [clients, motorizados] = await Promise.all([
            api('/api/clients'),
            api('/api/motorizados'),
          ]);
          const selClient = document.getElementById('client_id');
          const selMotorizado = document.getElementById('motorizado_id');
          if (clients.length === 0) {
            selClient.innerHTML = '<option value="">-- Primero crea un cliente --</option>';
          } else {
            selClient.innerHTML = '<option value="">-- Selecciona cliente --</option>' +
              clients.map(c => '<option value="' + c.id + '">' + esc(c.name) + ' (ID: ' + c.id + ')</option>').join('');
          }
          if (motorizados.length === 0) {
            selMotorizado.innerHTML = '<option value="">-- Sin asignar --</option>';
          } else {
            selMotorizado.innerHTML = '<option value="">-- Sin asignar --</option>' +
              motorizados.map(m => '<option value="' + m.id + '">' + esc(m.nombre) + '</option>').join('');
          }
        } catch (e) { showAlert(e.message); }
      }

      function calcular() {
        // Calcular total sugerido = monto * 1.20 (20% interés)
        const monto = parseFloat(document.getElementById('amount').value) || 0;
        if (monto > 0) {
          const sugerido = Math.round(monto * 1.20 * 100) / 100;
          document.getElementById('total_a_cobrar').value = sugerido;
          calcularCuota();
        }
      }

      function calcularCuota() {
        const total = parseFloat(document.getElementById('total_a_cobrar').value) || 0;
        const dias = parseInt(document.getElementById('dias_plazo').value) || 1;
        if (total > 0 && dias > 0) {
          const cuota = Math.round((total / dias) * 100) / 100;
          document.getElementById('cuota_diaria').value = cuota;
        }
      }

      async function loadLoans() {
        const body = document.getElementById('loansBody');
        body.innerHTML = '<tr><td colspan="10" class="empty-state">Cargando...</td></tr>';
        try {
          const rows = await api('/api/loans/gota');
          if (rows.length === 0) {
            body.innerHTML = '<tr><td colspan="10" class="empty-state">No hay préstamos gota a gota. Crea el primero.</td></tr>';
            return;
          }
          body.innerHTML = rows.map(l => '<tr><td>' + l.id + '</td><td>' + esc(l.client_name||'-') + '</td><td>' + fmtBs(l.amount) + '</td><td>' + fmtBs(l.total_a_cobrar) + '</td><td>' + fmtBs(l.cuota_diaria) + '</td><td>' + (l.dias_plazo||'-') + '</td><td>' + esc(l.fecha_inicio||'-') + '</td><td>' + esc(l.fecha_fin||'-') + '</td><td>' + esc(l.motorizado_nombre||'-') + '</td><td><span class="badge badge-active">' + esc(l.status) + '</span></td></tr>').join('');
        } catch (e) {
          body.innerHTML = '<tr><td colspan="10" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
        }
      }

      function openModal() {
        document.getElementById('fecha_inicio').value = new Date().toISOString().slice(0, 10);
        document.getElementById('modal').classList.add('show');
      }
      function closeModal() { document.getElementById('modal').classList.remove('show'); }

      document.getElementById('loanForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          client_id: Number(document.getElementById('client_id').value),
          amount: Number(document.getElementById('amount').value),
          total_a_cobrar: Number(document.getElementById('total_a_cobrar').value),
          dias_plazo: Number(document.getElementById('dias_plazo').value),
          cuota_diaria: Number(document.getElementById('cuota_diaria').value),
          seguro_monto: Number(document.getElementById('seguro_monto').value),
          mora_por_visita: Number(document.getElementById('mora_por_visita').value),
          motorizado_id: document.getElementById('motorizado_id').value || null,
          fecha_inicio: document.getElementById('fecha_inicio').value,
          cobrar_domingo: document.getElementById('cobrar_domingo').checked,
          cobrar_mora: document.getElementById('cobrar_mora').checked,
          tipo_interes_recargo: document.getElementById('tipo_interes_recargo').value,
          contract_number: document.getElementById('contract_number').value.trim(),
        };
        if (!data.client_id) { showAlert('modalAlert', 'Selecciona un cliente'); return; }
        try {
          const r = await api('/api/loans/gota', 'POST', data);
          closeModal();
          showAlert('Préstamo creado. Termina: ' + r.fecha_fin, 'success');
          loadLoans();
        } catch (err) { showAlert('modalAlert', err.message); }
      });

      loadData();
      loadLoans();
    `,
  });
}
