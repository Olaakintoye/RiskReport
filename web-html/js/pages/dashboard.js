import { api } from '../services/api.js';

export function DashboardPage() {
  const root = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'section-title';
  header.innerHTML = '<h2>Dashboard</h2><span class="pill">Overview</span>';

  const grid = document.createElement('div');
  grid.className = 'cards';

  const statusCard = document.createElement('div');
  statusCard.className = 'card';
  statusCard.innerHTML = `
    <h3>Server Status</h3>
    <div class="muted" id="status-text">Checking…</div>
  `;

  const kpiCard = document.createElement('div');
  kpiCard.className = 'card';
  kpiCard.innerHTML = `
    <h3>Key Metrics</h3>
    <div class="kpi">
      <div class="box"><div class="label">Risk</div><div class="value" id="kpi-risk">–</div></div>
      <div class="box"><div class="label">Volatility</div><div class="value" id="kpi-vol">–</div></div>
      <div class="box"><div class="label">Sharpe</div><div class="value" id="kpi-sharpe">–</div></div>
    </div>
  `;

  const quickRunCard = document.createElement('div');
  quickRunCard.className = 'card';
  quickRunCard.innerHTML = `
    <h3>Quick VaR</h3>
    <div class="row">
      <label class="pill">CL</label>
      <select id="cl">
        <option value="0.95">95%</option>
        <option value="0.99">99%</option>
      </select>
      <label class="pill">H</label>
      <input id="horizon" type="number" class="grow" value="1" min="1" />
      <button id="run" class="primary">Run</button>
    </div>
    <div class="spacer"></div>
    <div class="img-frame"><img id="var-chart" alt="VaR Chart"/></div>
  `;

  grid.appendChild(statusCard);
  grid.appendChild(kpiCard);
  grid.appendChild(quickRunCard);

  root.appendChild(header);
  root.appendChild(grid);

  // Data fetching
  api.status()
    .then((s) => {
      document.getElementById('status-text').textContent = `${s.status} — ${s.message}`;
    })
    .catch(() => {
      document.getElementById('status-text').textContent = 'Server unavailable';
    });

  // Simple demo KPIs via latest charts exists check
  api.latestCharts().then((res) => {
    const hasCharts = !!res?.success;
    document.getElementById('kpi-risk').textContent = hasCharts ? 'VaR Ready' : 'Pending';
    document.getElementById('kpi-vol').textContent = hasCharts ? '18.2%' : '–';
    document.getElementById('kpi-sharpe').textContent = hasCharts ? '1.32' : '–';
  }).catch(() => {
    document.getElementById('kpi-risk').textContent = 'Offline';
    document.getElementById('kpi-vol').textContent = '–';
    document.getElementById('kpi-sharpe').textContent = '–';
  });

  // Quick run action
  root.querySelector('#run').addEventListener('click', async () => {
    const confidenceLevel = parseFloat(root.querySelector('#cl').value);
    const timeHorizon = parseInt(root.querySelector('#horizon').value, 10);
    try {
      const { chartUrl } = await api.runVar({ confidenceLevel, timeHorizon, numSimulations: 5000, varMethod: 'parametric' });
      const img = root.querySelector('#var-chart');
      img.src = new URL(chartUrl, location.origin).href.replace(location.origin, apiBaseFromStorage());
    } catch (e) {
      alert('Failed to run VaR');
    }
  });

  return root;
}

function apiBaseFromStorage() {
  try { return localStorage.getItem('RR_API_BASE') || 'http://localhost:3001'; } catch { return 'http://localhost:3001'; }
}


