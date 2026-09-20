# Kept dashboard

Project management for Kept: the roadmap, the open decisions, and working notes.
Separate from the product site so planning content stops leaking into it.

## Run

```sh
cd dashboard
npm install
npm run dev        # http://localhost:5174
```

## Where the data comes from

- **Roadmap and decisions:** `../docs/roadmap/roadmap.json`, imported directly. That file stays
  the single source of truth — `scripts/roadmap.mjs` generates `ROADMAP.md` and `index.html`
  from the same file. The dashboard only reads it.
- **Notes:** `data/notes.json`, owned by the dashboard. Newest first.

## Deploying

This is a **separate Vercel project** from the product site, with:

- Root Directory: `dashboard`
- Build Command: `npm run build`, Output: `dist`
- **Vercel Authentication turned on**, so only you can open it.

The product site's Vercel project keeps its root at the repo root and is unaffected.

> The repo is public. Deployment protection hides the rendered page, not the source — anything
> written here is world-readable on GitHub. Keep credentials and anything genuinely private out.
