import * as THREE from 'three';
import { WorldFragment, MagicalAnchor, WorldCheckpoint, GraphicsQuality, TimeOfDay } from './types';
import { CreatureManager } from './creatures';

export interface NPCInfo {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  mesh?: THREE.Group;
}

export class WorldManager {
  public scene: THREE.Scene;
  public walkableMeshes: THREE.Object3D[] = [];
  public npcs: NPCInfo[] = [];
  public wildlife: Array<{ name: string; species: string; position: [number, number, number]; mesh?: THREE.Group }> = [];
  public fragments: WorldFragment[] = [];
  public anchors: MagicalAnchor[] = [];
  public checkpoints: WorldCheckpoint[] = [];
  public creatureManager!: CreatureManager;
  public timeOfDay: TimeOfDay = 'day';

  private skyMesh!: THREE.Mesh;
  private gasGiantMesh!: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public buildWorld() {
    // 1. Sky & Gas Giant Background
    const skyGeo = new THREE.SphereGeometry(800, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x070b14, side: THREE.BackSide });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);

    const giantGeo = new THREE.SphereGeometry(180, 32, 32);
    const giantMat = new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.8, emissive: 0x164e63, emissiveIntensity: 0.2 });
    this.gasGiantMesh = new THREE.Mesh(giantGeo, giantMat);
    this.gasGiantMesh.position.set(0, -120, -450);
    this.scene.add(this.gasGiantMesh);

    // 2. Lighting
    const ambient = new THREE.AmbientLight(0xd9f99d, 0.7);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfef08a, 1.2);
    sun.position.set(100, 200, 100);
    this.scene.add(sun);

    // 3. Floating Platforms & Citadels
    const platformGeo = new THREE.BoxGeometry(60, 3, 60);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });
    const mainPlatform = new THREE.Mesh(platformGeo, platformMat);
    mainPlatform.position.set(0, -1.5, 0);
    this.scene.add(mainPlatform);
    this.walkableMeshes.push(mainPlatform);

    // Secondary platform / outpost
    const outPost = new THREE.Mesh(new THREE.BoxGeometry(35, 3, 35), platformMat);
    outPost.position.set(0, -1.5, -35);
    this.scene.add(outPost);
    this.walkableMeshes.push(outPost);

    // 4. Creatures & Combat
    this.creatureManager = new CreatureManager(this.scene);

    // 5. Initialize Data
    this.anchors = [
      { id: 'anchor-1', name: 'Anchor Alpha (Observation Deck)', description: 'First foundational resonance spire overlooking the turquoise gas giant.', position: [0, 4.2, 0], activated: true },
      { id: 'anchor-2', name: 'Anchor Beta (Sky-Bridge Gantry)', description: 'Suspended celestial spire anchoring the bridge network.', position: [-18, 4.2, -35], activated: false },
      { id: 'anchor-3', name: 'Anchor Gamma (Research Biosphere)', description: 'Deep citadel spire holding ancient quantum codes.', position: [22, 4.2, -42], activated: false },
    ];

    this.checkpoints = [
      { id: 'cp-1', name: 'Aero-Haven Plaza', sectorName: 'Sector 01', position: [0, 4.2, 2], activated: true },
      { id: 'cp-2', name: 'Sky-Bridge Gateway', sectorName: 'Sector 02', position: [0, 4.2, -26], activated: false },
    ];

    this.fragments = [
      { id: 'frag-1', name: 'Telemetry Log #01', lore: 'The Great Drift began when planetary core harmonics shifted in year 402.', position: [4, 3.2, -8], collected: false },
      { id: 'frag-2', name: 'Architectural Blueprint', lore: 'Citadel suspension relies on quantum anchors tuned to 432 Hz resonance.', position: [-12, 3.2, -22], collected: false },
    ];

    this.npcs = [
      { id: 'npc-jorah', name: 'Traveler Jorah', role: 'Archipelago Guide', position: [3, 0, 4] },
      { id: 'npc-vesper', name: 'Archivist Vesper', role: 'Keeper of Relics', position: [-4, 0, -32] },
    ];
  }

  public setQuality(quality: GraphicsQuality) {
    if (this.gasGiantMesh) {
      this.gasGiantMesh.visible = quality !== 'low';
    }
  }

  public update(time: number, delta: number, playerPos: THREE.Vector3) {
    if (this.creatureManager) {
      this.creatureManager.update(time, delta, playerPos);
    }
  }
}
