# The Drifting Land

An atmospheric 3D open-world exploration, survival, adventure, and progression game set across fractured floating islands.

Built client-first with **Three.js**, **TypeScript**, and **Vite** for zero-dependency static deployment to **GitHub Pages**.

---

## 🧭 About The Game

Centuries after the catastrophic event known as the **Great Drift**, the land floats in fractured archipelagos suspended high above the clouds. You play as an explorer tasked with charting the untethered world, recovering lost celestial relics, and awakening dormant ancient monolith beacons to restore balance to the atmosphere.

### Core Gameplay Architecture
- **Floating Archipelago (The Verdant Reach)**: Procedurally generated rolling terrain with craggy, fractured rock underside tapering into mist.
- **The Ancient Monolith Beacon**: Concentric-ringed monument in the center of the isle that awakens when all Drift Shards are collected.
- **Entity Management**: 3D composite procedural models for NPCs (*Surveyor Kaelen*), critters (*Luminescent Aether Wisps*), and harvestable resource nodes (*Verdant Moss*, *Drift Blooms*).
- **Inventory & Currency**: 24-slot pouch with item stacking, rarity tiers, consumable sustenance, and Sunstone Coins / Aether Essence.
- **Quest & Progression System**: Data-driven quests with active checklists, progression triggers, and reward grants (XP, Leveling Up, Coins).
- **Dynamic Weather & Day/Night**: Clear skies, mist, aether breezes, pollen drifts, and the rare Red Moon alignment.
- **Sanctuary Checkpoints**: Waystones across the islands providing safe respawn anchors and discovery lore.
- **Procedural Web Audio**: 100% code-generated sound synthesizer for wind ambience, jumps, dashes, steps, and ethereal relic collect chimes.

---

## 🎮 Controls

### Desktop (Keyboard & Mouse)
- **WASD / Arrow Keys**: Move Explorer
- **Mouse Drag**: Orbit Third-Person Camera
- **Spacebar**: Jump (with Coyote time & input buffering)
- **Left Shift**: Surge Dash (consumes Stamina)
- **E**: Interact / Speak with NPCs / Harvest / Collect Relics / Awaken Beacon
- **I / Tab**: Toggle Expedition Pouch (Inventory)
- **J / Q**: Toggle Quest Journal (Logbook)
- **Escape / P**: Pause Journey & Access Save Options
- **H**: Toggle Collapsible HUD Dock (Cinema Mode)

### Mobile & Touch Devices
- **Left Virtual Joystick**: Move Explorer
- **Touch Drag on Canvas**: Rotate Camera
- **Action Buttons**: `JUMP`, `DASH`, and `[E] ACTION` buttons on the right flank
- **Dock Buttons**: `Pouch [I]` and `Quests [J]` accessible from the bottom control dock

---

## 🚀 GitHub Pages Deployment

The application is built static-first with relative base paths (`./`), allowing it to run at any repository subpath (e.g., `https://USERNAME.github.io/the-drifting-land/`) without modification.

### Automatic Deployment (GitHub Actions)
1. Push your repository to GitHub (`main` or `master` branch).
2. Go to your repository settings: **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` workflow will automatically run, build the static assets, and deploy to GitHub Pages.

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production static bundle (dist/)
npm run build

# Preview static production build
npm run preview

# Lint & type-check
npm run lint
```
