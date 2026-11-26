/**
 * Dynamic Celestial & Day/Night System for The Drifting Land.
 * Implements:
 * - 20-minute configurable day length (13 minutes daytime / 7 minutes nighttime)
 * - Accurate countdown timer to next sunrise / sunset
 * - 24-hour clock synchronization (06:00 Dawn, 12:00 Noon, 19:00 Dusk/Sunset, 22:00 Night)
 * - Persisted 1% Red Moon roll per eligible night with multi-day cooldown and refresh immunity
 * - Dramatic celestial visual transformations (enlarged blood moon, crimson sky/fog, red lighting)
 */

import * as THREE from 'three';
import { TimeOfDay, WorldTimeState, RedMoonSaveState } from '../types/game';
import { NotificationSystem } from '../systems/notificationSystem';

export class DayNightSystem {
  public state: WorldTimeState;
  public redMoonSave: RedMoonSaveState;

  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private moonGlowMesh: THREE.Mesh;
  private starsGroup: THREE.Points;

  // Day length configuration (default 1200s = 20 real minutes: 780s day / 420s night)
  public dayDurationSeconds: number;
  private readonly DAY_RATIO = 0.65; // 65% daytime = 13 minutes of 20 min
  private readonly NIGHT_RATIO = 0.35; // 35% nighttime = 7 minutes of 20 min

  private sunGeo: THREE.SphereGeometry;
  private sunMat: THREE.MeshBasicMaterial;
  private moonGeo: THREE.SphereGeometry;
  private moonMat: THREE.MeshBasicMaterial;
  private moonGlowGeo: THREE.RingGeometry;
  private moonGlowMat: THREE.MeshBasicMaterial;
  private starGeo: THREE.BufferGeometry;
  private starMat: THREE.PointsMaterial;
  private ownsLights: boolean;

  private lastHours = -1;
  private lastMinutes = -1;
  private lastAppliedPhase: TimeOfDay | null = null;
  private readonly _bgColor = new THREE.Color(0x0e1726);

  // Callbacks for celestial events
  public onRedMoonStart?: () => void;
  public onRedMoonEnd?: () => void;

  constructor(
    scene: THREE.Scene,
    initialCycleTime = 0.18,
    initialDayCount = 1,
    savedRedMoon?: RedMoonSaveState,
    dayDurationMinutes = 20,
    externalSunLight?: THREE.DirectionalLight,
    externalHemiLight?: THREE.HemisphereLight
  ) {
    this.scene = scene;
    this.dayDurationSeconds = Math.max(60, dayDurationMinutes * 60);

    this.redMoonSave = savedRedMoon ? { ...savedRedMoon } : {
      isActive: false,
      lastEvaluatedNightDay: 0,
      cooldownUntilDay: 3,
      wardenDefeated: false,
      wardenRewardsClaimed: false,
    };

    this.state = {
      timeScale: 1.0, // Multiplier on real seconds
      cycleTime: initialCycleTime,
      dayCount: initialDayCount,
      isRedMoon: this.redMoonSave.isActive,
      phaseName: 'DAWN',
      clockTime: '06:00',
      nextTransitionLabel: 'Sunset',
      nextTransitionSeconds: 780,
      dayDurationSeconds: this.dayDurationSeconds,
    };

    // Reuse RenderPipeline lights so only ONE directional shadow caster exists
    if (externalSunLight && externalHemiLight) {
      this.sunLight = externalSunLight;
      this.hemiLight = externalHemiLight;
      this.ownsLights = false;
    } else {
      this.ownsLights = true;
      this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
      const d = 50;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 350;
      scene.add(this.sunLight);

      this.hemiLight = new THREE.HemisphereLight(0x7ec8e3, 0x1b3826, 0.6);
      scene.add(this.hemiLight);
    }

    // Sun orb
    this.sunGeo = new THREE.SphereGeometry(5, 12, 12);
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    this.sunMesh = new THREE.Mesh(this.sunGeo, this.sunMat);
    scene.add(this.sunMesh);

    // Moon orb
    this.moonGeo = new THREE.SphereGeometry(3.5, 12, 12);
    this.moonMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    this.moonMesh = new THREE.Mesh(this.moonGeo, this.moonMat);
    scene.add(this.moonMesh);

    // Moon ethereal corona ring / glow
    this.moonGlowGeo = new THREE.RingGeometry(3.8, 6.5, 20);
    this.moonGlowMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    this.moonGlowMesh = new THREE.Mesh(this.moonGlowGeo, this.moonGlowMat);
    this.moonMesh.add(this.moonGlowMesh);

    // Starfield Points (600 stars for lower vertex cost)
    const starCount = 600;
    this.starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 260;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 12;
      starPos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    this.starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0,
    });
    this.starsGroup = new THREE.Points(this.starGeo, this.starMat);
    scene.add(this.starsGroup);

    this.recalculateTimeFields();
    this.updateCelestialPositions();
    this.updateAtmosphere();
  }

  /**
   * Advance simulation time and update sky, lights, moon & fog
   */
  update(delta: number, updateAtmosphereNow = true): void {
    const prevCycleTime = this.state.cycleTime;
    const cycleDelta = (delta * this.state.timeScale) / this.dayDurationSeconds;
    this.state.cycleTime = (this.state.cycleTime + cycleDelta) % 1.0;

    // Check Dawn crossover (Day completed)
    if (this.state.cycleTime < prevCycleTime) {
      this.state.dayCount += 1;

      // End active Red Moon event upon reaching Dawn
      if (this.state.isRedMoon) {
        this.endRedMoon();
      }
    }

    // Check Night crossover: evaluate Red Moon eligibility once per night
    if (prevCycleTime < this.DAY_RATIO && this.state.cycleTime >= this.DAY_RATIO) {
      this.evaluateNightRoll();
    }

    // If Red Moon is active during daytime, deactivate at dawn
    if (this.state.isRedMoon && this.state.cycleTime < this.DAY_RATIO && !this.redMoonSave.forceTriggered) {
      this.endRedMoon();
    }

    this.recalculateTimeFields();
    if (updateAtmosphereNow) {
      this.updateCelestialPositions();
      this.updateAtmosphere();
    }
  }

  /**
   * Evaluate rare Red Moon roll upon entering night
   */
  private evaluateNightRoll(): void {
    if (this.redMoonSave.lastEvaluatedNightDay === this.state.dayCount) {
      return;
    }

    this.redMoonSave.lastEvaluatedNightDay = this.state.dayCount;

    if (this.state.dayCount < this.redMoonSave.cooldownUntilDay) {
      return;
    }

    const rolled = Math.random() < 0.01;
    if (rolled) {
      this.startRedMoon();
    }
  }

  public startRedMoon(forced = false): void {
    this.state.isRedMoon = true;
    this.redMoonSave.isActive = true;
    this.redMoonSave.cooldownUntilDay = this.state.dayCount + 4;
    this.redMoonSave.forceTriggered = forced;
    this.lastAppliedPhase = null;

    NotificationSystem.notify(
      'Blood Moon Alignment',
      'The heavens turn crimson. Ancient rifts stir in the western crater...',
      'danger',
      9000
    );

    this.onRedMoonStart?.();
  }

  public endRedMoon(): void {
    this.state.isRedMoon = false;
    this.redMoonSave.isActive = false;
    this.redMoonSave.forceTriggered = false;
    this.lastAppliedPhase = null;

    NotificationSystem.notify(
      'Dawn Breaks',
      'The blood moon fades beneath the eastern horizon. The realm returns to calm.',
      'info',
      6000
    );

    this.onRedMoonEnd?.();
  }

  /**
   * Recalculate 24-hour clock and exact countdowns (zero string allocation unless minute changes)
   */
  private recalculateTimeFields(): void {
    const cycle = this.state.cycleTime;

    if (cycle < this.DAY_RATIO) {
      const fractionRemaining = this.DAY_RATIO - cycle;
      this.state.nextTransitionSeconds = Math.max(0, fractionRemaining * this.dayDurationSeconds);
      this.state.nextTransitionLabel = 'Sunset';
    } else {
      const fractionRemaining = 1.0 - cycle;
      this.state.nextTransitionSeconds = Math.max(0, fractionRemaining * this.dayDurationSeconds);
      this.state.nextTransitionLabel = 'Sunrise';
    }

    let totalHours = 6;
    if (cycle < this.DAY_RATIO) {
      const dayProgress = cycle / this.DAY_RATIO;
      totalHours = 6.0 + dayProgress * 13.0;
    } else {
      const nightProgress = (cycle - this.DAY_RATIO) / this.NIGHT_RATIO;
      totalHours = (19.0 + nightProgress * 11.0) % 24.0;
    }

    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours - hours) * 60);
    if (hours !== this.lastHours || minutes !== this.lastMinutes) {
      this.lastHours = hours;
      this.lastMinutes = minutes;
      this.state.clockTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    if (this.state.isRedMoon) {
      this.state.phaseName = 'RED_MOON';
    } else if (cycle < 0.08) {
      this.state.phaseName = 'DAWN';
    } else if (cycle < 0.55) {
      this.state.phaseName = 'NOON';
    } else if (cycle < this.DAY_RATIO) {
      this.state.phaseName = 'DUSK';
    } else {
      this.state.phaseName = 'NIGHT';
    }
  }

  /**
   * Update orbital coordinates for sun, moon and shadows
   */
  private updateCelestialPositions(): void {
    const angle = (this.state.cycleTime / this.DAY_RATIO) * Math.PI;
    const orbitDist = 190;

    const sunX = Math.cos(angle) * orbitDist;
    const sunY = Math.sin(angle) * orbitDist;
    const sunZ = Math.sin(angle * 0.5) * 45;

    this.sunLight.position.set(sunX, Math.max(18, sunY), sunZ);
    this.sunMesh.position.set(sunX, sunY, sunZ);

    this.moonMesh.position.set(-sunX, -sunY, -sunZ);
    this.moonGlowMesh.lookAt(0, 0, 0);

    this.sunMesh.visible = sunY > -10;
    this.moonMesh.visible = sunY < 20;

    if (this.state.isRedMoon) {
      this.moonMesh.scale.set(2.4, 2.4, 2.4);
    } else {
      this.moonMesh.scale.set(1.0, 1.0, 1.0);
    }
  }

  /**
   * Update atmospheric lighting, fog, and starfield without per-frame Color allocations
   */
  private updateAtmosphere(): void {
    if (this.lastAppliedPhase === this.state.phaseName && this.scene.background === this._bgColor) {
      return;
    }
    this.lastAppliedPhase = this.state.phaseName;

    if (this.scene.background !== this._bgColor) {
      this.scene.background = this._bgColor;
    }

    if (this.state.phaseName === 'RED_MOON') {
      this.moonMat.color.setHex(0xef4444);
      this.moonGlowMat.color.setHex(0xb91c1c);
      this.moonGlowMat.opacity = 0.7;

      this._bgColor.setHex(0x280508);
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0x280508);
      }

      this.sunLight.color.setHex(0xb91c1c);
      this.sunLight.intensity = 0.55;
      this.hemiLight.color.setHex(0xef4444);
      this.hemiLight.groundColor.setHex(0x1a0507);
      this.starMat.color.setHex(0xfca5a5);
      this.starMat.opacity = 0.65;
    } else if (this.state.phaseName === 'NOON') {
      this.moonMat.color.setHex(0xe2e8f0);
      this.moonGlowMat.color.setHex(0x93c5fd);
      this.moonGlowMat.opacity = 0.2;

      this._bgColor.setHex(0x38bdf8);
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0x7dd3fc);
      }

      this.sunLight.color.setHex(0xfff5e6);
      this.sunLight.intensity = 1.8;
      this.hemiLight.color.setHex(0x7ec8e3);
      this.hemiLight.groundColor.setHex(0x1b3826);
      this.starMat.opacity = 0.0;
    } else if (this.state.phaseName === 'DAWN') {
      this._bgColor.setHex(0xf59e0b);
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0xfbbf24);
      }

      this.sunLight.color.setHex(0xfef08a);
      this.sunLight.intensity = 1.35;
      this.hemiLight.color.setHex(0xfcd34d);
      this.hemiLight.groundColor.setHex(0x27272a);
      this.starMat.opacity = 0.15;
    } else if (this.state.phaseName === 'DUSK') {
      this._bgColor.setHex(0x701a75);
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0xa21caf);
      }

      this.sunLight.color.setHex(0xf43f5e);
      this.sunLight.intensity = 0.95;
      this.hemiLight.color.setHex(0xc084fc);
      this.hemiLight.groundColor.setHex(0x1e1b4b);
      this.starMat.opacity = 0.55;
    } else {
      this.moonMat.color.setHex(0xe2e8f0);
      this.moonGlowMat.color.setHex(0x93c5fd);
      this.moonGlowMat.opacity = 0.35;

      this._bgColor.setHex(0x060913);
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0x090d1a);
      }

      this.sunLight.color.setHex(0x60a5fa);
      this.sunLight.intensity = 0.35;
      this.hemiLight.color.setHex(0x38bdf8);
      this.hemiLight.groundColor.setHex(0x020617);
      this.starMat.color.setHex(0xffffff);
      this.starMat.opacity = 0.95;
    }
    this.starsGroup.visible = this.starMat.opacity > 0.01;
  }

  public toggleRedMoon(force?: boolean): boolean {
    const next = typeof force === 'boolean' ? force : !this.state.isRedMoon;
    if (next) {
      if (this.state.cycleTime < this.DAY_RATIO) {
        this.state.cycleTime = this.DAY_RATIO + 0.02;
      }
      this.startRedMoon(true);
    } else {
      this.endRedMoon();
    }
    this.lastAppliedPhase = null;
    this.updateAtmosphere();
    return this.state.isRedMoon;
  }

  public jumpToPhase(phase: 'DAWN' | 'NOON' | 'DUSK' | 'NIGHT'): void {
    if (phase === 'DAWN') this.state.cycleTime = 0.02;
    else if (phase === 'NOON') this.state.cycleTime = 0.30;
    else if (phase === 'DUSK') this.state.cycleTime = 0.58;
    else if (phase === 'NIGHT') this.state.cycleTime = 0.72;

    this.lastAppliedPhase = null;
    this.recalculateTimeFields();
    this.updateCelestialPositions();
    this.updateAtmosphere();
  }

  public advanceTimeSeconds(seconds: number): void {
    const cycleDelta = seconds / this.dayDurationSeconds;
    this.state.cycleTime = (this.state.cycleTime + cycleDelta) % 1.0;
    this.lastAppliedPhase = null;
    this.recalculateTimeFields();
    this.updateCelestialPositions();
    this.updateAtmosphere();
  }

  public resetRedMoonCooldown(): void {
    this.redMoonSave.cooldownUntilDay = 0;
    this.redMoonSave.lastEvaluatedNightDay = 0;
    NotificationSystem.notify('Dev Tool', 'Red Moon cooldown & roll lock reset.', 'info');
  }

  public setDayDurationMinutes(minutes: number): void {
    this.dayDurationSeconds = Math.max(60, minutes * 60);
    this.state.dayDurationSeconds = this.dayDurationSeconds;
    this.recalculateTimeFields();
  }

  dispose(): void {
    this.scene.remove(this.sunMesh);
    this.scene.remove(this.moonMesh);
    this.scene.remove(this.starsGroup);
    if (this.ownsLights) {
      this.scene.remove(this.sunLight);
      this.scene.remove(this.hemiLight);
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
      }
    }
    this.sunGeo?.dispose();
    this.sunMat?.dispose();
    this.moonGeo?.dispose();
    this.moonMat?.dispose();
    this.moonGlowGeo?.dispose();
    this.moonGlowMat?.dispose();
    this.starGeo?.dispose();
    this.starMat?.dispose();
  }
}
