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
  <title>Recuperar contraseña | Préstamos Web</title>
  <style>${css}</style>
  <style>
    .spinner { display: inline-block; width: 14px; height: 14px;
      border: 2px solid #fff; border-top-color: transparent; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin-right: 6px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .info-box { margin-top: 20px; padding: 14px; background: #e8f5e9; border: 1px solid #c8e6c9;
      border-radius: 8px; font-size: 13px; color: #2e7d32; }
  </style>
</head>
<body>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-logo">
        <h1>Préstamos<span>Web</span></h1>
        <p>Recuperar contraseña</p>
      </div>
      <div id="alert" class="alert" role="alert"></div>
      <form id="recoverForm">
        <div class="field">
          <label for="email">Correo electrónico del usuario</label>
          <input type="email" id="email" name="email" required placeholder="tu@correo.com">
        </div>
        <button type="submit" id="submitBtn" class="btn btn-primary btn-block">Enviar enlace de recuperación</button>
        <div style="text-align:center; margin-top: 16px;">
          <a href="/" style="color:#0b2545; font-size:13px; text-decoration:underline;">← Volver al login</a>
        </div>
      </form>
      <div id="infoBox" class="info-box" style="display:none;">
        <strong>✅ Solicitud recibida.</strong>
        <p id="infoText" style="margin-top:6px;"></p>
      </div>
    </div>
  </div>
  <script>
    function showAlert(msg, type) {
      const el = document.getElementById('alert');
      el.textContent = msg; el.className = 'alert alert-' + type; el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
    document.getElementById('recoverForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const email = document.getElementById('email').value.trim();
      if (!email) { showAlert('Ingresa tu correo', 'error'); return; }
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Enviando...';
      try {
        const res = await fetch('/api/recover-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        // Siempre mostramos el mismo mensaje para no revelar si el email existe o no
        const infoBox = document.getElementById('infoBox');
        const infoText = document.getElementById('infoText');
        infoText.textContent = 'Si el correo está registrado, recibiste un enlace para restablecer tu contraseña. ' +
          (data.preview_note || 'Revisa tu bandeja de entrada y spam.');
        infoBox.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = 'Enviar enlace de recuperación';
        document.getElementById('email').value = '';
      } catch (err) {
        showAlert('Error de conexión. Intenta de nuevo.', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Enviar enlace de recuperación';
      }
    });
  </script>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
