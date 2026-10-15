import * as THREE from 'three';
import {
  WorldFragment,
  MagicalAnchor,
  WorldCheckpoint,
  GraphicsQuality,
  TimeOfDay,
  HarvestableResource,
  InscriptionLore,
  DialogueNode,
  WorldClockData,
} from './types';
import { CreatureManager } from './creatures';
import { PlantManager } from './plants';

export interface NPCInfo {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  mesh?: THREE.Group;
  dialogue?: DialogueNode;
}

export class WorldManager {
  public scene: THREE.Scene;
  public walkableMeshes: THREE.Object3D[] = [];
  public npcs: NPCInfo[] = [];
  public wildlife: Array<{ name: string; species: string; position: [number, number, number]; mesh?: THREE.Group }> = [];
  public fragments: WorldFragment[] = [];
  public anchors: MagicalAnchor[] = [];
  public checkpoints: WorldCheckpoint[] = [];
  public resources: HarvestableResource[] = [];
  public inscriptions: InscriptionLore[] = [];
  public creatureManager!: CreatureManager;
  public plantsManager!: PlantManager;
  public timeOfDay: TimeOfDay = 'day';

  public get creaturesManager(): CreatureManager {
    return this.creatureManager;
  }
  public set creaturesManager(val: CreatureManager) {
    this.creatureManager = val;
  }

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
    const giantMat = new THREE.MeshStandardMaterial({
      color: 0x0e7490,
      roughness: 0.8,
      emissive: 0x164e63,
      emissiveIntensity: 0.2,
    });
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

    // Connecting bridge
    const bridgeGeo = new THREE.BoxGeometry(8, 1, 20);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.5 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(0, -1.5, -17.5);
    this.scene.add(bridge);
    this.walkableMeshes.push(bridge);

    // 4. Creatures & Combat
    this.creatureManager = new CreatureManager(this.scene);

    // 5. Plants & Vegetation Ecosystem
    this.plantsManager = new PlantManager(this.scene);

    // 6. Anchors
    this.anchors = [
      {
        id: 'anchor-1',
        name: 'Anchor Alpha (Observation Deck)',
        subtitle: 'Primary Celestial Spire',
        description: 'First foundational resonance spire overlooking the turquoise gas giant.',
        position: [0, 4.2, 0],
        beamColor: 0x38bdf8,
        activated: true,
        connectsTo: 'anchor-2',
      },
      {
        id: 'anchor-2',
        name: 'Anchor Beta (Sky-Bridge Gantry)',
        subtitle: 'Sector 02 Pylon',
        description: 'Suspended celestial spire anchoring the bridge network.',
        position: [-18, 4.2, -35],
        beamColor: 0x818cf8,
        activated: false,
        connectsTo: 'anchor-3',
      },
      {
        id: 'anchor-3',
        name: 'Anchor Gamma (Research Biosphere)',
        subtitle: 'Deep Citadel Spire',
        description: 'Deep citadel spire holding ancient quantum codes.',
        position: [22, 4.2, -42],
        beamColor: 0xa855f7,
        activated: false,
        connectsTo: null,
      },
    ];

    // 7. Checkpoints
    this.checkpoints = [
      { id: 'cp-1', name: 'Aero-Haven Plaza', sectorName: 'Sector 01', position: [0, 4.2, 2], activated: true },
      { id: 'cp-2', name: 'Sky-Bridge Gateway', sectorName: 'Sector 02', position: [0, 4.2, -26], activated: false },
    ];

    // 8. World Fragments
    this.fragments = [
      { id: 'frag-1', name: 'Telemetry Log #01', lore: 'The Great Drift began when planetary core harmonics shifted in year 402.', position: [4, 3.2, -8], collected: false },
      { id: 'frag-2', name: 'Architectural Blueprint', lore: 'Citadel suspension relies on quantum anchors tuned to 432 Hz resonance.', position: [-12, 3.2, -22], collected: false },
      { id: 'frag-3', name: 'Planar Almanac #03', lore: 'During the Red Moon, the drifting platforms oscillate between alternate dimensional echoes.', position: [16, 3.2, -38], collected: false },
    ];

    // 9. Harvestable Resources
    this.resources = [
      { id: 'res-basalt-1', name: 'Basalt Strata Deposit', itemType: 'mat-stone', coinValue: 12, xpValue: 15, position: [8, 0.5, 6], collected: false },
      { id: 'res-driftwood-1', name: 'Petrified Canopy Driftwood', itemType: 'mat-wood', coinValue: 15, xpValue: 18, position: [-10, 0.5, 12], collected: false },
      { id: 'res-celestine-1', name: 'Celestine Crystal Cluster', itemType: 'mat-celestine', coinValue: 45, xpValue: 50, position: [14, 0.5, -20], collected: false },
    ];

    // 10. Inscription Steles
    this.inscriptions = [
      {
        id: 'insc-origin',
        title: 'Chronicles of the Suspension Era',
        text: 'When the tectonic mantle dissolved into atmospheric tides, the architects aligned the harmonic anchors to keep our world from descending into the abyss.',
        position: [2, 1.2, -15],
      },
      {
        id: 'insc-moon',
        title: 'Prophecy of the Red Moon',
        text: 'During the scarlet alignment, the planar barrier weakens. Ancient sentinels awaken from torpor, testing the courage of those who walk the sky.',
        position: [-6, 1.2, -40],
      },
    ];

    // 11. NPCs with full dialogue trees
    this.npcs = [
      {
        id: 'npc-jorah',
        name: 'Traveler Jorah',
        role: 'Archipelago Guide',
        position: [3, 0, 4],
        dialogue: {
          id: 'dialogue-jorah',
          speaker: 'Traveler Jorah',
          title: 'Archipelago Guide',
          greeting: 'Greetings, skyfarer! The winds are calm today. Check your compass, gather materials, and attune the three harmonic anchors.',
          options: [
            {
              label: 'Where am I?',
              response: 'You stand upon Aero-Haven, one of the enduring platforms of The Drifting Land. Below lies the turquoise gas giant; above, the endless cosmos.',
            },
            {
              label: 'How do I survive and explore?',
              response: 'Gather lumenvine and driftwood, craft tools and medkits in your Crafting panel, and attune the celestial anchors to unlock sector portals.',
            },
            {
              label: 'Open Trade Market',
              response: 'Let me show you our expedition supplies.',
              openShop: true,
              openTradeTraderId: 'trader-haven',
            },
          ],
        },
      },
      {
        id: 'npc-vesper',
        name: 'Archivist Vesper',
        role: 'Keeper of Relics',
        position: [-4, 0, -32],
        dialogue: {
          id: 'dialogue-vesper',
          speaker: 'Archivist Vesper',
          title: 'Keeper of Relics',
          greeting: 'Ah, a researcher of the ancient strata! I catalog the world fragments left by the old citadel builders.',
          options: [
            {
              label: 'What are the World Fragments?',
              response: 'Crystalline data logs left behind when the world fractured. Recovering them restores ancient telemetry and grants profound XP.',
            },
            {
              label: 'Tell me about the Red Moon.',
              response: 'When the scarlet eclipse falls, hostile sentinels emerge. Be armed and alert, or seek sanctuary near attuned anchors!',
            },
            {
              label: 'Browse Relic Exchange',
              response: 'Peruse the curiosities collected from the deep sky-bridges.',
              openShop: true,
              openTradeTraderId: 'trader-collector',
            },
          ],
        },
      },
    ];
  }

  public initPerformanceOptimizations(): void {
    this.walkableMeshes.forEach(mesh => {
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
    });
  }

  public revealResonanceCitadel(): void {
    this.anchors.forEach(a => {
      a.activated = true;
    });
  }

  public setQuality(quality: GraphicsQuality) {
    if (this.gasGiantMesh) {
      this.gasGiantMesh.visible = quality !== 'low';
    }
  }

  public get clockData(): WorldClockData {
    return {
      dayNumber: 1,
      inGameTime: '12:00',
      period: 'Day',
      nextTransitionLabel: 'Sunset in 04:30',
      weatherCondition: 'Solar Calm',
      dayProgress: 0.5,
    };
  }

  public update(time: number, delta: number, playerPos: THREE.Vector3, onDamage?: (dmg: number, reason: string) => void) {
    if (this.creatureManager) {
      this.creatureManager.update(time, delta, playerPos, onDamage);
    }
    if (this.plantsManager) {
      this.plantsManager.update(time, delta, this.timeOfDay);
    }
  }
}
