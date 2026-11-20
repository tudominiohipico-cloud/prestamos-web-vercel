import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import type { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  // Si el usuario ya tiene token válido, lo mandamos al dashboard
  const user = getUserFromRequest(req);
  if (user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Cargar el CSS para inlinearlo
  const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
  const css = fs.readFileSync(cssPath, "utf8");

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Iniciar sesión | Préstamos Web</title>
  <style>${css}</style>
  <style>
    .password-wrap { position: relative; }
    .password-wrap input { padding-right: 44px; }
    .password-wrap .toggle-eye {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; font-size: 18px; color: #5c5c5c;
      padding: 4px 8px;
    }
    .links-row { display: flex; justify-content: space-between; margin-top: 14px; font-size: 13px; }
    .links-row a { color: #0b2545; text-decoration: underline; }
    .links-row a:hover { color: #a07d2c; }
    .setup-hint {
      margin-top: 24px; padding: 14px; background: #fff3cd; border: 1px solid #ffeaa7;
      border-radius: 8px; font-size: 12px; color: #856404;
    }
    .spinner {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid #fff; border-top-color: transparent; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin-right: 6px; vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-logo">
        <h1>Préstamos<span>Web</span></h1>
        <p>Panel administrativo</p>
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
            <button type="button" class="toggle-eye" onclick="togglePassword()" id="eyeBtn" aria-label="Mostrar/ocultar contraseña">👁</button>
          </div>
        </div>
        <button type="submit" id="submitBtn" class="btn btn-primary btn-block">Iniciar sesión</button>
        <div class="links-row">
          <a href="/recover-password">¿Olvidaste tu contraseña?</a>
          <a href="#" onclick="showSetupHint(); return false;">¿Primera vez?</a>
        </div>
      </form>
      <div id="setupHint" class="setup-hint" style="display:none;">
        <strong>Primera vez usando el sistema:</strong>
        <p style="margin-top:6px;">Si la base de datos está vacía, visita primero:<br>
        <code style="background:#fff; padding:2px 6px; border-radius:3px;">/api/setup</code><br>
        para crear las tablas y el usuario por defecto.</p>
      </div>
    </div>
  </div>

  <script>
    function togglePassword() {
      const input = document.getElementById('password');
      const btn = document.getElementById('eyeBtn');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁';
      }
    }
    function showSetupHint() {
      const el = document.getElementById('setupHint');
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
    function showAlert(msg, type) {
      const el = document.getElementById('alert');
      el.textContent = msg;
      el.className = 'alert alert-' + type;
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      if (!username || !password) {
        showAlert('Ingresa usuario y contraseña', 'error');
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Ingresando...';
      try {
        const res = await fetch('/api/login', {
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
        localStorage.setItem('pw_auth', JSON.stringify(data));
        window.location.href = '/dashboard';
      } catch (err) {
        showAlert('Error de conexión. Revisa tu internet.', 'error');
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
