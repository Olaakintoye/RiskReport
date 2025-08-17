import { api } from '../services/api.js';

export function ScenariosPage() {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="section-title">
      <h2>Scenarios</h2>
      <span class="pill">Structured Stress Testing</span>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3>Available Scenarios</h3>
        <div id="scenarios" class="muted">Loading…</div>
      </div>
      <div class="card">
        <h3>Run Scenario</h3>
        <div class="row">
          <input id="scenarioId" placeholder="Scenario ID (e.g. TMPL0006)" />
          <input id="portfolioId" placeholder="Portfolio ID (e.g. income-portfolio)" />
          <button id="run" class="primary">Run</button>
        </div>
        <div class="spacer"></div>
        <div class="img-frame vh" id="result">Result will appear here</div>
      </div>
    </div>
  `;

  const scenariosEl = root.querySelector('#scenarios');
  api.stress.scenarios()
    .then((s) => {
      if (Array.isArray(s)) {
        scenariosEl.innerHTML = '';
        const list = document.createElement('ul');
        for (const sc of s) {
          const li = document.createElement('li');
          li.textContent = `${sc.id} — ${sc.name || sc.title || ''}`;
          list.appendChild(li);
        }
        scenariosEl.appendChild(list);
      } else {
        scenariosEl.textContent = JSON.stringify(s);
      }
    })
    .catch(() => scenariosEl.textContent = 'Failed to load scenarios');

  root.querySelector('#run').addEventListener('click', async () => {
    const scenarioId = root.querySelector('#scenarioId').value.trim();
    const portfolioId = root.querySelector('#portfolioId').value.trim();
    const result = root.querySelector('#result');
    result.textContent = 'Running…';
    try {
      const res = await api.stress.run({ scenarioId, portfolioId, options: { confidenceLevel: 0.95, timeHorizon: 1 } });
      result.innerHTML = `<pre style="white-space: pre-wrap;">${escapeHtml(JSON.stringify(res, null, 2))}</pre>`;
    } catch (e) {
      result.textContent = e.message;
    }
  });

  return root;
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}


