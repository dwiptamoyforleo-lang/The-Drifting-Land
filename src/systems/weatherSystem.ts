/**
 * Dynamic Weather System for The Drifting Land.
 * Drives atmospheric changes (mist, aether breeze, pollen drift, red eclipse)
 * with smooth fog interpolation and environmental parameter controls.
 */

import * as THREE from 'three';
import { WeatherState, WeatherType } from '../types/game';
import { NotificationSystem } from './notificationSystem';

export class WeatherSystem {
  public state: WeatherState;
  private weatherTimer: number = 0;
  private weatherDuration: number = 90; // ~90 seconds per weather pattern

  constructor(initialWeather: WeatherType = 'CLEAR') {
    this.state = {
      currentWeather: initialWeather,
      transitionProgress: 1.0,
      windIntensity: 0.3,
      fogModifier: 1.0,
    };
  }

  update(delta: number, scene: THREE.Scene, isRedMoon: boolean): void {
    this.weatherTimer += delta;

    // Force RED_ECLIPSE weather during Red Moon events
    if (isRedMoon && this.state.currentWeather !== 'RED_ECLIPSE') {
      this.setWeather('RED_ECLIPSE');
      return;
    }

    // Natural weather shifts
    if (this.weatherTimer >= this.weatherDuration && !isRedMoon) {
      this.weatherTimer = 0;
      const patterns: WeatherType[] = ['CLEAR', 'MIST', 'AETHER_BREEZE', 'POLLEN_DRIFT'];
      const next = patterns[Math.floor(Math.random() * patterns.length)];
      this.setWeather(next);
    }

    // Apply fog effects based on current weather
    if (scene.fog && scene.fog instanceof THREE.FogExp2) {
      let targetDensity = 0.009;
      if (this.state.currentWeather === 'MIST') targetDensity = 0.022;
      if (this.state.currentWeather === 'RED_ECLIPSE') targetDensity = 0.018;
      if (this.state.currentWeather === 'CLEAR') targetDensity = 0.007;

      scene.fog.density = THREE.MathUtils.damp(scene.fog.density, targetDensity, 2.0, delta);
    }
  }

  setWeather(weather: WeatherType): void {
    if (this.state.currentWeather === weather) return;

    this.state.currentWeather = weather;
    this.state.transitionProgress = 0;

    switch (weather) {
      case 'CLEAR':
        this.state.windIntensity = 0.2;
        this.state.fogModifier = 0.8;
        NotificationSystem.notify('Weather Cleared', 'Sunlight breaks through the cloud sea', 'info');
        break;
      case 'MIST':
        this.state.windIntensity = 0.4;
        this.state.fogModifier = 2.2;
        NotificationSystem.notify('Dense Mist', 'Cool vapor sweeps across the floating plateau', 'info');
        break;
      case 'AETHER_BREEZE':
        this.state.windIntensity = 0.8;
        this.state.fogModifier = 1.0;
        NotificationSystem.notify('Aether Breeze', 'Gusting atmospheric currents carry glowing spores', 'info');
        break;
      case 'POLLEN_DRIFT':
        this.state.windIntensity = 0.35;
        this.state.fogModifier = 1.2;
        NotificationSystem.notify('Pollen Drift', 'Verdant flora releases shimmering celestial pollen', 'info');
        break;
      case 'RED_ECLIPSE':
        this.state.windIntensity = 0.9;
        this.state.fogModifier = 1.8;
        NotificationSystem.notify('Celestial Eclipse', 'Atmospheric resonance warps under the crimson moon', 'discovery', 6000);
        break;
    }
  }
}
