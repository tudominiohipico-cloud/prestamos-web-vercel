import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin-auth";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const css = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Casas | Admin Préstamos Web</title>
  <style>${css}</style>
  <style>
    .admin-header { background: linear-gradient(135deg, #c62828 0%, #8b1a1a 100%);
      color: white; padding: 20px 24px; margin-bottom: 24px; border-radius: 12px; }
    .admin-header h1 { font-size: 22px; margin: 0; }
    .admin-header p { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    table th { background: #c62828 !important; color: white !important; }
    .status-active { background: #e8f5e9; color: #2e7d32; padding: 3px 9px;
      border-radius: 10px; font-size: 11px; font-weight: 600; }
    .status-inactive { background: #ffebee; color: #c62828; padding: 3px 9px;
      border-radius: 10px; font-size: 11px; font-weight: 600; }
    .modal-overlay { display:none; position:fixed; inset:0; background:rgba(11,37,69,0.6);
      z-index:200; align-items:center; justify-content:center; padding:20px; }
    .modal-overlay.show { display:flex; }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <h2>Préstamos<span>Web</span></h2>
        <span class="role-badge" style="background:rgba(198,40,40,0.2);color:#ff6b6b;">SUPER ADMIN</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:6px;">${admin.username}</div>
      </div>
      <ul class="sidebar-menu">
        <li><a href="/admin/dashboard"><span class="emoji">📊</span> Dashboard</a></li>
        <li><a href="/admin/houses" class="active"><span class="emoji">🏠</span> Casas de empeño</a></li>
      </ul>
      <div class="sidebar-footer">
        <button type="button" onclick="window.doLogout()" style="width:100%;padding:9px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(201,161,74,0.3);border-radius:6px;cursor:pointer;font-size:13px;font-family:inherit;">Cerrar sesión</button>
      </div>
    </aside>
    <main class="main-content">
      <div class="admin-header">
        <h1>🏠 Casas de Empeño</h1>
        <p>Aquí creas y gestionas cada casa de empeño que alquila tu sistema.</p>
      </div>

      <div id="alert" class="alert"></div>

      <div class="panel">
        <div class="panel-header">
          <h2>Todas las casas</h2>
          <button class="btn btn-gold btn-sm" onclick="openModal()">+ Nueva casa</button>
        </div>
        <div class="panel-body no-pad">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Plan</th>
                <th>Cuota/Comisión</th>
                <th>Usuarios</th>
                <th>Clientes</th>
                <th>Estado</th>
                <th>Creada</th>
              </tr>
            </thead>
            <tbody id="housesBody">
              <tr><td colspan="8" class="empty-state">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>

  <div class="modal-overlay" id="modal">
    <div class="modal">
      <div class="modal-header">
        <h3>Crear nueva casa de empeño</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div id="modalAlert" class="alert"></div>
        <form id="houseForm">
          <h4 style="margin-bottom:10px;color:#0b2545;font-size:14px;">Datos de la casa</h4>
          <div class="field">
            <label for="hName">Nombre de la casa *</label>
            <input type="text" id="hName" required placeholder="Ej: Casa Gota">
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="hPlan">Plan</label>
              <select id="hPlan">
                <option value="fixed">Cuota fija mensual</option>
                <option value="commission">% de comisión</option>
              </select>
            </div>
            <div class="field">
              <label for="hFee">Cuota mensual (Bs.)</label>
              <input type="number" step="0.01" id="hFee" value="0">
            </div>
            <div class="field">
              <label for="hCommission">% Comisión</label>
              <input type="number" step="0.01" id="hCommission" value="0">
            </div>
          </div>
          <h4 style="margin:20px 0 10px;color:#0b2545;font-size:14px;">Usuario dueño de la casa</h4>
          <div class="form-grid">
            <div class="field">
              <label for="oUser">Usuario del dueño *</label>
              <input type="text" id="oUser" required placeholder="pedro_prestamista">
            </div>
            <div class="field">
              <label for="oPass">Contraseña del dueño *</label>
              <input type="text" id="oPass" required minlength="6" placeholder="Mínimo 6 caracteres">
            </div>
          </div>
          <div class="field">
            <label for="oEmail">Email del dueño (recuperar contraseña)</label>
            <input type="email" id="oEmail" placeholder="pedro@correo.com">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-sm" style="background:#f1ede4" onclick="closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm">Crear casa</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script>
    async function api(path, method='GET', body=null){
      const opts = { method, headers: {} };
      if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      const res = await fetch(path, opts);
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Error');
      return data;
    }
    async function doLogout() {
      try { await fetch('/api/admin/logout', { method: 'POST' }); } catch {}
      localStorage.removeItem('pw_admin');
      window.location.href = '/admin/login';
    }
    function fmtBs(v){ if (v==null||isNaN(v)) return '-'; return 'Bs. ' + Number(v).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
    function esc(s){ return String(s||'').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]); }
    function showAlert(id, msg, type='error'){
      const el = document.getElementById(id);
      if (!el) return alert(msg);
      el.textContent = msg; el.className = 'alert alert-' + type; el.style.display = 'block';
      setTimeout(()=>{ el.style.display='none'; }, 5000);
    }
    function openModal(){ document.getElementById('modal').classList.add('show'); }
    function closeModal(){ document.getElementById('modal').classList.remove('show'); }

    async function loadHouses() {
      const body = document.getElementById('housesBody');
      body.innerHTML = '<tr><td colspan="8" class="empty-state">Cargando...</td></tr>';
      try {
        const rows = await api('/api/admin/houses');
        if (rows.length === 0) {
          body.innerHTML = '<tr><td colspan="8" class="empty-state">Aún no hay casas. Crea la primera.</td></tr>';
          return;
        }
        body.innerHTML = rows.map(h => '<tr><td>' + h.id + '</td><td>' + esc(h.name) + '</td><td>' + (h.plan === 'fixed' ? 'Cuota fija' : '% Comisión') + '</td><td>' + (h.plan === 'fixed' ? fmtBs(h.monthly_fee) : (h.commission_pct + '%')) + '</td><td>' + h.user_count + '</td><td>' + h.client_count + '</td><td><span class="' + (h.status === 'active' ? 'status-active' : 'status-inactive') + '">' + esc(h.status) + '</span></td><td>' + esc((h.created_at||'').slice(0,10)) + '</td></tr>').join('');
      } catch (e) {
        body.innerHTML = '<tr><td colspan="8" class="empty-state">Error: ' + esc(e.message) + '</td></tr>';
      }
    }

    document.getElementById('houseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name: document.getElementById('hName').value.trim(),
        plan: document.getElementById('hPlan').value,
        monthly_fee: Number(document.getElementById('hFee').value),
        commission_pct: Number(document.getElementById('hCommission').value),
        owner_username: document.getElementById('oUser').value.trim(),
        owner_password: document.getElementById('oPass').value,
        owner_email: document.getElementById('oEmail').value.trim(),
      };
      try {
        await api('/api/admin/houses', 'POST', data);
        closeModal();
        showAlert('alert', 'Casa creada correctamente', 'success');
        loadHouses();
        document.getElementById('houseForm').reset();
      } catch (err) {
        showAlert('modalAlert', err.message);
      }
    });

    loadHouses();
  </script>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
