export const metadata = { title: "Iniciar sesión | Préstamos Web" };

export default function Page() {
  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <h1>Préstamos<span>Web</span></h1>
          <p>Panel administrativo</p>
        </div>
        <div id="alert" className="alert alert-error" role="alert"></div>
        <form id="loginForm">
          <div className="field">
            <label htmlFor="username">Usuario</label>
            <input type="text" id="username" name="username" required autoComplete="username" placeholder="Tu usuario" />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input type="password" id="password" name="password" required autoComplete="current-password" placeholder="Tu contraseña" />
          </div>
          <button type="submit" className="btn btn-primary btn-block">Iniciar sesión</button>
        </form>
        <div style={{ marginTop: 24, padding: 14, background: "#faf7f0", borderRadius: 8, fontSize: 12, color: "#5c5c5c" }}>
          <strong style={{ color: "#0b2545" }}>Acceso:</strong> Pide a tu administrador tu usuario y contraseña.
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
        function saveAuth(data){ localStorage.setItem('pw_auth', JSON.stringify(data)); }
        function showAlert(msg, type){
          const el = document.getElementById('alert');
          el.textContent = msg; el.className = 'alert alert-' + type; el.style.display = 'block';
          setTimeout(() => { el.style.display = 'none'; }, 5000);
        }
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const username = document.getElementById('username').value.trim();
          const password = document.getElementById('password').value;
          if (!username || !password) { showAlert('Ingresa usuario y contraseña', 'error'); return; }
          try {
            const res = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) { showAlert(data.error || 'Error en login', 'error'); return; }
            saveAuth(data);
            window.location.href = '/dashboard';
          } catch (err) {
            showAlert('Error de conexión', 'error');
          }
        });
      `}} />
    </div>
  );
}
