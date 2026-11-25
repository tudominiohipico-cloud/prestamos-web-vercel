import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  return renderPage({
    req,
    activeKey: "clients",
    title: "Clientes",
    subtitle: "Ficha completa del cliente con referencias",
    content: `
      <div class="panel">
        <div class="panel-header">
          <h2>Todos los clientes</h2>
          <button class="btn btn-gold btn-sm" onclick="openModal()">+ Nuevo cliente</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Cédula</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>QR</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="clientsBody">
              <tr><td colspan="7" class="empty-state">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" id="modal">
        <div class="modal" style="max-width:600px;">
          <div class="modal-header">
            <h3>Ficha del cliente</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="modalAlert" class="alert"></div>
            <form id="clientForm">
              <h4 style="margin-bottom:10px;color:#0b2545;font-size:14px;border-bottom:1px solid #e3dccc;padding-bottom:6px;">Datos personales</h4>
              <div class="field">
                <label for="name">Nombre completo *</label>
                <input type="text" id="name" required placeholder="Ej: María González">
              </div>
              <div class="form-grid">
                <div class="field">
                  <label for="cedula">Cédula</label>
                  <input type="text" id="cedula" placeholder="V-12345678">
                </div>
                <div class="field">
                  <label for="phone">Teléfono</label>
                  <input type="text" id="phone" placeholder="+58 412-555.1234">
                </div>
              </div>
              <div class="field">
                <label for="email">Correo electrónico</label>
                <input type="email" id="email" placeholder="cliente@correo.com">
              </div>
              <div class="field">
                <label for="direccion">Dirección</label>
                <textarea id="direccion" rows="2" placeholder="Calle, casa, urbanización, ciudad"></textarea>
              </div>

              <h4 style="margin:20px 0 10px;color:#0b2545;font-size:14px;border-bottom:1px solid #e3dccc;padding-bottom:6px;">Referencias</h4>
              <div class="form-grid">
                <div class="field">
                  <label for="ref_personal_nombre">Ref. personal (nombre)</label>
                  <input type="text" id="ref_personal_nombre" placeholder="Ej: José Pérez">
                </div>
                <div class="field">
                  <label for="ref_personal_tel">Ref. personal (teléfono)</label>
                  <input type="text" id="ref_personal_tel" placeholder="+58 412-555.1111">
                </div>
              </div>
              <div class="form-grid">
                <div class="field">
                  <label for="ref_familiar_nombre">Ref. familiar (nombre)</label>
                  <input type="text" id="ref_familiar_nombre" placeholder="Ej: Ana González (hermana)">
                </div>
                <div class="field">
                  <label for="ref_familiar_tel">Ref. familiar (teléfono)</label>
                  <input type="text" id="ref_familiar_tel" placeholder="+58 412-555.2222">
                </div>
              </div>

              <h4 style="margin:20px 0 10px;color:#0b2545;font-size:14px;border-bottom:1px solid #e3dccc;padding-bottom:6px;">Trabajo e ingresos</h4>
              <div class="form-grid">
                <div class="field">
                  <label for="lugar_trabajo">Lugar de trabajo</label>
                  <input type="text" id="lugar_trabajo" placeholder="Ej: Panadería El Sol">
                </div>
                <div class="field">
                  <label for="ingreso_mensual">Ingreso mensual (Bs.)</label>
                  <input type="number" step="0.01" id="ingreso_mensual" value="0" placeholder="5000">
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-sm" style="background:#f1ede4" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary btn-sm">Guardar cliente</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Modal para ver QR del cliente -->
      <div class="modal-overlay" id="qrModal">
        <div class="modal" style="max-width:400px;text-align:center;">
          <div class="modal-header">
            <h3>QR del cliente</h3>
            <button class="modal-close" onclick="closeQrModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="qrContent" style="padding:20px;">
              <p style="color:#5c5c5c;">Cargando QR...</p>
            </div>
            <p style="font-size:12px;color:#5c5c5c;margin-top:10px;">
              Este QR es único para este cliente. El motorizado lo escanea cuando cobra en efectivo.
            </p>
          </div>
        </div>
      </div>
    `,
    script: `
      async function loadClients() {
        const body = document.getElementById('clientsBody');
        body.innerHTML = '<tr><td colspan="7" class="empty-state">Cargando...</td></tr>';
        try {
          const rows = await api('/api/clients');
          if (!Array.isArray(rows) || rows.length === 0) {
            body.innerHTML = '<tr><td colspan="7" class="empty-state">No hay clientes. Crea el primero.</td></tr>';
            return;
          }
          body.innerHTML = rows.map(c => '<tr><td>' + c.id + '</td><td>' + esc(c.name) + '</td><td>' + esc(c.cedula||'-') + '</td><td>' + esc(c.phone||'-') + '</td><td>' + esc(c.email||'-') + '</td><td>' + (c.qr_token ? '<button class="btn btn-sm" style="background:#f1ede4" onclick="viewQr(' + c.id + ')">📱 Ver QR</button>' : '-') + '</td><td><a class="btn btn-sm btn-gold" href="/loans?client_id=' + c.id + '">Ver préstamos</a></td></tr>').join('');
        } catch (e) {
          body.innerHTML = '<tr><td colspan="7" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
        }
      }
      function openModal() {
        ['name','cedula','phone','email','direccion','ref_personal_nombre','ref_personal_tel','ref_familiar_nombre','ref_familiar_tel','lugar_trabajo','ingreso_mensual'].forEach(f => document.getElementById(f).value = f === 'ingreso_mensual' ? '0' : '');
        document.getElementById('modal').classList.add('show');
        document.getElementById('name').focus();
      }
      function closeModal() { document.getElementById('modal').classList.remove('show'); }

      async function viewQr(clientId) {
        document.getElementById('qrModal').classList.add('show');
        document.getElementById('qrContent').innerHTML = '<p style="color:#5c5c5c;">Cargando QR...</p>';
        try {
          const data = await api('/api/clients/' + clientId + '/qr');
          document.getElementById('qrContent').innerHTML =
            '<h4 style="color:#0b2545;margin-bottom:10px;">' + esc(data.client_name) + '</h4>' +
            '<img src="' + data.qr_image + '" alt="QR" style="max-width:250px;width:100%;border:4px solid #0b2545;border-radius:8px;">' +
            '<p style="font-size:11px;color:#888;margin-top:10px;font-family:monospace;">Token: ' + esc(data.qr_token) + '</p>';
        } catch (e) {
          document.getElementById('qrContent').innerHTML = '<p style="color:#c62828;">Error: ' + esc(e.message) + '</p>';
        }
      }
      function closeQrModal() { document.getElementById('qrModal').classList.remove('show'); }

      document.getElementById('clientForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          name: document.getElementById('name').value.trim(),
          cedula: document.getElementById('cedula').value.trim(),
          phone: document.getElementById('phone').value.trim(),
          email: document.getElementById('email').value.trim(),
          direccion: document.getElementById('direccion').value.trim(),
          ref_personal_nombre: document.getElementById('ref_personal_nombre').value.trim(),
          ref_personal_tel: document.getElementById('ref_personal_tel').value.trim(),
          ref_familiar_nombre: document.getElementById('ref_familiar_nombre').value.trim(),
          ref_familiar_tel: document.getElementById('ref_familiar_tel').value.trim(),
          lugar_trabajo: document.getElementById('lugar_trabajo').value.trim(),
          ingreso_mensual: Number(document.getElementById('ingreso_mensual').value),
        };
        if (!data.name) { showAlert('modalAlert', 'Ingresa el nombre'); return; }
        try {
          await api('/api/clients', 'POST', data);
          closeModal();
          showAlert('Cliente creado correctamente (con QR único)', 'success');
          loadClients();
        } catch (err) { showAlert('modalAlert', err.message); }
      });

      loadClients();
    `,
  });
}
