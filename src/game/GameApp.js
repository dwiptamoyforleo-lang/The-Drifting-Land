import * as THREE from '../vendor/three.js';
import { detectSoftwareWebGL, resolveQuality } from '../config/quality.js';
import { EventBus } from '../core/EventBus.js';
import { DriftClock, START_TIME } from '../core/DriftClock.js';
import { GameLoop } from '../core/GameLoop.js';
import { WorldRenderer } from '../core/Renderer.js';
import { ProceduralTextures } from '../world/ProceduralTextures.js';
import { SkyDome } from '../world/SkyDome.js';
import { SeaPlane } from '../world/SeaPlane.js';
import { IslandFactory } from '../world/IslandFactory.js';
import { evaluateOrbitPosition } from '../world/IslandMotion.js';
import { FirstPersonCamera } from '../player/FirstPersonCamera.js';
import { PlayerController } from '../player/PlayerController.js';
import { WayglassSystem } from '../systems/Wayglass.js';
import { AudioEngine } from '../systems/AudioEngine.js';
import { SaveManager } from '../save/SaveManager.js';
import { GameHUD } from '../ui/HUD.js';
import { REGIONS, ISLAND_DEFS } from '../data/worldData.js';

const _vTmp = new THREE.Vector3();

/**
 * Main interactive 3D runtime for The Drifting Land.
 */
export class GameApp {
  /**
   * @param {{
   *   mountEl: HTMLElement,
   *   settings: { soundEnabled: boolean, graphicsQuality: string, mobileFullscreen: boolean, reducedMotion: boolean },
   *   onSaveSettings: (s: object) => void,
   *   audioCtx?: AudioContext | null,
   *   initialSave?: object | null,
   *   onFirstRender?: () => void,
   *   onReturnTitle: () => void,
   *   log?: (...args: unknown[]) => void
   * }} options
   */
  constructor(options) {
    this.options = options;
    this.mountEl = options.mountEl;
    this.settings = { ...options.settings };
    this.log = options.log || (() => {});

    this.bus = new EventBus();
    this.saveManager = new SaveManager();
    this.isSoftwareGl = detectSoftwareWebGL();
    this.quality = resolveQuality(this.settings.graphicsQuality, this.isSoftwareGl);

    this.clock = new DriftClock(options.initialSave?.clockTime ?? START_TIME);
    this.worldRenderer = new WorldRenderer(this.mountEl, this.quality, {
      onContextLost: () => this.hud?.showToast('Graphics context paused — restoring…'),
      onContextRestored: () => this.hud?.showToast('Graphics restored.'),
    });

    this.textures = new ProceduralTextures(this.worldRenderer.renderer.capabilities.getMaxAnisotropy());
    this.skyDome = new SkyDome();
    this.worldRenderer.scene.add(this.skyDome.mesh);

    this.seaPlane = new SeaPlane(this.quality.seaSegments);
    this.worldRenderer.scene.add(this.seaPlane.group);

    this.islandFactory = new IslandFactory(this.textures);
    /** @type {Map<string, object>} */
    this.islandMap = new Map();
    for (const def of ISLAND_DEFS) {
      const built = this.islandFactory.buildIsland(def);
      this.islandMap.set(def.id, built);
      this.worldRenderer.scene.add(built.group);
    }

    this._buildAmbientMotes();

    this.fpCamera = new FirstPersonCamera(this.worldRenderer.camera, this.worldRenderer.renderer.domElement);
    this.player = new PlayerController(this.fpCamera, this.bus);
    this.wayglass = new WayglassSystem(this.worldRenderer.scene, this.islandMap);
    this.audio = new AudioEngine(this.settings.soundEnabled);
    this.audio.init(options.audioCtx || null);

    this.paused = false;
    this.elapsed = 0;
    this.litBeacons = new Set();
    this.collectedEchoes = new Set();
    this.activatedVanes = new Set();
    this.endingChosen = null;
    this.currentRegionId = 'shallows';
    this.activeSlotId = options.initialSave?.slotId || 1;
    this._activeInteractable = null;
    this._firstRenderDone = false;

    this._wireAudioEvents();

    this.hud = new GameHUD(this.mountEl, {
      regions: REGIONS,
      settings: this.settings,
      saveManager: this.saveManager,
      onSelectLevel: (regionId) => this.travelToRegion(regionId),
      onInteract: () => this._triggerInteract(),
      onToggleWayglass: () => this._toggleWayglass(),
      onWindcall: () => this._triggerWindcall(),
      onJumpStart: () => this.player.triggerJump(),
      onJumpEnd: () => this.player.releaseJump(),
      onMoveJoystick: (x, y, sprint) => {
        this.player.input.strafe = x;
        this.player.input.forward = y;
        this.player.input.sprint = sprint;
      },
      onTouchLook: (dx, dy) => this.fpCamera.applyLookDelta(dx, dy, 1.45),
      onPauseChange: (paused) => {
        this.paused = paused;
        this.fpCamera.enabled = !paused;
        if (paused) this.fpCamera.releaseLock();
      },
      onSettingsChange: (next) => {
        this.settings = { ...this.settings, ...next };
        this.options.onSaveSettings(this.settings);
        this.audio.setEnabled(this.settings.soundEnabled);
        this.quality = resolveQuality(this.settings.graphicsQuality, this.isSoftwareGl);
        this.worldRenderer.applyQuality(this.quality);
      },
      onSaveSlot: (slotId) => this._saveToSlot(slotId),
      onLoadSlot: (slotId) => {
        const data = this.saveManager.loadSlot(slotId);
        if (data) this._applySaveData(data);
      },
      onDeleteSlot: (slotId) => this.saveManager.deleteSlot(slotId),
      onReturnTitle: () => this.options.onReturnTitle(),
    });

    this._bindKeyboard();

    if (options.initialSave) {
      this._applySaveData(options.initialSave);
    } else {
      const startIsland = this.islandMap.get('kestrel_raft');
      if (startIsland) this.player.teleportToIsland(startIsland);
      if (!this.settings.reducedMotion) {
        this.hud.showPrologue();
      }
    }

    this.loop = new GameLoop({
      fixedUpdate: (dt) => this._fixedUpdate(dt),
      renderFrame: (_alpha, frameDt) => this._renderFrame(frameDt),
      renderer: this.worldRenderer.renderer,
      isSoftwareGl: this.isSoftwareGl,
    });
    this.loop.start();
  }

  _buildAmbientMotes() {
    const count = this.quality.moteCount;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = Math.random() * 28;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffe4a0,
      size: 0.24,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    this.motes = new THREE.Points(geo, mat);
    this.motes.frustumCulled = false;
    this.worldRenderer.scene.add(this.motes);
  }

  _wireAudioEvents() {
    this.bus.on('player:step', () => this.audio.playStep());
    this.bus.on('player:jump', () => this.audio.playJump());
    this.bus.on('player:lampHit', () => {
      this.audio.playLampHit();
      this.hud.showToast('A Hollow Lamp brushed your Ember (-35%).');
    });
    this.bus.on('player:rescued', (islandName) => {
      this.hud.showToast(`Sky-currents lifted you back to ${islandName}.`);
    });
  }

  _bindKeyboard() {
    this._keys = new Set();
    this._onKeyDown = (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.hud.modalOpen) {
          this.hud.closeModal();
        } else {
          this.hud.openMenu('main');
        }
        return;
      }
      if (this.hud.modalOpen) return;

      this._keys.add(e.code);
      this._syncKeyboardMovement();

      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) this.player.triggerJump();
      } else if (e.code === 'KeyE') {
        this._triggerInteract();
      } else if (e.code === 'KeyQ') {
        this._toggleWayglass();
      } else if (e.code === 'KeyF') {
        this._triggerWindcall();
      }
    };

    this._onKeyUp = (e) => {
      this._keys.delete(e.code);
      this._syncKeyboardMovement();
      if (e.code === 'Space') {
        this.player.releaseJump();
      }
    };

    this._onContextMenu = (e) => {
      if (!this.hud.modalOpen) {
        e.preventDefault();
        this._toggleWayglass();
      }
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.worldRenderer.renderer.domElement.addEventListener('contextmenu', this._onContextMenu);
  }

  _syncKeyboardMovement() {
    if (this.hud.isTouch && this._keys.size === 0) return;
    const f = (this._keys.has('KeyW') || this._keys.has('ArrowUp') ? 1 : 0)
      - (this._keys.has('KeyS') || this._keys.has('ArrowDown') ? 1 : 0);
    const s = (this._keys.has('KeyD') || this._keys.has('ArrowRight') ? 1 : 0)
      - (this._keys.has('KeyA') || this._keys.has('ArrowLeft') ? 1 : 0);
    this.player.input.forward = f;
    this.player.input.strafe = s;
    this.player.input.sprint = this._keys.has('ShiftLeft') || this._keys.has('ShiftRight');
  }

  _toggleWayglass() {
    if (!this.player.hasWayglass) {
      this.hud.showToast('Pick up the Wayglass on Kestrel Raft first.');
      return;
    }
    const on = this.wayglass.toggle();
    this.audio.playWayglass(on);
    this.hud.touchWayglassBtn?.classList.toggle('active', on);
  }

  _triggerWindcall() {
    if (this.player.windcallCooldown > 0) {
      this.hud.showToast(`Windcall gathering (${this.player.windcallCooldown.toFixed(1)}s)…`);
      return;
    }
    this.player.windcallCooldown = 4.0;
    this.audio.playWindcall();

    let hitVane = false;
    for (const island of this.islandMap.values()) {
      if (!island.vaneGate) continue;
      const vx = island.group.position.x + island.vaneGate.localPos.x;
      const vy = island.group.position.y + island.vaneGate.localPos.y;
      const vz = island.group.position.z + island.vaneGate.localPos.z;
      const dist = Math.hypot(this.player.position.x - vx, this.player.position.y - vy, this.player.position.z - vz);
      if (dist <= 13.5) {
        this._activateVaneGate(island, island.vaneGate);
        hitVane = true;
      }
    }

    if (!hitVane) {
      this.hud.showToast('A bright gust ripples outward.');
    }
  }

  _activateVaneGate(island, gate) {
    gate.activated = true;
    gate.spinSpeed = 6.5;
    this.activatedVanes.add(gate.id);
    for (let i = 0; i < island.bridges.length; i++) {
      if (island.bridges[i].id === gate.bridgeId) {
        island.bridges[i].extended = true;
        island.bridgeMeshes[i].group.visible = true;
      }
    }
    this.hud.showToast(`${gate.label} turned — the span extended!`);
  }

  _triggerInteract() {
    const inter = this._activeInteractable;
    if (!inter) return;

    if (inter.type === 'wayglass') {
      inter.collected = true;
      inter.mesh.visible = false;
      this.player.hasWayglass = true;
      this.audio.playEcho();
      this.hud.showToast('Wayglass attuned! Press Q (or tap Wayglass) to read drifting orbits.');
    } else if (inter.type === 'brazier') {
      this.player.ember = 100;
      this.audio.playBeaconLit();
      this.hud.showToast('Ember Lantern refilled to 100%.');
    } else if (inter.type === 'echo') {
      if (!inter.collected) {
        inter.collected = true;
        this.collectedEchoes.add(inter.id);
        inter.shardMat.emissiveIntensity = 0.25;
        inter.shardMat.opacity = 0.45;
        this.audio.playEcho();
        this._saveToSlot(this.activeSlotId, true);
      }
      this.hud.openChoiceModal({
        title: inter.title,
        body: inter.text,
        choices: [{ label: 'Keep Listening', action: () => {} }],
      });
    } else if (inter.type === 'npc') {
      const line = inter.lines[inter.lineIndex % inter.lines.length];
      inter.lineIndex++;
      this.hud.openChoiceModal({
        title: inter.name,
        body: line,
        choices: [{ label: 'Continue', action: () => {} }],
      });
    } else if (inter.type === 'mural') {
      this.hud.openChoiceModal({
        title: inter.title,
        body: inter.text,
        choices: [{ label: 'Step Back', action: () => {} }],
      });
    } else if (inter.type === 'chalk') {
      this.hud.openChoiceModal({
        title: "Wren's Chalk Note",
        body: inter.text,
        choices: [{ label: 'Continue', action: () => {} }],
      });
    } else if (inter.type === 'vaneGate') {
      this._triggerWindcall();
    } else if (inter.type === 'beacon') {
      this._openBeaconModal(inter);
    } else if (inter.type === 'latticeHeart') {
      this._openLatticeHeartModal();
    }
  }

  _openBeaconModal(beacon) {
    const island = this.islandMap.get(beacon.islandId);
    if (!beacon.lit) {
      const canLight = this.player.ember >= 40;
      this.hud.openChoiceModal({
        title: beacon.name,
        body: canLight
          ? `Channel 40% Ember to ignite ${beacon.name} and anchor ${island?.name || 'this island'} at its current point on the Drift Clock.`
          : 'Your Ember Lantern needs at least 40% charge. Warm it at a nearby Brazier first.',
        choices: [
          {
            label: canLight ? `Light ${beacon.name} (-40% Ember)` : 'Not Enough Ember',
            detail: 'Anchors this island and saves your place in the sky-lanes.',
            disabled: !canLight,
            action: () => {
              this.player.ember = Math.max(10, this.player.ember - 40);
              this._lightBeacon(beacon, island);
            },
          },
          { label: 'Leave Unlit', action: () => {} },
        ],
      });
      return;
    }

    this.hud.openChoiceModal({
      title: `${beacon.name} · Lit`,
      body: island?.anchored
        ? `${island.name} is currently anchored still. Release it back to the Drift Clock, or rest to advance the sky by 90 seconds.`
        : `${island?.name || 'This island'} is drifting freely along its orbit.`,
      choices: [
        {
          label: island?.anchored ? 'Release Anchor' : 'Anchor Island Here',
          detail: island?.anchored ? 'Let the island resume its natural sky-lane orbit.' : 'Freeze the island at this orbital position.',
          action: () => {
            if (!island) return;
            island.anchored = !island.anchored;
            island.anchoredTime = island.anchored ? this.clock.time : null;
            this.audio.playWayglass(!island.anchored);
            this.hud.showToast(
              island.anchored ? `${island.name} anchored.` : `${island.name} released to the Drift.`
            );
            this._saveToSlot(this.activeSlotId, true);
          },
        },
        {
          label: 'Rest (+90s Drift Clock)',
          detail: 'Pass time calmly to align nearby sky-lanes and refill Ember.',
          action: () => {
            this.clock.advance(90);
            this.player.ember = 100;
            this.hud.showToast(`Sky shifts to ${this.clock.phase} (${this.clock.getFormattedCycle()}).`);
          },
        },
        { label: 'Step Back', action: () => {} },
      ],
    });
  }

  _lightBeacon(beacon, island) {
    beacon.lit = true;
    beacon.coreMat.color.setHex(0xffe29a);
    beacon.coreMat.emissiveIntensity = 1.9;
    beacon.beam.visible = true;
    beacon.light.intensity = 3.0;
    this.litBeacons.add(beacon.id);

    if (island) {
      island.anchored = true;
      island.anchoredTime = this.clock.time;
    }

    this.audio.playBeaconLit();
    this.hud.showToast(`${beacon.name} lit! ${island?.name || ''} is anchored.`);
    this._saveToSlot(this.activeSlotId, true);
  }

  _openLatticeHeartModal() {
    const allEchoes = this.collectedEchoes.size >= 12;
    this.hud.openChoiceModal({
      title: 'The Lattice Heart',
      body: `The center of every sky-lane hums before you. You carry ${this.collectedEchoes.size} of 12 Echoes. Choose what becomes of The Drifting Land.`,
      choices: [
        {
          label: 'Moor the Sky-Lanes',
          detail: 'Anchor every beacon permanently so no bridge breaks again, even as the wind grows still.',
          action: () => this._finishEnding('moor'),
        },
        {
          label: 'Release Every Anchor',
          detail: 'Unbind all beacons and return the islands to their ancient twelve-minute dance.',
          action: () => this._finishEnding('release'),
        },
        {
          label: allEchoes ? 'Harmonise the Drift' : 'Harmonise the Drift (Requires 12 Echoes)',
          detail: allEchoes
            ? 'Weave all twelve Echoes into the Lattice so islands drift without severing their crossings.'
            : `Gather all 12 Echoes across the five levels (${12 - this.collectedEchoes.size} remaining).`,
          disabled: !allEchoes,
          action: () => this._finishEnding('harmonise'),
        },
        { label: 'Step Back and Keep Exploring', action: () => {} },
      ],
    });
  }

  _finishEnding(choice) {
    this.endingChosen = choice;
    this.audio.playBeaconLit();
    if (choice === 'release') {
      for (const island of this.islandMap.values()) {
        island.anchored = false;
        island.anchoredTime = null;
      }
    } else if (choice === 'moor') {
      for (const island of this.islandMap.values()) {
        island.anchored = true;
        island.anchoredTime = this.clock.time;
      }
    }
    this._saveToSlot(this.activeSlotId, true);

    const copy = {
      moor: {
        title: 'Ending · The Still Horizon',
        body: 'The Lattice Heart settles into golden stone. Bridges hold fast across every abyss, and travelers walk safely from Mooring Shallows to the Spindle under an unmoving sky.',
      },
      release: {
        title: 'Ending · The Turning Sky',
        body: 'One by one the iron anchors unlatch. Wind rushes back through the waterfalls and sails, setting every island dancing along the ancient Drift Clock once more.',
      },
      harmonise: {
        title: 'Ending · Song of Twelve Echoes',
        body: 'Twelve memories weave into a living golden thread. The islands keep their graceful orbits, yet luminous wind-spans bridge every crossing whenever two lanes greet.',
      },
    }[choice];

    this.hud.openChoiceModal({
      title: copy.title,
      body: copy.body,
      choices: [
        { label: 'Continue Wandering This Sky', action: () => {} },
        { label: 'Return to Title Screen', action: () => this.options.onReturnTitle() },
      ],
    });
  }

  /**
   * Jump directly to a Region/Level spawn island (Levels selector).
   * @param {string} regionId
   */
  travelToRegion(regionId) {
    const reg = REGIONS.find((r) => r.id === regionId);
    if (!reg) return;
    const target = this.islandMap.get(reg.spawnIslandId);
    if (!target) return;
    evaluateOrbitPosition(target, this.clock.time, target.group.position);
    this.currentRegionId = reg.id;
    if (reg.index > 1) this.player.hasWayglass = true;
    this.player.ember = 100;
    this.player.teleportToIsland(target);
    this.hud.showToast(`Arrived at Level ${reg.index} · ${reg.name}`);
    this._saveToSlot(this.activeSlotId, true);
  }

  _saveToSlot(slotId, silent = false) {
    this.activeSlotId = slotId;
    const anchoredIslands = [];
    for (const isl of this.islandMap.values()) {
      if (isl.anchored) anchoredIslands.push(isl.id);
    }
    const ok = this.saveManager.saveSlot(slotId, {
      regionId: this.currentRegionId,
      islandId: this.player.safeIslandId,
      clockTime: this.clock.time,
      ember: this.player.ember,
      hasWayglass: this.player.hasWayglass,
      litBeacons: Array.from(this.litBeacons),
      anchoredIslands,
      collectedEchoes: Array.from(this.collectedEchoes),
      activatedVanes: Array.from(this.activatedVanes),
      endingChosen: this.endingChosen,
    });
    if (!silent) {
      this.hud.showToast(ok ? `Saved to Slot ${slotId}.` : 'Saved for this session (storage restricted).');
    }
  }

  _applySaveData(data) {
    this.clock.setTime(data.clockTime ?? START_TIME);
    this.player.ember = data.ember ?? 100;
    this.player.hasWayglass = Boolean(data.hasWayglass);
    this.endingChosen = data.endingChosen || null;
    this.litBeacons = new Set(data.litBeacons || []);
    this.collectedEchoes = new Set(data.collectedEchoes || []);
    this.activatedVanes = new Set(data.activatedVanes || []);

    const anchoredSet = new Set(data.anchoredIslands || []);

    for (const island of this.islandMap.values()) {
      island.anchored = anchoredSet.has(island.id);
      island.anchoredTime = island.anchored ? this.clock.time : null;
      evaluateOrbitPosition(island, this.clock.time, island.group.position);

      for (const inter of island.interactables) {
        if (inter.type === 'wayglass' && this.player.hasWayglass) {
          inter.collected = true;
          inter.mesh.visible = false;
        } else if (inter.type === 'beacon' && this.litBeacons.has(inter.id)) {
          inter.lit = true;
          inter.coreMat.color.setHex(0xffe29a);
          inter.coreMat.emissiveIntensity = 1.9;
          inter.beam.visible = true;
          inter.light.intensity = 3.0;
        } else if (inter.type === 'echo' && this.collectedEchoes.has(inter.id)) {
          inter.collected = true;
          inter.shardMat.emissiveIntensity = 0.25;
        } else if (inter.type === 'vaneGate' && this.activatedVanes.has(inter.id)) {
          this._activateVaneGate(island, inter);
        }
      }
    }

    const spawn = this.islandMap.get(data.islandId) || this.islandMap.get('kestrel_raft');
    if (spawn) {
      this.currentRegionId = spawn.regionId;
      this.player.teleportToIsland(spawn);
    }
  }

  _fixedUpdate(dt) {
    if (!this.paused) {
      this.elapsed += dt;
      this.clock.update(dt);

      // Update drifting island world positions deterministically
      for (const island of this.islandMap.values()) {
        evaluateOrbitPosition(island, this.clock.time, island.group.position);
        this._animateIslandProps(island, dt);
      }
    }

    this.player.step(dt, this.islandMap, this.paused);
    this.player.syncCamera();

    // Determine current island/region + closest interactable
    const currentIsland = this.islandMap.get(this.player.safeIslandId) || this.islandMap.get('kestrel_raft');
    if (currentIsland) {
      this.currentRegionId = currentIsland.regionId;
    }

    let closestInter = null;
    let bestD = Infinity;
    for (const island of this.islandMap.values()) {
      for (const inter of island.interactables) {
        if ((inter.type === 'wayglass' || inter.type === 'echo') && inter.collected && inter.type === 'wayglass') continue;
        const wx = island.group.position.x + inter.localPos.x;
        const wy = island.group.position.y + inter.localPos.y;
        const wz = island.group.position.z + inter.localPos.z;
        const d = _vTmp.set(wx, wy, wz).distanceTo(this.player.position);
        if (d <= inter.radius && d < bestD) {
          bestD = d;
          closestInter = inter;
        }
      }
    }
    this._activeInteractable = closestInter;

    const region = REGIONS.find((r) => r.id === this.currentRegionId) || REGIONS[0];
    const wayglassText = this.wayglass.update(this.player.position, this.clock.time);

    let promptText = '';
    if (closestInter) {
      const lbl = closestInter.type === 'beacon' && closestInter.lit
        ? `${closestInter.name} (Anchor / Rest)`
        : closestInter.label;
      promptText = `[E] ${lbl}`;
    }

    this.hud.update({
      region,
      islandName: currentIsland?.name || 'Sky-Lane',
      clock: this.clock,
      yaw: this.fpCamera.yaw,
      ember: this.player.ember,
      breath: this.player.breath,
      echoCount: this.collectedEchoes.size,
      totalEchoes: 12,
      promptText,
      wayglassText,
      objective: region.objective,
    });

    const speed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    this.audio.updateWind(this.player.gliding, speed);
  }

  _animateIslandProps(island, dt) {
    const t = this.elapsed;
    for (let i = 0; i < island.streamers.length; i++) {
      const ribbon = island.streamers[i];
      ribbon.rotation.y = Math.sin(t * 2.4 + i) * 0.25 + 0.35;
      ribbon.rotation.z = Math.sin(t * 3.8 + i) * 0.08;
    }
    for (const u of island.updrafts) {
      u.r1.position.y = 0.8 + ((t * 2.2) % 3.4);
      u.r2.position.y = 0.8 + ((t * 2.2 + 1.7) % 3.4);
    }
    for (const lamp of island.hollowLamps) {
      const a = t * lamp.cfg.speed + lamp.cfg.phase;
      lamp.mesh.position.x = lamp.cfg.cx + Math.cos(a) * lamp.cfg.rx;
      lamp.mesh.position.z = lamp.cfg.cz + Math.sin(a) * lamp.cfg.rz;
      lamp.mesh.rotation.y += dt * 0.8;
    }
    for (const inter of island.interactables) {
      if (inter.type === 'beacon') {
        inter.cradle.rotation.y += dt * (inter.lit ? 1.2 : 0.2);
        inter.ringInner.rotation.z += dt * (inter.lit ? 1.8 : 0.3);
      } else if (inter.type === 'echo') {
        inter.shard.rotation.y += dt * 1.1;
        inter.ring.rotation.x += dt * 0.7;
      } else if (inter.type === 'vaneGate') {
        inter.rotor.rotation.z += dt * inter.spinSpeed;
      } else if (inter.type === 'latticeHeart') {
        inter.ring1.rotation.y += dt * 0.45;
        inter.ring2.rotation.x += dt * 0.6;
        inter.heart.rotation.y -= dt * 0.8;
      }
    }
  }

  _renderFrame() {
    this.worldRenderer.syncAtmosphere(this.clock, this.player.position);
    this.skyDome.update(this.clock, this.player.position, this.elapsed);
    this.seaPlane.update(this.clock, this.elapsed, this.quality.fogDensity);

    if (this.motes) {
      this.motes.position.set(this.player.position.x, this.player.position.y - 8, this.player.position.z);
      this.motes.rotation.y += 0.0005;
    }

    this.worldRenderer.render();
    if (!this._firstRenderDone) {
      this._firstRenderDone = true;
      this.options.onFirstRender?.();
    }
  }

  dispose() {
    this.loop.stop();
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.worldRenderer.renderer.domElement.removeEventListener('contextmenu', this._onContextMenu);
    this.hud.dispose();
    this.fpCamera.dispose();
    this.wayglass.dispose();
    this.skyDome.dispose();
    this.seaPlane.dispose();
    this.islandFactory.dispose();
    this.textures.dispose();
    if (this.motes) {
      this.motes.geometry.dispose();
      this.motes.material.dispose();
    }
    this.worldRenderer.dispose();
  }
}
