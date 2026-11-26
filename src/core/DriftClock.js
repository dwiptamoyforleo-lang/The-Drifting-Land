import * as THREE from '../vendor/three.js';

export const CYCLE_SECONDS = 720;
export const START_TIME = 20;

const KEYFRAMES = [
  { t: 0, phase: 'Dawn', zenith: 0x1b3a6b, horizon: 0xf4a872, sun: 0xffd08a, fog: 0xd99e7c, hemiSky: 0x89a8d8, hemiGround: 0x4c4036, sunIntensity: 1.35, hemiIntensity: 0.72, starOpacity: 0.25 },
  { t: 120, phase: 'Day', zenith: 0x2968b8, horizon: 0xaed9f4, sun: 0xfff3d4, fog: 0x9bc6e6, hemiSky: 0x9cd2f6, hemiGround: 0x5c5b48, sunIntensity: 1.75, hemiIntensity: 0.86, starOpacity: 0.0 },
  { t: 300, phase: 'Day', zenith: 0x235ba8, horizon: 0xbedff5, sun: 0xfff8e2, fog: 0xaad1ea, hemiSky: 0xa8daf8, hemiGround: 0x625f4c, sunIntensity: 1.8, hemiIntensity: 0.88, starOpacity: 0.0 },
  { t: 420, phase: 'Dusk', zenith: 0x26346e, horizon: 0xf49464, sun: 0xffb36c, fog: 0xd8886e, hemiSky: 0x9382b8, hemiGround: 0x473634, sunIntensity: 1.4, hemiIntensity: 0.7, starOpacity: 0.2 },
  { t: 560, phase: 'Dusk', zenith: 0x192350, horizon: 0xd96e5b, sun: 0xff9452, fog: 0x9b5a63, hemiSky: 0x676193, hemiGround: 0x332829, sunIntensity: 0.95, hemiIntensity: 0.56, starOpacity: 0.55 },
  { t: 600, phase: 'Night', zenith: 0x0b1530, horizon: 0x294473, sun: 0x9dc2f2, fog: 0x1c3156, hemiSky: 0x486ba3, hemiGround: 0x1f2836, sunIntensity: 0.65, hemiIntensity: 0.52, starOpacity: 0.95 },
  { t: 700, phase: 'Night', zenith: 0x101f44, horizon: 0x526491, sun: 0xc2d4f4, fog: 0x364a72, hemiSky: 0x5876ad, hemiGround: 0x28303d, sunIntensity: 0.78, hemiIntensity: 0.56, starOpacity: 0.7 },
];

const _cA = new THREE.Color();
const _cB = new THREE.Color();

/**
 * Deterministic 12-minute global clock driving island orbits and sky atmosphere.
 */
export class DriftClock {
  /**
   * @param {number} [initialTime]
   */
  constructor(initialTime = START_TIME) {
    this.time = ((initialTime % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
    this.paused = false;
    this.timeScale = 1;
    this.zenithColor = new THREE.Color();
    this.horizonColor = new THREE.Color();
    this.sunColor = new THREE.Color();
    this.fogColor = new THREE.Color();
    this.hemiSkyColor = new THREE.Color();
    this.hemiGroundColor = new THREE.Color();
    this.sunDirection = new THREE.Vector3();
    this.sunIntensity = 1.4;
    this.hemiIntensity = 0.75;
    this.starOpacity = 0.1;
    this.phase = 'Dawn';
    this._recomputeAtmosphere();
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    if (!this.paused) {
      this.time = (this.time + dt * this.timeScale) % CYCLE_SECONDS;
      if (this.time < 0) this.time += CYCLE_SECONDS;
    }
    this._recomputeAtmosphere();
  }

  /**
   * Jump or advance the Drift Clock directly (e.g. Resting at a lit Beacon).
   * @param {number} t
   */
  setTime(t) {
    this.time = ((t % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
    this._recomputeAtmosphere();
  }

  /**
   * Advance clock by delta seconds (e.g., +90s on Rest).
   * @param {number} delta
   */
  advance(delta) {
    this.setTime(this.time + delta);
  }

  /**
   * @returns {string}
   */
  getPhaseName() {
    if (this.time < 120) return 'Dawn';
    if (this.time < 420) return 'Day';
    if (this.time < 600) return 'Dusk';
    return 'Night';
  }

  /**
   * Formatted MM:SS inside the 12:00 Drift Cycle.
   * @returns {string}
   */
  getFormattedCycle() {
    const whole = Math.floor(this.time);
    const m = Math.floor(whole / 60);
    const s = whole % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  _recomputeAtmosphere() {
    const t = this.time;
    this.phase = this.getPhaseName();

    let k0 = KEYFRAMES[KEYFRAMES.length - 1];
    let k1 = KEYFRAMES[0];
    let span = CYCLE_SECONDS - k0.t + k1.t;
    let local = t >= k0.t ? t - k0.t : CYCLE_SECONDS - k0.t + t;

    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (t >= KEYFRAMES[i].t && t < KEYFRAMES[i + 1].t) {
        k0 = KEYFRAMES[i];
        k1 = KEYFRAMES[i + 1];
        span = k1.t - k0.t;
        local = t - k0.t;
        break;
      }
    }

    const alpha = THREE.MathUtils.smoothstep(local / Math.max(1, span), 0, 1);

    const lerpHex = (target, hexA, hexB) => {
      _cA.setHex(hexA);
      _cB.setHex(hexB);
      target.copy(_cA).lerp(_cB, alpha);
    };

    lerpHex(this.zenithColor, k0.zenith, k1.zenith);
    lerpHex(this.horizonColor, k0.horizon, k1.horizon);
    lerpHex(this.sunColor, k0.sun, k1.sun);
    lerpHex(this.fogColor, k0.fog, k1.fog);
    lerpHex(this.hemiSkyColor, k0.hemiSky, k1.hemiSky);
    lerpHex(this.hemiGroundColor, k0.hemiGround, k1.hemiGround);

    this.sunIntensity = THREE.MathUtils.lerp(k0.sunIntensity, k1.sunIntensity, alpha);
    this.hemiIntensity = THREE.MathUtils.lerp(k0.hemiIntensity, k1.hemiIntensity, alpha);
    this.starOpacity = THREE.MathUtils.lerp(k0.starOpacity, k1.starOpacity, alpha);

    // Sun sweeps in an angled arc overhead across the 720s cycle (highest near Day T=300)
    const angle = ((t - 10) / CYCLE_SECONDS) * Math.PI * 2;
    const elevation = Math.sin(angle * 0.5 + 0.35);
    const y = THREE.MathUtils.clamp(Math.sin((t / CYCLE_SECONDS) * Math.PI * 2 - 0.15) * 0.78 + 0.25, 0.14, 0.92);
    const horiz = Math.sqrt(Math.max(0.05, 1 - y * y));
    this.sunDirection.set(Math.cos(angle) * horiz, y, Math.sin(angle) * horiz * 0.7 + elevation * 0.1).normalize();
  }
}
