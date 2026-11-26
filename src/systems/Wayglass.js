import * as THREE from '../vendor/three.js';
import { CYCLE_SECONDS } from '../core/DriftClock.js';
import { evaluateOrbitPosition, computeAlignmentInfo } from '../world/IslandMotion.js';

const _pt = new THREE.Vector3();

/**
 * Wayglass Read Mode: visualizes deterministic orbital arcs for drifting islands,
 * alignment timing readouts, and pulsing Echo markers.
 */
export class WayglassSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {Map<string, object>} islandMap
   */
  constructor(scene, islandMap) {
    this.scene = scene;
    this.islandMap = islandMap;
    this.active = false;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this._orbitLines = [];
    this._echoBeams = [];
    this._buildVisuals();
  }

  _buildVisuals() {
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x8fd6e8,
      transparent: true,
      opacity: 0.68,
    });
    const anchoredMat = new THREE.LineBasicMaterial({
      color: 0xf6c978,
      transparent: true,
      opacity: 0.55,
    });

    for (const island of this.islandMap.values()) {
      if (island.orbit && (island.orbit.rx > 0 || island.orbit.rz > 0)) {
        const pts = [];
        const steps = 64;
        for (let i = 0; i <= steps; i++) {
          const fakeT = (i / steps) * (CYCLE_SECONDS / (island.orbit.k || 1));
          evaluateOrbitPosition({ ...island, anchored: false, anchoredTime: null }, fakeT, _pt);
          pts.push(_pt.clone());
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, lineMat);
        this.group.add(line);
        this._orbitLines.push({ island, line, lineMat, anchoredMat });
      }
    }

    const beamGeo = new THREE.CylinderGeometry(0.12, 0.28, 22, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x8fd6e8,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (const island of this.islandMap.values()) {
      for (const inter of island.interactables) {
        if (inter.type === 'echo') {
          const beam = new THREE.Mesh(beamGeo, beamMat);
          this.group.add(beam);
          this._echoBeams.push({ island, inter, beam });
        }
      }
    }
    this._sharedGeos = [beamGeo];
    this._sharedMats = [lineMat, anchoredMat, beamMat];
  }

  toggle() {
    this.active = !this.active;
    this.group.visible = this.active;
    return this.active;
  }

  /**
   * Update Wayglass visual highlights and return concise alignment hint if looking near a drifting island.
   * @param {THREE.Vector3} playerPos
   * @param {number} clockTime
   * @returns {string}
   */
  update(playerPos, clockTime) {
    if (!this.active) return '';

    for (const entry of this._orbitLines) {
      entry.line.material = entry.island.anchored ? entry.anchoredMat : entry.lineMat;
    }

    for (const eb of this._echoBeams) {
      if (eb.inter.collected) {
        eb.beam.visible = false;
        continue;
      }
      const wx = eb.island.group.position.x + eb.inter.localPos.x;
      const wy = eb.island.group.position.y + eb.inter.localPos.y + 10.5;
      const wz = eb.island.group.position.z + eb.inter.localPos.z;
      const dist = Math.hypot(playerPos.x - wx, playerPos.z - wz);
      eb.beam.visible = dist <= 52;
      eb.beam.position.set(wx, wy, wz);
    }

    // Find closest drifting island with alignTargetId
    let nearestDrifter = null;
    let nearestDist = 42;
    for (const island of this.islandMap.values()) {
      if (!island.alignTargetId) continue;
      const d = playerPos.distanceTo(island.group.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearestDrifter = island;
      }
    }

    if (!nearestDrifter) return 'Wayglass Read · Surveying sky-lanes';
    if (nearestDrifter.anchored) return `${nearestDrifter.name} · Anchored in place`;

    const target = this.islandMap.get(nearestDrifter.alignTargetId);
    if (!target) return `${nearestDrifter.name} · Drifting`;

    const info = computeAlignmentInfo(nearestDrifter, target, clockTime);
    if (info.alignedNow) {
      return `${nearestDrifter.name} · Aligned now — cross or light its Beacon`;
    }
    return `${nearestDrifter.name} · Closest bridge in ~${info.secondsToBest}s`;
  }

  dispose() {
    for (const entry of this._orbitLines) entry.line.geometry.dispose();
    for (const g of this._sharedGeos) g.dispose();
    for (const m of this._sharedMats) m.dispose();
  }
}
