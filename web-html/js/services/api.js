let API_BASE = 'http://localhost:3001';

export function setApiBase(url) {
  API_BASE = url.replace(/\/$/, '');
  try { localStorage.setItem('RR_API_BASE', API_BASE); } catch {}
}

export function getApiBase() { return API_BASE; }

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.json();
}

export const api = {
  status: () => request('/api/status'),
  runVar: (params) => request('/api/run-var', { method: 'POST', body: JSON.stringify(params) }),
  latestCharts: () => request('/api/latest-charts'),
  stress: {
    test: () => request('/api/stress-test/test'),
    portfolios: () => request('/api/stress-test/portfolios'),
    portfolio: (id) => request(`/api/stress-test/portfolios/${encodeURIComponent(id)}`),
    scenarios: () => request('/api/stress-test/scenarios'),
    scenario: (id) => request(`/api/stress-test/scenarios/${encodeURIComponent(id)}`),
    run: (body) => request('/api/stress-test/run', { method: 'POST', body: JSON.stringify(body) }),
    history: () => request('/api/stress-test/history'),
  },
};


