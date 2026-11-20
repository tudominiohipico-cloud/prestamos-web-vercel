import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const loanId = url.searchParams.get("loan_id") || "";
  return renderPage({
    req,
    activeKey: "payments",
    title: "Pagos",
    subtitle: "Registrar pagos y adjuntar comprobantes",
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
        <div class="panel-header"><h2>Pagos del préstamo</h2>
          <button class="btn btn-gold btn-sm" onclick="openModal()">+ Registrar pago</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead><tr><th>ID</th><th>Fecha</th><th>Monto</th><th>Tipo</th><th>Comprobante</th></tr></thead>
            <tbody id="paymentsBody"><tr><td colspan="5" class="empty-state">Selecciona un préstamo</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" id="modal">
        <div class="modal">
          <div class="modal-header"><h3>Registrar pago</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="paymentForm">
              <div class="field"><label for="pLoan">Préstamo</label><select id="pLoan" required></select></div>
              <div class="form-grid">
                <div class="field"><label for="pDate">Fecha</label><input type="date" id="pDate" required></div>
                <div class="field"><label for="pAmount">Monto</label><input type="number" step="0.01" id="pAmount" required placeholder="500.00"></div>
              </div>
              <div class="field"><label for="pType">Tipo</label>
                <select id="pType">
                  <option value="cuota">Cuota mensual</option>
                  <option value="abono">Abono parcial</option>
                  <option value="cancelacion">Cancelación total</option>
                </select>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-sm" style="background:#f1ede4" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="modal-overlay" id="photoModal">
        <div class="modal">
          <div class="modal-header"><h3>Subir comprobante</h3>
            <button class="modal-close" onclick="closePhotoModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="alertPhoto" class="alert"></div>
            <form id="photoForm">
              <input type="hidden" id="photoPaymentId">
              <div class="field"><label for="photoFile">Imagen (JPG, PNG) - máx 5 MB</label><input type="file" id="photoFile" accept="image/*" required></div>
              <div class="form-actions">
                <button type="button" class="btn btn-sm" style="background:#f1ede4" onclick="closePhotoModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary btn-sm">Subir foto</button>
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
          const selPay = document.getElementById('pLoan');
          if (loans.length === 0) {
            sel.innerHTML = '<option value="">-- No hay préstamos --</option>';
            selPay.innerHTML = '<option value="">-- No hay préstamos --</option>';
            return;
          }
          const opts = loans.map(l => '<option value="' + l.id + '">#' + l.id + ' - ' + esc(l.contract_number||'Sin contrato') + '</option>').join('');
          sel.innerHTML = '<option value="">-- Selecciona un préstamo --</option>' + opts;
          selPay.innerHTML = opts;
          if (initialLoanId) {
            sel.value = initialLoanId;
            loadPayments(initialLoanId);
          }
        } catch (e) { showAlert(e.message); }
      }
      document.getElementById('loanSelect').addEventListener('change', (e) => {
        const v = e.target.value;
        if (v) loadPayments(v);
        else document.getElementById('paymentsBody').innerHTML = '<tr><td colspan="5" class="empty-state">Selecciona un préstamo</td></tr>';
      });
      async function loadPayments(loanId) {
        const body = document.getElementById('paymentsBody');
        body.innerHTML = '<tr><td colspan="5" class="empty-state">Cargando...</td></tr>';
        try {
          const pays = await api('/api/payments?loan_id=' + loanId);
          if (pays.length === 0) {
            body.innerHTML = '<tr><td colspan="5" class="empty-state">Sin pagos aún.</td></tr>';
            return;
          }
          body.innerHTML = pays.map(p => '<tr><td>' + p.id + '</td><td>' + esc(p.payment_date||'-') + '</td><td>' + fmtBs(p.amount) + '</td><td>' + esc(p.type||'-') + '</td><td>' + (p.photo_url ? '<a href="' + esc(p.photo_url) + '" target="_blank" class="btn btn-sm btn-gold">Ver foto</a>' : '<button class="btn btn-sm" style="background:#f1ede4" onclick="openPhotoModal(' + p.id + ')">Subir foto</button>') + '</td></tr>').join('');
        } catch (e) {
          body.innerHTML = '<tr><td colspan="5" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
        }
      }
      function openModal() {
        if (!document.getElementById('pLoan').value) { showAlert('Primero crea un préstamo'); return; }
        document.getElementById('pDate').value = new Date().toISOString().slice(0,10);
        document.getElementById('modal').classList.add('show');
      }
      function closeModal() { document.getElementById('modal').classList.remove('show'); }
      document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          loan_id: Number(document.getElementById('pLoan').value),
          payment_date: document.getElementById('pDate').value,
          amount: Number(document.getElementById('pAmount').value),
          type: document.getElementById('pType').value,
        };
        try {
          await api('/api/payments', 'POST', data);
          closeModal();
          showAlert('Pago registrado', 'success');
          const v = document.getElementById('loanSelect').value;
          if (v) loadPayments(v);
        } catch (err) { showAlert(err.message); }
      });

      function openPhotoModal(id) {
        document.getElementById('photoPaymentId').value = id;
        document.getElementById('photoFile').value = '';
        document.getElementById('alertPhoto').style.display = 'none';
        document.getElementById('photoModal').classList.add('show');
      }
      function closePhotoModal() { document.getElementById('photoModal').classList.remove('show'); }
      document.getElementById('photoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pid = document.getElementById('photoPaymentId').value;
        const file = document.getElementById('photoFile').files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('photo', file);
        try {
          const res = await fetch('/api/payments/' + pid + '/photo', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + getToken() },
            body: fd,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Error');
          closePhotoModal();
          showAlert('Foto subida correctamente', 'success');
          const v = document.getElementById('loanSelect').value;
          if (v) loadPayments(v);
        } catch (err) {
          const el = document.getElementById('alertPhoto');
          el.textContent = err.message; el.className = 'alert alert-error'; el.style.display = 'block';
        }
      });

      loadLoans();
    `,
  });
}
