export function PortfolioPage() {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="section-title"><h2>Portfolio</h2><span class="pill">Simple Example</span></div>
    <div class="grid-2">
      <div class="card">
        <h3>Positions</h3>
        <table>
          <thead><tr><th>Symbol</th><th>Name</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
      <div class="card">
        <h3>Actions</h3>
        <div class="row">
          <input id="symbol" placeholder="Symbol (e.g. AAPL)" />
          <input id="name" placeholder="Name" />
        </div>
        <div class="spacer"></div>
        <div class="row">
          <input id="qty" type="number" placeholder="Qty" value="10" />
          <input id="price" type="number" placeholder="Price" value="150" />
          <button id="add" class="primary">Add</button>
        </div>
      </div>
    </div>
  `;

  const tbody = root.querySelector('#rows');
  const state = { assets: [
    { symbol: 'AAPL', name: 'Apple Inc.', quantity: 10, price: 180, assetClass: 'equity' },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury', quantity: 5, price: 90, assetClass: 'bond' },
  ]};

  function renderRows() {
    tbody.innerHTML = '';
    for (const a of state.assets) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${a.symbol}</td><td class="muted">${a.name}</td><td>${a.quantity}</td><td>$${a.price}</td>`;
      tbody.appendChild(tr);
    }
  }
  renderRows();

  root.querySelector('#add').addEventListener('click', () => {
    const symbol = root.querySelector('#symbol').value.trim().toUpperCase();
    const name = root.querySelector('#name').value.trim() || symbol;
    const quantity = parseFloat(root.querySelector('#qty').value || '0');
    const price = parseFloat(root.querySelector('#price').value || '0');
    if (!symbol || quantity <= 0 || price <= 0) return;
    state.assets.push({ symbol, name, quantity, price, assetClass: 'equity' });
    renderRows();
  });

  return root;
}


