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
