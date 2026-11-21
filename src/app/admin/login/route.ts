import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(req: any) {
  // Si ya está logueado como admin, ir al dashboard admin
  const admin = getAdminFromRequest(req);
  if (admin) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  const css = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin Login | Préstamos Web</title>
  <style>${css}</style>
  <style>
    .admin-badge {
      position: absolute; top: 20px; right: 20px;
      background: #c62828; color: white; padding: 6px 14px;
      border-radius: 20px; font-size: 11px; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase;
    }
    .password-wrap { position: relative; }
    .password-wrap input { padding-right: 44px; }
    .toggle-eye {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; font-size: 18px; color: #5c5c5c;
      padding: 4px 8px;
    }
    .spinner { display: inline-block; width: 14px; height: 14px;
      border: 2px solid #fff; border-top-color: transparent; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin-right: 6px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .back-link { text-align:center; margin-top: 16px; font-size: 13px; }
    .back-link a { color: #0b2545; text-decoration: underline; }
  </style>
</head>
<body style="position:relative;">
  <div class="admin-badge">⚠ Panel Admin</div>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-logo">
        <h1>Préstamos<span>Web</span></h1>
        <p>Panel del Dueño del Sistema</p>
      </div>
      <div id="alert" class="alert alert-error" role="alert"></div>
      <form id="loginForm">
        <div class="field">
          <label for="username">Usuario</label>
          <input type="text" id="username" name="username" required autocomplete="username" placeholder="Tu usuario">
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <div class="password-wrap">
            <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="Tu contraseña">
            <button type="button" class="toggle-eye" onclick="togglePassword()" id="eyeBtn">👁</button>
          </div>
        </div>
        <button type="submit" id="submitBtn" class="btn btn-primary btn-block">Iniciar sesión</button>
        <div class="back-link">
          <a href="/">← Volver al login normal</a>
        </div>
      </form>
    </div>
  </div>

  <script>
    function togglePassword() {
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
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      if (!username || !password) { showAlert('Ingresa usuario y contraseña', 'error'); return; }
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Ingresando...';
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) {
          showAlert(data.error || 'Error en login', 'error');
          btn.disabled = false;
          btn.innerHTML = 'Iniciar sesión';
          return;
        }
        window.location.href = '/admin/dashboard';
      } catch (err) {
        showAlert('Error de conexión', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Iniciar sesión';
      }
    });
  </script>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
