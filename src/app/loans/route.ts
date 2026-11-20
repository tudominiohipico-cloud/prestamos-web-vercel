import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id") || "";
  return renderPage({
    req,
    activeKey: "loans",
    title: "Préstamos",
    subtitle: "Crear y listar préstamos por cliente",
    content: `
      <div class="panel">
        <div class="panel-header"><h2>Seleccionar cliente</h2></div>
        <div class="panel-body">
          <div class="field"><label for="clientSelect">Cliente</label>
            <select id="clientSelect"><option value="">-- Cargando... --</option></select>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>Préstamos del cliente</h2>
          <button class="btn btn-gold btn-sm" onclick="openModal()">+ Nuevo préstamo</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead><tr><th>ID</th><th>Contrato</th><th>Monto</th><th>Tasa (%)</th><th>Moneda</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody id="loansBody"><tr><td colspan="7" class="empty-state">Selecciona un cliente</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" id="modal">
        <div class="modal">
          <div class="modal-header"><h3>Nuevo préstamo</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="loanForm">
              <div class="field"><label for="loanClient">Cliente</label><select id="loanClient" required></select></div>
              <div class="field"><label for="contract_number">Número de contrato</label><input type="text" id="contract_number" required placeholder="PST-2026-0001"></div>
              <div class="form-grid">
                <div class="field"><label for="amount">Monto</label><input type="number" step="0.01" id="amount" required placeholder="5000"></div>
                <div class="field"><label for="interest_rate">Tasa (%)</label><input type="number" step="0.01" id="interest_rate" required placeholder="2.95"></div>
              </div>
              <div class="field"><label for="currency">Moneda</label>
                <select id="currency"><option value="VES">Bolívares (Bs.)</option><option value="USD">Dólares (USD)</option></select>
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
      let initialClientId = '${clientId}';
      async function loadClients() {
        try {
          const clients = await api('/api/clients');
          const sel = document.getElementById('clientSelect');
          const selModal = document.getElementById('loanClient');
          if (clients.length === 0) {
            sel.innerHTML = '<option value="">-- No hay clientes. Crea uno primero. --</option>';
            selModal.innerHTML = '<option value="">-- No hay clientes --</option>';
            return;
          }
          const opts = clients.map(c => '<option value="' + c.id + '">' + esc(c.name) + ' (ID: ' + c.id + ')</option>').join('');
          sel.innerHTML = '<option value="">-- Selecciona un cliente --</option>' + opts;
          selModal.innerHTML = opts;
          if (initialClientId) {
            sel.value = initialClientId;
            loadLoans(initialClientId);
          }
        } catch (e) { showAlert(e.message); }
      }
      document.getElementById('clientSelect').addEventListener('change', (e) => {
        const v = e.target.value;
        if (v) loadLoans(v);
        else document.getElementById('loansBody').innerHTML = '<tr><td colspan="7" class="empty-state">Selecciona un cliente</td></tr>';
      });
      async function loadLoans(clientId) {
        const body = document.getElementById('loansBody');
        body.innerHTML = '<tr><td colspan="7" class="empty-state">Cargando...</td></tr>';
        try {
          const loans = await api('/api/loans?client_id=' + clientId);
          if (loans.length === 0) {
            body.innerHTML = '<tr><td colspan="7" class="empty-state">Este cliente no tiene préstamos.</td></tr>';
            return;
          }
          body.innerHTML = loans.map(l => '<tr><td>' + l.id + '</td><td>' + esc(l.contract_number) + '</td><td>' + fmtBs(l.amount) + ' ' + esc(l.currency||'') + '</td><td>' + l.interest_rate + '%</td><td>' + esc(l.currency||'') + '</td><td><span class="badge badge-active">' + esc(l.status||'active') + '</span></td><td><a class="btn btn-sm btn-gold" href="/payments?loan_id=' + l.id + '">Ver pagos</a></td></tr>').join('');
        } catch (e) {
          body.innerHTML = '<tr><td colspan="7" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
        }
      }
      function openModal() {
        if (!document.getElementById('loanClient').value) { showAlert('Primero crea un cliente'); return; }
        document.getElementById('modal').classList.add('show');
      }
      function closeModal() { document.getElementById('modal').classList.remove('show'); }
      document.getElementById('loanForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          client_id: Number(document.getElementById('loanClient').value),
          contract_number: document.getElementById('contract_number').value.trim(),
          amount: Number(document.getElementById('amount').value),
          interest_rate: Number(document.getElementById('interest_rate').value),
          currency: document.getElementById('currency').value,
        };
        try {
          await api('/api/loans', 'POST', data);
          closeModal();
          showAlert('Préstamo creado', 'success');
          document.getElementById('clientSelect').value = data.client_id;
          loadLoans(data.client_id);
        } catch (err) { showAlert(err.message); }
      });
      loadClients();
    `,
  });
}
