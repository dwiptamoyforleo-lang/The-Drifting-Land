# The Drifting World (Playable 3D Fantasy Exploration Game)

A mobile-optimized, first-person fantasy exploration game built with **Three.js**, **WebGL**, **TypeScript**, and **Tailwind CSS**.

---

## 🌌 Visual Direction & Atmosphere
- **Luminous Turquoise Ocean**: Vast teal and turquoise ocean plane with real-time procedural wave vertex undulations and caustic reflections.
- **Floating Island Archipelago**: Low-poly sculpted islands with lush turquoise grass tops, jagged craggy underside rock outcroppings, and suspended crystal stalactites.
- **Mysterious Distant Striders**: Enormous 4-legged silhouettes towering 80 meters high in the ocean mist, swaying peacefully with the tides.
- **Ancient Ruins**: Broken monolithic gateway arches, weathered stone pillars, and floating rune rings.
- **Signature Landmark**: The towering Monolith and the Central Core of the Drifting Citadel.
- **Atmospheric Palette**: Luminous turquoise `#14b8a6`, deep twilight violet shadows `#1e2238`, and cool cyan celestial lighting.

---

## 🕹️ Controls (First-Person Only)

The camera strictly represents the player's eyes (height 1.65m) with smooth head movement, vertical pitch clamping (-85° to +85°), and no character model visible.

### Mobile (Android & iOS)
- **Movement**: Virtual analog joystick on the bottom-left.
- **Camera Look**: Touch-and-drag anywhere on the right half of the screen.
- **Jump**: Dedicated jump button on the bottom-right.
- **Interact**: Contextual glowing button on the bottom-right that appears and pulses when approaching an ancient anchor, world fragment, or inscription tablet.
- **Pause & Settings**: Top-right corner button.
- **Archive Journal**: Top-right book button.

### Desktop
- **Movement**: `W`, `A`, `S`, `D` or Arrow keys.
- **Camera Look**: Mouse look (click canvas to engage Pointer Lock).
- **Jump**: `Space`.
- **Interact**: `E` key.
- **Pause / Settings**: `Esc`.

---

## ⚡ The Signature Thread System

### 1. Anchor Threads
Players discover ancient magical anchors situated on each island:
- **Anchor Alpha (The Dawn Anchor)** on the starting Threshold Island.
- **Anchor Beta (The Twilight Anchor)** atop the high ruined Spire.
- **Anchor Gamma (The Meridian Anchor)** inside the circular stone sanctuary.

Attuning an anchor shoots an ethereal beacon upward and creates a glowing energy thread connecting compatible anchors with a pulsing Bezier light beam.

### 2. Resonance Thread
When all three anchors are tuned in harmonic resonance:
1. Celestial chime crescendo plays.
2. The twilight mist temporarily clears with an aurora flare.
3. The previously hidden **Drifting Citadel** rises from the turquoise ocean depths.
4. A **Luminous Bridge of Light** materializes, granting physical walking access to the Citadel.
5. Players can explore the Citadel and collect **The Celestial Heart**.

---

## 📱 Mobile Performance Architecture
- **Adaptive Resolution Capping**:
  - `Low`: DPR capped at 1.0, minimum effects, high FPS.
  - `Balanced`: DPR capped at 1.35, smooth lighting and foliage (default for Android).
  - `High`: DPR up to 1.75 with maximum particles and lighting detail.
- **Restrained Draw Calls**: Shared low-poly geometries and materials (`MeshLambertMaterial` & `MeshStandardMaterial`).
- **No Heavy Post-Processing**: Atmospheric depth achieved through lightweight exponential fog (`THREE.FogExp2`).
- **Procedural Web Audio API Synthesizer**: Complete soundscape (wind, ocean swell, footsteps, jumps, crystal chimes, resonance crescendo) generated in real time without external audio files.
- **Local Progress Saving**: Discovered anchors, fragments, and resonance achievements persist across browser reloads via `localStorage`.

---

## 🚀 GitHub Pages Deployment

The repository is configured for automatic deployment to GitHub Pages at:
**`https://dwiptamoyforleo-lang.github.io/the-drifting-world/`**

### Automatic Deployment via GitHub Actions
A production GitHub Actions workflow is provided at `.github/workflows/deploy.yml`.

1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initialize The Drifting World with GitHub Pages workflow"
   git remote add origin https://github.com/dwiptamoyforleo-lang/the-drifting-world.git
   git branch -M main
   git push -u origin main
   ```
2. In your GitHub repository:
   - Navigate to **Settings > Pages**
   - Under **Build and deployment > Source**, select **GitHub Actions**
3. Once selected, pushing to `main` automatically builds with `base: '/the-drifting-world/'`, generates the `dist/` directory, and publishes the live game.

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
