import { NextResponse } from "next/server";

// Página de login MÍNIMA sin nada que pueda romperse
// Sin CSS externo, sin imports, sin nada complicado
export async function GET() {
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login simple | Préstamos Web</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0b2545; margin: 0; padding: 20px; }
    .card { max-width: 380px; margin: 60px auto; background: white; padding: 30px;
            border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    h1 { color: #0b2545; text-align: center; margin: 0 0 8px; font-size: 26px; }
    h1 span { color: #c9a14a; }
    p.subtitle { text-align: center; color: #c9a14a; font-size: 11px;
                letter-spacing: 2px; text-transform: uppercase; margin: 0 0 24px; }
    label { display: block; font-weight: 600; color: #0b2545; font-size: 13px; margin-bottom: 6px; }
    input[type="text"], input[type="password"] {
      width: 100%; padding: 11px; font-size: 14px; border: 1px solid #ccc;
      border-radius: 6px; margin-bottom: 14px; box-sizing: border-box;
    }
    button { width: 100%; padding: 12px; background: #0b2545; color: white; border: none;
             border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
    button:hover { background: #13315c; }
    button:disabled { background: #999; cursor: not-allowed; }
    .links { text-align: center; margin-top: 16px; font-size: 13px; }
    .links a { color: #0b2545; }
    .alert { padding: 10px; border-radius: 6px; margin-bottom: 14px;
             display: none; font-size: 13px; }
    .alert-error { background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
    .alert-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
    .debug { background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 11px;
             color: #555; margin-top: 14px; font-family: monospace; max-height: 150px;
             overflow-y: auto; display: none; }
    .show-pass { background: none; border: none; color: #5c5c5c; cursor: pointer;
                 width: auto; padding: 0; margin-left: 8px; font-size: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Préstamos<span>Web</span></h1>
    <p class="subtitle">Panel administrativo</p>

    <div id="alert" class="alert alert-error"></div>

    <label>Usuario</label>
    <input type="text" id="u" autocomplete="off" value="">

    <label>Contraseña</label>
    <div style="display:flex; align-items:center;">
      <input type="password" id="p" autocomplete="off" value="" style="margin-bottom:0; flex:1;">
      <button type="button" class="show-pass" onclick="document.getElementById('p').type = document.getElementById('p').type === 'password' ? 'text' : 'password';">👁</button>
    </div>

    <br>
    <button id="b" onclick="entrar()">Iniciar sesión</button>

    <div class="links">
      <a href="/recover-password">¿Olvidaste tu contraseña?</a>
    </div>

    <div id="d" class="debug"></div>
  </div>

  <script>
    function d(msg) {
      console.log(msg);
      var box = document.getElementById('d');
      box.style.display = 'block';
      box.innerHTML += msg + '<br>';
    }
    function showAlert(msg, type) {
      var el = document.getElementById('alert');
      el.textContent = msg;
      el.className = 'alert alert-' + (type || 'error');
      el.style.display = 'block';
    }
    function entrar() {
      d('Botón clickeado');
      var u = document.getElementById('u').value;
      var p = document.getElementById('p').value;
      d('Usuario: ' + u);
      d('Password length: ' + p.length);

      if (!u || !p) {
        showAlert('Ingresa usuario y contraseña', 'error');
        return;
      }

      var btn = document.getElementById('b');
      btn.disabled = true;
      btn.textContent = 'Ingresando...';

      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/login', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function() {
        d('XHR readyState: ' + xhr.readyState + ', status: ' + xhr.status);
        if (xhr.readyState === 4) {
          d('Respuesta: ' + xhr.responseText.substring(0, 200));
          try {
            var data = JSON.parse(xhr.responseText);
            if (xhr.status === 200) {
              // Guardar el token en localStorage (la cookie httpOnly se setea automáticamente
              // en la respuesta del server, pero la usamos también como flag para el frontend)
              localStorage.setItem('pw_auth', JSON.stringify(data));
              d('OK, redirigiendo al dashboard...');
              window.location.href = '/dashboard';
            } else {
              showAlert(data.error || 'Error en login', 'error');
              btn.disabled = false;
              btn.textContent = 'Iniciar sesión';
            }
          } catch(e) {
            d('Error parseando: ' + e.message);
            showAlert('Error del servidor', 'error');
            btn.disabled = false;
            btn.textContent = 'Iniciar sesión';
          }
        }
      };
      var body = JSON.stringify({ username: u, password: p });
      d('Enviando: ' + body);
      xhr.send(body);
    }

    // Enter key
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('u').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { document.getElementById('p').focus(); }
      });
      document.getElementById('p').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); entrar(); }
      });
      d('Página cargada OK');
    });
  </script>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
