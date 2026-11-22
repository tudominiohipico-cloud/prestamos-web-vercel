import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  return renderPage({
    req,
    activeKey: "motorizados",
    title: "Motorizados",
    subtitle: "Cobradores en moto - gestión de rutas",
    content: `
      <div class="panel">
        <div class="panel-header">
          <h2>Todos los motorizados</h2>
          <button class="btn btn-gold btn-sm" onclick="openModal()">+ Nuevo motorizado</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Préstamos activos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="motBody">
              <tr><td colspan="5" class="empty-state">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" id="modal">
        <div class="modal">
          <div class="modal-header">
            <h3>Nuevo motorizado</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="modalAlert" class="alert"></div>
            <form id="motForm">
              <div class="field">
                <label for="nombre">Nombre completo *</label>
                <input type="text" id="nombre" required placeholder="Ej: Carlos Pérez">
              </div>
              <div class="field">
                <label for="telefono">Teléfono</label>
                <input type="text" id="telefono" placeholder="+58 412-555.1234">
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
      async function loadMotorizados() {
        const body = document.getElementById('motBody');
        body.innerHTML = '<tr><td colspan="5" class="empty-state">Cargando...</td></tr>';
        try {
          const rows = await api('/api/motorizados');
          if (rows.length === 0) {
            body.innerHTML = '<tr><td colspan="5" class="empty-state">No hay motorizados. Crea el primero.</td></tr>';
            return;
          }
          body.innerHTML = rows.map(m => '<tr><td>' + m.id + '</td><td>' + esc(m.nombre) + '</td><td>' + esc(m.telefono||'-') + '</td><td>' + (m.prestamos_activos||0) + '</td><td><a class="btn btn-sm btn-gold" href="/ruta-diaria?motorizado_id=' + m.id + '">Ver ruta</a></td></tr>').join('');
        } catch (e) {
          body.innerHTML = '<tr><td colspan="5" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
        }
      }

      function openModal() {
        document.getElementById('nombre').value = '';
        document.getElementById('telefono').value = '';
        document.getElementById('modal').classList.add('show');
      }
      function closeModal() { document.getElementById('modal').classList.remove('show'); }

      document.getElementById('motForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          nombre: document.getElementById('nombre').value.trim(),
          telefono: document.getElementById('telefono').value.trim(),
        };
        try {
          await api('/api/motorizados', 'POST', data);
          closeModal();
          showAlert('Motorizado creado', 'success');
          loadMotorizados();
        } catch (err) { showAlert('modalAlert', err.message); }
      });

      loadMotorizados();
    `,
  });
}
