/**
 * Custom Original Plants & Vegetation System for THE DRIFTING LAND
 * Manages unique flora species, ecological habitats, day/night bloom reactions,
 * harvesting mechanics, yields, and regrowth cycles.
 */
import * as THREE from 'three';
import { CustomPlant, TimeOfDay } from './types';
import { ITEM_DATABASE } from './itemDatabase';

export class PlantManager {
  private scene: THREE.Scene;
  public plants: CustomPlant[] = [];
  private plantMeshes: Map<string, THREE.Group> = new Map();

  // Shared reusable materials to minimize draw calls and WebGL state switches
  private matVineStem!: THREE.MeshStandardMaterial;
  private matCyanBulb!: THREE.MeshBasicMaterial;
  private matMoonbloomPetals!: THREE.MeshStandardMaterial;
  private matMoonbloomCore!: THREE.MeshBasicMaterial;
  private matEmberFrond!: THREE.MeshStandardMaterial;
  private matDriftwoodRoot!: THREE.MeshStandardMaterial;
  private matDriftFloatNode!: THREE.MeshBasicMaterial;
  private matGlassleafSilicate!: THREE.MeshPhysicalMaterial;
  private matWhisperMoss!: THREE.MeshStandardMaterial;
  private matRiftOrchidPetals!: THREE.MeshStandardMaterial;
  private matRiftOrchidCore!: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initMaterials();
    this.buildPlants();
  }

  private initMaterials() {
    this.matVineStem = new THREE.MeshStandardMaterial({
      color: 0x0f2b38,
      roughness: 0.7,
      metalness: 0.1,
    });

    this.matCyanBulb = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });

    this.matMoonbloomPetals = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x0369a1,
      emissiveIntensity: 0.2,
    });

    this.matMoonbloomCore = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
    });

    this.matEmberFrond = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0xb45309,
      emissiveIntensity: 0.4,
      roughness: 0.5,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    this.matDriftwoodRoot = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.8,
      metalness: 0.05,
    });

    this.matDriftFloatNode = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });

    this.matGlassleafSilicate = new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      emissive: 0x0891b2,
      emissiveIntensity: 0.3,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    this.matWhisperMoss = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      emissive: 0x166534,
      emissiveIntensity: 0.35,
      roughness: 0.9,
    });

    this.matRiftOrchidPetals = new THREE.MeshStandardMaterial({
      color: 0x7e22ce,
      emissive: 0x581c87,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });

    this.matRiftOrchidCore = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
    });
  }

  private buildPlants() {
    const plantDefs: Array<{
      id: string;
      name: string;
      species: CustomPlant['species'];
      habitat: string;
      description: string;
      pos: [number, number, number];
      yieldItemId: string;
      yieldCount: number;
      rarity: CustomPlant['harvestRarity'];
      requiresNight?: boolean;
    }> = [
      // 1. Lumenvine (Climbing tendrils with luminous pods)
      {
        id: 'plant-lumenvine-1',
        name: 'Observation Lumenvine',
        species: 'lumenvine',
        habitat: 'Observation Deck Trusses',
        description: 'Bioluminescent climbing tendrils harvested for lanterns and light equipment.',
        pos: [-14.5, 4.3, 2.5],
        yieldItemId: 'mat-lumenvine',
        yieldCount: 3,
        rarity: 'uncommon',
      },
      {
        id: 'plant-lumenvine-2',
        name: 'Sky-Bridge Lumenvine',
        species: 'lumenvine',
        habitat: 'Sector 02 Sky-Bridge Arch',
        description: 'Vibrant azure vines clinging to the structural steel cables.',
        pos: [22.0, 7.8, -24.0],
        yieldItemId: 'mat-lumenvine',
        yieldCount: 2,
        rarity: 'uncommon',
      },
      // 2. Moonbloom (Nocturnal glowing flower)
      {
        id: 'plant-moonbloom-1',
        name: 'Celestial Moonbloom',
        species: 'moonbloom',
        habitat: 'Observation Garden Promontory',
        description: 'Unfolds luminous radiant cyan petals only under moonlight and dusk.',
        pos: [-8.0, 4.3, -22.0],
        yieldItemId: 'mat-moonbloom',
        yieldCount: 2,
        rarity: 'uncommon',
        requiresNight: true,
      },
      {
        id: 'plant-moonbloom-2',
        name: 'Twilight Moonbloom',
        species: 'moonbloom',
        habitat: 'Citadel Overlook Ledge',
        description: 'Rare lunar flower oscillating with celestial tidal energy.',
        pos: [-18.0, 4.5, -42.0],
        yieldItemId: 'mat-moonbloom',
        yieldCount: 2,
        rarity: 'uncommon',
        requiresNight: true,
      },
      // 3. Emberfern (Warm volcanic flora)
      {
        id: 'plant-emberfern-1',
        name: 'Basalt Emberfern',
        species: 'emberfern',
        habitat: 'Campfire Geothermal Vent',
        description: 'Hardy plant growing near volcanic vents; yields heat-resistant fibers.',
        pos: [11.5, 4.5, -17.0],
        yieldItemId: 'mat-emberfern',
        yieldCount: 3,
        rarity: 'uncommon',
      },
      {
        id: 'plant-emberfern-2',
        name: 'Thermal Fissure Emberfern',
        species: 'emberfern',
        habitat: 'Citadel Foundry Fissure',
        description: 'Deep crimson fronds radiating continuous soothing warmth.',
        pos: [28.0, 7.5, -38.0],
        yieldItemId: 'mat-emberfern',
        yieldCount: 2,
        rarity: 'uncommon',
      },
      // 4. Driftroot (Floating land fragment root)
      {
        id: 'plant-driftroot-1',
        name: 'High-Altitude Driftroot',
        species: 'driftroot',
        habitat: 'Outer Cloud Archipelago Crag',
        description: 'Buoyant underground roots used to craft aerial gliding equipment.',
        pos: [6.0, 4.4, 18.0],
        yieldItemId: 'mat-driftroot',
        yieldCount: 2,
        rarity: 'uncommon',
      },
      {
        id: 'plant-driftroot-2',
        name: 'Kepler Driftroot Cluster',
        species: 'driftroot',
        habitat: 'Suspended Sky-Bridge Underbelly',
        description: 'Tangled anti-gravitational roots suspending small floating fragments.',
        pos: [-30.0, 8.2, -18.0],
        yieldItemId: 'mat-driftroot',
        yieldCount: 3,
        rarity: 'uncommon',
      },
      // 5. Glassleaf (Transparent mineral vegetation)
      {
        id: 'plant-glassleaf-1',
        name: 'Prismatic Glassleaf',
        species: 'glassleaf',
        habitat: 'Celestine Crystal Outcrop',
        description: 'Faceted translucent leaves reflecting cloud sea sunlight into rainbow prisms.',
        pos: [18.5, 4.8, -8.0],
        yieldItemId: 'mat-glassleaf',
        yieldCount: 2,
        rarity: 'rare',
      },
      {
        id: 'plant-glassleaf-2',
        name: 'Deep Strata Glassleaf',
        species: 'glassleaf',
        habitat: 'Citadel Ancient Archive Alcove',
        description: 'Crystalline leaves harvested to construct optical sensors and laser cutters.',
        pos: [5.0, 5.0, -52.0],
        yieldItemId: 'mat-glassleaf',
        yieldCount: 2,
        rarity: 'rare',
      },
      // 6. Whisper Moss (Subtle glowing moss near ruins)
      {
        id: 'plant-whispermoss-1',
        name: 'Ancient Temple Whisper Moss',
        species: 'whispermoss',
        habitat: 'Ruin Guardian Watchtower Base',
        description: 'Bioluminescent emerald moss that hums softly in the presence of ancient builders.',
        pos: [-12.0, 4.5, -34.0],
        yieldItemId: 'mat-whispermoss',
        yieldCount: 4,
        rarity: 'common',
      },
      {
        id: 'plant-whispermoss-2',
        name: 'Vault Portal Whisper Moss',
        species: 'whispermoss',
        habitat: 'Ancient Citadel Vault Entrance',
        description: 'Coats ancient stone seals with radiant green harmonic spores.',
        pos: [-2.0, 4.8, -48.0],
        yieldItemId: 'mat-whispermoss',
        yieldCount: 3,
        rarity: 'common',
      },
      // 7. Rift Orchid (Dimensional anomaly flower)
      {
        id: 'plant-rift-orchid-1',
        name: 'Singularity Rift Orchid',
        species: 'rift_orchid',
        habitat: 'Dimensional Gateway Perimeter',
        description: 'Exotic dimensional blossom vibrating with spatial displacement energy.',
        pos: [32.0, 8.0, -44.0],
        yieldItemId: 'mat-rift-orchid',
        yieldCount: 1,
        rarity: 'epic',
      },
    ];

    plantDefs.forEach((def) => {
      const meshGroup = this.createPlantMesh(def.species, def.pos);
      this.scene.add(meshGroup);
      this.plantMeshes.set(def.id, meshGroup);

      this.plants.push({
        id: def.id,
        name: def.name,
        species: def.species,
        habitat: def.habitat,
        description: def.description,
        position: def.pos,
        harvestYieldItemId: def.yieldItemId,
        harvestYieldCount: def.yieldCount,
        harvestRarity: def.rarity,
        harvestCooldown: 45.0, // Regrows after 45s
        harvestTimer: 0,
        isHarvested: false,
        requiresNight: def.requiresNight,
        mesh: meshGroup,
      });
    });
  }

  private createPlantMesh(species: CustomPlant['species'], pos: [number, number, number]): THREE.Group {
    const group = new THREE.Group();
    group.position.set(...pos);

    switch (species) {
      case 'lumenvine': {
        // Spiraling vine column
        const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.6, 6);
        const stem = new THREE.Mesh(stemGeo, this.matVineStem);
        stem.position.y = 0.8;
        group.add(stem);

        // Hanging glowing cyan bulbs
        const bulbGeo = new THREE.SphereGeometry(0.18, 8, 8);
        for (let b = 0; b < 3; b++) {
          const bulb = new THREE.Mesh(bulbGeo, this.matCyanBulb);
          const angle = (b * Math.PI * 2) / 3;
          bulb.position.set(Math.cos(angle) * 0.35, 0.4 + b * 0.4, Math.sin(angle) * 0.35);
          group.add(bulb);
        }
        break;
      }

      case 'moonbloom': {
        // Sturdy stem
        const stemGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.9, 6);
        const stem = new THREE.Mesh(stemGeo, this.matVineStem);
        stem.position.y = 0.45;
        group.add(stem);

        // Petal cup (flower head)
        const petalGroup = new THREE.Group();
        petalGroup.name = 'petalGroup';
        petalGroup.position.y = 0.9;

        const petalGeo = new THREE.ConeGeometry(0.28, 0.55, 6);
        petalGeo.rotateX(Math.PI);
        for (let p = 0; p < 5; p++) {
          const petal = new THREE.Mesh(petalGeo, this.matMoonbloomPetals);
          const angle = (p * Math.PI * 2) / 5;
          petal.position.set(Math.cos(angle) * 0.18, 0.1, Math.sin(angle) * 0.18);
          petal.rotation.z = Math.cos(angle) * 0.35;
          petal.rotation.x = Math.sin(angle) * 0.35;
          petalGroup.add(petal);
        }

        // Luminous glowing heart
        const coreGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const core = new THREE.Mesh(coreGeo, this.matMoonbloomCore);
        core.position.y = 0.05;
        petalGroup.add(core);

        group.add(petalGroup);
        break;
      }

      case 'emberfern': {
        // Red-orange arched fronds
        for (let f = 0; f < 6; f++) {
          const frondGeo = new THREE.ConeGeometry(0.18, 1.2, 5);
          const frond = new THREE.Mesh(frondGeo, this.matEmberFrond);
          const angle = (f * Math.PI * 2) / 6;
          frond.position.set(Math.cos(angle) * 0.25, 0.55, Math.sin(angle) * 0.25);
          frond.rotation.z = Math.cos(angle) * 0.5;
          frond.rotation.x = -Math.sin(angle) * 0.5;
          group.add(frond);
        }
        break;
      }

      case 'driftroot': {
        // Gnarled roots
        for (let r = 0; r < 4; r++) {
          const rootGeo = new THREE.CylinderGeometry(0.06, 0.15, 1.1, 5);
          const root = new THREE.Mesh(rootGeo, this.matDriftwoodRoot);
          const angle = (r * Math.PI * 2) / 4;
          root.position.set(Math.cos(angle) * 0.2, 0.5, Math.sin(angle) * 0.2);
          root.rotation.z = Math.cos(angle) * 0.35;
          group.add(root);
        }

        // Floating yellow anti-gravity core
        const nodeGeo = new THREE.OctahedronGeometry(0.22, 0);
        const node = new THREE.Mesh(nodeGeo, this.matDriftFloatNode);
        node.name = 'floatNode';
        node.position.y = 1.15;
        group.add(node);
        break;
      }

      case 'glassleaf': {
        // Crystalline translucent prism clusters
        for (let c = 0; c < 5; c++) {
          const crystalGeo = new THREE.ConeGeometry(0.14, 0.8 + (c % 3) * 0.25, 5);
          const crystal = new THREE.Mesh(crystalGeo, this.matGlassleafSilicate);
          const angle = (c * Math.PI * 2) / 5;
          crystal.position.set(Math.cos(angle) * 0.22, 0.45, Math.sin(angle) * 0.22);
          crystal.rotation.z = Math.cos(angle) * 0.25;
          group.add(crystal);
        }
        break;
      }

      case 'whispermoss': {
        // Emerald layered mound on stone
        const baseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.2, 8);
        const base = new THREE.Mesh(baseGeo, this.matVineStem);
        base.position.y = 0.1;
        group.add(base);

        const mossGeo = new THREE.SphereGeometry(0.5, 8, 6);
        mossGeo.scale(1, 0.5, 1);
        const moss = new THREE.Mesh(mossGeo, this.matWhisperMoss);
        moss.position.y = 0.25;
        group.add(moss);
        break;
      }

      case 'rift_orchid': {
        // Exotic dark purple petals radiating outward
        for (let o = 0; o < 6; o++) {
          const petalGeo = new THREE.ConeGeometry(0.18, 0.9, 4);
          const petal = new THREE.Mesh(petalGeo, this.matRiftOrchidPetals);
          const angle = (o * Math.PI * 2) / 6;
          petal.position.set(Math.cos(angle) * 0.28, 0.6, Math.sin(angle) * 0.28);
          petal.rotation.z = Math.cos(angle) * 0.6;
          petal.rotation.x = Math.sin(angle) * 0.6;
          group.add(petal);
        }

        // Levitating lavender energy singularity
        const coreGeo = new THREE.DodecahedronGeometry(0.2, 0);
        const core = new THREE.Mesh(coreGeo, this.matRiftOrchidCore);
        core.name = 'riftCore';
        core.position.y = 0.9;
        group.add(core);
        break;
      }
    }

    return group;
  }

  public update(time: number, delta: number, timeOfDay: TimeOfDay) {
    const isNight = timeOfDay === 'night' || timeOfDay === 'sunset' || timeOfDay === 'red_moon';

    const numPlants = this.plants.length;
    for (let i = 0; i < numPlants; i++) {
      const plant = this.plants[i];
      const mesh = this.plantMeshes.get(plant.id);
      if (!mesh) continue;

      // Regrowth timer logic
      if (plant.isHarvested) {
        plant.harvestTimer += delta;
        if (plant.harvestTimer >= plant.harvestCooldown) {
          plant.isHarvested = false;
          plant.harvestTimer = 0;
          mesh.scale.set(1, 1, 1);
          mesh.visible = true;
        } else {
          // Slowly regrow scale
          const progress = plant.harvestTimer / plant.harvestCooldown;
          const scale = 0.2 + progress * 0.8;
          mesh.scale.set(scale, scale, scale);
        }
      }

      // Moonbloom night reaction (opens and glows under moonlight)
      if (plant.species === 'moonbloom') {
        const petalGroup = mesh.getObjectByName('petalGroup');
        if (petalGroup) {
          const targetScale = isNight ? 1.25 : 0.65;
          petalGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1.0, 3.0 * delta));
        }
      }

      // Driftroot levitating core oscillation
      if (plant.species === 'driftroot') {
        const floatNode = mesh.getObjectByName('floatNode');
        if (floatNode) {
          floatNode.position.y = 1.15 + Math.sin(time * 2.5 + i) * 0.08;
          floatNode.rotation.y = time * 1.2;
        }
      }

      // Rift orchid spatial rotation
      if (plant.species === 'rift_orchid') {
        const riftCore = mesh.getObjectByName('riftCore');
        if (riftCore) {
          riftCore.rotation.x = time * 2.0;
          riftCore.rotation.y = time * 2.4;
          riftCore.position.y = 0.9 + Math.sin(time * 3.0) * 0.06;
        }
      }
    }
  }

  public harvestPlant(plantId: string): { success: boolean; itemId: string; count: number; name: string; rarity: string; message: string } {
    const plant = this.plants.find((p) => p.id === plantId);
    if (!plant) {
      return { success: false, itemId: '', count: 0, name: '', rarity: 'common', message: 'Plant not found.' };
    }

    if (plant.isHarvested) {
      const remainingSec = Math.ceil(plant.harvestCooldown - plant.harvestTimer);
      return {
        success: false,
        itemId: '',
        count: 0,
        name: plant.name,
        rarity: plant.harvestRarity,
        message: `${plant.name} is recovering. Regrows in ${remainingSec}s.`,
      };
    }

    // Set harvested state
    plant.isHarvested = true;
    plant.harvestTimer = 0;
    const mesh = this.plantMeshes.get(plant.id);
    if (mesh) {
      mesh.scale.set(0.25, 0.25, 0.25);
    }

    const item = ITEM_DATABASE[plant.harvestYieldItemId];
    const itemName = item ? item.name : plant.name;

    return {
      success: true,
      itemId: plant.harvestYieldItemId,
      count: plant.harvestYieldCount,
      name: itemName,
      rarity: plant.harvestRarity,
      message: `Harvested ${plant.harvestYieldCount}x ${itemName} from ${plant.name}!`,
    };
  }
}
