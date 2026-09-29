# Slay the Spire 2 Run Analyzer

A local web app that watches your STS2 `.run` history folder, ingests every run into a
local SQLite database, and gives you filterable views over card picks, relic influence,
and damage taken.

## Setup

```bash
npm install
npm run dev
```

This starts the API server on `http://localhost:3001` and the web UI on
`http://localhost:5173` (proxying `/api` to the server).

On first launch the server tries to auto-detect your STS2 save folder under
`%APPDATA%\SlayTheSpire2\steam\<steamId>\profile1\saves\history`. If it can't find
one, open the **Settings** page in the app and use **Select folder…** to point it at
the right place. Every existing `.run` file there is backfilled into the database, and
new ones are picked up automatically as you play — no restart needed.

## Project layout

- `server/` — Express API + SQLite storage + folder watcher (TypeScript, ESM)
- `web/` — React + Vite frontend (TypeScript)
- `data/runs.db` — SQLite database (gitignored)

## Production build

```bash
npm run build
npm start
```

`npm start` serves both the API and the built frontend from a single process on
`PORT` (default `3001`).
