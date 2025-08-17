import { getApiBase, setApiBase } from '../services/api.js';

export function SettingsPage() {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="section-title"><h2>Settings</h2><span class="pill">Environment</span></div>
    <div class="card">
      <div class="row">
        <label class="pill">API Base</label>
        <input id="base" class="grow" placeholder="http://localhost:3001" />
        <button id="save" class="primary">Save</button>
      </div>
      <div class="spacer"></div>
      <div class="alert info">Update the API base URL to match the running backend.</div>
    </div>
  `;

  const input = root.querySelector('#base');
  input.value = getApiBase();

  root.querySelector('#save').addEventListener('click', () => {
    const url = input.value.trim();
    if (!url) return;
    setApiBase(url);
    document.getElementById('api-base').textContent = url;
    alert('Saved');
  });

  return root;
}


