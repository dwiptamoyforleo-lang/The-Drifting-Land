/**
 * @fileoverview Entry bootstrap and loader integration for The Drifting Land.
 * Keeps /public/loading-screen.html completely unmodified while launching the
 * live 3D game world on Begin Journey or Save Slot load.
 */

import { SaveManager } from './save/SaveManager.js';

const SETTINGS_KEY = 'the-drifting-land:settings:v1';
const LOADER_SKY = '#1b3a6b';
const FADE_MS = 900;

const LOADER_STAGES = [
  [0, 'Waking the drift', 'Preparing the skies'],
  [18, 'Charting the sky lanes', 'Loading terrain'],
  [38, 'Stitching floating islands', 'Placing islands'],
  [58, 'Raising the old ruins', 'Building ruins'],
  [76, 'Calling the waterfalls', 'Simulating water'],
  [90, 'Lighting the beacons', 'Final touches'],
  [100, 'The drift is ready', 'Ready'],
];

const isDebugEnabled = () => {
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
};

export function log(...args) {
  if (isDebugEnabled()) {
    console.info('[The Drifting Land]', ...args);
  }
}

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  graphicsQuality: 'auto',
  mobileFullscreen: false,
  reducedMotion:
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
      graphicsQuality: ['auto', 'low', 'medium', 'high'].includes(parsed.graphicsQuality)
        ? parsed.graphicsQuality
        : DEFAULT_SETTINGS.graphicsQuality,
      mobileFullscreen: Boolean(parsed.mobileFullscreen),
      reducedMotion:
        typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(next) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or blocked storage
  }
}

let settings = loadSettings();
let started = false;
let audioCtx = null;
let warmupPromise = null;
let warmupState = { status: 'warming', gameAppClass: null, error: null };
let loaderTimer = null;
let activeApp = null;

/**
 * Warm Three.js and GameApp modules in the background while the loader counts.
 */
function warmModules(forceRetry = false) {
  if (warmupPromise && !forceRetry && warmupState.status !== 'error') {
    return warmupPromise;
  }

  warmupState = { status: 'warming', gameAppClass: null, error: null };
  warmupPromise = Promise.all([
    import('./vendor/three.js'),
    import('./game/GameApp.js'),
  ])
    .then(([threeModule, gameModule]) => {
      if (!threeModule || !threeModule.WebGLRenderer || !gameModule?.GameApp) {
        throw new Error('Could not initialize 3D game modules.');
      }
      warmupState = { status: 'ready', gameAppClass: gameModule.GameApp, error: null };
      log('3D game modules warmed cleanly.');
      return warmupState;
    })
    .catch((err) => {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Could not load 3D engine modules. Check your connection and retry.';
      warmupState = { status: 'error', gameAppClass: null, error: message };
      return warmupState;
    });

  return warmupPromise;
}

/**
 * Probe WebGL2/WebGL once and release immediately.
 */
function checkWebGLSupport() {
  if (typeof document === 'undefined' || !window.WebGLRenderingContext) {
    return { ok: false, reason: 'WebGL is disabled or unsupported in this browser.' };
  }

  let canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  try {
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false });
    if (!gl) {
      return { ok: false, reason: 'Browser could not create a WebGL2 or WebGL graphics context.' };
    }
    try {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      // Ignore
    }
    return { ok: true, reason: '' };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Unexpected WebGL initialization error.' };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    canvas = null;
  }
}

function unlockWebAudio() {
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!audioCtx) audioCtx = new AudioCtor();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    src.buffer = buf;
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(0);
    log('WebAudio unlocked on user gesture.');
  } catch {
    // Silent fallback
  }
}

function maybeRequestMobileFullscreen() {
  if (!settings.mobileFullscreen) return;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobile || document.fullscreenElement) return;
  const root = document.documentElement;
  const req = root.requestFullscreen || root.webkitRequestFullscreen;
  if (typeof req === 'function') {
    try {
      const p = req.call(root);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      // Optional
    }
  }
}

function ensureShellStyles() {
  if (document.getElementById('tdl-shell-styles')) return;
  const style = document.createElement('style');
  style.id = 'tdl-shell-styles';
  style.textContent = `
    #loader-host {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      background: ${LOADER_SKY};
    }
    #loader-frame {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
    }
    #game-root {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 100;
      background: ${LOADER_SKY};
      color: #f3ecd8;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 16px;
      opacity: 0;
      transition: opacity ${FADE_MS}ms ease;
      touch-action: none;
      overscroll-behavior: none;
      overflow: hidden;
    }
    #game-root.tdl-reduced-motion {
      transition: none !important;
    }
    .tdl-error-wrap {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      background: radial-gradient(circle at 50% 35%, #234b85 0%, ${LOADER_SKY} 65%, #112442 100%);
    }
    .tdl-glass-card {
      width: min(500px, 100%);
      background: rgba(14, 28, 38, 0.84);
      border: 1px solid rgba(246, 201, 120, 0.55);
      border-radius: 12px;
      padding: 26px 24px;
      box-shadow: 0 24px 56px rgba(5, 12, 24, 0.6);
      text-align: center;
      box-sizing: border-box;
    }
    .tdl-title {
      margin: 0 0 10px;
      font-family: "Cinzel", Georgia, "Times New Roman", serif;
      font-weight: 700;
      font-size: clamp(20px, 3vw, 26px);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #f6c978;
    }
    .tdl-subtitle {
      margin: 0 0 18px;
      font-size: 16px;
      line-height: 1.55;
      color: #f3ecd8;
    }
    .tdl-btn-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin-top: 18px;
    }
    .tdl-btn {
      font-family: "Cinzel", Georgia, serif;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 12px 22px;
      border-radius: 10px;
      border: 1px solid rgba(246, 201, 120, 0.65);
      background: rgba(24, 46, 62, 0.85);
      color: #f3ecd8;
      cursor: pointer;
      min-height: 44px;
    }
    .tdl-btn:hover { background: rgba(34, 65, 86, 0.95); }
    .tdl-btn:focus-visible { outline: 3px solid #f6c978; outline-offset: 3px; }
    .tdl-btn-primary {
      background: linear-gradient(180deg, rgba(246, 201, 120, 0.28), rgba(246, 201, 120, 0.14));
      color: #f6c978;
    }
    .tdl-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 90;
      background: rgba(8, 16, 28, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
    }
    .tdl-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(246, 201, 120, 0.2);
      text-align: left;
    }
    .tdl-select {
      font-size: 15px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid rgba(246, 201, 120, 0.5);
      background: #0e1c26;
      color: #f3ecd8;
      min-height: 40px;
    }
  `;
  document.head.appendChild(style);
}

function hideAndInertLoader(host, frame) {
  if (loaderTimer !== null) {
    window.clearInterval(loaderTimer);
    loaderTimer = null;
  }

  const markInert = (el) => {
    if (!el) return;
    if (el instanceof HTMLElement) {
      el.style.display = 'none';
      el.inert = true;
    }
    el.setAttribute('inert', '');
    el.setAttribute('aria-hidden', 'true');
  };

  try {
    const doc = frame?.contentDocument;
    if (doc) {
      markInert(doc.getElementById('scene'));
      markInert(doc.getElementById('stage'));
      doc.querySelectorAll('.mote').forEach(markInert);
    }
  } catch {
    // Ignore cross-origin
  }

  markInert(host);
}

function openSettingsDialog(frame) {
  if (document.getElementById('tdl-settings-modal')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'tdl-settings-modal';
  backdrop.className = 'tdl-modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'tdl-settings-title');

  const card = document.createElement('div');
  card.className = 'tdl-glass-card';

  const title = document.createElement('h2');
  title.id = 'tdl-settings-title';
  title.className = 'tdl-title';
  title.textContent = 'Settings';

  const makeToggleRow = (labelText, initialValue, onToggle) => {
    const row = document.createElement('div');
    row.className = 'tdl-field';
    const label = document.createElement('span');
    label.textContent = labelText;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tdl-btn';
    let current = initialValue;
    const sync = () => {
      btn.textContent = current ? 'On' : 'Off';
      btn.setAttribute('aria-pressed', String(current));
    };
    sync();
    btn.addEventListener('click', () => {
      current = !current;
      onToggle(current);
      sync();
    });
    row.append(label, btn);
    return row;
  };

  const soundRow = makeToggleRow('Audio', settings.soundEnabled, (next) => {
    settings.soundEnabled = next;
    saveSettings(settings);
    if (frame?.contentWindow) {
      frame.contentWindow.postMessage({ type: 'drifting-land:sound', enabled: next }, window.location.origin);
    }
  });

  const fullscreenRow = makeToggleRow('Mobile Fullscreen on Begin', settings.mobileFullscreen, (next) => {
    settings.mobileFullscreen = next;
    saveSettings(settings);
  });

  const motionRow = makeToggleRow('Reduced Motion', settings.reducedMotion, (next) => {
    settings.reducedMotion = next;
    saveSettings(settings);
  });

  const qualityRow = document.createElement('div');
  qualityRow.className = 'tdl-field';
  const qLabel = document.createElement('label');
  qLabel.htmlFor = 'tdl-quality-select';
  qLabel.textContent = 'Graphics Preset';
  const qSelect = document.createElement('select');
  qSelect.id = 'tdl-quality-select';
  qSelect.className = 'tdl-select';
  ['auto', 'low', 'medium', 'high'].forEach((val) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val.charAt(0).toUpperCase() + val.slice(1);
    if (settings.graphicsQuality === val) opt.selected = true;
    qSelect.appendChild(opt);
  });
  qSelect.addEventListener('change', () => {
    settings.graphicsQuality = qSelect.value;
    saveSettings(settings);
  });
  qualityRow.append(qLabel, qSelect);

  const btnRow = document.createElement('div');
  btnRow.className = 'tdl-btn-row';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'tdl-btn tdl-btn-primary';
  closeBtn.textContent = 'Done';
  const closeModal = () => {
    window.removeEventListener('keydown', onEsc);
    backdrop.remove();
  };
  const onEsc = (ev) => {
    if (ev.key === 'Escape') closeModal();
  };
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) closeModal();
  });
  window.addEventListener('keydown', onEsc);

  btnRow.appendChild(closeBtn);
  card.append(title, soundRow, fullscreenRow, motionRow, qualityRow, btnRow);
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
  closeBtn.focus();
}

function openSaveSlotsDialog(onSelectSave) {
  if (document.getElementById('tdl-slots-modal')) return;
  const saveMgr = new SaveManager();

  const backdrop = document.createElement('div');
  backdrop.id = 'tdl-slots-modal';
  backdrop.className = 'tdl-modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'tdl-glass-card';

  const title = document.createElement('h2');
  title.className = 'tdl-title';
  title.textContent = 'Save Slots';
  card.appendChild(title);

  const slots = saveMgr.listSlots();
  slots.forEach(({ slotId, data }) => {
    const row = document.createElement('div');
    row.className = 'tdl-field';
    const label = document.createElement('span');
    if (data) {
      label.textContent = `Slot ${slotId} · ${data.regionId} (${data.litBeacons.length} Beacons, ${data.collectedEchoes.length}/12 Echoes)`;
    } else {
      label.textContent = `Slot ${slotId} · Empty`;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tdl-btn';
    btn.textContent = data ? 'Continue' : 'New Journey';
    btn.addEventListener('click', () => {
      backdrop.remove();
      onSelectSave(data || { slotId, islandId: 'kestrel_raft', regionId: 'shallows', clockTime: 20 });
    });
    row.append(label, btn);
    card.appendChild(row);
  });

  const btnRow = document.createElement('div');
  btnRow.className = 'tdl-btn-row';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'tdl-btn tdl-btn-primary';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => backdrop.remove());
  btnRow.appendChild(closeBtn);
  card.appendChild(btnRow);

  backdrop.appendChild(card);
  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) backdrop.remove();
  });
  document.body.appendChild(backdrop);
  closeBtn.focus();
}

function showLaunchError(gameRoot, reason, onRetry) {
  gameRoot.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'tdl-error-wrap';
  const card = document.createElement('section');
  card.className = 'tdl-glass-card';
  card.setAttribute('role', 'alert');

  const h1 = document.createElement('h1');
  h1.className = 'tdl-title';
  h1.textContent = 'Unable to Wake the Drift';

  const p = document.createElement('p');
  p.className = 'tdl-subtitle';
  p.textContent = reason || 'A graphics or module loading error prevented startup.';

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'tdl-btn tdl-btn-primary';
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('click', onRetry);

  const reloadBtn = document.createElement('button');
  reloadBtn.type = 'button';
  reloadBtn.className = 'tdl-btn';
  reloadBtn.textContent = 'Return to Loading Screen';
  reloadBtn.addEventListener('click', () => window.location.reload());

  const row = document.createElement('div');
  row.className = 'tdl-btn-row';
  row.append(retryBtn, reloadBtn);
  card.append(h1, p, row);
  wrap.appendChild(card);
  gameRoot.appendChild(wrap);
}

async function launchGameWorld(gameRoot, loaderHost, loaderFrame, initialSave = null) {
  const warmupResult = await warmModules();
  const webgl = checkWebGLSupport();

  if (warmupResult.status === 'error' || !webgl.ok || !warmupResult.gameAppClass) {
    hideAndInertLoader(loaderHost, loaderFrame);
    const reason = warmupResult.status === 'error' ? warmupResult.error : webgl.reason;
    showLaunchError(gameRoot, reason, () => {
      warmModules(true).then(() => launchGameWorld(gameRoot, loaderHost, loaderFrame, initialSave));
    });
    return;
  }

  gameRoot.replaceChildren();
  const GameApp = warmupResult.gameAppClass;
  activeApp = new GameApp({
    mountEl: gameRoot,
    settings,
    audioCtx,
    initialSave,
    log,
    onSaveSettings: (next) => {
      settings = { ...settings, ...next };
      saveSettings(settings);
    },
    onFirstRender: () => {
      hideAndInertLoader(loaderHost, loaderFrame);
    },
    onReturnTitle: () => {
      if (activeApp) {
        activeApp.dispose();
        activeApp = null;
      }
      window.location.reload();
    },
  });
}

function boot() {
  ensureShellStyles();

  if (window.location.protocol === 'file:') {
    const root = document.createElement('div');
    root.id = 'game-root';
    root.style.opacity = '1';
    const wrap = document.createElement('div');
    wrap.className = 'tdl-error-wrap';
    const card = document.createElement('section');
    card.className = 'tdl-glass-card';
    card.setAttribute('role', 'alert');
    const title = document.createElement('h1');
    title.className = 'tdl-title';
    title.textContent = 'Web Server Required';
    const msg = document.createElement('p');
    msg.className = 'tdl-subtitle';
    msg.textContent = 'Open this through a web server or the GitHub Pages address.';
    card.append(title, msg);
    wrap.appendChild(card);
    root.appendChild(wrap);
    document.body.appendChild(root);
    return;
  }

  warmModules();

  const loaderHost = document.createElement('div');
  loaderHost.id = 'loader-host';

  const loaderFrame = document.createElement('iframe');
  loaderFrame.id = 'loader-frame';
  loaderFrame.title = 'The Drifting Land loading screen';
  loaderFrame.src = './loading-screen.html';
  loaderFrame.allow = 'autoplay';

  loaderHost.appendChild(loaderFrame);
  document.body.appendChild(loaderHost);

  const postToLoader = (payload) => {
    if (!loaderFrame.contentWindow) return;
    loaderFrame.contentWindow.postMessage(payload, window.location.origin);
  };

  let progress = 0;
  let stageSentDone = false;

  const syncProgress = () => {
    const rounded = Math.round(progress);
    let phase = LOADER_STAGES[0][1];
    let label = LOADER_STAGES[0][2];
    for (let i = LOADER_STAGES.length - 1; i >= 0; i--) {
      if (rounded >= LOADER_STAGES[i][0]) {
        phase = LOADER_STAGES[i][1];
        label = LOADER_STAGES[i][2];
        break;
      }
    }

    if (progress >= 100 && !stageSentDone) {
      stageSentDone = true;
      postToLoader({ type: 'drifting-land:ready' });
      postToLoader({ type: 'drifting-land:save-state', ready: true });
      postToLoader({ type: 'drifting-land:sound', enabled: settings.soundEnabled });
      window.dispatchEvent(new CustomEvent('drifting-land:loaded'));
      if (loaderTimer !== null) {
        window.clearInterval(loaderTimer);
        loaderTimer = null;
      }
    } else if (!stageSentDone) {
      postToLoader({
        type: 'drifting-land:progress',
        progress,
        phase,
        label,
      });
    }
  };

  loaderFrame.addEventListener('load', () => {
    postToLoader({ type: 'drifting-land:sound', enabled: settings.soundEnabled });
    postToLoader({ type: 'drifting-land:save-state', ready: false });
    syncProgress();

    if (loaderTimer === null && !stageSentDone) {
      loaderTimer = window.setInterval(() => {
        if (started) return;
        const burst = Math.random() < 0.25 ? 2.4 : 0.75 + Math.random() * 0.9;
        progress = Math.min(100, progress + burst);
        syncProgress();
      }, 110);
    }
  });

  const handleBegin = (initialSave = null) => {
    if (started) return;
    started = true;

    unlockWebAudio();
    maybeRequestMobileFullscreen();

    const gameRoot = document.createElement('div');
    gameRoot.id = 'game-root';
    if (settings.reducedMotion) {
      gameRoot.classList.add('tdl-reduced-motion');
    }
    document.body.appendChild(gameRoot);

    if (settings.reducedMotion) {
      gameRoot.style.opacity = '1';
      launchGameWorld(gameRoot, loaderHost, loaderFrame, initialSave);
    } else {
      window.requestAnimationFrame(() => {
        gameRoot.style.opacity = '1';
      });
      window.setTimeout(() => {
        launchGameWorld(gameRoot, loaderHost, loaderFrame, initialSave);
      }, FADE_MS);
    }
  };

  window.addEventListener('drifting-land:begin', () => handleBegin(null));

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== loaderFrame.contentWindow) {
      return;
    }
    const type = event.data?.type;
    if (type === 'drifting-land:begin') {
      handleBegin(null);
    } else if (type === 'drifting-land:toggle-sound') {
      settings.soundEnabled = !settings.soundEnabled;
      saveSettings(settings);
      postToLoader({ type: 'drifting-land:sound', enabled: settings.soundEnabled });
    } else if (type === 'drifting-land:settings') {
      openSettingsDialog(loaderFrame);
    } else if (type === 'drifting-land:save-slots') {
      openSaveSlotsDialog((slotData) => handleBegin(slotData));
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
