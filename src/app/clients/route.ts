import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  return renderPage({
    req,
    activeKey: "clients",
    title: "Clientes",
    subtitle: "Crear y listar clientes",
    content: `
      <div class="panel">
        <div class="panel-header"><h2>Todos los clientes</h2>
          <button class="btn btn-gold btn-sm" onclick="openModal()">+ Nuevo cliente</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Creado</th><th>Acciones</th></tr></thead>
            <tbody id="clientsBody"><tr><td colspan="4" class="empty-state">Cargando...</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" id="modal">
        <div class="modal">
          <div class="modal-header"><h3>Nuevo cliente</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="clientForm">
              <div class="field">
                <label for="name">Nombre completo</label>
                <input type="text" id="name" required placeholder="Ej: María González">
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
      async function loadClients() {
        const body = document.getElementById('clientsBody');
        body.innerHTML = '<tr><td colspan="4" class="empty-state">Cargando...</td></tr>';
        try {
          const rows = await api('/api/clients');
          if (!Array.isArray(rows) || rows.length === 0) {
            body.innerHTML = '<tr><td colspan="4" class="empty-state">No hay clientes. Crea el primero.</td></tr>';
            return;
          }
          body.innerHTML = rows.map(c => '<tr><td>' + c.id + '</td><td>' + esc(c.name) + '</td><td>' + esc((c.created_at||'').slice(0,10)) + '</td><td><a class="btn btn-sm btn-gold" href="/loans?client_id=' + c.id + '">Ver préstamos</a></td></tr>').join('');
        } catch (e) {
          body.innerHTML = '<tr><td colspan="4" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
        }
      }
      function openModal() {
        document.getElementById('modal').classList.add('show');
        document.getElementById('name').value = '';
        document.getElementById('name').focus();
      }
      function closeModal() { document.getElementById('modal').classList.remove('show'); }
      document.getElementById('clientForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        if (!name) return;
        try {
          await api('/api/clients', 'POST', { name });
          closeModal();
          showAlert('Cliente creado correctamente', 'success');
          loadClients();
        } catch (err) { showAlert(err.message); }
      });
      loadClients();
    `,
  });
}
