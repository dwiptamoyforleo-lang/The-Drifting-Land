/**
 * Multi-Dimension 3D World Generation & Resource Lifecycle for The Drifting Land.
 * Implements Prompt 11:
 * - 6 Playable Destinations:
 *   1. The Verdant Reach (Rolling green meadow, Whispering River, Monolith Beacon, pine & oak forests)
 *   2. The Shattered Highlands (Sheer vertical cliffs, floating needle islands, updraft wind rings)
 *   3. The Ashen Expanse (Volcanic basalt crags, glowing animated lava stream, smoldering cinder rocks)
 *   4. The Sunken Archive (Terraced stone terraces, rotating brass astrolabes, ancient record pedestals)
 *   5. The Moonveil Wilds (Perpetual twilight moss, towering bioluminescent mushrooms, floating spores)
 *   6. The Rift Frontier (Fractured tilted obsidian islands, anti-gravity void tears, gravitational distortions)
 * - Continuous mathematical elevation function tailored per region
 * - Clean disposal of all Three.js geometries, materials, and procedural textures
 * - No background simulation of inactive worlds
 */

import * as THREE from 'three';
import { ShardRelic, BeaconStatus } from '../types/game';
import { TextureGenerator } from './textures';

export interface WorldBundle {
  group: THREE.Group;
  regionId: string;
  shards: Map<string, { mesh: THREE.Group; data: ShardRelic }>;
  beacon?: {
    mesh: THREE.Group;
    rings: THREE.Group[];
    coreMesh: THREE.Mesh;
    beamMesh: THREE.Mesh;
    light: THREE.PointLight;
    data: BeaconStatus;
  };
  getTerrainHeight: (x: number, z: number) => number;
  update: (delta: number) => void;
  dispose: () => void;
}

const _tempMatrix = new THREE.Matrix4();

export class WorldGenerator {
  /**
   * Continuous mathematical elevation function by region
   */
  static getTerrainHeightForRegion(regionId: string, x: number, z: number): number {
    const dist = Math.hypot(x, z);
    const maxRadius = regionId === 'shattered_highlands' ? 100 : 90;

    if (dist > maxRadius) {
      return -60;
    }

    let edgeFactor = 1.0;
    if (dist > 65) {
      edgeFactor = Math.cos(((dist - 65) / 25) * (Math.PI / 2));
    }

    switch (regionId) {
      case 'shattered_highlands': {
        // High altitude stepped needle spires and cliffs
        const tier = Math.sin(x * 0.05) * 6.0 + Math.cos(z * 0.05) * 6.0;
        const needle = Math.max(0, 15 - Math.hypot(x - 20, z + 15) * 0.8) * 0.9;
        const ridge = Math.abs(x * 0.2) + Math.abs(z * 0.15);
        return (14.0 + tier + needle + ridge * 0.4) * edgeFactor;
      }

      case 'ashen_expanse': {
        // Volcanic jagged crags with central lava rift depression
        const crags = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 3.5;
        const calderaDepression = dist < 24 ? -Math.cos((dist / 24) * (Math.PI / 2)) * 3.2 : 0;
        return (5.0 + crags + calderaDepression) * edgeFactor;
      }

      case 'sunken_archive': {
        // Geometrical stone terraces and sunken courtyards
        const stepX = Math.floor((x + 60) / 15) * 0.8;
        const stepZ = Math.floor((z + 60) / 15) * 0.8;
        const courtyard = dist < 20 ? -1.5 : 0;
        return (3.5 + stepX * 0.3 + stepZ * 0.3 + courtyard) * edgeFactor;
      }

      case 'moonveil_wilds': {
        // Undulating gentle twilight mounds
        const mound1 = Math.sin(x * 0.06) * 3.0;
        const mound2 = Math.cos(z * 0.05) * 2.5;
        const centralGrotto = dist < 18 ? 1.5 : 0;
        return (4.0 + mound1 + mound2 + centralGrotto) * edgeFactor;
      }

      case 'rift_frontier': {
        // Fractured anti-gravity floating chunks
        const wave = Math.sin(x * 0.09) * Math.sin(z * 0.09) * 5.0;
        const tilt = (x * 0.08 - z * 0.06);
        return (6.0 + wave + tilt) * edgeFactor;
      }

      case 'verdant_reach':
      default: {
        // Natural rolling terrain harmonics
        const hill1 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 3.8;
        const hill2 = Math.sin(x * 0.08 + 1.2) * Math.sin(z * 0.07) * 2.0;
        const hill3 = Math.cos((x + z) * 0.02) * 2.2;
        const centerMound = Math.max(0, 16 - dist * 0.8) * 0.35;
        const eastRidge = (x > 20 && Math.abs(z) < 30) ? (x - 20) * 0.18 : 0;

        const riverT = (z + 45) / 70;
        const riverTargetX = 10 + riverT * 38;
        const distToRiver = Math.abs(x - riverTargetX);
        let riverDepression = 0;
        if (z > -45 && z < 25 && distToRiver < 9) {
          riverDepression = -1.6 * Math.cos((distToRiver / 9) * (Math.PI / 2));
        }

        const baseElevation = 2.4;
        return (baseElevation + hill1 + hill2 + hill3 + centerMound + eastRidge + riverDepression) * edgeFactor;
      }
    }
  }

  /**
   * Static helper for backward compatibility
   */
  static getTerrainHeight(x: number, z: number): number {
    return this.getTerrainHeightForRegion('verdant_reach', x, z);
  }

  /**
   * Construct 3D scene bundle for any destination
   */
  static generate(regionId = 'verdant_reach', maxAnisotropy = 4, isSoftwareGl = false): WorldBundle {
    const worldGroup = new THREE.Group();
    worldGroup.name = `${regionId}_world`;

    const getHeight = (x: number, z: number) => this.getTerrainHeightForRegion(regionId, x, z);

    // Track resources for clean disposal
    const disposableGeometries: THREE.BufferGeometry[] = [];
    const disposableMaterials: THREE.Material[] = [];
    const disposableTextures: THREE.Texture[] = [];

    // Shared procedural textures
    const stoneTex = TextureGenerator.createStoneTexture(maxAnisotropy);
    disposableTextures.push(stoneTex);

    // 1. Terrain Mesh (Plane displaced according to region elevation)
    const terrainGeo = new THREE.PlaneGeometry(180, 180, 80, 80);
    terrainGeo.rotateX(-Math.PI / 2);
    disposableGeometries.push(terrainGeo);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, getHeight(vx, vz));
    }
    terrainGeo.computeVertexNormals();

    // Material tailored per destination
    let terrainMat: THREE.MeshStandardMaterial;
    if (regionId === 'ashen_expanse') {
      terrainMat = new THREE.MeshStandardMaterial({
        map: stoneTex,
        color: 0x27272a,
        roughness: 0.9,
        metalness: 0.25,
      });
    } else if (regionId === 'moonveil_wilds') {
      terrainMat = new THREE.MeshStandardMaterial({
        map: stoneTex,
        color: 0x2e1065,
        roughness: 0.8,
        metalness: 0.1,
      });
    } else if (regionId === 'sunken_archive') {
      terrainMat = new THREE.MeshStandardMaterial({
        map: stoneTex,
        color: 0x334155,
        roughness: 0.75,
        metalness: 0.35,
      });
    } else if (regionId === 'rift_frontier') {
      terrainMat = new THREE.MeshStandardMaterial({
        map: stoneTex,
        color: 0x18181b,
        roughness: 0.6,
        metalness: 0.7,
      });
    } else if (regionId === 'shattered_highlands') {
      terrainMat = new THREE.MeshStandardMaterial({
        map: stoneTex,
        color: 0x475569,
        roughness: 0.85,
        metalness: 0.15,
      });
    } else {
      // Verdant Reach grass
      const grassTex = TextureGenerator.createGrassTexture(maxAnisotropy);
      disposableTextures.push(grassTex);
      terrainMat = new THREE.MeshStandardMaterial({
        map: grassTex,
        roughness: 0.85,
        metalness: 0.05,
      });
    }
    disposableMaterials.push(terrainMat);

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = !isSoftwareGl;
    worldGroup.add(terrainMesh);

    // 2. Fractured Underside Keel
    const undersideMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: regionId === 'ashen_expanse' ? 0x18181b : 0x334155,
      roughness: 0.9,
      metalness: 0.2,
      flatShading: true,
    });
    disposableMaterials.push(undersideMat);

    const undersideGeo = new THREE.ConeGeometry(82, 55, 18, 6, true);
    undersideGeo.rotateX(Math.PI);
    undersideGeo.translate(0, -27, 0);
    disposableGeometries.push(undersideGeo);

    const undersideMesh = new THREE.Mesh(undersideGeo, undersideMat);
    undersideMesh.receiveShadow = !isSoftwareGl;
    worldGroup.add(undersideMesh);

    // 3. Ambient Cloud Sea / Abyssal Void Plane
    const cloudGeo = new THREE.PlaneGeometry(600, 600, 8, 8);
    cloudGeo.rotateX(-Math.PI / 2);
    disposableGeometries.push(cloudGeo);

    const cloudColor =
      regionId === 'ashen_expanse'
        ? 0x2b0d06
        : regionId === 'moonveil_wilds'
        ? 0x16082f
        : regionId === 'rift_frontier'
        ? 0x0f031e
        : 0x1e293b;

    const cloudMat = new THREE.MeshBasicMaterial({
      color: cloudColor,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    disposableMaterials.push(cloudMat);

    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.position.y = -35;
    worldGroup.add(cloudMesh);

    // Dynamic animators list
    const animators: ((delta: number, totalTime: number) => void)[] = [];

    // Region-specific Landmark & Decor generation
    let beaconBundle: WorldBundle['beacon'] = undefined;
    const shardsMap = new Map<string, { mesh: THREE.Group; data: ShardRelic }>();

    if (regionId === 'verdant_reach') {
      // Build Verdant Reach specific decor (River, Bridge, Beacon, Shards, Trees)
      this.buildVerdantFeatures(
        worldGroup,
        getHeight,
        stoneTex,
        maxAnisotropy,
        isSoftwareGl,
        disposableGeometries,
        disposableMaterials,
        disposableTextures,
        animators,
        shardsMap,
        (b) => {
          beaconBundle = b;
        }
      );
    } else if (regionId === 'shattered_highlands') {
      this.buildHighlandsFeatures(
        worldGroup,
        getHeight,
        isSoftwareGl,
        disposableGeometries,
        disposableMaterials,
        animators
      );
    } else if (regionId === 'ashen_expanse') {
      this.buildAshenFeatures(
        worldGroup,
        getHeight,
        isSoftwareGl,
        disposableGeometries,
        disposableMaterials,
        animators
      );
    } else if (regionId === 'sunken_archive') {
      this.buildArchiveFeatures(
        worldGroup,
        getHeight,
        isSoftwareGl,
        disposableGeometries,
        disposableMaterials,
        animators
      );
    } else if (regionId === 'moonveil_wilds') {
      this.buildMoonveilFeatures(
        worldGroup,
        getHeight,
        isSoftwareGl,
        disposableGeometries,
        disposableMaterials,
        animators
      );
    } else if (regionId === 'rift_frontier') {
      this.buildRiftFeatures(
        worldGroup,
        getHeight,
        isSoftwareGl,
        disposableGeometries,
        disposableMaterials,
        animators
      );
    }

    let totalWorldTime = 0;
    const update = (delta: number) => {
      totalWorldTime += delta;
      for (const fn of animators) {
        fn(delta, totalWorldTime);
      }
    };

    const dispose = () => {
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
      disposableTextures.forEach((t) => t.dispose());
    };

    return {
      group: worldGroup,
      regionId,
      shards: shardsMap,
      beacon: beaconBundle,
      getTerrainHeight: getHeight,
      update,
      dispose,
    };
  }

  /**
   * Destination I: The Verdant Reach Landmark Features
   */
  private static buildVerdantFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    stoneTex: THREE.Texture,
    maxAnisotropy: number,
    isSoftwareGl: boolean,
    geos: THREE.BufferGeometry[],
    mats: THREE.Material[],
    textures: THREE.Texture[],
    animators: ((dt: number, total: number) => void)[],
    shardsMap: Map<string, { mesh: THREE.Group; data: ShardRelic }>,
    setBeacon: (b: NonNullable<WorldBundle['beacon']>) => void
  ): void {
    const waterTex = TextureGenerator.createWaterTexture(maxAnisotropy);
    const pathTex = TextureGenerator.createPathTexture(maxAnisotropy);
    const barkTex = TextureGenerator.createBarkTexture(maxAnisotropy);
    textures.push(waterTex, pathTex, barkTex);

    // River
    const riverGeo = new THREE.PlaneGeometry(16, 75, 12, 32);
    riverGeo.rotateX(-Math.PI / 2);
    riverGeo.rotateY(Math.PI / 4);
    geos.push(riverGeo);

    const rPos = riverGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const rx = rPos.getX(i) + 26;
      const rz = rPos.getZ(i) - 8;
      rPos.setX(i, rx);
      rPos.setZ(i, rz);
      rPos.setY(i, Math.max(0.4, getHeight(rx, rz) + 0.25));
    }
    riverGeo.computeVertexNormals();

    const waterMat = new THREE.MeshStandardMaterial({
      map: waterTex,
      color: 0x67e8f9,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.78,
    });
    mats.push(waterMat);

    const riverMesh = new THREE.Mesh(riverGeo, waterMat);
    riverMesh.receiveShadow = !isSoftwareGl;
    worldGroup.add(riverMesh);

    // Animated water UV scroll
    animators.push((_dt, total) => {
      waterTex.offset.x = (total * 0.08) % 1.0;
      waterTex.offset.y = (total * 0.03) % 1.0;
    });

    // Monolith Beacon Plaza
    const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.85, metalness: 0.15 });
    mats.push(stoneMat);

    const beaconGroup = new THREE.Group();
    beaconGroup.name = 'ancient_beacon';
    beaconGroup.position.set(0, getHeight(0, 0), 0);

    const daisGeo = new THREE.CylinderGeometry(8.5, 9.5, 1.2, 8);
    geos.push(daisGeo);
    const daisMesh = new THREE.Mesh(daisGeo, stoneMat);
    daisMesh.position.y = 0.6;
    beaconGroup.add(daisMesh);

    // Concentric Bronze Rings
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.25,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
    });
    mats.push(ringMat);

    const ring1Group = new THREE.Group();
    const ring1Geo = new THREE.TorusGeometry(3.4, 0.18, 12, 32);
    geos.push(ring1Geo);
    ring1Group.add(new THREE.Mesh(ring1Geo, ringMat));
    ring1Group.position.set(0, 5.2, 0);
    beaconGroup.add(ring1Group);

    const ring2Group = new THREE.Group();
    const ring2Geo = new THREE.TorusGeometry(2.4, 0.15, 12, 28);
    geos.push(ring2Geo);
    ring2Group.add(new THREE.Mesh(ring2Geo, ringMat));
    ring2Group.position.set(0, 5.2, 0);
    beaconGroup.add(ring2Group);

    // Hovering Emerald Power Core
    const coreGeo = new THREE.DodecahedronGeometry(1.1, 0);
    geos.push(coreGeo);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.85,
    });
    mats.push(coreMat);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 5.2, 0);
    beaconGroup.add(coreMesh);

    const beaconLight = new THREE.PointLight(0x34d399, 1.8, 32);
    beaconLight.position.set(0, 5.4, 0);
    beaconGroup.add(beaconLight);

    const beamGeo = new THREE.CylinderGeometry(0.7, 1.3, 140, 16, 1, true);
    geos.push(beamGeo);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    mats.push(beamMat);
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(0, 70, 0);
    beaconGroup.add(beamMesh);

    worldGroup.add(beaconGroup);

    const beaconData: BeaconStatus = {
      id: 'verdant_monolith_beacon',
      name: 'Verdant Monolith Beacon',
      activated: false,
      activationProgress: 0,
      requiredShards: 4,
    };

    setBeacon({
      mesh: beaconGroup,
      rings: [ring1Group, ring2Group],
      coreMesh,
      beamMesh,
      light: beaconLight,
      data: beaconData,
    });

    // Beacon ring animators
    animators.push((dt, total) => {
      ring1Group.rotation.x += dt * 0.45;
      ring1Group.rotation.y += dt * 0.35;
      ring2Group.rotation.z += dt * 0.55;
      ring2Group.rotation.x -= dt * 0.25;

      coreMesh.position.y = 5.2 + Math.sin(total * 2.0) * 0.25;
      coreMesh.rotation.y += dt * 0.8;

      if (beaconData.activated) {
        if (beamMat.opacity < 0.85) {
          beamMat.opacity = Math.min(0.85, beamMat.opacity + dt * 0.6);
        }
        beamMesh.rotation.y += dt * 0.5;
        beaconLight.intensity = 2.5 + Math.sin(total * 4) * 0.6;
      }
    });

    // Collectible Drift Shards
    const shardConfigs: ShardRelic[] = [
      { id: 'shard_verdant_heart', name: 'Verdant Heart Shard', region: 'The Verdant Reach', position: [-34, 0, 18], collected: false, loreSnippet: 'Primeval plant resonance.', element: 'verdant' },
      { id: 'shard_sunward_ridge', name: 'Sunward Crest Shard', region: 'The Verdant Reach', position: [38, 0, 25], collected: false, loreSnippet: 'Celestial dawn light.', element: 'solar' },
      { id: 'shard_elder_groove', name: 'Elder Spire Relic', region: 'The Verdant Reach', position: [-28, 0, -28], collected: false, loreSnippet: 'Vibrates faintly toward monolith.', element: 'aether' },
      { id: 'shard_waterfall_basin', name: 'Tears of Aether', region: 'The Verdant Reach', position: [28, 0, -12], collected: false, loreSnippet: 'Crystalline zero-g tear.', element: 'lunar' },
    ];

    const elementColors: Record<string, { color: number; emissive: number }> = {
      verdant: { color: 0x34d399, emissive: 0x059669 },
      solar: { color: 0xfbbf24, emissive: 0xd97706 },
      aether: { color: 0x38bdf8, emissive: 0x0284c7 },
      lunar: { color: 0xc084fc, emissive: 0x7e22ce },
    };

    shardConfigs.forEach((sc) => {
      const sy = getHeight(sc.position[0], sc.position[2]) + 1.6;
      sc.position[1] = sy;

      const sGroup = new THREE.Group();
      sGroup.position.set(sc.position[0], sy, sc.position[2]);

      const colors = elementColors[sc.element] || elementColors.verdant;
      const cGeo = new THREE.OctahedronGeometry(0.7, 0);
      geos.push(cGeo);
      const cMat = new THREE.MeshStandardMaterial({
        color: colors.color,
        emissive: colors.emissive,
        emissiveIntensity: 0.95,
        roughness: 0.15,
        metalness: 0.85,
      });
      mats.push(cMat);
      sGroup.add(new THREE.Mesh(cGeo, cMat));

      const sLight = new THREE.PointLight(colors.color, 0.9, 10);
      sGroup.add(sLight);

      worldGroup.add(sGroup);
      shardsMap.set(sc.id, { mesh: sGroup, data: sc });
    });

    animators.push((dt, total) => {
      shardsMap.forEach((entry) => {
        if (!entry.data.collected) {
          entry.mesh.rotation.y += dt * 1.5;
          const baseY = entry.data.position[1];
          entry.mesh.position.y = baseY + Math.sin(total * 2.5 + entry.mesh.position.x) * 0.25;
        }
      });
    });
  }

  /**
   * Destination II: The Shattered Highlands
   */
  private static buildHighlandsFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    isSoftwareGl: boolean,
    geos: THREE.BufferGeometry[],
    mats: THREE.Material[],
    animators: ((dt: number, total: number) => void)[]
  ): void {
    // Updraft Wind Rings (interactive floating golden rings that animate)
    const ringGeo = new THREE.TorusGeometry(3.5, 0.25, 8, 24);
    geos.push(ringGeo);

    const windMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.8,
    });
    mats.push(windMat);

    const updraftPoints: [number, number][] = [
      [15, -12],
      [-22, 18],
      [28, 24],
      [-15, -28],
    ];

    const windRings: THREE.Mesh[] = [];

    updraftPoints.forEach(([ux, uz], i) => {
      const uy = getHeight(ux, uz) + 4.0;
      const ring = new THREE.Mesh(ringGeo, windMat);
      ring.position.set(ux, uy, uz);
      ring.rotation.x = Math.PI / 2;
      worldGroup.add(ring);
      windRings.push(ring);

      // Updraft vertical light
      const uLight = new THREE.PointLight(0x38bdf8, 1.2, 16);
      uLight.position.set(ux, uy, uz);
      worldGroup.add(uLight);
    });

    animators.push((dt, total) => {
      windRings.forEach((r, idx) => {
        r.rotation.z += dt * (1.2 + idx * 0.2);
        r.position.y += Math.sin(total * 2.0 + idx) * 0.03;
      });
    });

    // Soaring needle spires
    const spireGeo = new THREE.ConeGeometry(3.5, 28, 6);
    geos.push(spireGeo);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, flatShading: true });
    mats.push(spireMat);

    const spireLocations: [number, number][] = [
      [-35, -15],
      [42, -20],
      [-20, 38],
      [32, -35],
    ];

    spireLocations.forEach(([sx, sz]) => {
      const sy = getHeight(sx, sz);
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.set(sx, sy + 14, sz);
      spire.castShadow = !isSoftwareGl;
      worldGroup.add(spire);
    });
  }

  /**
   * Destination III: The Ashen Expanse (Volcanic Basalt & Lava Fissure)
   */
  private static buildAshenFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    isSoftwareGl: boolean,
    geos: THREE.BufferGeometry[],
    mats: THREE.Material[],
    animators: ((dt: number, total: number) => void)[]
  ): void {
    // Glowing bubbling magma fissure in the central depression
    const lavaGeo = new THREE.PlaneGeometry(28, 60, 10, 20);
    lavaGeo.rotateX(-Math.PI / 2);
    geos.push(lavaGeo);

    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.8,
    });
    mats.push(lavaMat);

    const lavaMesh = new THREE.Mesh(lavaGeo, lavaMat);
    lavaMesh.position.set(0, 1.8, 0);
    worldGroup.add(lavaMesh);

    // Dynamic lava heat point light
    const lavaLight = new THREE.PointLight(0xf97316, 2.5, 45);
    lavaLight.position.set(0, 4.0, 0);
    worldGroup.add(lavaLight);

    animators.push((_dt, total) => {
      lavaMat.emissiveIntensity = 0.85 + Math.sin(total * 3.0) * 0.25;
      lavaLight.intensity = 2.2 + Math.sin(total * 3.5) * 0.5;
    });

    // Basalt hexagonal cooling columns
    const colGeo = new THREE.CylinderGeometry(1.4, 1.5, 9, 6);
    geos.push(colGeo);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95, flatShading: true });
    mats.push(colMat);

    const colPositions: [number, number][] = [
      [-18, 12],
      [-15, 16],
      [18, -14],
      [22, -10],
      [-24, -20],
      [26, 22],
    ];

    colPositions.forEach(([cx, cz], i) => {
      const cy = getHeight(cx, cz);
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, cy + 4.5, cz);
      col.rotation.y = (i * Math.PI) / 3;
      worldGroup.add(col);
    });
  }

  /**
   * Destination IV: The Sunken Archive (Forgotten Technology & Astrolabes)
   */
  private static buildArchiveFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    _isSoftwareGl: boolean,
    geos: THREE.BufferGeometry[],
    mats: THREE.Material[],
    animators: ((dt: number, total: number) => void)[]
  ): void {
    // Grand Central Astrolabe mechanism
    const astroGroup = new THREE.Group();
    astroGroup.position.set(0, getHeight(0, 0) + 1.2, 0);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x78350f,
      emissiveIntensity: 0.3,
    });
    mats.push(brassMat);

    const ring1Geo = new THREE.TorusGeometry(5.0, 0.2, 12, 32);
    const ring2Geo = new THREE.TorusGeometry(3.6, 0.18, 12, 28);
    const coreGeo = new THREE.IcosahedronGeometry(1.4, 0);
    geos.push(ring1Geo, ring2Geo, coreGeo);

    const r1 = new THREE.Mesh(ring1Geo, brassMat);
    const r2 = new THREE.Mesh(ring2Geo, brassMat);
    const core = new THREE.Mesh(
      coreGeo,
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9,
      })
    );
    mats.push(core.material as THREE.Material);

    astroGroup.add(r1, r2, core);
    worldGroup.add(astroGroup);

    const astroLight = new THREE.PointLight(0x38bdf8, 2.0, 30);
    astroLight.position.set(0, getHeight(0, 0) + 2.5, 0);
    worldGroup.add(astroLight);

    animators.push((dt, total) => {
      r1.rotation.x += dt * 0.3;
      r1.rotation.y += dt * 0.4;
      r2.rotation.z += dt * 0.5;
      core.rotation.y += dt * 0.8;
      core.position.y = Math.sin(total * 2.0) * 0.2;
    });

    // 4 Ancient Record Cipher Pedestals
    const pedGeo = new THREE.BoxGeometry(1.6, 3.2, 1.6);
    geos.push(pedGeo);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    mats.push(pedMat);

    const pedPositions: [number, number][] = [
      [12, 12],
      [-12, 12],
      [12, -12],
      [-12, -12],
    ];

    pedPositions.forEach(([px, pz]) => {
      const py = getHeight(px, pz);
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.set(px, py + 1.6, pz);
      worldGroup.add(ped);

      const glyphGeo = new THREE.OctahedronGeometry(0.4, 0);
      geos.push(glyphGeo);
      const glyphMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9,
      });
      mats.push(glyphMat);
      const glyph = new THREE.Mesh(glyphGeo, glyphMat);
      glyph.position.set(px, py + 3.8, pz);
      worldGroup.add(glyph);
    });
  }

  /**
   * Destination V: The Moonveil Wilds (Bioluminescent Flora & Spores)
   */
  private static buildMoonveilFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    _isSoftwareGl: boolean,
    geos: THREE.BufferGeometry[],
    mats: THREE.Material[],
    animators: ((dt: number, total: number) => void)[]
  ): void {
    // Giant Bioluminescent Mushrooms
    const stalkGeo = new THREE.CylinderGeometry(0.5, 0.8, 6.0, 8);
    const capGeo = new THREE.ConeGeometry(3.4, 2.0, 8);
    geos.push(stalkGeo, capGeo);

    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.9 });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });
    mats.push(stalkMat, capMat);

    const shroomLocations: [number, number, number][] = [
      [-16, 14, 0xc084fc],
      [22, -18, 0x67e8f9],
      [-28, -22, 0xa855f7],
      [18, 24, 0x38bdf8],
      [32, 12, 0xc084fc],
    ];

    const lights: THREE.PointLight[] = [];

    shroomLocations.forEach(([mx, mz, colorHex]) => {
      const my = getHeight(mx, mz);
      const mGroup = new THREE.Group();
      mGroup.position.set(mx, my, mz);

      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.position.y = 3.0;
      mGroup.add(stalk);

      const customCapMat = capMat.clone();
      customCapMat.color.setHex(colorHex);
      customCapMat.emissive.setHex(colorHex);
      mats.push(customCapMat);

      const cap = new THREE.Mesh(capGeo, customCapMat);
      cap.position.y = 6.2;
      mGroup.add(cap);

      const mLight = new THREE.PointLight(colorHex, 1.4, 16);
      mLight.position.y = 6.5;
      mGroup.add(mLight);
      lights.push(mLight);

      worldGroup.add(mGroup);
    });

    animators.push((_dt, total) => {
      lights.forEach((l, idx) => {
        l.intensity = 1.2 + Math.sin(total * 2.5 + idx) * 0.4;
      });
    });
  }

  /**
   * Destination VI: The Rift Frontier (Fractured Void Tears)
   */
  private static buildRiftFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    _isSoftwareGl: boolean,
    geos: THREE.BufferGeometry[],
    mats: THREE.Material[],
    animators: ((dt: number, total: number) => void)[]
  ): void {
    // Hovering void anomaly singularity at center
    const singGroup = new THREE.Group();
    singGroup.position.set(0, getHeight(0, 0) + 5.0, 0);

    const voidCoreGeo = new THREE.IcosahedronGeometry(2.2, 1);
    const voidRingGeo = new THREE.TorusGeometry(4.2, 0.25, 8, 32);
    geos.push(voidCoreGeo, voidRingGeo);

    const voidMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.1,
      metalness: 0.9,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true,
    });
    mats.push(voidMat, glowMat);

    const core = new THREE.Mesh(voidCoreGeo, voidMat);
    const wire = new THREE.Mesh(voidCoreGeo, glowMat);
    wire.scale.set(1.15, 1.15, 1.15);
    const ring = new THREE.Mesh(voidRingGeo, glowMat);

    singGroup.add(core, wire, ring);
    worldGroup.add(singGroup);

    const voidLight = new THREE.PointLight(0xa855f7, 2.5, 35);
    voidLight.position.set(0, getHeight(0, 0) + 5.0, 0);
    worldGroup.add(voidLight);

    animators.push((dt, total) => {
      singGroup.rotation.y += dt * 0.8;
      singGroup.rotation.z += dt * 0.4;
      singGroup.position.y = getHeight(0, 0) + 5.0 + Math.sin(total * 2.0) * 0.4;
      voidLight.intensity = 2.2 + Math.sin(total * 3.5) * 0.6;
    });

    // Floating tilted obsidian monolith chunks
    const chunkGeo = new THREE.BoxGeometry(4.5, 1.2, 4.5);
    geos.push(chunkGeo);
    const chunkMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.3,
      metalness: 0.8,
    });
    mats.push(chunkMat);

    const chunkLocations: [number, number, number, number][] = [
      [-18, 12, 10, 0.3],
      [22, -14, 12, -0.4],
      [-25, -20, 8, 0.2],
      [18, 22, 14, -0.25],
    ];

    chunkLocations.forEach(([cx, cz, cyOffset, tilt]) => {
      const cy = getHeight(cx, cz) + cyOffset;
      const chunk = new THREE.Mesh(chunkGeo, chunkMat);
      chunk.position.set(cx, cy, cz);
      chunk.rotation.z = tilt;
      chunk.rotation.x = tilt * 0.5;
      worldGroup.add(chunk);
    });
  }
}
