/**
 * DYNAMIC WEATHER AND ENVIRONMENTAL EVENTS SYSTEM
 * Implements lightweight weather variation, performance scaling for low-end devices,
 * and gameplay impacts on wildlife, visibility, and resource availability.
 */

import * as THREE from 'three';

export type WeatherType =
  | 'clear'
  | 'mist'
  | 'light_rain'
  | 'wind'
  | 'heavy_clouds'
  | 'storm'
  | 'dimensional_disturbance';

export interface WeatherState {
  current: WeatherType;
  intensity: number;
  transitionProgress: number;
  windVector: THREE.Vector3;
  visibilityDistance: number;
  resourceSpawnMultiplier: number;
}

export class WeatherSystem {
  private currentWeather: WeatherType = 'clear';
  private targetWeather: WeatherType = 'clear';
  private transitionTimer: number = 0;
  private durationTimer: number = 0;
  private lowEndDevice: boolean = false;

  public state: WeatherState = {
    current: 'clear',
    intensity: 0,
    transitionProgress: 1,
    windVector: new THREE.Vector3(1, 0, 0),
    visibilityDistance: 1200,
    resourceSpawnMultiplier: 1.0,
  };

  constructor(graphicsQuality: string = 'balanced') {
    this.lowEndDevice = graphicsQuality === 'low';
  }

  public setQuality(quality: string) {
    this.lowEndDevice = quality === 'low';
  }

  public update(delta: number, currentAltitude: number) {
    this.durationTimer += delta;

    // Gradual weather transition cycle every 180-300 seconds
    if (this.durationTimer > 240) {
      this.durationTimer = 0;
      this.triggerRandomWeather(currentAltitude);
    }

    if (this.currentWeather !== this.targetWeather) {
      this.transitionTimer += delta * 0.2;
      if (this.transitionTimer >= 1.0) {
        this.transitionTimer = 1.0;
        this.currentWeather = this.targetWeather;
      }
      this.state.transitionProgress = this.transitionTimer;
    }

    this.updateEnvironmentalModifiers(currentAltitude);
  }

  public triggerRandomWeather(altitude: number) {
    const possible: WeatherType[] = ['clear', 'mist', 'light_rain', 'heavy_clouds'];

    // High altitude or specific regions get wind/storms/disturbances
    if (altitude > 1600) {
      possible.push('wind', 'storm');
    }
    if (Math.random() < 0.15) {
      possible.push('dimensional_disturbance');
    }

    const next = possible[Math.floor(Math.random() * possible.length)];
    if (next !== this.currentWeather) {
      this.targetWeather = next;
      this.transitionTimer = 0;
    }
  }

  public forceWeather(weather: WeatherType) {
    this.targetWeather = weather;
    this.transitionTimer = 0;
  }

  private updateEnvironmentalModifiers(altitude: number) {
    switch (this.currentWeather) {
      case 'clear':
        this.state.visibilityDistance = 1500;
        this.state.resourceSpawnMultiplier = 1.0;
        this.state.windVector.set(0.5, 0, 0.2);
        break;
      case 'mist':
        this.state.visibilityDistance = 450;
        this.state.resourceSpawnMultiplier = 1.2;
        this.state.windVector.set(0.2, 0, 0.1);
        break;
      case 'light_rain':
        this.state.visibilityDistance = 800;
        this.state.resourceSpawnMultiplier = 1.5;
        this.state.windVector.set(0.8, 0, 0.4);
        break;
      case 'wind':
        this.state.visibilityDistance = 1100;
        this.state.resourceSpawnMultiplier = 0.9;
        this.state.windVector.set(altitude > 1700 ? 4.5 : 2.0, 0, 1.5);
        break;
      case 'heavy_clouds':
        this.state.visibilityDistance = 600;
        this.state.resourceSpawnMultiplier = 1.0;
        this.state.windVector.set(1.0, 0, 0.5);
        break;
      case 'storm':
        this.state.visibilityDistance = 350;
        this.state.resourceSpawnMultiplier = 0.7;
        this.state.windVector.set(5.0, 0, 3.0);
        break;
      case 'dimensional_disturbance':
        this.state.visibilityDistance = 500;
        this.state.resourceSpawnMultiplier = 2.0;
        this.state.windVector.set(0, 2.5, 0);
        break;
    }

    if (this.lowEndDevice) {
      this.state.visibilityDistance = Math.min(this.state.visibilityDistance, 600);
    }
  }
}