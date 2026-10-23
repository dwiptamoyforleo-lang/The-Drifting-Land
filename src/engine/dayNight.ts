/**
 * Dynamic Celestial & Day/Night System for The Drifting Land.
 * Drives sun/moon orbital trajectories, atmosphere lighting, horizon fog color interpolation,
 * and the rare Red Moon celestial alignment event.
 */

import * as THREE from 'three';
import { TimeOfDay, WorldTimeState } from '../types/game';

export class DayNightSystem {
  public state: WorldTimeState;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private scene: THREE.Scene;
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private starsGroup: THREE.Points;

  constructor(scene: THREE.Scene, initialCycleTime = 0.18) {
    this.scene = scene;
    this.state = {
      timeScale: 0.015, // full day cycle ~ 66 seconds by default, adjustable
      cycleTime: initialCycleTime,
      dayCount: 1,
      isRedMoon: false,
      phaseName: 'DAWN',
    };

    // Sun directional light
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    const d = 50;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    scene.add(this.sunLight);

    // Hemisphere sky/ground fill
    this.hemiLight = new THREE.HemisphereLight(0x7ec8e3, 0x1b3826, 0.6);
    scene.add(this.hemiLight);

    // Visible celestial orbs
    this.sunGeo = new THREE.SphereGeometry(4, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    this.sunMesh = new THREE.Mesh(this.sunGeo, sunMat);
    scene.add(this.sunMesh);

    const moonGeo = new THREE.SphereGeometry(3, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(this.moonMesh);

    // Starfield Points
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 15; // upper hemisphere
      starPos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0,
    });
    this.starsGroup = new THREE.Points(starGeo, starMat);
    scene.add(this.starsGroup);
  }

  /**
   * Advance celestial time and update lighting / fog
   */
  update(delta: number): void {
    this.state.cycleTime = (this.state.cycleTime + delta * this.state.timeScale) % 1.0;

    // Advance day count on dawn crossover
    if (this.state.cycleTime < delta * this.state.timeScale) {
      this.state.dayCount += 1;
      // 10% chance of Red Moon on odd nights
      if (this.state.dayCount % 3 === 0 && Math.random() < 0.3) {
        this.state.isRedMoon = true;
      } else {
        this.state.isRedMoon = false;
      }
    }

    const angle = this.state.cycleTime * Math.PI * 2;
    const orbitDist = 180;

    // Sun trajectory
    const sunX = Math.cos(angle) * orbitDist;
    const sunY = Math.sin(angle) * orbitDist;
    const sunZ = Math.sin(angle * 0.5) * 40;

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunMesh.position.set(sunX, sunY, sunZ);

    // Moon trajectory (opposite)
    this.moonMesh.position.set(-sunX, -sunY, -sunZ);

    // Determine phase name
    let phase: TimeOfDay = 'NOON';
    if (this.state.isRedMoon && sunY < 0) {
      phase = 'RED_MOON';
    } else if (sunY > 20 && sunY < 80 && Math.cos(angle) > 0) {
      phase = 'DAWN';
    } else if (sunY >= 80) {
      phase = 'NOON';
    } else if (sunY > 0 && sunY <= 80 && Math.cos(angle) < 0) {
      phase = 'DUSK';
    } else {
      phase = 'NIGHT';
    }
    this.state.phaseName = phase;

    // Palette interpolation based on phase
    const starMat = this.starsGroup.material as THREE.PointsMaterial;

    if (phase === 'RED_MOON') {
      (this.moonMesh.material as THREE.MeshBasicMaterial).color.setHex(0xef4444);
      this.scene.background = new THREE.Color(0x2d0607);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0x2d0607);
      this.sunLight.color.setHex(0x991b1b);
      this.sunLight.intensity = 0.5;
      this.hemiLight.color.setHex(0xef4444);
      this.hemiLight.groundColor.setHex(0x180506);
      starMat.opacity = 0.4;
    } else if (phase === 'NOON') {
      (this.moonMesh.material as THREE.MeshBasicMaterial).color.setHex(0xe2e8f0);
      this.scene.background = new THREE.Color(0x38bdf8); // Sky blue
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0x7dd3fc);
      this.sunLight.color.setHex(0xfff5e6);
      this.sunLight.intensity = 1.8;
      this.hemiLight.color.setHex(0x7ec8e3);
      this.hemiLight.groundColor.setHex(0x1b3826);
      starMat.opacity = 0.0;
    } else if (phase === 'DAWN') {
      this.scene.background = new THREE.Color(0xf59e0b); // Golden amber
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0xfbbf24);
      this.sunLight.color.setHex(0xfef08a);
      this.sunLight.intensity = 1.3;
      this.hemiLight.color.setHex(0xfcd34d);
      this.hemiLight.groundColor.setHex(0x27272a);
      starMat.opacity = 0.2;
    } else if (phase === 'DUSK') {
      this.scene.background = new THREE.Color(0x701a75); // Deep purple dusk
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0xa21caf);
      this.sunLight.color.setHex(0xf43f5e);
      this.sunLight.intensity = 1.0;
      this.hemiLight.color.setHex(0xc084fc);
      this.hemiLight.groundColor.setHex(0x1e1b4b);
      starMat.opacity = 0.5;
    } else {
      // NIGHT
      this.scene.background = new THREE.Color(0x060913); // Deep cosmic navy
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0x090d1a);
      this.sunLight.color.setHex(0x60a5fa);
      this.sunLight.intensity = 0.35;
      this.hemiLight.color.setHex(0x38bdf8);
      this.hemiLight.groundColor.setHex(0x020617);
      starMat.opacity = 0.95;
    }
  }

  /**
   * Manually trigger Red Moon event for testing/lore
   */
  toggleRedMoon(): boolean {
    this.state.isRedMoon = !this.state.isRedMoon;
    return this.state.isRedMoon;
  }

  dispose(): void {
    this.sunGeo?.dispose();
    this.starsGroup.geometry.dispose();
  }

  private sunGeo?: THREE.SphereGeometry;
}
