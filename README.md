# THE DRIFTING LAND (Playable 3D Sci-Fi Exploration Game)

A mobile-optimized, first-person sci-fi exploration game built with **Three.js**, **WebGL**, **TypeScript**, and **Tailwind CSS**, accurately recreating the visual environment and HUD from the concept artwork.

---

## 🌌 Visual Direction & Atmosphere
- **Colossal Turquoise Gas Giant Planet**: Dominates the upper-right sky with swirling atmospheric bands and a luminous crescent rim glow.
- **Golden Cloud Sea**: Dense amber/sunset cloud ocean rolling beneath the towering sky citadels.
- **Industrial Metallic Observation Deck**: High-altitude catwalk with diamond tread steel grating, conduits, and an industrial control console with green CRT terminal displays and keypads.
- **Hand-Held Brass Field Compass**: A 3D field compass held in the player's gloved hand with a magnetic needle that dynamically rotates to track True North in first-person view.
- **Sky Citadels & Neon Signage**: Vertical skyscrapers connected by elevated sky-bridges, adorned with glowing magenta, cyan, amber, and green holographic neon signs.
- **Geodesic Polyhedral Dome**: Futuristic faceted crystal research habitat crowning the right tower.
- **Aerial Traffic**: Flying speeders cruising along transit corridors with glowing red and cyan thruster light trails.
- **Authentic Sci-Fi HUD**:
  - Horizontal scrolling compass tape with degree markings (100° to 240°).
  - Temperature meter gauge (`18.4°C`).
  - Elevation meter with glowing diamond milestone indicator (`1,420 m`).
  - Centered precision crosshair `+`.

---

## 🕹️ Controls (First-Person Only)

The camera strictly represents the player's eyes with smooth head movement and vertical pitch clamping.

### Mobile (Android & iOS)
- **Movement**: Virtual analog joystick on the bottom-left.
- **Camera Look**: Touch-and-drag anywhere on the right half of the screen.
- **Jump**: Dedicated jump button on the bottom-right.
- **Interact**: Glowing contextual button that appears when approaching terminals and beacons.
- **Pause & Settings**: Top-right corner button.
- **Archive Journal**: Top-right book button.

### Desktop
- **Movement**: `W`, `A`, `S`, `D` or Arrow keys.
- **Camera Look**: Mouse look (click canvas to engage Pointer Lock).
- **Jump**: `Space`.
- **Interact**: `E` key.
- **Pause / Settings**: `Esc`.

---

## 🚀 GitHub Pages Deployment (Fixing Loading Screen Issue)

### Why It Was Stuck on a Loading Screen Previously:
1. **Repository Name & Subpath Mismatches**: Hardcoded base paths (like `/the-drifting-world/`) cause HTTP 404 errors if the repository is named differently (e.g. `the-drifting-land` or capitalized). A 404 on the JavaScript asset prevented the app from executing, leaving the initial loading shell frozen forever.
2. **Relative Path Fix**: The build is now configured with relative base paths (`base: './'`), guaranteeing that JavaScript and CSS files resolve correctly regardless of repository name, account name, custom domain, or folder hierarchy.
3. **Deployment Mode**: GitHub Pages must be configured to build from **GitHub Actions**:
   - In your repository, go to **Settings > Pages**.
   - Under **Build and deployment > Source**, choose **GitHub Actions**.
   - The included workflow `.github/workflows/deploy.yml` will automatically build the project and deploy the contents of `dist/` on every push to `main`.

---

## 🛠️ White Screen Resolution Summary

The white screen issue was caused by several compounding issues in standard Vite static deployments:

1. **Subpath Asset 404s**: By default, Vite builds with `base: '/'`. When hosted on GitHub Pages under the subpath `/the-drifting-world/`, the browser requested assets at the domain root (e.g., `https://dwiptamoyforleo-lang.github.io/assets/...`) which resulted in HTTP 404s. The script never ran, leaving a blank white page.
   - **Fix**: Configured `base: '/the-drifting-world/'` for production builds in `vite.config.ts`, while keeping `/` for local development.
2. **Missing Fallback HTML & Canvas Styles**: The `<html>` and `<body>` tags had no default dark background style before Tailwind CSS mounted. If scripts failed or took time to bundle, the browser defaulted to a white canvas.
   - **Fix**: Injected inline dark background styling (`#070b14`) on `html` and `body`, plus an immediate fantasy loading shell inside `#root`.
3. **Unhandled WebGL Exceptions**: If WebGL context creation threw an error, React unmounted without an error boundary.
   - **Fix**: Wrapped the entire application in a React `ErrorBoundary` with a dedicated WebGL recovery card (switch to Low Graphics mode, troubleshooting guide, and reload button), and added fallback renderer options in `src/game/engine.ts`.
4. **Hardcoded Root Paths in PWA Manifest & Service Worker**: `/icon.svg` and `/manifest.json` pointed to the root domain.
   - **Fix**: Changed to relative URLs (`./icon.svg`, `./manifest.json`) and updated `sw.js` to dynamically detect scope.

---

## 📦 Packaging for Android APK

This project is built with standard Web Standards, PWA manifest, and service worker. You can convert it into an Android APK using **Capacitor**:

```bash
# 1. Install Capacitor CLI and Android platform
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor
npx cap init "The Drifting World" "com.driftingworld.game" --web-dir "dist"

# 3. Build Web Assets
npm run build

# 4. Add Android platform & copy files
npx cap add android
npx cap copy android

# 5. Open in Android Studio to build APK
npx cap open android
```
