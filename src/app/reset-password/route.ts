import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
  const css = fs.readFileSync(cssPath, "utf8");

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Restablecer contraseña | Préstamos Web</title>
  <style>${css}</style>
  <style>
    .password-wrap { position: relative; }
    .password-wrap input { padding-right: 44px; }
    .password-wrap .toggle-eye {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; font-size: 18px; color: #5c5c5c;
      padding: 4px 8px;
    }
    .spinner { display: inline-block; width: 14px; height: 14px;
      border: 2px solid #fff; border-top-color: transparent; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin-right: 6px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .hint { font-size: 11px; color: #5c5c5c; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-logo">
        <h1>Préstamos<span>Web</span></h1>
        <p>Restablecer contraseña</p>
      </div>
      <div id="alert" class="alert" role="alert"></div>
      <form id="resetForm">
        <div class="field">
          <label for="password">Nueva contraseña</label>
          <div class="password-wrap">
            <input type="password" id="password" required minlength="8" placeholder="Mínimo 8 caracteres">
            <button type="button" class="toggle-eye" onclick="toggleP()" id="eyeBtn">👁</button>
          </div>
          <div class="hint">Mínimo 8 caracteres. Recomendamos: mayúsculas, números y símbolos.</div>
        </div>
        <div class="field">
          <label for="password2">Repetir contraseña</label>
          <input type="password" id="password2" required minlength="8" placeholder="Repite la nueva contraseña">
        </div>
        <button type="submit" id="submitBtn" class="btn btn-primary btn-block">Restablecer contraseña</button>
        <div style="text-align:center; margin-top: 16px;">
          <a href="/" style="color:#0b2545; font-size:13px; text-decoration:underline;">← Volver al login</a>
        </div>
      </form>
    </div>
  </div>
  <script>
    function toggleP() {
      const i = document.getElementById('password');
      const b = document.getElementById('eyeBtn');
      if (i.type === 'password') { i.type = 'text'; b.textContent = '🙈'; }
      else { i.type = 'password'; b.textContent = '👁'; }
    }
    function showAlert(msg, type) {
      const el = document.getElementById('alert');
      el.textContent = msg; el.className = 'alert alert-' + type; el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      if (!token) { showAlert('Token inválido. Solicita un nuevo enlace.', 'error'); return; }
      const p1 = document.getElementById('password').value;
      const p2 = document.getElementById('password2').value;
      if (p1.length < 8) { showAlert('La contraseña debe tener mínimo 8 caracteres', 'error'); return; }
      if (p1 !== p2) { showAlert('Las contraseñas no coinciden', 'error'); return; }
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Restableciendo...';
      try {
        const res = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password: p1 })
        });
        const data = await res.json();
        if (!res.ok) {
          showAlert(data.error || 'Error', 'error');
          btn.disabled = false;
          btn.innerHTML = 'Restablecer contraseña';
          return;
        }
        showAlert('Contraseña restablecida. Redirigiendo al login...', 'success');
        setTimeout(() => { window.location.href = '/'; }, 2000);
      } catch (err) {
        showAlert('Error de conexión', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Restablecer contraseña';
      }
    });
  </script>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
