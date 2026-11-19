import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  return renderPage({
    req,
    activeKey: "dashboard",
    title: "Dashboard",
    subtitle: "Resumen general del sistema de préstamos",
    content: `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Clientes registrados</div>
          <div class="stat-value" id="totalClients">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Préstamos activos</div>
          <div class="stat-value" id="totalLoans">—</div>
        </div>
        <div class="stat-card" id="cardPayments" style="display:none;">
          <div class="stat-label">Total ingresos (pagos)</div>
          <div class="stat-value" id="totalPayments" style="font-size:22px;">—</div>
        </div>
        <div class="stat-card" id="cardExpenses" style="display:none;">
          <div class="stat-label">Total gastos</div>
          <div class="stat-value" id="totalExpenses" style="font-size:22px;">—</div>
        </div>
        <div class="stat-card" id="cardNet" style="display:none;">
          <div class="stat-label">Resultado neto</div>
          <div class="stat-value" id="netIncome" style="font-size:22px;">—</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>Bienvenido</h2></div>
        <div class="panel-body">
          <p style="color:#5c5c5c;line-height:1.6;">Usa el menú de la izquierda para navegar por las secciones permitidas para tu rol.</p>
        </div>
      </div>
    `,
    script: `
      (async () => {
        try {
          const u = JSON.parse(localStorage.getItem('pw_auth')).user;
          const canSeeFinance = (u.role === 'owner' || u.role === 'admin');
          if (canSeeFinance) {
            document.getElementById('cardPayments').style.display = '';
            document.getElementById('cardExpenses').style.display = '';
            document.getElementById('cardNet').style.display = '';
          }
        } catch {}
        try {
          const d = await api('/api/dashboard');
          document.getElementById('totalClients').textContent = d.total_clients;
          document.getElementById('totalLoans').textContent = d.total_active_loans;
        } catch (e) { console.error(e); }
        try {
          const r = await api('/api/report/summary');
          document.getElementById('totalPayments').textContent = fmtBs(r.total_payments);
          document.getElementById('totalExpenses').textContent = fmtBs(r.total_expenses);
          const net = document.getElementById('netIncome');
          net.textContent = fmtBs(r.net_income);
          net.style.color = r.net_income >= 0 ? '#2e7d32' : '#c62828';
        } catch (e) { console.error(e); }
      })();
    `,
  });
}
