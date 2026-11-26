/**
 * @fileoverview Glass-and-Gilt HUD, touch controls, Level/Region selector, Beacon/Ending modals, and Settings/Save drawer.
 * Uses solid/rgba backing without backdrop-filter over WebGL to avoid Android/software-WebGL stalls.
 */

const CARDINAL = [
  { label: 'N', yaw: 0 },
  { label: 'E', yaw: -Math.PI * 0.5 },
  { label: 'S', yaw: Math.PI },
  { label: 'W', yaw: Math.PI * 0.5 },
];

function wrapAngle(a) {
  let x = (a + Math.PI) % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x - Math.PI;
}

export class GameHUD {
  /**
   * @param {HTMLElement} root
   * @param {{
   *   regions: Array<object>,
   *   settings: object,
   *   saveManager: import('../save/SaveManager.js').SaveManager,
   *   onSelectLevel: (regionId: string) => void,
   *   onInteract: () => void,
   *   onToggleWayglass: () => void,
   *   onWindcall: () => void,
   *   onJumpStart: () => void,
   *   onJumpEnd: () => void,
   *   onMoveJoystick: (x: number, y: number, sprint: boolean) => void,
   *   onTouchLook: (dx: number, dy: number) => void,
   *   onPauseChange: (paused: boolean) => void,
   *   onSettingsChange: (nextSettings: object) => void,
   *   onSaveSlot: (slotId: number) => void,
   *   onLoadSlot: (slotId: number) => void,
   *   onDeleteSlot: (slotId: number) => void,
   *   onReturnTitle: () => void,
   * }} handlers
   */
  constructor(root, handlers) {
    this.root = root;
    this.handlers = handlers;
    this.isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);

    this.paused = false;
    this.modalOpen = false;
    this._toastTimer = 0;

    this._injectStyles();
    this._buildDOM();
    if (this.isTouch) {
      this._bindTouchControls();
    }
  }

  _injectStyles() {
    if (document.getElementById('tdl-hud-styles')) return;
    const style = document.createElement('style');
    style.id = 'tdl-hud-styles';
    style.textContent = `
      .tdl-hud {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 20;
        color: #f3ecd8;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 16px;
        user-select: none;
        -webkit-user-select: none;
      }
      .tdl-hud-top {
        position: absolute;
        top: max(12px, env(safe-area-inset-top));
        left: max(12px, env(safe-area-inset-left));
        right: max(12px, env(safe-area-inset-right));
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }
      .tdl-glass {
        background: rgba(14, 28, 38, 0.82);
        border: 1px solid rgba(246, 201, 120, 0.52);
        border-radius: 12px;
        box-shadow: 0 10px 28px rgba(5, 12, 24, 0.45);
      }
      .tdl-region-box {
        padding: 8px 14px;
        min-width: 0;
        pointer-events: auto;
      }
      .tdl-region-name {
        font-family: "Cinzel", Georgia, serif;
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.08em;
        color: #f6c978;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tdl-region-sub {
        font-size: 13px;
        color: #d7d0be;
        margin-top: 2px;
      }
      .tdl-compass-wrap {
        padding: 6px 14px;
        text-align: center;
        min-width: 150px;
      }
      .tdl-compass {
        font-family: "Cinzel", Georgia, serif;
        font-size: 14px;
        letter-spacing: 0.14em;
        color: #f3ecd8;
        font-variant-numeric: tabular-nums;
      }
      .tdl-clock-line {
        font-size: 13px;
        color: #8fd6e8;
        font-variant-numeric: tabular-nums;
        margin-top: 2px;
      }
      .tdl-top-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: auto;
      }
      .tdl-hud-btn {
        font-family: "Cinzel", Georgia, serif;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: #f6c978;
        background: rgba(14, 28, 38, 0.86);
        border: 1px solid rgba(246, 201, 120, 0.58);
        border-radius: 10px;
        padding: 10px 14px;
        min-height: 44px;
        min-width: 44px;
        cursor: pointer;
        white-space: nowrap;
      }
      .tdl-hud-btn:hover { background: rgba(24, 46, 62, 0.96); }
      .tdl-hud-btn:focus-visible { outline: 3px solid #f6c978; outline-offset: 2px; }

      .tdl-reticle {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 8px;
        height: 8px;
        margin: -4px 0 0 -4px;
        border-radius: 50%;
        border: 1.5px solid rgba(243, 236, 216, 0.85);
        box-shadow: 0 0 6px rgba(14, 28, 38, 0.8);
      }
      .tdl-prompt {
        position: absolute;
        left: 50%;
        top: 56%;
        transform: translateX(-50%);
        padding: 8px 16px;
        font-size: 15px;
        color: #f3ecd8;
        display: none;
        white-space: nowrap;
      }
      .tdl-wayglass-banner {
        position: absolute;
        top: 84px;
        left: 50%;
        transform: translateX(-50%);
        padding: 7px 15px;
        font-size: 14px;
        color: #8fd6e8;
        border-color: rgba(143, 214, 232, 0.65);
        display: none;
        white-space: nowrap;
        max-width: 90vw;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tdl-toast {
        position: absolute;
        top: 126px;
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 18px;
        font-size: 15px;
        color: #f6c978;
        opacity: 0;
        transition: opacity 0.25s ease;
        max-width: min(480px, 90vw);
        text-align: center;
      }
      .tdl-toast.visible { opacity: 1; }

      .tdl-bottom-left {
        position: absolute;
        left: max(14px, env(safe-area-inset-left));
        bottom: max(14px, env(safe-area-inset-bottom));
        width: min(270px, 52vw);
        padding: 10px 14px;
      }
      .tdl-meter-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        margin-bottom: 4px;
      }
      .tdl-bar-track {
        height: 7px;
        border-radius: 6px;
        background: rgba(8, 16, 24, 0.8);
        overflow: hidden;
        margin-bottom: 8px;
      }
      .tdl-bar-ember {
        height: 100%;
        background: linear-gradient(90deg, #d46b2c, #ff9d4a, #ffd584);
        width: 100%;
      }
      .tdl-bar-breath {
        height: 100%;
        background: linear-gradient(90deg, #4b94ad, #8fd6e8);
        width: 100%;
      }
      .tdl-objective {
        font-size: 13px;
        line-height: 1.4;
        color: #e4ddc7;
      }

      /* Desktop subtle control bar */
      .tdl-desktop-hints {
        position: absolute;
        right: max(14px, env(safe-area-inset-right));
        bottom: max(14px, env(safe-area-inset-bottom));
        padding: 8px 12px;
        font-size: 13px;
        color: #d8d2be;
      }

      /* Touch overlay */
      .tdl-touch-zone-left {
        position: absolute;
        left: 0;
        top: 22%;
        width: 40%;
        bottom: 0;
        pointer-events: auto;
        touch-action: none;
      }
      .tdl-touch-zone-right {
        position: absolute;
        left: 40%;
        top: 18%;
        right: 0;
        bottom: 0;
        pointer-events: auto;
        touch-action: none;
      }
      .tdl-joystick-base {
        position: absolute;
        width: 108px;
        height: 108px;
        border-radius: 50%;
        border: 2px solid rgba(246, 201, 120, 0.5);
        background: rgba(14, 28, 38, 0.45);
        display: none;
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
      .tdl-joystick-knob {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 46px;
        height: 46px;
        margin: -23px 0 0 -23px;
        border-radius: 50%;
        background: rgba(246, 201, 120, 0.8);
      }
      .tdl-touch-actions {
        position: absolute;
        right: max(14px, env(safe-area-inset-right));
        bottom: max(16px, env(safe-area-inset-bottom));
        display: grid;
        grid-template-columns: repeat(2, 62px);
        gap: 10px;
        pointer-events: auto;
      }
      .tdl-touch-btn {
        width: 62px;
        height: 54px;
        border-radius: 12px;
        border: 1px solid rgba(246, 201, 120, 0.65);
        background: rgba(14, 28, 38, 0.84);
        color: #f3ecd8;
        font-family: "Cinzel", Georgia, serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        cursor: pointer;
        touch-action: none;
      }
      .tdl-touch-btn.active {
        background: rgba(246, 201, 120, 0.25);
        color: #f6c978;
      }

      /* Modals & Intro */
      .tdl-modal-layer {
        position: absolute;
        inset: 0;
        background: rgba(8, 16, 28, 0.72);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
        pointer-events: auto;
        z-index: 40;
      }
      .tdl-modal-layer.open { display: flex; }
      .tdl-modal-panel {
        width: min(560px, 100%);
        max-height: 86vh;
        overflow-y: auto;
        padding: 24px;
        text-align: left;
      }
      .tdl-modal-heading {
        margin: 0 0 10px;
        font-family: "Cinzel", Georgia, serif;
        font-size: 22px;
        color: #f6c978;
        letter-spacing: 0.08em;
      }
      .tdl-modal-body {
        font-size: 16px;
        line-height: 1.6;
        color: #f3ecd8;
        margin: 0 0 16px;
      }
      .tdl-choice-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .tdl-choice-btn {
        text-align: left;
        padding: 12px 16px;
        border-radius: 10px;
        border: 1px solid rgba(246, 201, 120, 0.55);
        background: rgba(20, 38, 52, 0.9);
        color: #f3ecd8;
        font-size: 15px;
        cursor: pointer;
        min-height: 48px;
      }
      .tdl-choice-btn:hover:not(:disabled) { background: rgba(34, 62, 82, 0.95); }
      .tdl-choice-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .tdl-choice-title {
        display: block;
        font-family: "Cinzel", Georgia, serif;
        font-weight: 700;
        color: #f6c978;
        margin-bottom: 3px;
      }
      .tdl-prologue {
        position: absolute;
        inset: 0;
        z-index: 45;
        background: rgba(11, 21, 44, 0.92);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 24px;
        transition: opacity 1.1s ease;
        pointer-events: auto;
      }
      .tdl-prologue p {
        font-family: "Cinzel", Georgia, serif;
        font-size: clamp(18px, 2.8vw, 25px);
        line-height: 1.75;
        max-width: 620px;
        color: #f3ecd8;
        margin: 8px 0;
      }

      @media (max-width: 720px) {
        .tdl-compass-wrap { display: none; }
        .tdl-desktop-hints { display: none; }
        .tdl-bottom-left { width: min(210px, 50vw); bottom: max(12px, env(safe-area-inset-bottom)); }
      }
    `;
    document.head.appendChild(style);
  }

  _buildDOM() {
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'tdl-hud';

    // Top bar
    const top = document.createElement('div');
    top.className = 'tdl-hud-top';

    const regionBox = document.createElement('div');
    regionBox.className = 'tdl-glass tdl-region-box';
    this.regionNameEl = document.createElement('div');
    this.regionNameEl.className = 'tdl-region-name';
    this.regionSubEl = document.createElement('div');
    this.regionSubEl.className = 'tdl-region-sub';
    regionBox.append(this.regionNameEl, this.regionSubEl);

    const compassWrap = document.createElement('div');
    compassWrap.className = 'tdl-glass tdl-compass-wrap';
    this.compassEl = document.createElement('div');
    this.compassEl.className = 'tdl-compass';
    this.clockEl = document.createElement('div');
    this.clockEl.className = 'tdl-clock-line';
    compassWrap.append(this.compassEl, this.clockEl);

    const topActions = document.createElement('div');
    topActions.className = 'tdl-top-actions';

    this.levelsBtn = document.createElement('button');
    this.levelsBtn.type = 'button';
    this.levelsBtn.className = 'tdl-hud-btn';
    this.levelsBtn.textContent = 'Levels';
    this.levelsBtn.addEventListener('click', () => this.openMenu('levels'));

    this.menuBtn = document.createElement('button');
    this.menuBtn.type = 'button';
    this.menuBtn.className = 'tdl-hud-btn';
    this.menuBtn.textContent = 'Menu';
    this.menuBtn.addEventListener('click', () => this.openMenu('main'));

    topActions.append(this.levelsBtn, this.menuBtn);
    top.append(regionBox, compassWrap, topActions);

    // Reticle + prompt + wayglass + toast
    this.reticleEl = document.createElement('div');
    this.reticleEl.className = 'tdl-reticle';

    this.promptEl = document.createElement('div');
    this.promptEl.className = 'tdl-glass tdl-prompt';

    this.wayglassBannerEl = document.createElement('div');
    this.wayglassBannerEl.className = 'tdl-glass tdl-wayglass-banner';

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'tdl-glass tdl-toast';

    // Bottom-left gauges & objective
    const bottomLeft = document.createElement('div');
    bottomLeft.className = 'tdl-glass tdl-bottom-left';

    const emberRow = document.createElement('div');
    emberRow.className = 'tdl-meter-row';
    const emberLabel = document.createElement('span');
    emberLabel.textContent = 'Ember Lantern';
    this.emberPctEl = document.createElement('span');
    emberRow.append(emberLabel, this.emberPctEl);
    const emberTrack = document.createElement('div');
    emberTrack.className = 'tdl-bar-track';
    this.emberFillEl = document.createElement('div');
    this.emberFillEl.className = 'tdl-bar-ember';
    emberTrack.appendChild(this.emberFillEl);

    const breathRow = document.createElement('div');
    breathRow.className = 'tdl-meter-row';
    const breathLabel = document.createElement('span');
    breathLabel.textContent = 'Skycloak Breath';
    this.breathValEl = document.createElement('span');
    breathRow.append(breathLabel, this.breathValEl);
    const breathTrack = document.createElement('div');
    breathTrack.className = 'tdl-bar-track';
    this.breathFillEl = document.createElement('div');
    this.breathFillEl.className = 'tdl-bar-breath';
    breathTrack.appendChild(this.breathFillEl);

    this.objectiveEl = document.createElement('div');
    this.objectiveEl.className = 'tdl-objective';

    bottomLeft.append(emberRow, emberTrack, breathRow, breathTrack, this.objectiveEl);

    // Desktop keyboard hint
    this.desktopHintsEl = document.createElement('div');
    this.desktopHintsEl.className = 'tdl-glass tdl-desktop-hints';
    this.desktopHintsEl.textContent = 'WASD Move · Space Jump/Glide · E Interact · Q Wayglass · F Windcall';

    this.hudEl.append(
      top,
      this.reticleEl,
      this.promptEl,
      this.wayglassBannerEl,
      this.toastEl,
      bottomLeft,
      this.desktopHintsEl
    );

    if (this.isTouch) {
      this._buildTouchDOM();
    }

    // Modal overlay
    this.modalLayer = document.createElement('div');
    this.modalLayer.className = 'tdl-modal-layer';
    this.modalPanel = document.createElement('div');
    this.modalPanel.className = 'tdl-glass tdl-modal-panel';
    this.modalLayer.appendChild(this.modalPanel);
    this.hudEl.appendChild(this.modalLayer);

    this.root.appendChild(this.hudEl);
  }

  _buildTouchDOM() {
    this.leftZone = document.createElement('div');
    this.leftZone.className = 'tdl-touch-zone-left';
    this.rightZone = document.createElement('div');
    this.rightZone.className = 'tdl-touch-zone-right';

    this.joyBase = document.createElement('div');
    this.joyBase.className = 'tdl-joystick-base';
    this.joyKnob = document.createElement('div');
    this.joyKnob.className = 'tdl-joystick-knob';
    this.joyBase.appendChild(this.joyKnob);

    const actionGrid = document.createElement('div');
    actionGrid.className = 'tdl-touch-actions';

    const makeBtn = (label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tdl-touch-btn';
      b.textContent = label;
      return b;
    };

    this.touchWayglassBtn = makeBtn('Wayglass');
    this.touchWindcallBtn = makeBtn('Windcall');
    this.touchInteractBtn = makeBtn('Interact');
    this.touchJumpBtn = makeBtn('Glide');

    this.touchWayglassBtn.addEventListener('click', () => this.handlers.onToggleWayglass());
    this.touchWindcallBtn.addEventListener('click', () => this.handlers.onWindcall());
    this.touchInteractBtn.addEventListener('click', () => this.handlers.onInteract());
    this.touchJumpBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.handlers.onJumpStart();
    });
    this.touchJumpBtn.addEventListener('pointerup', () => this.handlers.onJumpEnd());
    this.touchJumpBtn.addEventListener('pointercancel', () => this.handlers.onJumpEnd());

    actionGrid.append(
      this.touchWayglassBtn,
      this.touchWindcallBtn,
      this.touchInteractBtn,
      this.touchJumpBtn
    );

    this.hudEl.append(this.leftZone, this.rightZone, this.joyBase, actionGrid);
  }

  _bindTouchControls() {
    let movePointerId = null;
    let moveOriginX = 0;
    let moveOriginY = 0;
    const maxRadius = 46;

    this.leftZone.addEventListener('pointerdown', (e) => {
      if (movePointerId !== null) return;
      movePointerId = e.pointerId;
      moveOriginX = e.clientX;
      moveOriginY = e.clientY;
      this.leftZone.setPointerCapture(e.pointerId);
      this.joyBase.style.display = 'block';
      this.joyBase.style.left = `${moveOriginX}px`;
      this.joyBase.style.top = `${moveOriginY}px`;
      this.joyKnob.style.transform = 'translate(0px, 0px)';
    });

    this.leftZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== movePointerId) return;
      const dx = e.clientX - moveOriginX;
      const dy = e.clientY - moveOriginY;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(maxRadius, dist);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clamped;
      const ky = Math.sin(angle) * clamped;
      this.joyKnob.style.transform = `translate(${kx}px, ${ky}px)`;
      const normX = kx / maxRadius;
      const normY = -ky / maxRadius;
      this.handlers.onMoveJoystick(normX, normY, dist > maxRadius * 0.85);
    });

    const endMove = (e) => {
      if (e.pointerId !== movePointerId) return;
      movePointerId = null;
      this.joyBase.style.display = 'none';
      this.handlers.onMoveJoystick(0, 0, false);
    };
    this.leftZone.addEventListener('pointerup', endMove);
    this.leftZone.addEventListener('pointercancel', endMove);

    let lookPointerId = null;
    let lastLookX = 0;
    let lastLookY = 0;

    this.rightZone.addEventListener('pointerdown', (e) => {
      if (lookPointerId !== null) return;
      lookPointerId = e.pointerId;
      lastLookX = e.clientX;
      lastLookY = e.clientY;
      this.rightZone.setPointerCapture(e.pointerId);
    });

    this.rightZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookPointerId) return;
      const dx = e.clientX - lastLookX;
      const dy = e.clientY - lastLookY;
      lastLookX = e.clientX;
      lastLookY = e.clientY;
      this.handlers.onTouchLook(dx, dy);
    });

    const endLook = (e) => {
      if (e.pointerId === lookPointerId) lookPointerId = null;
    };
    this.rightZone.addEventListener('pointerup', endLook);
    this.rightZone.addEventListener('pointercancel', endLook);
  }

  /**
   * Show the 3-line Dawn Prologue fade over Kestrel Raft.
   * @param {() => void} [onDone]
   */
  showPrologue(onDone) {
    const overlay = document.createElement('div');
    overlay.className = 'tdl-prologue';
    overlay.innerHTML = `
      <p>The sky-lanes wake at dawn.</p>
      <p>Twelve beacons once moored a drifting land.</p>
      <p>Walk the islands, read the wind, and choose what should endure.</p>
    `;
    const dismiss = () => {
      overlay.style.opacity = '0';
      window.setTimeout(() => {
        overlay.remove();
        onDone?.();
      }, 900);
    };
    overlay.addEventListener('click', dismiss, { once: true });
    this.hudEl.appendChild(overlay);
    window.setTimeout(dismiss, 3600);
  }

  /**
   * @param {string} msg
   */
  showToast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('visible');
    if (this._toastTimer) window.clearTimeout(this._toastTimer);
    this._toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, 3200);
  }

  /**
   * Update live HUD telemetry (player gauges, Drift Clock, region, compass, prompt).
   */
  update({ region, islandName, clock, yaw, ember, breath, echoCount, totalEchoes, promptText, wayglassText, objective }) {
    this.regionNameEl.textContent = `Level ${region.index} · ${region.name}`;
    this.regionSubEl.textContent = `${islandName} · ${echoCount}/${totalEchoes} Echoes`;

    // Compass heading
    let closest = 'N';
    let bestDelta = Infinity;
    for (const c of CARDINAL) {
      const d = Math.abs(wrapAngle(yaw - c.yaw));
      if (d < bestDelta) {
        bestDelta = d;
        closest = c.label;
      }
    }
    this.compassEl.textContent = `Facing ${closest}`;
    this.clockEl.textContent = `${clock.phase} · ${clock.getFormattedCycle()}`;

    this.emberPctEl.textContent = `${Math.round(ember)}%`;
    this.emberFillEl.style.width = `${Math.round(ember)}%`;

    this.breathValEl.textContent = `${breath.toFixed(1)}s`;
    this.breathFillEl.style.width = `${Math.round((breath / 6.0) * 100)}%`;

    this.objectiveEl.textContent = objective;

    if (promptText && !this.modalOpen) {
      this.promptEl.textContent = this.isTouch ? promptText.replace('[E] ', '') : promptText;
      this.promptEl.style.display = 'block';
    } else {
      this.promptEl.style.display = 'none';
    }

    if (wayglassText && !this.modalOpen) {
      this.wayglassBannerEl.textContent = wayglassText;
      this.wayglassBannerEl.style.display = 'block';
    } else {
      this.wayglassBannerEl.style.display = 'none';
    }
  }

  /**
   * Open an interactive dialogue / beacon / ending modal.
   * @param {{ title: string, body: string, choices: Array<{ label: string, detail?: string, disabled?: boolean, action: () => void }> }} cfg
   */
  openChoiceModal({ title, body, choices }) {
    this.modalOpen = true;
    this.handlers.onPauseChange(true);
    this.modalPanel.replaceChildren();

    const h = document.createElement('h2');
    h.className = 'tdl-modal-heading';
    h.textContent = title;
    const p = document.createElement('p');
    p.className = 'tdl-modal-body';
    p.textContent = body;

    const list = document.createElement('div');
    list.className = 'tdl-choice-list';
    for (const c of choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tdl-choice-btn';
      btn.disabled = Boolean(c.disabled);
      const t = document.createElement('span');
      t.className = 'tdl-choice-title';
      t.textContent = c.label;
      btn.appendChild(t);
      if (c.detail) {
        const d = document.createElement('span');
        d.textContent = c.detail;
        btn.appendChild(d);
      }
      btn.addEventListener('click', () => {
        this.closeModal();
        c.action();
      });
      list.appendChild(btn);
    }

    this.modalPanel.append(h, p, list);
    this.modalLayer.classList.add('open');
  }

  openMenu(tab = 'main') {
    this.modalOpen = true;
    this.handlers.onPauseChange(true);
    this.modalPanel.replaceChildren();

    const h = document.createElement('h2');
    h.className = 'tdl-modal-heading';

    if (tab === 'levels') {
      h.textContent = 'Sky-Lane Levels';
      const p = document.createElement('p');
      p.className = 'tdl-modal-body';
      p.textContent = 'Travel to any of the five altitude regions to explore, solve its Drift Clock alignment, and gather Echoes.';
      const list = document.createElement('div');
      list.className = 'tdl-choice-list';

      for (const reg of this.handlers.regions) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tdl-choice-btn';
        btn.innerHTML = `<span class="tdl-choice-title">Level ${reg.index} · ${reg.name}</span><span>${reg.subtitle}</span>`;
        btn.addEventListener('click', () => {
          this.closeModal();
          this.handlers.onSelectLevel(reg.id);
        });
        list.appendChild(btn);
      }

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'tdl-choice-btn';
      backBtn.innerHTML = `<span class="tdl-choice-title">Resume Journey</span>`;
      backBtn.addEventListener('click', () => this.closeModal());
      list.appendChild(backBtn);

      this.modalPanel.append(h, p, list);
    } else if (tab === 'saves') {
      h.textContent = 'Save Slots';
      const p = document.createElement('p');
      p.className = 'tdl-modal-body';
      p.textContent = 'Save your current sky-lane position, lit beacons, and Echoes, or load a previous journey.';
      const list = document.createElement('div');
      list.className = 'tdl-choice-list';

      for (const slot of this.handlers.saveManager.listSlots()) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '8px';

        const mainBtn = document.createElement('button');
        mainBtn.type = 'button';
        mainBtn.className = 'tdl-choice-btn';
        mainBtn.style.flex = '1';
        if (slot.data) {
          const dt = new Date(slot.data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          mainBtn.innerHTML = `<span class="tdl-choice-title">Slot ${slot.slotId} · ${slot.data.regionId.toUpperCase()}</span><span>${slot.data.litBeacons.length} Beacons · ${slot.data.collectedEchoes.length}/12 Echoes · ${dt}</span>`;
        } else {
          mainBtn.innerHTML = `<span class="tdl-choice-title">Slot ${slot.slotId} · Empty</span><span>Click to save current progress here</span>`;
        }
        mainBtn.addEventListener('click', () => {
          this.handlers.onSaveSlot(slot.slotId);
          this.openMenu('saves');
        });
        row.appendChild(mainBtn);

        if (slot.data) {
          const loadBtn = document.createElement('button');
          loadBtn.type = 'button';
          loadBtn.className = 'tdl-hud-btn';
          loadBtn.textContent = 'Load';
          loadBtn.addEventListener('click', () => {
            this.closeModal();
            this.handlers.onLoadSlot(slot.slotId);
          });
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'tdl-hud-btn';
          delBtn.textContent = 'Clear';
          delBtn.addEventListener('click', () => {
            this.handlers.onDeleteSlot(slot.slotId);
            this.openMenu('saves');
          });
          row.append(loadBtn, delBtn);
        }

        list.appendChild(row);
      }

      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'tdl-choice-btn';
      back.innerHTML = `<span class="tdl-choice-title">Back to Menu</span>`;
      back.addEventListener('click', () => this.openMenu('main'));
      list.appendChild(back);

      this.modalPanel.append(h, p, list);
    } else if (tab === 'settings') {
      h.textContent = 'Settings';
      const s = { ...this.handlers.settings };
      const list = document.createElement('div');
      list.className = 'tdl-choice-list';

      const soundBtn = document.createElement('button');
      soundBtn.type = 'button';
      soundBtn.className = 'tdl-choice-btn';
      const syncSound = () => {
        soundBtn.innerHTML = `<span class="tdl-choice-title">Sound: ${s.soundEnabled ? 'On' : 'Off'}</span><span>Toggle procedural wind and beacon chimes</span>`;
      };
      syncSound();
      soundBtn.addEventListener('click', () => {
        s.soundEnabled = !s.soundEnabled;
        this.handlers.onSettingsChange(s);
        syncSound();
      });

      const qualBtn = document.createElement('button');
      qualBtn.type = 'button';
      qualBtn.className = 'tdl-choice-btn';
      const qualities = ['auto', 'low', 'medium', 'high'];
      const syncQual = () => {
        qualBtn.innerHTML = `<span class="tdl-choice-title">Graphics: ${s.graphicsQuality.toUpperCase()}</span><span>Cycle rendering quality preset</span>`;
      };
      syncQual();
      qualBtn.addEventListener('click', () => {
        const idx = qualities.indexOf(s.graphicsQuality);
        s.graphicsQuality = qualities[(idx + 1) % qualities.length];
        this.handlers.onSettingsChange(s);
        syncQual();
      });

      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'tdl-choice-btn';
      back.innerHTML = `<span class="tdl-choice-title">Back to Menu</span>`;
      back.addEventListener('click', () => this.openMenu('main'));

      list.append(soundBtn, qualBtn, back);
      this.modalPanel.append(h, list);
    } else {
      h.textContent = 'Journey Menu';
      const list = document.createElement('div');
      list.className = 'tdl-choice-list';

      const items = [
        ['Resume', 'Return to the sky-lanes', () => this.closeModal()],
        ['Levels & Sky-Lanes', 'Jump between the 5 altitude regions', () => this.openMenu('levels')],
        ['Save Slots', 'Save, load, or manage your 3 journey slots', () => this.openMenu('saves')],
        ['Settings', 'Audio and graphics quality options', () => this.openMenu('settings')],
        ['Return to Title', 'Go back to the opening sky-scene', () => this.handlers.onReturnTitle()],
      ];

      for (const [title, detail, fn] of items) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tdl-choice-btn';
        btn.innerHTML = `<span class="tdl-choice-title">${title}</span><span>${detail}</span>`;
        btn.addEventListener('click', fn);
        list.appendChild(btn);
      }
      this.modalPanel.append(h, list);
    }

    this.modalLayer.classList.add('open');
  }

  closeModal() {
    this.modalOpen = false;
    this.modalLayer.classList.remove('open');
    this.handlers.onPauseChange(false);
  }

  dispose() {
    this.hudEl.remove();
  }
}
