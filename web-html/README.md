# RiskReport Web (HTML)

A lightweight static HTML/CSS/JS mirror of the RiskReport app that talks to the same backend APIs.

## Run

- Install Node 18+
- Start the backend server (for this repo: `npm run server`, which runs on http://localhost:3001 by default)
- From this `web-html/` directory, run:

```bash
node dev-server.mjs
```

Then visit `http://localhost:5174`.

Use the Settings page to change the API base if your backend isn’t at `http://localhost:3001`.

Alternatively, from the repo root you can run:

```bash
npm run web-html
```

This starts the HTML app with an API proxy pointing to `http://localhost:3001`.

## Structure

- `index.html` — Shell with header/nav/footer
- `styles.css` — Minimal dark theme
- `js/app.js` — App bootstrap
- `js/router.js` — Hash router
- `js/services/api.js` — API client for existing endpoints
- `js/pages/*` — Pages: dashboard, risk-report, portfolio, scenarios, settings
- `dev-server.mjs` — Static server with API proxy to backend
