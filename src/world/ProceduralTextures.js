import * as THREE from '../vendor/three.js';

/**
 * Generates and caches procedural CanvasTextures (zero external 404s).
 */
export class ProceduralTextures {
  /**
   * @param {number} maxAnisotropy
   */
  constructor(maxAnisotropy = 4) {
    this.maxAnisotropy = Math.min(8, Math.max(1, maxAnisotropy));
    /** @type {Map<string, THREE.CanvasTexture>} */
    this._cache = new Map();
  }

  /**
   * @param {string} key
   * @param {number} size
   * @param {(ctx: CanvasRenderingContext2D, size: number) => void} painter
   * @param {number} [repeat=2]
   */
  _make(key, size, painter, repeat = 2) {
    if (this._cache.has(key)) return this._cache.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) painter(ctx, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.anisotropy = this.maxAnisotropy;
    tex.needsUpdate = true;
    this._cache.set(key, tex);
    return tex;
  }

  get turf() {
    return this._make('turf', 256, (ctx, s) => {
      ctx.fillStyle = '#588238';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1600; i++) {
        const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * s;
        const y = (Math.sin(i * 78.233) * 29432.123 % 1 + 1) % 1 * s;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(138, 178, 72, 0.35)' : i % 2 === 0 ? 'rgba(46, 84, 30, 0.32)' : 'rgba(195, 206, 112, 0.16)';
        ctx.fillRect(x, y, 3, 6);
      }
    }, 3);
  }

  get rimeTurf() {
    return this._make('rimeTurf', 256, (ctx, s) => {
      ctx.fillStyle = '#8fa9b8';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1200; i++) {
        const x = (Math.sin(i * 17.13) * 19432.5 % 1 + 1) % 1 * s;
        const y = (Math.sin(i * 43.77) * 32412.7 % 1 + 1) % 1 * s;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(228, 242, 252, 0.38)' : 'rgba(84, 112, 134, 0.3)';
        ctx.fillRect(x, y, 4, 4);
      }
    }, 3);
  }

  get moorTurf() {
    return this._make('moorTurf', 256, (ctx, s) => {
      ctx.fillStyle = '#475c50';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1400; i++) {
        const x = (Math.sin(i * 19.31) * 28411.2 % 1 + 1) % 1 * s;
        const y = (Math.sin(i * 61.17) * 41239.9 % 1 + 1) % 1 * s;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(104, 128, 116, 0.28)' : 'rgba(30, 44, 38, 0.35)';
        ctx.fillRect(x, y, 4, 5);
      }
    }, 3);
  }

  get stone() {
    return this._make('stone', 256, (ctx, s) => {
      ctx.fillStyle = '#7e7d75';
      ctx.fillRect(0, 0, s, s);
      const rows = 8;
      const h = s / rows;
      ctx.strokeStyle = 'rgba(32, 34, 34, 0.42)';
      ctx.lineWidth = 2;
      for (let r = 0; r < rows; r++) {
        const y = r * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
        const cols = 4;
        const w = s / cols;
        const offset = (r % 2) * (w * 0.5);
        for (let c = 0; c <= cols; c++) {
          const x = (c * w + offset) % s;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + h);
          ctx.stroke();
        }
      }
      for (let i = 0; i < 800; i++) {
        const x = (Math.sin(i * 23.1) * 14123.3 % 1 + 1) % 1 * s;
        const y = (Math.sin(i * 51.9) * 31942.7 % 1 + 1) % 1 * s;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(x, y, 3, 3);
      }
    }, 2);
  }

  get cliff() {
    return this._make('cliff', 256, (ctx, s) => {
      const grad = ctx.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, '#856952');
      grad.addColorStop(0.55, '#665042');
      grad.addColorStop(1, '#463732');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 180; i++) {
        const y = (i / 180) * s;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(30,22,18,0.14)' : 'rgba(210,180,150,0.07)';
        ctx.fillRect(0, y, s, 2);
      }
    }, 2);
  }

  get wood() {
    return this._make('wood', 256, (ctx, s) => {
      ctx.fillStyle = '#735339';
      ctx.fillRect(0, 0, s, s);
      const planks = 6;
      const pw = s / planks;
      for (let p = 0; p < planks; p++) {
        ctx.fillStyle = p % 2 === 0 ? 'rgba(255,230,200,0.06)' : 'rgba(25,14,8,0.12)';
        ctx.fillRect(p * pw, 0, pw - 2, s);
        ctx.fillStyle = 'rgba(20,12,8,0.45)';
        ctx.fillRect(p * pw + pw - 2, 0, 2, s);
      }
      for (let i = 0; i < 240; i++) {
        const x = (Math.sin(i * 31.7) * 18231.1 % 1 + 1) % 1 * s;
        const y = (Math.sin(i * 11.3) * 42112.9 % 1 + 1) % 1 * s;
        ctx.fillStyle = 'rgba(38, 22, 12, 0.16)';
        ctx.fillRect(x, y, 2, 18);
      }
    }, 2);
  }

  dispose() {
    for (const tex of this._cache.values()) {
      tex.dispose();
    }
    this._cache.clear();
  }
}
