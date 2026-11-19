import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const loanId = url.searchParams.get("loan_id") || "";
  return renderPage({
    req,
    activeKey: "collaterals",
    title: "Garantías",
    subtitle: "Bienes entregados como respaldo de préstamos",
    content: `
      <div class="panel">
        <div class="panel-header"><h2>Seleccionar préstamo</h2></div>
        <div class="panel-body">
          <div class="field"><label for="loanSelect">Préstamo</label>
            <select id="loanSelect"><option value="">-- Cargando... --</option></select>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>Garantías del préstamo</h2>
          <button class="btn btn-gold btn-sm" onclick="openModal()">+ Agregar garantía</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead><tr><th>ID</th><th>Tipo</th><th>Descripción</th><th>Valor estimado</th></tr></thead>
            <tbody id="collBody"><tr><td colspan="4" class="empty-state">Selecciona un préstamo</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" id="modal">
        <div class="modal">
          <div class="modal-header"><h3>Agregar garantía</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="collForm">
              <div class="field"><label for="cLoan">Préstamo</label><select id="cLoan" required></select></div>
              <div class="field"><label for="cType">Tipo</label>
                <select id="cType">
                  <option value="vehiculo">Vehículo</option>
                  <option value="inmueble">Inmueble</option>
                  <option value="electronico">Equipo electrónico</option>
                  <option value="maquinaria">Maquinaria</option>
                  <option value="joya">Joya / Alhaja</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div class="field"><label for="cDesc">Descripción</label>
                <textarea id="cDesc" rows="3" required placeholder="Ej: Honda Civic 2018, placa ABC123"></textarea>
              </div>
              <div class="field"><label for="cValue">Valor estimado (Bs.)</label>
                <input type="number" step="0.01" id="cValue" required placeholder="15000">
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-sm" style="background:#f1ede4" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `,
    script: `
      let initialLoanId = '${loanId}';
      async function loadLoans() {
        try {
          const loans = await api('/api/loans');
          const sel = document.getElementById('loanSelect');
          const selModal = document.getElementById('cLoan');
          if (loans.length === 0) {
            sel.innerHTML = '<option value="">-- No hay préstamos --</option>';
            selModal.innerHTML = '<option value="">-- No hay préstamos --</option>';
            return;
          }
          const opts = loans.map(l => '<option value="' + l.id + '">#' + l.id + ' - ' + esc(l.contract_number||'Sin contrato') + '</option>').join('');
          sel.innerHTML = '<option value="">-- Selecciona un préstamo --</option>' + opts;
          selModal.innerHTML = opts;
          if (initialLoanId) { sel.value = initialLoanId; loadCollaterals(initialLoanId); }
        } catch (e) { showAlert(e.message); }
      }
      document.getElementById('loanSelect').addEventListener('change', (e) => {
        const v = e.target.value;
        if (v) loadCollaterals(v);
        else document.getElementById('collBody').innerHTML = '<tr><td colspan="4" class="empty-state">Selecciona un préstamo</td></tr>';
      });
      async function loadCollaterals(loanId) {
        const body = document.getElementById('collBody');
        body.innerHTML = '<tr><td colspan="4" class="empty-state">Cargando...</td></tr>';
        try {
          const rows = await api('/api/collaterals?loan_id=' + loanId);
          if (rows.length === 0) {
            body.innerHTML = '<tr><td colspan="4" class="empty-state">Sin garantías.</td></tr>';
            return;
          }
          body.innerHTML = rows.map(c => '<tr><td>' + c.id + '</td><td>' + esc(c.type) + '</td><td>' + esc(c.description) + '</td><td>' + fmtBs(c.estimated_value) + '</td></tr>').join('');
        } catch (e) {
          body.innerHTML = '<tr><td colspan="4" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
        }
      }
      function openModal() {
        if (!document.getElementById('cLoan').value) { showAlert('Primero crea un préstamo'); return; }
        document.getElementById('modal').classList.add('show');
      }
      function closeModal() { document.getElementById('modal').classList.remove('show'); }
      document.getElementById('collForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loanId = Number(document.getElementById('cLoan').value);
        const data = {
          loan_id: loanId,
          type: document.getElementById('cType').value,
          description: document.getElementById('cDesc').value.trim(),
          estimated_value: Number(document.getElementById('cValue').value),
        };
        try {
          await api('/api/collaterals', 'POST', data);
          closeModal();
          showAlert('Garantía agregada', 'success');
          document.getElementById('loanSelect').value = loanId;
          loadCollaterals(loanId);
        } catch (err) { showAlert(err.message); }
      });
      loadLoans();
    `,
  });
}
