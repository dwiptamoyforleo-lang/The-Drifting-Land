/**
 * Portal 3D Architecture & Proximity Management for The Drifting Land.
 * Implements physical gateways in The Verdant Reach and return conduits in destination realms.
 */

import * as THREE from 'three';
import { PortalDefinition, PORTALS } from '../data/portals';

export interface RuntimePortal {
  def: PortalDefinition;
  group: THREE.Group;
  vortexMesh: THREE.Mesh;
  rings: THREE.Group[];
  light: THREE.PointLight;
}

export class PortalManager {
  private scene: THREE.Scene;
  private isSoftwareGl: boolean;
  public group: THREE.Group;
  public activePortals: Map<string, RuntimePortal> = new Map();
  private sharedGeometries: THREE.BufferGeometry[] = [];
  private sharedMaterials: THREE.Material[] = [];

  constructor(scene: THREE.Scene, isSoftwareGl = false) {
    this.scene = scene;
    this.isSoftwareGl = isSoftwareGl;
    this.group = new THREE.Group();
    this.group.name = 'world_portals';
    this.scene.add(this.group);
  }

  /**
   * Spawns only the portals relevant to the current region
   */
  public populateForRegion(
    regionId: string,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    this.clear();

    const relevant = PORTALS.filter((p) => p.sourceRegionId === regionId);

    // Shared reusable geometries
    const archPillarGeo = new THREE.BoxGeometry(1.4, 8.5, 1.4);
    const archLintelGeo = new THREE.BoxGeometry(7.2, 1.4, 1.8);
    const daisGeo = new THREE.CylinderGeometry(4.6, 5.2, 0.8, 8);
    const vortexGeo = new THREE.PlaneGeometry(4.6, 7.2);
    const ringGeo = new THREE.TorusGeometry(3.2, 0.12, 8, 24);
    const markerSpireGeo = new THREE.ConeGeometry(0.5, 1.8, 4);

    this.sharedGeometries.push(
      archPillarGeo,
      archLintelGeo,
      daisGeo,
      vortexGeo,
      ringGeo,
      markerSpireGeo
    );

    for (const portal of relevant) {
      const [px, , pz] = portal.position;
      const py = getTerrainHeight(px, pz);
      portal.position[1] = py;

      const pGroup = new THREE.Group();
      pGroup.position.set(px, py, pz);
      pGroup.rotation.y = portal.rotationY;

      // Stone Material
      const stoneMat = new THREE.MeshStandardMaterial({
        color: portal.isReturnPortal ? 0x27272a : 0x1e293b,
        roughness: 0.85,
        metalness: 0.2,
      });
      this.sharedMaterials.push(stoneMat);

      // Dais
      const dais = new THREE.Mesh(daisGeo, stoneMat);
      dais.position.y = 0.4;
      dais.receiveShadow = !this.isSoftwareGl;
      pGroup.add(dais);

      // Pillars
      const pillarL = new THREE.Mesh(archPillarGeo, stoneMat);
      pillarL.position.set(-2.8, 4.25, 0);
      pillarL.castShadow = !this.isSoftwareGl;
      pGroup.add(pillarL);

      const pillarR = new THREE.Mesh(archPillarGeo, stoneMat);
      pillarR.position.set(2.8, 4.25, 0);
      pillarR.castShadow = !this.isSoftwareGl;
      pGroup.add(pillarR);

      // Lintel
      const lintel = new THREE.Mesh(archLintelGeo, stoneMat);
      lintel.position.set(0, 8.5, 0);
      lintel.castShadow = !this.isSoftwareGl;
      pGroup.add(lintel);

      // Spires atop pillars
      const spireMat = new THREE.MeshStandardMaterial({
        color: portal.accentColor,
        emissive: portal.glowColor,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      this.sharedMaterials.push(spireMat);

      const spireL = new THREE.Mesh(markerSpireGeo, spireMat);
      spireL.position.set(-2.8, 9.4, 0);
      pGroup.add(spireL);

      const spireR = new THREE.Mesh(markerSpireGeo, spireMat);
      spireR.position.set(2.8, 9.4, 0);
      pGroup.add(spireR);

      // Event Horizon Vortex
      const vortexMat = new THREE.MeshBasicMaterial({
        color: portal.vortexColor,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      });
      this.sharedMaterials.push(vortexMat);

      const vortex = new THREE.Mesh(vortexGeo, vortexMat);
      vortex.position.set(0, 4.5, 0);
      pGroup.add(vortex);

      // Orbiting Concentric Ring
      const ringMat = new THREE.MeshStandardMaterial({
        color: portal.accentColor,
        emissive: portal.glowColor,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.8,
      });
      this.sharedMaterials.push(ringMat);

      const ringGroup = new THREE.Group();
      ringGroup.position.set(0, 4.5, 0);
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringGroup.add(ringMesh);
      pGroup.add(ringGroup);

      // Portal Light
      const pLight = new THREE.PointLight(portal.vortexColor, 1.8, 18);
      pLight.position.set(0, 4.5, 0);
      pGroup.add(pLight);

      this.group.add(pGroup);

      this.activePortals.set(portal.id, {
        def: portal,
        group: pGroup,
        vortexMesh: vortex,
        rings: [ringGroup],
        light: pLight,
      });
    }
  }

  /**
   * Per-frame animation for vortexes and concentric rings
   */
  public update(delta: number, totalTime: number): void {
    let idx = 0;
    for (const p of this.activePortals.values()) {
      // Bob and pulse vortex opacity
      const mat = p.vortexMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.65 + Math.sin(totalTime * 2.5 + idx) * 0.15;

      // Rotate rings
      p.rings.forEach((r, rIdx) => {
        r.rotation.y += delta * (0.8 + rIdx * 0.3);
        r.rotation.x = Math.sin(totalTime * 1.5 + rIdx) * 0.2;
      });

      // Pulse light
      p.light.intensity = 1.6 + Math.sin(totalTime * 3.0 + idx) * 0.4;
      idx++;
    }
  }

  /**
   * Check proximity to any active portal in the scene
   */
  public getNearbyPortal(
    playerPos: [number, number, number],
    threshold = 4.5
  ): { portal: PortalDefinition; distance: number } | null {
    let closest: { portal: PortalDefinition; distance: number } | null = null;

    this.activePortals.forEach((p) => {
      const [px, py, pz] = p.def.position;
      const dist = Math.hypot(playerPos[0] - px, playerPos[2] - pz);
      const verticalDist = Math.abs(playerPos[1] - py);

      if (dist < threshold && verticalDist < 6.0) {
        if (!closest || dist < closest.distance) {
          closest = { portal: p.def, distance: dist };
        }
      }
    });

    return closest;
  }

  /**
   * Cleanly dispose active portal geometries and materials
   */
  public clear(): void {
    this.activePortals.forEach((p) => {
      this.group.remove(p.group);
    });
    this.activePortals.clear();

    this.sharedGeometries.forEach((g) => g.dispose());
    this.sharedGeometries = [];

    this.sharedMaterials.forEach((m) => m.dispose());
    this.sharedMaterials = [];
  }

  public dispose(): void {
    this.clear();
    this.scene.remove(this.group);
  }
}
