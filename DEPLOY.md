# Publishing the atlas on Vercel

The public website is the prebuilt, tested build in **`site/`** (`site/index.html` + `site/favicon.svg`).
`vercel.json` tells Vercel to serve that folder as-is: no install, no build step, HTTPS, public by default.
The background-music file is **never** uploaded (`.gitignore` and `.vercelignore`); on the public site the
music button reads **Add music**, and each visitor can choose their own track.

## Option A — GitHub + Vercel (recommended: automatic updates)
1. Put this folder in a GitHub repository (e.g. `interstellar-atlas`).
2. On https://vercel.com/new → **Import Git Repository** → pick the repo → **Deploy**.
   Vercel reads `vercel.json`; no settings need changing.
3. Every push to the `main` branch redeploys the same URL automatically.

## Option B — Vercel CLI from this folder
Double-click `deploy-to-vercel.cmd` (Windows) or run `npx vercel@latest deploy --prod`.
First run: log in to Vercel in the browser, accept the suggested project settings.
Run it again to publish updates to the same URL.

## Updating the website
- Changes to the site are rebuilt into `site/index.html` (single self-contained file), then pushed (A) or redeployed (B).
- Production URL: `https://<project-name>.vercel.app`. Visitors do not need an account.
- Keep **Deployment Protection** off for Production (default) so the URL stays public.
