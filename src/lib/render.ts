import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, type AuthUser } from "./auth";

const ITEMS = [
  ["dashboard", "📊", "Dashboard"],
  ["clients", "👥", "Clientes"],
  ["loans", "💵", "Préstamos"],
  ["payments", "🧾", "Pagos"],
  ["collaterals", "🔒", "Garantías"],
  ["expenses", "💸", "Gastos"],
  ["users", "👤", "Usuarios"],
  ["audit", "📜", "Auditoría"],
];

const ROLE_PERMS: Record<string, string[]> = {
  owner: ["dashboard", "clients", "loans", "payments", "collaterals", "expenses", "users", "audit"],
  admin: ["dashboard", "clients", "loans", "payments", "collaterals", "expenses"],
  collector: ["dashboard", "clients", "loans", "payments"],
};
const ROLE_LABEL: Record<string, string> = {
  owner: "Dueño", admin: "Administrador", collector: "Cobrador",
};

function esc(s: string): string {
  return String(s || "").replace(/[&<>"']/g, (ch: string) => {
    const map: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    };
    return map[ch] || ch;
  });
}

export function renderPage(opts: {
  req: NextRequest;
  activeKey: string;
  title: string;
  subtitle?: string;
  content: string;
  script?: string;
  allowedRoles?: string[];
}) {
  const user = getUserFromRequest(opts.req);
  if (!user) {
    return NextResponse.redirect(new URL("/", opts.req.url));
  }
  const allowedRoles = opts.allowedRoles || ROLE_PERMS[user.role] || [];
  if (!allowedRoles.includes(opts.activeKey) && opts.allowedRoles) {
    // Si la página requiere roles específicos y el usuario no los tiene
    return NextResponse.redirect(new URL("/dashboard", opts.req.url));
  }

  const perms = ROLE_PERMS[user.role] || [];
  const sidebar = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <h2>Préstamos<span>Web</span></h2>
        <span class="role-badge">${esc(ROLE_LABEL[user.role] || user.role)}</span>
        <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:6px;">${esc(user.username)}</div>
      </div>
      <ul class="sidebar-menu">
        ${ITEMS.map(([key, emoji, label]) => {
          if (!perms.includes(key)) return "";
          return `<li><a href="/${key}"${key === opts.activeKey ? ' class="active"' : ""}><span class="emoji">${emoji}</span> ${label}</a></li>`;
        }).join("")}
      </ul>
      <div class="sidebar-footer">
        <form action="/api/logout" method="POST" style="margin:0;">
          <button type="submit" style="width:100%;padding:9px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(201,161,74,0.3);border-radius:6px;cursor:pointer;font-size:13px;font-family:inherit;">Cerrar sesión</button>
        </form>
      </div>
    </aside>
  `;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(opts.title)} | Préstamos Web</title>
  <link rel="stylesheet" href="/_styles.css">
</head>
<body>
  <div class="layout">
    ${sidebar}
    <main class="main-content">
      <div class="page-header">
        <div>
          <h1>${esc(opts.title)}</h1>
          ${opts.subtitle ? `<p>${esc(opts.subtitle)}</p>` : ""}
        </div>
      </div>
      <div id="alert" class="alert"></div>
      ${opts.content}
    </main>
  </div>
  <script>
    function getToken(){ try { const a = JSON.parse(localStorage.getItem('pw_auth')); return a ? a.token : null; } catch { return null; } }
    async function api(path, method='GET', body=null, isForm=false){
      const token = getToken();
      if (!token) { window.location.href = '/'; return; }
      const opts = { method, headers: { 'Authorization': 'Bearer ' + token } };
      if (body) {
        if (isForm) { opts.body = body; }
        else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      }
      const res = await fetch(path, opts);
      if (res.status === 401) { window.location.href = '/'; return; }
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Error');
      return data;
    }
    function fmtBs(v){ if (v==null||isNaN(v)) return '-'; return 'Bs. ' + Number(v).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
    function esc(s){ return String(s||'').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]); }
    function showAlert(msg, type='error'){
      const el = document.getElementById('alert');
      if (!el) return alert(msg);
      el.textContent = msg; el.className = 'alert alert-' + type; el.style.display = 'block';
      setTimeout(()=>{ el.style.display='none'; }, 4000);
    }
    ${opts.script || ""}
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
