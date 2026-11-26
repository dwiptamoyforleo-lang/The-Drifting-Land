# The Drifting Land

A first-person atmospheric exploration-puzzle adventure across floating islands governed by the 12-minute Drift Clock. Built with native ES modules and Three.js for static deployment on GitHub Pages across desktop and Android browsers.

---

## Deploying to GitHub Pages

1. Push the repository to GitHub (`main` or `master`).
2. Open **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment → Source**, choose **GitHub Actions** (using `.github/workflows/deploy.yml`, which builds `dist/` with `base: './'` via Vite and includes `.nojekyll`).
4. Alternatively, you can serve the static `dist/` output from any subdirectory (for example `https://<user>.github.io/The-Drifting-Land/`) because every asset and module reference uses relative paths (`./`).

---

## Testing Locally

Direct `file://` URLs block ES module scripts by browser security policy. Always serve the project over HTTP:

```bash
# Using Python
python -m http.server 8080

# Or using serve
npx serve .

# Or using the Vite development server
npm install
npm run dev
```

To test subdirectory hosting locally (matching GitHub Pages project URLs), serve the **parent** directory and open `http://localhost:8080/The-Drifting-Land/`.

---

## Three.js Dependency & Self-Hosting

All engine code imports Three.js exclusively through `src/vendor/three.js`.

- In this Vite build setup, `src/vendor/three.js` re-exports from the pinned `three` npm dependency (`export * from 'three';`), which is bundled locally into `dist/assets/`.
- If running without a bundler or switching to a CDN / self-hosted single file later, replace the single line in `src/vendor/three.js` with either the pinned jsDelivr URL (`three@0.160.0`) or a local copy placed in `vendor/three.module.min.js`.

---

## Save Data

Progress and settings are stored strictly client-side in `localStorage` under project-prefixed keys (so GitHub Pages sites sharing an origin never collide):

- `the-drifting-land:save:v1` & `the-drifting-land:save:backup` (gameplay progress and atomic backup, introduced in Phases 2–3)
- `the-drifting-land:settings:v1` (audio, graphics preset, reduced motion, and mobile fullscreen preference)
- `the-drifting-land:meta:v1` (persistent meta-progression across journeys)

If `localStorage` is blocked (such as strict private browsing), the game automatically falls back to an in-memory store.

---

## Query Switches

- `?debug=1` — Enables production-silent `log()` diagnostics in the browser console (and unlocks the Phase 5 debug overlay in later phases).
- `?selftest=1` — Runs the automated data, orbit-clearance, gap, and save-schema self-test suite (implemented in Phase 5).

---

## Legacy Archive

The earlier v1 prototype source files have been preserved untouched in `legacy-v1/` and excluded from the new codebase (`tsconfig.json`) with zero imports into `src/`.
