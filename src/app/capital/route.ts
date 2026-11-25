import { NextRequest } from "next/server";
import { renderPage } from "@/lib/render";

export async function GET(req: NextRequest) {
  return renderPage({
    req,
    activeKey: "capital",
    title: "Capital",
    subtitle: "Control de capital por casa de empeño",
    content: `
      <div class="stats-grid">
        <div class="stat-card" style="border-left-color:#c62828;">
          <div class="stat-label">💵 Capital en la calle</div>
          <div class="stat-value" id="capitalCalle" style="font-size:22px;">—</div>
        </div>
        <div class="stat-card" style="border-left-color:#2e7d32;">
          <div class="stat-label">💰 Cobrado hoy</div>
          <div class="stat-value" id="cobradoHoy" style="font-size:22px;">—</div>
        </div>
        <div class="stat-card" style="border-left-color:#13315c;">
          <div class="stat-label">📦 Total prestado (histórico)</div>
          <div class="stat-value" id="totalPrestado" style="font-size:22px;">—</div>
        </div>
        <div class="stat-card" style="border-left-color:#c9a14a;">
          <div class="stat-label">📈 Ganancia (intereses)</div>
          <div class="stat-value" id="ganancia" style="font-size:22px;">—</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h2>Resumen</h2>
          <button class="btn btn-gold btn-sm" onclick="loadCapital()">↻ Actualizar</button>
        </div>
        <div class="panel-body">
          <p style="color:#5c5c5c; line-height:1.6;">
            <strong>Capital en la calle</strong>: es el dinero que tienes prestado actualmente (recuperable).<br>
            <strong>Cobrado hoy</strong>: lo que entró el día de hoy.<br>
            <strong>Total prestado</strong>: todo lo que has prestado desde que empezaste.<br>
            <strong>Ganancia</strong>: intereses cobrados (total cobrado - capital recuperado).
          </p>
        </div>
      </div>
    `,
    script: `
      async function loadCapital() {
        try {
          const data = await api('/api/capital');
          document.getElementById('capitalCalle').textContent = fmtBs(data.capital_calle);
          document.getElementById('cobradoHoy').textContent = fmtBs(data.cobrado_hoy);
          document.getElementById('totalPrestado').textContent = fmtBs(data.total_prestado);
          const gan = document.getElementById('ganancia');
          gan.textContent = fmtBs(data.ganancia);
          gan.style.color = data.ganancia >= 0 ? '#2e7d32' : '#c62828';
        } catch (e) {
          showAlert(e.message);
        }
      }
      loadCapital();
    `,
  });
}
