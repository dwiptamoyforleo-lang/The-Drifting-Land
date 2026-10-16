# Master Implementation Plan: The Drifting Land

## Architecture & Repo Audit Summary

The repository is built on **React 19 + TypeScript + Vite + Tailwind CSS v4 + Three.js**. The foundational build and deployment pipelines are green (`npm run build` generates clean relative-pathed static files into `dist/` and `npm run lint` passes with 0 errors).

However, to satisfy the **Master Development Prompt: The Drifting Land**, the application requires expansion from the current floating platform prototype into a living, organic 3D open-world exploration and survival game.

---

## Phased Implementation Roadmap

### Phase 1: Playable Foundation & Architecture Hardening
- **Repository Integrity**: Ensure all imports across `src/game/` and `src/components/` adhere to strict TypeScript contracts.
- **Error Boundaries & WebGL Fallbacks**: Safeguard Three.js canvas initialization against WebGL context loss (`webglcontextlost` / `webglcontextrestored`) with user-friendly recovery screens.
- **Deterministic Random / Seed Generator**: Establish a stable seeded noise utility for terrain, resource distribution, and creature spawns.

### Phase 2: Player Movement, 3 Camera Modes, Collision & Survival HUD
- **Camera Modes**:
  1. *First-Person*: Eye-level perspective (`y + 1.62`), smooth mouse/touch look, character mesh hidden.
  2. *Third-Person*: Smooth orbit follow camera with adjustable pitch/yaw and wall obstacle collision offset.
  3. *Second-Person (Observer View)*: Cinematic perspective switching to nearby observing NPCs/creatures within 22m, or a front reconnaissance drone looking back at the player.
- **Controls & Input**:
  - Desktop: WASD movement, Space (jump), Shift (sprint), Left Click (attack/use tool), E (interact), V (switch camera), Esc (pause/menu).
  - Android Mobile: Large virtual movement joystick (left), responsive touch-look region (right), jump, sprint toggle, attack button, interact button, camera toggle, and menu shortcut icons.
- **Survival Mechanics & Physics**:
  - Stamina consumption during sprinting/combat and steady regeneration during resting/walking.
  - Health penalties from falls, hostile creatures, and environmental hazards.
  - Zero per-frame allocations in the player controller update loop.
- **Real-Time HUD**: Throttled React state updates displaying health, stamina, Drift Coins, in-game clock, active quest objective, hotbar slots, and contextual prompts.

### Phase 3: Living World, Procedural Organic Terrain & Vegetation
- **Realistic Natural Terrain**:
  - Replace flat box platforms with procedural heightmapped landmasses: rolling green hills, jagged stone cliffs, ancient moss-covered paths, and canyon descents.
  - Seamless chunk generation around the player with automated mesh pooling and distant chunk unloading.
- **Custom Flora & Plant Harvesting**:
  - Instanced rendering of 7 original plant species: Lumenvine, Moonbloom, Emberfern, Driftroot, Glassleaf, Whisper Moss, and Rift Orchid.
  - Day/night bloom reactions and timed regrowth cycles yielding usable inventory crafting materials.
- **Living Wildlife & Hostile Creatures**:
  - Peaceful wildlife: Cloudgrazer, Emberfox, Glasswing, Mossback, Glowhare, and sacred Moon Deer.
  - Hostile sentinels: Nest Scouts, Ruin Guardians, Storm Rays, and Rift Stalkers with alert, chase, attack, and defeat states.

### Phase 4: Economy, Crafting, NPC Settlements & Quests
- **Inventory & Hotbar**: 6-slot hotbar, categorized inventory (resources, food, equipment, relics), stack counting, and item tooltips.
- **Drift Coins & Traders**:
  - Unified marketplace and specialized merchants: Trader Oakhaven (outfitter), The Mosskeeper (arboreal golem), The Drift Collector (feathered scavenger), The Moon Moth, and The Rift Broker.
  - Guaranteed atomic transactions with zero coin duplication or negative balance vulnerabilities.
- **Dialogue & Settlements**: Multi-branch dialogue trees for Traveler Jorah, Archivist Vesper, and village scouts.
- **Quest Progression Bus**: Event-driven tracking for main beacons, tower explorations, botanical collections, and relic discoveries.

### Phase 5: Dynamic Weather, Live Clock & The Rare Red Moon Event
- **Live World Clock**: 20-minute day cycle with smooth lighting transitions across Dawn, Daylight, Sunset, Night, and celestial fog.
- **Lightweight Weather Engine**: Clear skies, mist, rain showers, atmospheric wind, and dimensional disturbances with automatic performance scaling for mobile devices.
- **The Red Moon Phenomenon**:
  - 1% nightly probability roll with persistent cooldown across saves.
  - Deep scarlet lunar eclipse, glowing red fog, altered creature behaviors, and atmospheric music shifts.
  - Encounter with **The Crimson Warden** boss: telegraphed combat phases, unique relic drops (Crimson Core), and persistent defeat tracking.

### Phase 6: Multi-Dimensional Gateways & Regional Bosses
- **5 Playable Dimensions**:
  1. *The Living Reach* (Starting dimension - forests, rivers, ruins).
  2. *The Ashen Expanse* (Volcanic industrial dimension - magma colossus).
  3. *The Moonveil* (Bioluminescent nighttime realm - storm sentinel).
  4. *The Fractured Archive* (Ancient knowledge repository - puzzles and vaults).
  5. *The Rift* (Origin of the Great Drift - dimensional anomalies).
- **Portal & Streaming System**: Clean disposal and unloading of inactive dimensions to preserve mobile memory.
- **Boss Encounters**: The Rootbound Guardian, Ash Colossus, Storm Sentinel, Archive Keeper, Rift Sovereign, and Crimson Warden.

### Phase 7: Optimization, Persistence & Verification
- **Android Performance**:
  - Frustum culling, adaptive quality presets (Low, Medium, High, Auto), and DPR clamping.
  - Texture and material reuse to keep draw calls low on mid-range mobile chips.
- **Save Integrity**: Dual-slot local storage persistence (`_progress` and `_backup`) with schema validation.
- **Verification**: Complete verification via `npm run lint` and `npm run build`.
