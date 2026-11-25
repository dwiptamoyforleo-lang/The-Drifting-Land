/**
 * Dynamic Weather & Particle Simulation System for The Drifting Land.
 * Implements:
 * - Weather conditions: CLEAR, MIST, WIND, RAIN, CLOUDS, STORMS, DIMENSIONAL_DISTURBANCE, RED_ECLIPSE
 * - Lightweight Three.js BufferGeometry particle engine with configurable particle limits
 * - Atmospheric fog & lighting adjustments
 * - Gameplay effects (wind velocity drift, movement speed / stamina consumption modifiers)
 */

import * as THREE from 'three';
import { WeatherState, WeatherType } from '../types/game';
import { NotificationSystem } from './notificationSystem';

export class WeatherSystem {
  public state: WeatherState;
  private weatherTimer: number = 0;
  private weatherDuration: number = 110; // ~110 seconds per natural weather cycle
  private particleLimit: number;

  // Particle System
  private particleGroup: THREE.Group;
  private particlePoints: THREE.Points | null = null;
  private particlePositions: Float32Array | null = null;
  private particleVelocities: Float32Array | null = null;
  private particleGeo: THREE.BufferGeometry | null = null;
  private particleMat: THREE.PointsMaterial | null = null;

  // Gameplay modifiers
  public staminaRegenModifier: number = 1.0;
  public movementSpeedModifier: number = 1.0;
  public windVector: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(initialWeather: WeatherType = 'CLEAR', particleLimit = 600) {
    this.particleLimit = particleLimit;
    this.particleGroup = new THREE.Group();
    this.particleGroup.name = 'weather_particles';

    this.state = {
      currentWeather: initialWeather,
      transitionProgress: 1.0,
      windIntensity: 0.2,
      fogModifier: 1.0,
      precipitationIntensity: 0.0,
    };
  }

  public initScene(scene: THREE.Scene): void {
    scene.add(this.particleGroup);
    this.rebuildParticleSystem();
    this.applyWeatherSettings(this.state.currentWeather, true);
  }

  public setParticleLimit(limit: number): void {
    if (this.particleLimit !== limit) {
      this.particleLimit = limit;
      this.rebuildParticleSystem();
    }
  }

  private rebuildParticleSystem(): void {
    if (this.particlePoints) {
      this.particleGroup.remove(this.particlePoints);
      this.particleGeo?.dispose();
      this.particleMat?.dispose();
    }

    const count = this.particleLimit;
    this.particlePositions = new Float32Array(count * 3);
    this.particleVelocities = new Float32Array(count * 3);

    // Spread particles in an area around the player (radius ~45m, height 0 to 25m)
    for (let i = 0; i < count; i++) {
      this.resetParticle(i, true);
    }

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    this.particleMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 1.2,
      transparent: true,
      opacity: 0.0,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.particlePoints = new THREE.Points(this.particleGeo, this.particleMat);
    this.particleGroup.add(this.particlePoints);
  }

  private resetParticle(i: number, randomY = false): void {
    if (!this.particlePositions || !this.particleVelocities) return;
    const r = Math.random() * 45;
    const theta = Math.random() * Math.PI * 2;

    this.particlePositions[i * 3] = Math.cos(theta) * r;
    this.particlePositions[i * 3 + 1] = randomY ? Math.random() * 22 + 1 : 20 + Math.random() * 4;
    this.particlePositions[i * 3 + 2] = Math.sin(theta) * r;

    // Velocity based on current weather pattern
    const w = this.state.currentWeather;
    if (w === 'RAIN') {
      this.particleVelocities[i * 3] = (Math.random() - 0.5) * 1.5 - 2.5; // slight diagonal wind
      this.particleVelocities[i * 3 + 1] = -(18 + Math.random() * 8); // fast downward
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    } else if (w === 'STORMS') {
      this.particleVelocities[i * 3] = -(7 + Math.random() * 4); // strong diagonal gales
      this.particleVelocities[i * 3 + 1] = -(24 + Math.random() * 10);
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 3;
    } else if (w === 'MIST' || w === 'CLOUDS') {
      this.particleVelocities[i * 3] = 0.8 + Math.random() * 0.5;
      this.particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      this.particleVelocities[i * 3 + 2] = 0.5 + Math.random() * 0.5;
    } else if (w === 'WIND') {
      this.particleVelocities[i * 3] = -(8 + Math.random() * 4);
      this.particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      this.particleVelocities[i * 3 + 2] = -(4 + Math.random() * 2);
    } else if (w === 'DIMENSIONAL_DISTURBANCE') {
      // Swirling chaotic motes
      const angle = Math.random() * Math.PI * 2;
      this.particleVelocities[i * 3] = Math.cos(angle) * 3.5;
      this.particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 3.0;
      this.particleVelocities[i * 3 + 2] = Math.sin(angle) * 3.5;
    } else if (w === 'RED_ECLIPSE') {
      // Crimson spores floating upwards/drifting
      this.particleVelocities[i * 3] = (Math.random() - 0.5) * 1.2;
      this.particleVelocities[i * 3 + 1] = 0.8 + Math.random() * 1.2; // rising ash
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    } else {
      // CLEAR: gentle ambient drifting aether specs
      this.particleVelocities[i * 3] = (Math.random() - 0.5) * 0.4;
      this.particleVelocities[i * 3 + 1] = 0.2 + Math.random() * 0.3;
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
  }

  update(delta: number, scene: THREE.Scene, isRedMoon: boolean, playerPos?: THREE.Vector3): void {
    this.weatherTimer += delta;

    // Force RED_ECLIPSE weather during Red Moon events
    if (isRedMoon && this.state.currentWeather !== 'RED_ECLIPSE') {
      this.setWeather('RED_ECLIPSE');
      return;
    }

    // Natural weather shifts when not in Red Moon
    if (this.weatherTimer >= this.weatherDuration && !isRedMoon) {
      this.weatherTimer = 0;
      const patterns: WeatherType[] = [
        'CLEAR',
        'MIST',
        'WIND',
        'RAIN',
        'CLOUDS',
        'STORMS',
        'DIMENSIONAL_DISTURBANCE',
      ];
      // Random new weather different from current
      const available = patterns.filter((p) => p !== this.state.currentWeather);
      const next = available[Math.floor(Math.random() * available.length)];
      this.setWeather(next);
    }

    // Center particle system around player position for infinite bounds
    if (playerPos) {
      this.particleGroup.position.x = playerPos.x;
      this.particleGroup.position.z = playerPos.z;
    }

    // Update Particles
    if (this.particlePositions && this.particleVelocities && this.particleGeo) {
      const count = this.particleLimit;
      for (let i = 0; i < count; i++) {
        this.particlePositions[i * 3] += this.particleVelocities[i * 3] * delta;
        this.particlePositions[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * delta;
        this.particlePositions[i * 3 + 2] += this.particleVelocities[i * 3 + 2] * delta;

        // Ground collision or out-of-bounds reset
        const py = this.particlePositions[i * 3 + 1];
        const distSq =
          this.particlePositions[i * 3] * this.particlePositions[i * 3] +
          this.particlePositions[i * 3 + 2] * this.particlePositions[i * 3 + 2];

        if (py < 0.2 || py > 28 || distSq > 48 * 48) {
          this.resetParticle(i, false);
        }
      }
      this.particleGeo.attributes.position.needsUpdate = true;
    }

    // Smooth Fog Density interpolation
    if (scene.fog && scene.fog instanceof THREE.FogExp2) {
      let targetDensity = 0.008;
      if (this.state.currentWeather === 'MIST') targetDensity = 0.024;
      else if (this.state.currentWeather === 'STORMS') targetDensity = 0.019;
      else if (this.state.currentWeather === 'RAIN') targetDensity = 0.014;
      else if (this.state.currentWeather === 'DIMENSIONAL_DISTURBANCE') targetDensity = 0.016;
      else if (this.state.currentWeather === 'RED_ECLIPSE') targetDensity = 0.022;
      else if (this.state.currentWeather === 'CLEAR') targetDensity = 0.007;

      scene.fog.density = THREE.MathUtils.damp(scene.fog.density, targetDensity, 2.0, delta);
    }
  }

  public setWeather(weather: WeatherType): void {
    if (this.state.currentWeather === weather) return;
    this.state.currentWeather = weather;
    this.applyWeatherSettings(weather, false);
  }

  private applyWeatherSettings(weather: WeatherType, isInitial: boolean): void {
    if (!this.particleMat) return;

    switch (weather) {
      case 'CLEAR':
        this.state.windIntensity = 0.2;
        this.state.fogModifier = 1.0;
        this.state.precipitationIntensity = 0.0;
        this.staminaRegenModifier = 1.0;
        this.movementSpeedModifier = 1.0;
        this.windVector.set(0, 0, 0);

        this.particleMat.color.setHex(0xa7f3d0); // Light emerald specs
        this.particleMat.size = 1.0;
        this.particleMat.opacity = 0.35;
        if (!isInitial) NotificationSystem.notify('Skies Clear', 'Sunlight floods the floating archipelago.', 'info');
        break;

      case 'MIST':
        this.state.windIntensity = 0.35;
        this.state.fogModifier = 2.4;
        this.state.precipitationIntensity = 0.2;
        this.staminaRegenModifier = 0.95;
        this.movementSpeedModifier = 0.95;
        this.windVector.set(0.4, 0, 0.2);

        this.particleMat.color.setHex(0xe2e8f0);
        this.particleMat.size = 2.6;
        this.particleMat.opacity = 0.45;
        if (!isInitial) NotificationSystem.notify('Highland Mist', 'Thick cloud vapor blankets the ridges.', 'info');
        break;

      case 'WIND':
        this.state.windIntensity = 0.85;
        this.state.fogModifier = 1.1;
        this.state.precipitationIntensity = 0.0;
        this.staminaRegenModifier = 0.9;
        this.movementSpeedModifier = 1.05; // Wind assist/resistance
        this.windVector.set(-1.2, 0, -0.6);

        this.particleMat.color.setHex(0xbfdbfe);
        this.particleMat.size = 1.4;
        this.particleMat.opacity = 0.6;
        if (!isInitial) NotificationSystem.notify('Gale Winds', 'High-altitude jet streams whip across the plateau.', 'info');
        break;

      case 'RAIN':
        this.state.windIntensity = 0.6;
        this.state.fogModifier = 1.8;
        this.state.precipitationIntensity = 0.7;
        this.staminaRegenModifier = 0.85;
        this.movementSpeedModifier = 0.92;
        this.windVector.set(-0.4, 0, 0);

        this.particleMat.color.setHex(0x93c5fd);
        this.particleMat.size = 1.8;
        this.particleMat.opacity = 0.8;
        if (!isInitial) NotificationSystem.notify('Archipelago Rain', 'Gentle rain showers drench the verdant canopy.', 'info');
        break;

      case 'CLOUDS':
        this.state.windIntensity = 0.4;
        this.state.fogModifier = 1.5;
        this.state.precipitationIntensity = 0.1;
        this.staminaRegenModifier = 1.0;
        this.movementSpeedModifier = 1.0;
        this.windVector.set(0.2, 0, 0.2);

        this.particleMat.color.setHex(0xd1d5db);
        this.particleMat.size = 2.4;
        this.particleMat.opacity = 0.4;
        if (!isInitial) NotificationSystem.notify('Cloud Cover', 'Distant thunderheads shadow the sunward horizon.', 'info');
        break;

      case 'STORMS':
        this.state.windIntensity = 1.0;
        this.state.fogModifier = 2.2;
        this.state.precipitationIntensity = 1.0;
        this.staminaRegenModifier = 0.75;
        this.movementSpeedModifier = 0.88;
        this.windVector.set(-1.5, 0, 0.5);

        this.particleMat.color.setHex(0x60a5fa);
        this.particleMat.size = 2.2;
        this.particleMat.opacity = 0.9;
        if (!isInitial) NotificationSystem.notify('Celestial Storm', 'Violent tempests and lightning arc through the clouds!', 'danger');
        break;

      case 'DIMENSIONAL_DISTURBANCE':
        this.state.windIntensity = 0.7;
        this.state.fogModifier = 1.9;
        this.state.precipitationIntensity = 0.5;
        this.staminaRegenModifier = 1.1; // Aether surges grant stamina
        this.movementSpeedModifier = 1.0;
        this.windVector.set(0, 0, 0);

        this.particleMat.color.setHex(0xc084fc); // Purple celestial motes
        this.particleMat.size = 2.5;
        this.particleMat.opacity = 0.85;
        if (!isInitial) NotificationSystem.notify('Dimensional Disturbance', 'Space-time folds ripple through the atmosphere!', 'danger', 7000);
        break;

      case 'RED_ECLIPSE':
        this.state.windIntensity = 0.75;
        this.state.fogModifier = 2.2;
        this.state.precipitationIntensity = 0.6;
        this.staminaRegenModifier = 0.9;
        this.movementSpeedModifier = 0.95;
        this.windVector.set(0, 0, 0);

        this.particleMat.color.setHex(0xf87171); // Crimson spores
        this.particleMat.size = 2.2;
        this.particleMat.opacity = 0.8;
        if (!isInitial) NotificationSystem.notify('Red Moon Eclipse', 'The air burns with red ash and ancient fury.', 'danger', 8000);
        break;
    }

    // Reset particles with new velocity profile
    if (this.particlePositions) {
      for (let i = 0; i < this.particleLimit; i++) {
        this.resetParticle(i, true);
      }
    }
  }

  dispose(): void {
    if (this.particlePoints) {
      this.particleGroup.remove(this.particlePoints);
    }
    this.particleGeo?.dispose();
    this.particleMat?.dispose();
  }
}
