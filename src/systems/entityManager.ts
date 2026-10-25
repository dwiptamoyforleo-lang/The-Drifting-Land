/**
 * Entity Management System for The Drifting Land.
 * Builds and coordinates interactive 3D world entities (NPCs, creatures, resource nodes, waystones)
 * using composite 3-12 part procedural models adhering to the Three.js skill.
 */

import * as THREE from 'three';
import { WorldEntityDefinition } from '../types/game';
import { WORLD_ENTITIES } from '../data/entities';
import { TextureGenerator } from '../engine/textures';

export interface RuntimeEntity {
  def: WorldEntityDefinition;
  group: THREE.Group;
  harvested?: boolean;
  update?: (delta: number, totalTime: number) => void;
  dispose: () => void;
}

export class EntityManager {
  public group: THREE.Group;
  private entities: Map<string, RuntimeEntity> = new Map();
  private isSoftwareGl: boolean;

  constructor(scene: THREE.Scene, isSoftwareGl = false) {
    this.group = new THREE.Group();
    this.group.name = 'world_entities';
    this.isSoftwareGl = isSoftwareGl;
    scene.add(this.group);
  }

  /**
   * Populate region entities from catalog
   */
  populate(getTerrainHeight: (x: number, z: number) => number): void {
    WORLD_ENTITIES.forEach((def) => {
      const y = getTerrainHeight(def.position[0], def.position[2]);
      const entity = this.createEntity(def, y);
      if (entity) {
        this.entities.set(def.id, entity);
        this.group.add(entity.group);
      }
    });
  }

  private createEntity(def: WorldEntityDefinition, groundY: number): RuntimeEntity | null {
    const entityGroup = new THREE.Group();
    entityGroup.position.set(def.position[0], groundY, def.position[2]);
    if (def.rotationY) entityGroup.rotation.y = def.rotationY;

    if (def.type === 'NPC') {
      return this.createNpc(def, entityGroup);
    } else if (def.type === 'CREATURE') {
      return this.createAetherWisp(def, entityGroup, groundY);
    } else if (def.type === 'COLLECTIBLE') {
      return this.createResourceNode(def, entityGroup);
    }

    return null;
  }

  /**
   * Composite 3-8 part Procedural NPC (Surveyor Kaelen)
   */
  private createNpc(def: WorldEntityDefinition, group: THREE.Group): RuntimeEntity {
    // 1. Stool / Camp Seat
    const stoolGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.45, 8);
    stoolGeo.translate(0, 0.22, 0);
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const stoolMesh = new THREE.Mesh(stoolGeo, stoolMat);
    group.add(stoolMesh);

    // 2. Torso with survey coat
    const coatGeo = new THREE.CylinderGeometry(0.3, 0.38, 0.8, 8);
    coatGeo.translate(0, 0.75, 0);
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.7, metalness: 0.1 });
    const coatMesh = new THREE.Mesh(coatGeo, coatMat);
    coatMesh.castShadow = !this.isSoftwareGl;
    group.add(coatMesh);

    // 3. Head & Explorer Brimmed Hat
    const headGeo = new THREE.SphereGeometry(0.22, 10, 8);
    headGeo.translate(0, 1.3, 0);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    group.add(headMesh);

    const hatGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12);
    hatGeo.translate(0, 1.45, 0);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const hatMesh = new THREE.Mesh(hatGeo, hatMat);
    group.add(hatMesh);

    // 4. Map Scroll & Brass Compass
    const scrollGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
    scrollGeo.rotateZ(Math.PI / 3);
    scrollGeo.translate(0.2, 0.8, 0.2);
    const scrollMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
    const scrollMesh = new THREE.Mesh(scrollGeo, scrollMat);
    group.add(scrollMesh);

    // 5. Resting Lantern with warm glow
    const lanternGeo = new THREE.BoxGeometry(0.16, 0.22, 0.16);
    lanternGeo.translate(-0.35, 0.3, 0.2);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
    });
    const lanternMesh = new THREE.Mesh(lanternGeo, lanternMat);
    group.add(lanternMesh);

    const light = new THREE.PointLight(0xfbbf24, 0.7, 5);
    light.position.set(-0.35, 0.35, 0.2);
    group.add(light);

    return {
      def,
      group,
      update: (_delta, totalTime) => {
        // Subtle breathing animation
        coatMesh.scale.y = 1.0 + Math.sin(totalTime * 1.5) * 0.02;
      },
      dispose: () => {
        stoolGeo.dispose();
        coatGeo.dispose();
        headGeo.dispose();
        hatGeo.dispose();
        scrollGeo.dispose();
        lanternGeo.dispose();
      },
    };
  }

  /**
   * Composite Procedural Aether Wisp Critter (or Mutated Crimson Wisp)
   */
  private createAetherWisp(def: WorldEntityDefinition, group: THREE.Group, groundY: number): RuntimeEntity {
    const isCrimson = def.id.includes('crimson');
    const color = isCrimson ? 0xef4444 : 0x38bdf8;
    const emissive = isCrimson ? 0xdc2626 : 0x0284c7;

    // Glowing Core
    const coreGeo = new THREE.SphereGeometry(isCrimson ? 0.35 : 0.28, 12, 12);
    const coreMat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: isCrimson ? 1.8 : 1.2,
      roughness: 0.1,
      metalness: 0.9,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Orbiting Spark Ring
    const ringGeo = new THREE.TorusGeometry(isCrimson ? 0.65 : 0.5, 0.04, 6, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isCrimson ? 0xf87171 : 0x7dd3fc,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    group.add(ringMesh);

    const light = new THREE.PointLight(color, isCrimson ? 1.2 : 0.8, 8);
    group.add(light);

    const baseY = groundY + 1.8;

    return {
      def,
      group,
      update: (delta, totalTime) => {
        // Fluttering flight pattern
        const flutter = Math.sin(totalTime * 3.0 + group.position.x) * 0.35;
        group.position.y = baseY + flutter;
        ringMesh.rotation.x += delta * (isCrimson ? 3.0 : 2.0);
        ringMesh.rotation.y += delta * (isCrimson ? 2.5 : 1.5);
      },
      dispose: () => {
        coreGeo.dispose();
        ringGeo.dispose();
      },
    };
  }

  /**
   * Composite Procedural Harvestable Node
   */
  private createResourceNode(def: WorldEntityDefinition, group: THREE.Group): RuntimeEntity {
    const isMoss = def.id.includes('moss');
    const isBloodroot = def.id.includes('bloodroot');

    // Base Boulder
    const rockGeo = new THREE.DodecahedronGeometry(0.55, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: isBloodroot ? 0x27272a : 0x475569,
      roughness: 0.85,
      metalness: 0.1,
    });
    const rockMesh = new THREE.Mesh(rockGeo, rockMat);
    rockMesh.position.y = 0.3;
    group.add(rockMesh);

    // Flora topper (Moss cap, glowing bloom petals, or Bloodroot Orchid)
    let floraGeo: THREE.BufferGeometry;
    let floraColor = 0x22c55e;
    let floraEmissive = 0x15803d;

    if (isBloodroot) {
      floraGeo = new THREE.OctahedronGeometry(0.45, 1);
      floraColor = 0xef4444;
      floraEmissive = 0xb91c1c;
    } else if (isMoss) {
      floraGeo = new THREE.ConeGeometry(0.6, 0.4, 7);
      floraColor = 0x22c55e;
      floraEmissive = 0x15803d;
    } else {
      floraGeo = new THREE.OctahedronGeometry(0.3, 0);
      floraColor = 0xa855f7;
      floraEmissive = 0x7e22ce;
    }

    floraGeo.translate(0, 0.65, 0);
    const floraMat = new THREE.MeshStandardMaterial({
      color: floraColor,
      emissive: floraEmissive,
      emissiveIntensity: isBloodroot ? 1.2 : 0.4,
      roughness: 0.5,
    });
    const floraMesh = new THREE.Mesh(floraGeo, floraMat);
    group.add(floraMesh);

    return {
      def,
      group,
      update: (_delta, totalTime) => {
        if (!isMoss) {
          floraMesh.rotation.y = totalTime * (isBloodroot ? 1.8 : 1.2);
        }
      },
      dispose: () => {
        rockGeo.dispose();
        floraGeo.dispose();
      },
    };
  }

  update(delta: number, totalTime: number, isRedMoon = false): void {
    this.entities.forEach((entity) => {
      const isRedMoonExclusive =
        entity.def.id.includes('bloodroot') || entity.def.id.includes('crimson');

      // Hide or show event exclusives based on celestial phase
      if (isRedMoonExclusive) {
        entity.group.visible = isRedMoon && !entity.harvested;
      }

      if (entity.group.visible) {
        entity.update?.(delta, totalTime);
      }
    });
  }

  /**
   * Find nearest interactable entity within range (default 3.0m)
   */
  getNearestInteractable(playerPos: THREE.Vector3, maxDist = 3.2): RuntimeEntity | null {
    let nearest: RuntimeEntity | null = null;
    let minDist = maxDist;

    this.entities.forEach((entity) => {
      if (entity.harvested) return;
      const dist = playerPos.distanceTo(entity.group.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = entity;
      }
    });

    return nearest;
  }

  harvestEntity(id: string): WorldEntityDefinition | null {
    const entity = this.entities.get(id);
    if (!entity || entity.harvested) return null;

    entity.harvested = true;
    entity.group.visible = false;
    return entity.def;
  }

  dispose(): void {
    this.entities.forEach((e) => e.dispose());
    this.entities.clear();
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
  }
}
