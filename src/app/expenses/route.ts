import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  return renderPage({
    req,
    activeKey: "expenses",
    title: "Gastos",
    subtitle: "Egresos del negocio",
    allowedRoles: ["owner", "admin"],
    content: `
      <div class="panel">
        <div class="panel-header"><h2>Todos los gastos</h2>
          <button class="btn btn-gold btn-sm" onclick="openModal()">+ Registrar gasto</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead><tr><th>ID</th><th>Fecha</th><th>Descripción</th><th>Pagado a</th><th>Monto</th></tr></thead>
            <tbody id="expBody"><tr><td colspan="5" class="empty-state">Cargando...</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" id="modal">
        <div class="modal">
          <div class="modal-header"><h3>Registrar gasto</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="expForm">
              <div class="field"><label for="eDesc">Descripción</label>
                <input type="text" id="eDesc" required placeholder="Ej: Renta oficina">
              </div>
              <div class="form-grid">
                <div class="field"><label for="eAmount">Monto (Bs.)</label>
                  <input type="number" step="0.01" id="eAmount" required placeholder="1500.00">
                </div>
                <div class="field"><label for="eDate">Fecha</label>
                  <input type="date" id="eDate" required>
                </div>
              </div>
              <div class="field"><label for="ePaidTo">Pagado a</label>
                <input type="text" id="ePaidTo" placeholder="Ej: Inmobiliaria CA">
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
      async function loadExpenses() {
        const body = document.getElementById('expBody');
        body.innerHTML = '<tr><td colspan="5" class="empty-state">Cargando...</td></tr>';
        try {
          const rows = await api('/api/expenses');
          if (rows.length === 0) {
            body.innerHTML = '<tr><td colspan="5" class="empty-state">No hay gastos.</td></tr>';
            return;
          }
          body.innerHTML = rows.map(e => '<tr><td>' + e.id + '</td><td>' + esc(e.date) + '</td><td>' + esc(e.description) + '</td><td>' + esc(e.paid_to) + '</td><td>' + fmtBs(e.amount) + '</td></tr>').join('');
        } catch (err) {
          body.innerHTML = '<tr><td colspan="5" class="empty-state">Error: ' + esc(err.message) + '</td></tr>';
        }
      }
      function openModal() {
        document.getElementById('eDesc').value = '';
        document.getElementById('eAmount').value = '';
        document.getElementById('eDate').value = new Date().toISOString().slice(0,10);
        document.getElementById('ePaidTo').value = '';
        document.getElementById('modal').classList.add('show');
      }
      function closeModal() { document.getElementById('modal').classList.remove('show'); }
      document.getElementById('expForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          description: document.getElementById('eDesc').value.trim(),
          amount: Number(document.getElementById('eAmount').value),
          date: document.getElementById('eDate').value,
          paid_to: document.getElementById('ePaidTo').value.trim(),
        };
        try {
          await api('/api/expenses', 'POST', data);
          closeModal();
          showAlert('Gasto registrado', 'success');
          loadExpenses();
        } catch (err) { showAlert(err.message); }
      });
      loadExpenses();
    `,
  });
}
