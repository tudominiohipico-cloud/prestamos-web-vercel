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
    .debug-box {
      margin-top: 16px; padding: 10px; background: #f5f5f5;
      border: 1px solid #ddd; border-radius: 6px;
      font-family: monospace; font-size: 11px; color: #666;
      max-height: 120px; overflow-y: auto;
    }
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

      <!-- SIN form, solo inputs y un button con onclick. Más robusto. -->
      <div>
        <div class="field">
          <label for="username">Usuario</label>
          <input type="text" id="username" name="username" autocomplete="username" placeholder="Tu usuario" value="">
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <div class="password-wrap">
            <input type="password" id="password" name="password" autocomplete="current-password" placeholder="Tu contraseña" value="">
            <button type="button" class="toggle-eye" onclick="window.togglePassword && window.togglePassword()" id="eyeBtn" aria-label="Mostrar/ocultar contraseña">👁</button>
          </div>
        </div>
        <button type="button" id="submitBtn" class="btn btn-primary btn-block" onclick="window.doLogin && window.doLogin()">Iniciar sesión</button>
        <div class="links-row">
          <a href="/recover-password">¿Olvidaste tu contraseña?</a>
          <a href="#" onclick="window.showSetupHint && window.showSetupHint(); return false;">¿Primera vez?</a>
        </div>
      </div>

      <div id="setupHint" class="setup-hint" style="display:none;">
        <strong>Primera vez usando el sistema:</strong>
        <p style="margin-top:6px;">Si la base de datos está vacía, visita primero:<br>
        <a href="/api/setup" style="color:#0b2545;">/api/setup</a> para crear las tablas y el usuario por defecto.</p>
      </div>

      <div id="debugBox" class="debug-box" style="display:none;"></div>
    </div>
  </div>

  <script>
    // Función para mostrar mensajes de debug (visible en consola y en caja)
    function debug(msg) {
      console.log('[login]', msg);
      try {
        var box = document.getElementById('debugBox');
        if (box) {
          box.style.display = 'block';
          box.innerHTML += msg + '<br>';
          box.scrollTop = box.scrollHeight;
        }
      } catch(e) {}
    }

    // Toggle del ojo para mostrar/ocultar contraseña
    window.togglePassword = function() {
      debug('togglePassword llamado');
      try {
        var input = document.getElementById('password');
        var btn = document.getElementById('eyeBtn');
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.textContent = '👁';
        }
      } catch(e) {
        debug('Error en togglePassword: ' + e.message);
      }
    };

    // Mostrar pista de setup
    window.showSetupHint = function() {
      var el = document.getElementById('setupHint');
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    };

    // Mostrar alerta
    window.showAlert = function(msg, type) {
      var el = document.getElementById('alert');
      el.textContent = msg;
      el.className = 'alert alert-' + (type || 'error');
      el.style.display = 'block';
      setTimeout(function() { el.style.display = 'none'; }, 5000);
    };

    // Función principal de login
    window.doLogin = function() {
      debug('doLogin llamado');
      var btn = document.getElementById('submitBtn');
      var username = document.getElementById('username').value.trim();
      var password = document.getElementById('password').value;
      debug('usuario: ' + username + ', password length: ' + password.length);

      if (!username || !password) {
        window.showAlert('Ingresa usuario y contraseña', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Ingresando...';

      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      })
      .then(function(res) {
        debug('Respuesta HTTP: ' + res.status);
        return res.json().then(function(data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function(result) {
        debug('Datos: ' + JSON.stringify(result.data));
        if (!result.ok) {
          window.showAlert(result.data.error || 'Error en login', 'error');
          btn.disabled = false;
          btn.innerHTML = 'Iniciar sesión';
          return;
        }
        try {
          localStorage.setItem('pw_auth', JSON.stringify(result.data));
        } catch(e) {
          debug('Error guardando en localStorage: ' + e.message);
        }
        debug('Redirigiendo a /dashboard...');
        window.location.href = '/dashboard';
      })
      .catch(function(err) {
        debug('Error fetch: ' + err.message);
        window.showAlert('Error de conexión: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Iniciar sesión';
      });
    };

    // Permitir presionar Enter en los inputs
    document.addEventListener('DOMContentLoaded', function() {
      debug('DOM cargado');
      var userInput = document.getElementById('username');
      var passInput = document.getElementById('password');
      userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); passInput.focus(); }
      });
      passInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); window.doLogin(); }
      });
      debug('Listeners de Enter conectados');
    });

    debug('Script cargado OK. Listo para login.');
  </script>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
