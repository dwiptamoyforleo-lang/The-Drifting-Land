/**
 * Multi-Dimension 3D World Generation & Resource Lifecycle for The Drifting Land.
 * - 6 Playable Destinations with continuous mathematical elevation
 * - Chunk terrain & instanced foliage/rocks handled by ChunkManager (this module builds
 *   lightweight base underside keel, cloud sea, river, Monolith Beacon, shards, and region landmarks)
 * - Uses SharedAssets & glow sprites instead of excessive PointLights
 * - Preserves cached procedural textures across region switches
 */

import * as THREE from 'three';
import { ShardRelic, BeaconStatus } from '../types/game';
import { TextureGenerator } from './textures';
import { SharedAssets } from './sharedAssets';
import { QualityTier } from './performanceGovernor';

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
  syncChunkVisibility: (isVisible: (x: number, z: number) => boolean) => void;
  setPointLightBudget: (tier: QualityTier) => void;
  dispose: () => void;
}

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
        const tier = Math.sin(x * 0.05) * 6.0 + Math.cos(z * 0.05) * 6.0;
        const needle = Math.max(0, 15 - Math.hypot(x - 20, z + 15) * 0.8) * 0.9;
        const ridge = Math.abs(x * 0.2) + Math.abs(z * 0.15);
        return (14.0 + tier + needle + ridge * 0.4) * edgeFactor;
      }

      case 'ashen_expanse': {
        const crags = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 3.5;
        const calderaDepression = dist < 24 ? -Math.cos((dist / 24) * (Math.PI / 2)) * 3.2 : 0;
        return (5.0 + crags + calderaDepression) * edgeFactor;
      }

      case 'sunken_archive': {
        const stepX = Math.floor((x + 60) / 15) * 0.8;
        const stepZ = Math.floor((z + 60) / 15) * 0.8;
        const courtyard = dist < 20 ? -1.5 : 0;
        return (3.5 + stepX * 0.3 + stepZ * 0.3 + courtyard) * edgeFactor;
      }

      case 'moonveil_wilds': {
        const mound1 = Math.sin(x * 0.06) * 3.0;
        const mound2 = Math.cos(z * 0.05) * 2.5;
        const centralGrotto = dist < 18 ? 1.5 : 0;
        return (4.0 + mound1 + mound2 + centralGrotto) * edgeFactor;
      }

      case 'rift_frontier': {
        const wave = Math.sin(x * 0.09) * Math.sin(z * 0.09) * 5.0;
        const tilt = x * 0.08 - z * 0.06;
        return (6.0 + wave + tilt) * edgeFactor;
      }

      case 'verdant_reach':
      default: {
        const hill1 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 3.8;
        const hill2 = Math.sin(x * 0.08 + 1.2) * Math.sin(z * 0.07) * 2.0;
        const hill3 = Math.cos((x + z) * 0.02) * 2.2;
        const centerMound = Math.max(0, 16 - dist * 0.8) * 0.35;
        const eastRidge = x > 20 && Math.abs(z) < 30 ? (x - 20) * 0.18 : 0;

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

  static getTerrainHeight(x: number, z: number): number {
    return this.getTerrainHeightForRegion('verdant_reach', x, z);
  }

  /**
   * Construct 3D landmark & atmosphere bundle for any destination.
   * Chunked terrain & instanced foliage/rocks are streamed by ChunkManager.
   */
  static generate(regionId = 'verdant_reach', maxAnisotropy = 4, isSoftwareGl = false): WorldBundle {
    const worldGroup = new THREE.Group();
    worldGroup.name = `${regionId}_world`;

    const getHeight = (x: number, z: number) => this.getTerrainHeightForRegion(regionId, x, z);
    const stoneTex = TextureGenerator.createStoneTexture(maxAnisotropy);

    // 1. Fractured Underside Keel (shared geometry, lightweight 14-seg cone)
    const undersideGeo = SharedAssets.getGeometry('world_underside_keel', () => {
      const g = new THREE.ConeGeometry(82, 55, 14, 3, true);
      g.rotateX(Math.PI);
      g.translate(0, -27, 0);
      return g;
    });
    const undersideMat = SharedAssets.getMaterial(`world_underside_${regionId === 'ashen_expanse' ? 'ashen' : 'stone'}`, () =>
      new THREE.MeshStandardMaterial({
        map: stoneTex,
        color: regionId === 'ashen_expanse' ? 0x18181b : 0x334155,
        roughness: 0.9,
        metalness: 0.2,
        flatShading: true,
      })
    );
    const undersideMesh = new THREE.Mesh(undersideGeo, undersideMat);
    undersideMesh.receiveShadow = !isSoftwareGl;
    worldGroup.add(undersideMesh);

    // 2. Ambient Cloud Sea / Abyssal Void Plane
    const cloudGeo = SharedAssets.getGeometry('world_cloud_sea', () => {
      const g = new THREE.PlaneGeometry(600, 600, 2, 2);
      g.rotateX(-Math.PI / 2);
      return g;
    });
    const cloudColor =
      regionId === 'ashen_expanse'
        ? 0x2b0d06
        : regionId === 'moonveil_wilds'
        ? 0x16082f
        : regionId === 'rift_frontier'
        ? 0x0f031e
        : 0x1e293b;
    const cloudMat = SharedAssets.getMaterial(`world_cloud_mat_${regionId}`, () =>
      new THREE.MeshBasicMaterial({
        color: cloudColor,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.position.y = -35;
    worldGroup.add(cloudMesh);

    const animators: ((delta: number, totalTime: number) => void)[] = [];
    const managedLights: THREE.PointLight[] = [];
    const streamObjects: { obj: THREE.Object3D; x: number; z: number; checkCollected?: () => boolean }[] = [];

    let beaconBundle: WorldBundle['beacon'] = undefined;
    const shardsMap = new Map<string, { mesh: THREE.Group; data: ShardRelic }>();

    if (regionId === 'verdant_reach') {
      this.buildVerdantFeatures(
        worldGroup,
        getHeight,
        stoneTex,
        maxAnisotropy,
        isSoftwareGl,
        animators,
        managedLights,
        streamObjects,
        shardsMap,
        (b) => {
          beaconBundle = b;
        }
      );
    } else if (regionId === 'shattered_highlands') {
      this.buildHighlandsFeatures(worldGroup, getHeight, isSoftwareGl, animators, streamObjects);
    } else if (regionId === 'ashen_expanse') {
      this.buildAshenFeatures(worldGroup, getHeight, animators, managedLights, streamObjects);
    } else if (regionId === 'sunken_archive') {
      this.buildArchiveFeatures(worldGroup, getHeight, animators, managedLights, streamObjects);
    } else if (regionId === 'moonveil_wilds') {
      this.buildMoonveilFeatures(worldGroup, getHeight, animators, streamObjects);
    } else if (regionId === 'rift_frontier') {
      this.buildRiftFeatures(worldGroup, getHeight, animators, managedLights, streamObjects);
    }

    let totalWorldTime = 0;
    const update = (delta: number) => {
      totalWorldTime += delta;
      for (let i = 0; i < animators.length; i++) {
        animators[i](delta, totalWorldTime);
      }
    };

    const syncChunkVisibility = (isVisible: (x: number, z: number) => boolean) => {
      for (let i = 0; i < streamObjects.length; i++) {
        const entry = streamObjects[i];
        if (entry.checkCollected && entry.checkCollected()) {
          entry.obj.visible = false;
        } else {
          entry.obj.visible = isVisible(entry.x, entry.z);
        }
      }
    };

    const setPointLightBudget = (tier: QualityTier) => {
      const allowFocalLight = !isSoftwareGl && tier !== 'low';
      for (let i = 0; i < managedLights.length; i++) {
        managedLights[i].visible = allowFocalLight && i === 0;
      }
    };

    const dispose = () => {
      // Safely disposes unique world geometries/materials while preserving SharedAssets & TextureGenerator caches
      SharedAssets.disposeObject3DSafe(worldGroup);
    };

    return {
      group: worldGroup,
      regionId,
      shards: shardsMap,
      beacon: beaconBundle,
      getTerrainHeight: getHeight,
      update,
      syncChunkVisibility,
      setPointLightBudget,
      dispose,
    };
  }

  private static buildVerdantFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    stoneTex: THREE.Texture,
    maxAnisotropy: number,
    isSoftwareGl: boolean,
    animators: ((dt: number, total: number) => void)[],
    managedLights: THREE.PointLight[],
    streamObjects: { obj: THREE.Object3D; x: number; z: number; checkCollected?: () => boolean }[],
    shardsMap: Map<string, { mesh: THREE.Group; data: ShardRelic }>,
    setBeacon: (b: NonNullable<WorldBundle['beacon']>) => void
  ): void {
    const waterTex = TextureGenerator.createWaterTexture(maxAnisotropy);

    // River
    const riverGeo = new THREE.PlaneGeometry(16, 75, 10, 24);
    riverGeo.rotateX(-Math.PI / 2);
    riverGeo.rotateY(Math.PI / 4);

    const rPos = riverGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const rx = rPos.getX(i) + 26;
      const rz = rPos.getZ(i) - 8;
      rPos.setX(i, rx);
      rPos.setZ(i, rz);
      rPos.setY(i, Math.max(0.4, getHeight(rx, rz) + 0.25));
    }
    riverGeo.computeVertexNormals();

    const waterMat = SharedAssets.getMaterial('world_river_water_mat', () =>
      new THREE.MeshStandardMaterial({
        map: waterTex,
        color: 0x67e8f9,
        roughness: 0.15,
        metalness: 0.8,
        transparent: true,
        opacity: 0.78,
      })
    );

    const riverMesh = new THREE.Mesh(riverGeo, waterMat);
    riverMesh.receiveShadow = !isSoftwareGl;
    worldGroup.add(riverMesh);

    animators.push((_dt, total) => {
      waterTex.offset.x = (total * 0.08) % 1.0;
      waterTex.offset.y = (total * 0.03) % 1.0;
    });

    // Monolith Beacon Plaza
    const stoneMat = SharedAssets.getMaterial('world_stone_mat', () =>
      new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.85, metalness: 0.15 })
    );

    const beaconGroup = new THREE.Group();
    beaconGroup.name = 'ancient_beacon';
    beaconGroup.position.set(0, getHeight(0, 0), 0);

    const daisGeo = SharedAssets.getGeometry('beacon_dais', () => new THREE.CylinderGeometry(8.5, 9.5, 1.2, 8));
    const daisMesh = new THREE.Mesh(daisGeo, stoneMat);
    daisMesh.position.y = 0.6;
    beaconGroup.add(daisMesh);

    const ringMat = SharedAssets.getMaterial('beacon_bronze_ring', () =>
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.9,
        roughness: 0.25,
        emissive: 0x78350f,
        emissiveIntensity: 0.25,
      })
    );

    const ring1Group = new THREE.Group();
    const ring1Geo = SharedAssets.getGeometry('beacon_ring_outer', () => new THREE.TorusGeometry(3.4, 0.18, 10, 28));
    ring1Group.add(new THREE.Mesh(ring1Geo, ringMat));
    ring1Group.position.set(0, 5.2, 0);
    beaconGroup.add(ring1Group);

    const ring2Group = new THREE.Group();
    const ring2Geo = SharedAssets.getGeometry('beacon_ring_inner', () => new THREE.TorusGeometry(2.4, 0.15, 10, 24));
    ring2Group.add(new THREE.Mesh(ring2Geo, ringMat));
    ring2Group.position.set(0, 5.2, 0);
    beaconGroup.add(ring2Group);

    const coreGeo = SharedAssets.getGeometry('beacon_core', () => new THREE.DodecahedronGeometry(1.1, 0));
    const coreMat = SharedAssets.getMaterial('beacon_core_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 0.85,
        roughness: 0.15,
        metalness: 0.85,
      })
    );
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 5.2, 0);
    beaconGroup.add(coreMesh);

    const coreGlow = SharedAssets.createGlowSprite(0x34d399, 5.5, 0.72);
    coreGlow.position.set(0, 5.2, 0);
    beaconGroup.add(coreGlow);

    const beaconLight = new THREE.PointLight(0x34d399, 1.8, 32);
    beaconLight.position.set(0, 5.4, 0);
    beaconGroup.add(beaconLight);
    managedLights.push(beaconLight);

    const beamGeo = SharedAssets.getGeometry('beacon_beam', () => new THREE.CylinderGeometry(0.7, 1.3, 140, 14, 1, true));
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(0, 70, 0);
    beaconGroup.add(beamMesh);

    worldGroup.add(beaconGroup);
    streamObjects.push({ obj: beaconGroup, x: 0, z: 0 });

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

    animators.push((dt, total) => {
      if (!beaconGroup.visible) return;
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
        if (beaconLight.visible) {
          beaconLight.intensity = 2.5 + Math.sin(total * 4) * 0.6;
        }
      }
    });

    // Collectible Drift Shards (use baked glow sprites instead of 4 extra PointLights)
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

    const shardGeo = SharedAssets.getGeometry('world_drift_shard', () => new THREE.OctahedronGeometry(0.7, 0));

    shardConfigs.forEach((sc) => {
      const sy = getHeight(sc.position[0], sc.position[2]) + 1.6;
      sc.position[1] = sy;

      const sGroup = new THREE.Group();
      sGroup.position.set(sc.position[0], sy, sc.position[2]);

      const colors = elementColors[sc.element] || elementColors.verdant;
      const cMat = SharedAssets.getMaterial(`shard_mat_${sc.element}`, () =>
        new THREE.MeshStandardMaterial({
          color: colors.color,
          emissive: colors.emissive,
          emissiveIntensity: 0.95,
          roughness: 0.15,
          metalness: 0.85,
        })
      );
      sGroup.add(new THREE.Mesh(shardGeo, cMat));
      sGroup.add(SharedAssets.createGlowSprite(colors.color, 2.8, 0.8));

      worldGroup.add(sGroup);
      shardsMap.set(sc.id, { mesh: sGroup, data: sc });
      streamObjects.push({
        obj: sGroup,
        x: sc.position[0],
        z: sc.position[2],
        checkCollected: () => sc.collected,
      });
    });

    animators.push((dt, total) => {
      shardsMap.forEach((entry) => {
        if (!entry.data.collected && entry.mesh.visible) {
          entry.mesh.rotation.y += dt * 1.5;
          const baseY = entry.data.position[1];
          entry.mesh.position.y = baseY + Math.sin(total * 2.5 + entry.mesh.position.x) * 0.25;
        }
      });
    });
  }

  private static buildHighlandsFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    isSoftwareGl: boolean,
    animators: ((dt: number, total: number) => void)[],
    streamObjects: { obj: THREE.Object3D; x: number; z: number }[]
  ): void {
    const ringGeo = SharedAssets.getGeometry('highlands_wind_ring', () => new THREE.TorusGeometry(3.5, 0.25, 8, 22));
    const windMat = SharedAssets.getMaterial('highlands_wind_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.8,
      })
    );

    const updraftPoints: [number, number][] = [
      [15, -12],
      [-22, 18],
      [28, 24],
      [-15, -28],
    ];

    const windRings: { mesh: THREE.Mesh; baseY: number }[] = [];

    updraftPoints.forEach(([ux, uz]) => {
      const uy = getHeight(ux, uz) + 4.0;
      const ringGrp = new THREE.Group();
      ringGrp.position.set(ux, uy, uz);

      const ring = new THREE.Mesh(ringGeo, windMat);
      ring.rotation.x = Math.PI / 2;
      ringGrp.add(ring);
      ringGrp.add(SharedAssets.createGlowSprite(0x38bdf8, 4.8, 0.6));

      worldGroup.add(ringGrp);
      windRings.push({ mesh: ring, baseY: 0 });
      streamObjects.push({ obj: ringGrp, x: ux, z: uz });
    });

    animators.push((dt, total) => {
      windRings.forEach((entry, idx) => {
        if (!entry.mesh.parent?.visible) return;
        entry.mesh.rotation.z += dt * (1.2 + idx * 0.2);
        entry.mesh.position.y = entry.baseY + Math.sin(total * 2.0 + idx) * 0.25;
      });
    });

    const spireGeo = SharedAssets.getGeometry('highlands_spire', () => new THREE.ConeGeometry(3.5, 28, 6));
    const spireMat = SharedAssets.getMaterial('highlands_spire_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, flatShading: true })
    );

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
      streamObjects.push({ obj: spire, x: sx, z: sz });
    });
  }

  private static buildAshenFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    animators: ((dt: number, total: number) => void)[],
    managedLights: THREE.PointLight[],
    streamObjects: { obj: THREE.Object3D; x: number; z: number }[]
  ): void {
    const lavaGeo = SharedAssets.getGeometry('ashen_lava_fissure', () => {
      const g = new THREE.PlaneGeometry(28, 60, 8, 16);
      g.rotateX(-Math.PI / 2);
      return g;
    });

    const lavaMat = SharedAssets.getMaterial('ashen_lava_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 0.95,
        roughness: 0.2,
        metalness: 0.8,
      })
    );

    const lavaMesh = new THREE.Mesh(lavaGeo, lavaMat);
    lavaMesh.position.set(0, 1.8, 0);
    worldGroup.add(lavaMesh);

    const lavaLight = new THREE.PointLight(0xf97316, 2.5, 45);
    lavaLight.position.set(0, 4.0, 0);
    worldGroup.add(lavaLight);
    managedLights.push(lavaLight);

    animators.push((_dt, total) => {
      lavaMat.emissiveIntensity = 0.85 + Math.sin(total * 3.0) * 0.25;
      if (lavaLight.visible) {
        lavaLight.intensity = 2.2 + Math.sin(total * 3.5) * 0.5;
      }
    });

    const colGeo = SharedAssets.getGeometry('ashen_basalt_col', () => new THREE.CylinderGeometry(1.4, 1.5, 9, 6));
    const colMat = SharedAssets.getMaterial('ashen_basalt_col_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95, flatShading: true })
    );

    const colPositions: [number, number][] = [
      [-18, 12],
      [-15, 16],
      [18, -14],
      [22, -10],
      [-24, -20],
      [26, 22],
    ];

    const colInst = new THREE.InstancedMesh(colGeo, colMat, colPositions.length);
    const dummy = new THREE.Object3D();
    colPositions.forEach(([cx, cz], i) => {
      const cy = getHeight(cx, cz);
      dummy.position.set(cx, cy + 4.5, cz);
      dummy.rotation.set(0, (i * Math.PI) / 3, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      colInst.setMatrixAt(i, dummy.matrix);
    });
    colInst.instanceMatrix.needsUpdate = true;
    worldGroup.add(colInst);
    streamObjects.push({ obj: lavaMesh, x: 0, z: 0 });
  }

  private static buildArchiveFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    animators: ((dt: number, total: number) => void)[],
    managedLights: THREE.PointLight[],
    streamObjects: { obj: THREE.Object3D; x: number; z: number }[]
  ): void {
    const astroGroup = new THREE.Group();
    astroGroup.position.set(0, getHeight(0, 0) + 1.2, 0);

    const brassMat = SharedAssets.getMaterial('archive_brass_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x78350f,
        emissiveIntensity: 0.3,
      })
    );

    const ring1Geo = SharedAssets.getGeometry('archive_ring1', () => new THREE.TorusGeometry(5.0, 0.2, 10, 28));
    const ring2Geo = SharedAssets.getGeometry('archive_ring2', () => new THREE.TorusGeometry(3.6, 0.18, 10, 24));
    const coreGeo = SharedAssets.getGeometry('archive_core', () => new THREE.IcosahedronGeometry(1.4, 0));
    const coreMat = SharedAssets.getMaterial('archive_core_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9,
      })
    );

    const r1 = new THREE.Mesh(ring1Geo, brassMat);
    const r2 = new THREE.Mesh(ring2Geo, brassMat);
    const core = new THREE.Mesh(coreGeo, coreMat);

    astroGroup.add(r1, r2, core, SharedAssets.createGlowSprite(0x38bdf8, 5.0, 0.65));
    worldGroup.add(astroGroup);
    streamObjects.push({ obj: astroGroup, x: 0, z: 0 });

    const astroLight = new THREE.PointLight(0x38bdf8, 2.0, 30);
    astroLight.position.set(0, getHeight(0, 0) + 2.5, 0);
    worldGroup.add(astroLight);
    managedLights.push(astroLight);

    animators.push((dt, total) => {
      if (!astroGroup.visible) return;
      r1.rotation.x += dt * 0.3;
      r1.rotation.y += dt * 0.4;
      r2.rotation.z += dt * 0.5;
      core.rotation.y += dt * 0.8;
      core.position.y = Math.sin(total * 2.0) * 0.2;
    });

    const pedGeo = SharedAssets.getGeometry('archive_pedestal', () => new THREE.BoxGeometry(1.6, 3.2, 1.6));
    const pedMat = SharedAssets.getMaterial('archive_pedestal_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    const glyphGeo = SharedAssets.getGeometry('archive_glyph', () => new THREE.OctahedronGeometry(0.4, 0));

    const pedPositions: [number, number][] = [
      [12, 12],
      [-12, 12],
      [12, -12],
      [-12, -12],
    ];

    pedPositions.forEach(([px, pz]) => {
      const py = getHeight(px, pz);
      const pedGrp = new THREE.Group();
      pedGrp.position.set(px, py, pz);

      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.y = 1.6;
      const glyph = new THREE.Mesh(glyphGeo, coreMat);
      glyph.position.y = 3.8;
      pedGrp.add(ped, glyph);
      worldGroup.add(pedGrp);
      streamObjects.push({ obj: pedGrp, x: px, z: pz });
    });
  }

  private static buildMoonveilFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    animators: ((dt: number, total: number) => void)[],
    streamObjects: { obj: THREE.Object3D; x: number; z: number }[]
  ): void {
    const stalkGeo = SharedAssets.getGeometry('moonveil_stalk', () => new THREE.CylinderGeometry(0.5, 0.8, 6.0, 8));
    const capGeo = SharedAssets.getGeometry('moonveil_cap', () => new THREE.ConeGeometry(3.4, 2.0, 8));
    const stalkMat = SharedAssets.getMaterial('moonveil_stalk_mat', () =>
      new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.9 })
    );

    const shroomLocations: [number, number, number][] = [
      [-16, 14, 0xc084fc],
      [22, -18, 0x67e8f9],
      [-28, -22, 0xa855f7],
      [18, 24, 0x38bdf8],
      [32, 12, 0xc084fc],
    ];

    const glows: THREE.Sprite[] = [];

    shroomLocations.forEach(([mx, mz, colorHex]) => {
      const my = getHeight(mx, mz);
      const mGroup = new THREE.Group();
      mGroup.position.set(mx, my, mz);

      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.position.y = 3.0;
      mGroup.add(stalk);

      const capMat = SharedAssets.getMaterial(`moonveil_cap_${colorHex}`, () =>
        new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.85,
          roughness: 0.3,
        })
      );

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 6.2;
      mGroup.add(cap);

      const glow = SharedAssets.createGlowSprite(colorHex, 5.5, 0.68);
      glow.position.y = 6.5;
      mGroup.add(glow);
      glows.push(glow);

      worldGroup.add(mGroup);
      streamObjects.push({ obj: mGroup, x: mx, z: mz });
    });

    animators.push((_dt, total) => {
      glows.forEach((g, idx) => {
        if (!g.parent?.visible) return;
        const s = 5.2 + Math.sin(total * 2.5 + idx) * 0.6;
        g.scale.set(s, s, 1);
      });
    });
  }

  private static buildRiftFeatures(
    worldGroup: THREE.Group,
    getHeight: (x: number, z: number) => number,
    animators: ((dt: number, total: number) => void)[],
    managedLights: THREE.PointLight[],
    streamObjects: { obj: THREE.Object3D; x: number; z: number }[]
  ): void {
    const singGroup = new THREE.Group();
    const baseY = getHeight(0, 0) + 5.0;
    singGroup.position.set(0, baseY, 0);

    const voidCoreGeo = SharedAssets.getGeometry('rift_void_core', () => new THREE.IcosahedronGeometry(2.2, 1));
    const voidRingGeo = SharedAssets.getGeometry('rift_void_ring', () => new THREE.TorusGeometry(4.2, 0.25, 8, 28));
    const voidMat = SharedAssets.getMaterial('rift_void_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0x09090b,
        roughness: 0.1,
        metalness: 0.9,
      })
    );
    const glowMat = SharedAssets.getMaterial('rift_wire_mat', () =>
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        wireframe: true,
      })
    );

    const core = new THREE.Mesh(voidCoreGeo, voidMat);
    const wire = new THREE.Mesh(voidCoreGeo, glowMat);
    wire.scale.set(1.15, 1.15, 1.15);
    const ring = new THREE.Mesh(voidRingGeo, glowMat);

    singGroup.add(core, wire, ring, SharedAssets.createGlowSprite(0xa855f7, 7.5, 0.72));
    worldGroup.add(singGroup);
    streamObjects.push({ obj: singGroup, x: 0, z: 0 });

    const voidLight = new THREE.PointLight(0xa855f7, 2.5, 35);
    voidLight.position.set(0, baseY, 0);
    worldGroup.add(voidLight);
    managedLights.push(voidLight);

    animators.push((dt, total) => {
      singGroup.rotation.y += dt * 0.8;
      singGroup.rotation.z += dt * 0.4;
      singGroup.position.y = baseY + Math.sin(total * 2.0) * 0.4;
      if (voidLight.visible) {
        voidLight.intensity = 2.2 + Math.sin(total * 3.5) * 0.6;
      }
    });

    const chunkGeo = SharedAssets.getGeometry('rift_obsidian_chunk', () => new THREE.BoxGeometry(4.5, 1.2, 4.5));
    const chunkMat = SharedAssets.getMaterial('rift_obsidian_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.3,
        metalness: 0.8,
      })
    );

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
      streamObjects.push({ obj: chunk, x: cx, z: cz });
    });
  }
}
