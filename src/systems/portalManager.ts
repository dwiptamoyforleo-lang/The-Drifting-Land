/**
 * Portal 3D Architecture & Proximity Management for The Drifting Land.
 * - Shares stone, spire, dais, and ring geometries via SharedAssets
 * - Uses glow sprites instead of expensive per-portal PointLights
 * - Supports chunk visibility streaming while preserving proximity metadata
 */

import * as THREE from 'three';
import { PortalDefinition, PORTALS } from '../data/portals';
import { SharedAssets } from '../engine/sharedAssets';

export interface RuntimePortal {
  def: PortalDefinition;
  group: THREE.Group;
  vortexMesh: THREE.Mesh;
  rings: THREE.Group[];
}

export class PortalManager {
  private scene: THREE.Scene;
  private isSoftwareGl: boolean;
  public group: THREE.Group;
  public activePortals: Map<string, RuntimePortal> = new Map();
  private ownedMaterials: THREE.Material[] = [];

  constructor(scene: THREE.Scene, isSoftwareGl = false) {
    this.scene = scene;
    this.isSoftwareGl = isSoftwareGl;
    this.group = new THREE.Group();
    this.group.name = 'world_portals';
    this.scene.add(this.group);
  }

  public populateForRegion(
    regionId: string,
    getTerrainHeight: (x: number, z: number) => number
  ): void {
    this.clear();

    const relevant = PORTALS.filter((p) => p.sourceRegionId === regionId);

    const archPillarGeo = SharedAssets.getGeometry('portal_pillar', () => new THREE.BoxGeometry(1.4, 8.5, 1.4));
    const archLintelGeo = SharedAssets.getGeometry('portal_lintel', () => new THREE.BoxGeometry(7.2, 1.4, 1.8));
    const daisGeo = SharedAssets.getGeometry('portal_dais', () => new THREE.CylinderGeometry(4.6, 5.2, 0.8, 8));
    const vortexGeo = SharedAssets.getGeometry('portal_vortex', () => new THREE.PlaneGeometry(4.6, 7.2));
    const ringGeo = SharedAssets.getGeometry('portal_ring', () => new THREE.TorusGeometry(3.2, 0.12, 8, 22));
    const markerSpireGeo = SharedAssets.getGeometry('portal_spire', () => new THREE.ConeGeometry(0.5, 1.8, 4));

    const stoneReturnMat = SharedAssets.getMaterial('portal_stone_return', () =>
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85, metalness: 0.2 })
    );
    const stoneOutMat = SharedAssets.getMaterial('portal_stone_out', () =>
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.2 })
    );

    for (const portal of relevant) {
      const [px, , pz] = portal.position;
      const py = getTerrainHeight(px, pz);
      portal.position[1] = py;

      const pGroup = new THREE.Group();
      pGroup.position.set(px, py, pz);
      pGroup.rotation.y = portal.rotationY;

      const stoneMat = portal.isReturnPortal ? stoneReturnMat : stoneOutMat;

      const dais = new THREE.Mesh(daisGeo, stoneMat);
      dais.position.y = 0.4;
      dais.receiveShadow = !this.isSoftwareGl;
      pGroup.add(dais);

      const pillarL = new THREE.Mesh(archPillarGeo, stoneMat);
      pillarL.position.set(-2.8, 4.25, 0);
      pillarL.castShadow = !this.isSoftwareGl;
      pGroup.add(pillarL);

      const pillarR = new THREE.Mesh(archPillarGeo, stoneMat);
      pillarR.position.set(2.8, 4.25, 0);
      pillarR.castShadow = !this.isSoftwareGl;
      pGroup.add(pillarR);

      const lintel = new THREE.Mesh(archLintelGeo, stoneMat);
      lintel.position.set(0, 8.5, 0);
      lintel.castShadow = !this.isSoftwareGl;
      pGroup.add(lintel);

      const spireMat = SharedAssets.getMaterial(`portal_spire_${portal.accentColor}`, () =>
        new THREE.MeshStandardMaterial({
          color: portal.accentColor,
          emissive: portal.glowColor,
          emissiveIntensity: 0.6,
          roughness: 0.2,
        })
      );

      const spireL = new THREE.Mesh(markerSpireGeo, spireMat);
      spireL.position.set(-2.8, 9.4, 0);
      const spireR = new THREE.Mesh(markerSpireGeo, spireMat);
      spireR.position.set(2.8, 9.4, 0);
      pGroup.add(spireL, spireR);

      const vortexMat = new THREE.MeshBasicMaterial({
        color: portal.vortexColor,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      });
      this.ownedMaterials.push(vortexMat);

      const vortex = new THREE.Mesh(vortexGeo, vortexMat);
      vortex.position.set(0, 4.5, 0);
      pGroup.add(vortex);

      const ringMat = SharedAssets.getMaterial(`portal_ring_${portal.accentColor}`, () =>
        new THREE.MeshStandardMaterial({
          color: portal.accentColor,
          emissive: portal.glowColor,
          emissiveIntensity: 0.4,
          roughness: 0.3,
          metalness: 0.8,
        })
      );

      const ringGroup = new THREE.Group();
      ringGroup.position.set(0, 4.5, 0);
      ringGroup.add(new THREE.Mesh(ringGeo, ringMat));
      pGroup.add(ringGroup);

      const glow = SharedAssets.createGlowSprite(portal.vortexColor, 6.2, 0.7);
      glow.position.set(0, 4.5, 0);
      pGroup.add(glow);

      this.group.add(pGroup);

      this.activePortals.set(portal.id, {
        def: portal,
        group: pGroup,
        vortexMesh: vortex,
        rings: [ringGroup],
      });
    }
  }

  public syncStreaming(isVisible: (x: number, z: number) => boolean): void {
    this.activePortals.forEach((p) => {
      p.group.visible = isVisible(p.def.position[0], p.def.position[2]);
    });
  }

  public update(delta: number, totalTime: number): void {
    let idx = 0;
    for (const p of this.activePortals.values()) {
      if (!p.group.visible) {
        idx++;
        continue;
      }
      const mat = p.vortexMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.65 + Math.sin(totalTime * 2.5 + idx) * 0.15;

      p.rings.forEach((r, rIdx) => {
        r.rotation.y += delta * (0.8 + rIdx * 0.3);
        r.rotation.x = Math.sin(totalTime * 1.5 + rIdx) * 0.2;
      });
      idx++;
    }
  }

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

  public clear(): void {
    this.activePortals.forEach((p) => {
      this.group.remove(p.group);
    });
    this.activePortals.clear();

    this.ownedMaterials.forEach((m) => m.dispose());
    this.ownedMaterials = [];
  }

  public dispose(): void {
    this.clear();
    this.scene.remove(this.group);
  }
}
