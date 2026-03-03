# Deploying to GitHub Pages

The app is configured to deploy under **`/light-fighter/`**.

## One-time setup

1. Push this repo to GitHub. Name the repo **`light-fighter`** so the path matches (or change `base` in `vite.config.js` to `'/your-repo-name/'`). The site will be at:
   - **https://\<your-username\>.github.io/light-fighter/**

2. In the repo on GitHub: **Settings → Pages**
   - Under **Build and deployment**, set **Source** to **GitHub Actions**.

## Deploying

- **Automatic:** Push or merge to the `main` branch. The workflow builds and deploys.
- **Manual:** **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**.

After a successful run, the site is live at the URL above (may take a minute).

## Leaderboard API (production)

To hook the deployed game into your production leaderboard API:

1. **Set the API URL at build time**  
   In the repo: **Settings → Secrets and variables → Actions → Variables**. Add a variable `LEADERBOARD_API_URL` with the base URL of your leaderboard API (e.g. the CloudFront URL from your leaderboard stack outputs). The deploy workflow passes this as `VITE_LEADERBOARD_API_URL` so the built game can fetch and submit scores.

2. **CORS**  
   Configure the leaderboard service so its `CorsOrigin` includes your game origin (e.g. `https://<your-username>.github.io`). If the leaderboard allows `*`, it will work without changes.

For a local production build (e.g. `npm run build && npm run preview`), set the API in `.env.production`: `VITE_LEADERBOARD_API_URL=https://your-cloudfront-url`. In development (`npm run dev`), the game uses `http://localhost:3000` for the leaderboard automatically.
