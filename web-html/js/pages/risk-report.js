import { api, getApiBase } from '../services/api.js';

export function RiskReportPage() {
  const root = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'section-title';
  header.innerHTML = '<h2>Risk Report</h2><span class="pill">Parametric / Historical / Monte Carlo</span>';

  const grid = document.createElement('div');
  grid.className = 'grid-2';

  const controls = document.createElement('div');
  controls.className = 'card';
  controls.innerHTML = `
    <h3>Parameters</h3>
    <div class="row">
      <label class="pill">Confidence</label>
      <select id="cl">
        <option value="0.95">95%</option>
        <option value="0.99">99%</option>
        <option value="0.90">90%</option>
      </select>
      <label class="pill">Horizon</label>
      <input id="horizon" type="number" value="1" min="1" />
    </div>
    <div class="spacer"></div>
    <div class="row">
      <label class="pill">Method</label>
      <select id="method">
        <option value="parametric">Parametric</option>
        <option value="historical">Historical</option>
        <option value="monte-carlo">Monte Carlo</option>
      </select>
      <label class="pill">Sims</label>
      <input id="sims" type="number" value="10000" min="100" step="100" />
      <button id="run" class="primary">Run</button>
    </div>
    <div id="err" class="spacer"></div>
  `;

  const charts = document.createElement('div');
  charts.className = 'card';
  charts.innerHTML = `
    <h3>Chart</h3>
    <div class="img-frame"><img id="img" alt="VaR Chart"/></div>
    <div class="muted" id="meta"></div>
  `;

  grid.appendChild(controls);
  grid.appendChild(charts);
  root.appendChild(header);
  root.appendChild(grid);

  async function run() {
    const cl = parseFloat(root.querySelector('#cl').value);
    const horizon = parseInt(root.querySelector('#horizon').value, 10);
    const method = root.querySelector('#method').value;
    const numSimulations = parseInt(root.querySelector('#sims').value, 10);

    try {
      root.querySelector('#err').innerHTML = '';
      const res = await api.runVar({ confidenceLevel: cl, timeHorizon: horizon, numSimulations, varMethod: method, distribution: method === 'historical' ? 'historical' : 'normal' });
      const base = getApiBase();
      root.querySelector('#img').src = `${base}${res.chartUrl}`;
      root.querySelector('#meta').textContent = `method=${res.method}`;
    } catch (e) {
      root.querySelector('#err').innerHTML = `<div class="alert error">${e.message}</div>`;
    }
  }

  root.querySelector('#run').addEventListener('click', run);

  // Initial
  run();

  return root;
}


