import { DashboardPage } from './pages/dashboard.js';
import { RiskReportPage } from './pages/risk-report.js';
import { PortfolioPage } from './pages/portfolio.js';
import { ScenariosPage } from './pages/scenarios.js';
import { SettingsPage } from './pages/settings.js';

const routes = {
  '': DashboardPage,
  'dashboard': DashboardPage,
  'risk-report': RiskReportPage,
  'portfolio': PortfolioPage,
  'scenarios': ScenariosPage,
  'settings': SettingsPage,
};

function resolveRoute() {
  const hash = location.hash.replace(/^#\//, '');
  const [path, query] = hash.split('?');
  return { path: path || 'dashboard', query: new URLSearchParams(query || '') };
}

function render() {
  const { path, query } = resolveRoute();
  const Page = routes[path] || DashboardPage;
  const app = document.getElementById('app');
  app.innerHTML = '';
  const el = Page({ query });
  app.appendChild(el);
}

export const router = {
  start() {
    addEventListener('hashchange', render);
    if (!location.hash) location.hash = '#/dashboard';
    render();
  }
};


