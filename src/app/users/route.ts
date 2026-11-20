import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  return renderPage({
    req,
    activeKey: "users",
    title: "Usuarios",
    subtitle: "Gestión de usuarios del sistema",
    allowedRoles: ["owner"],
    content: `
      <div class="panel">
        <div class="panel-header"><h2>Todos los usuarios</h2>
          <button class="btn btn-gold btn-sm" onclick="openModal()">+ Nuevo usuario</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead><tr><th>ID</th><th>Usuario</th><th>Rol</th><th>Creado</th></tr></thead>
            <tbody id="usersBody"><tr><td colspan="4" class="empty-state">Cargando...</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" id="modal">
        <div class="modal">
          <div class="modal-header"><h3>Nuevo usuario</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="userForm">
              <div class="field"><label for="uUser">Usuario</label>
                <input type="text" id="uUser" required placeholder="Ej: cobrador2">
              </div>
              <div class="field"><label for="uPass">Contraseña (mínimo 8 caracteres)</label>
                <input type="password" id="uPass" required minlength="8" placeholder="Mínimo 8 caracteres">
              </div>
              <div class="field"><label for="uRole">Rol</label>
                <select id="uRole">
                  <option value="admin">Administrador</option>
                  <option value="collector">Cobrador</option>
                  <option value="owner">Dueño</option>
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
    `,
    script: `
      async function loadUsers() {
        const body = document.getElementById('usersBody');
        body.innerHTML = '<tr><td colspan="4" class="empty-state">Cargando...</td></tr>';
        try {
          const rows = await api('/api/users');
          if (rows.length === 0) {
            body.innerHTML = '<tr><td colspan="4" class="empty-state">No hay usuarios.</td></tr>';
            return;
          }
          const labels = { owner: 'Dueño', admin: 'Administrador', collector: 'Cobrador' };
          body.innerHTML = rows.map(u => '<tr><td>' + u.id + '</td><td>' + esc(u.username) + '</td><td><span class="badge badge-active">' + esc(labels[u.role]||u.role) + '</span></td><td>' + esc((u.created_at||'').slice(0,10)) + '</td></tr>').join('');
        } catch (err) {
          body.innerHTML = '<tr><td colspan="4" class="empty-state">Error: ' + esc(err.message) + '</td></tr>';
        }
      }
      function openModal() {
        document.getElementById('uUser').value = '';
        document.getElementById('uPass').value = '';
        document.getElementById('uRole').value = 'collector';
        document.getElementById('modal').classList.add('show');
      }
      function closeModal() { document.getElementById('modal').classList.remove('show'); }
      document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          username: document.getElementById('uUser').value.trim(),
          password: document.getElementById('uPass').value,
          role: document.getElementById('uRole').value,
        };
        try {
          await api('/api/users', 'POST', data);
          closeModal();
          showAlert('Usuario creado', 'success');
          loadUsers();
        } catch (err) { showAlert(err.message); }
      });
      loadUsers();
    `,
  });
}
