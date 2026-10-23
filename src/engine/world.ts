/**
 * The Verdant Reach - 3D World & Art Direction for The Drifting Land.
 * Builds a genuinely explorable 3D floating archipelago featuring:
 * - Rolling green terrain with natural riverbed depression and safe traversal boundaries
 * - Overgrown cobblestone paths connecting intentional landmarks
 * - Whispering River with animated luminous cyan water and timber footbridge
 * - The Ancient Monolith Beacon (central landmark with spinning rings and aether beam)
 * - The Sunken Ruin Sanctum with ancient portal arch and colonnade
 * - The Sunward Promontory Watchtower overlooking the sky
 * - Distant floating islands and crags for immense environmental depth
 * - Dense composite 3-8 part trees and instanced grass foliage
 * - 4 collectible Drift Shards placed deterministically at landmarks
 */

import * as THREE from 'three';
import { ShardRelic, BeaconStatus } from '../types/game';
import { TextureGenerator } from './textures';

export interface WorldBundle {
  group: THREE.Group;
  shards: Map<string, { mesh: THREE.Group; data: ShardRelic }>;
  beacon: {
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

// Reusable math objects to eliminate render-loop garbage collection
const _tempMatrix = new THREE.Matrix4();
const _tempColor = new THREE.Color();

export class WorldGenerator {
  /**
   * Continuous mathematical elevation function for The Verdant Reach.
   * Seamlessly shapes:
   * - Gentle central starting clearing
   * - Undulating hills and ridges
   * - Riverbed valley depression
   * - Natural perimeter barrier cliffs
   */
  static getTerrainHeight(x: number, z: number): number {
    const dist = Math.hypot(x, z);
    const maxRadius = 90;

    // Out of bounds drop-off into cloud abyss
    if (dist > maxRadius) {
      return -60;
    }

    // Natural perimeter cliff edge roll-off
    let edgeFactor = 1.0;
    if (dist > 65) {
      edgeFactor = Math.cos(((dist - 65) / 25) * (Math.PI / 2));
    }

    // Natural rolling terrain harmonics
    const hill1 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 3.8;
    const hill2 = Math.sin(x * 0.08 + 1.2) * Math.sin(z * 0.07) * 2.0;
    const hill3 = Math.cos((x + z) * 0.02) * 2.2;

    // Central Starting Clearing (Monolith Beacon Plaza mound)
    const centerMound = Math.max(0, 16 - dist * 0.8) * 0.35;

    // Eastern Promontory Ridge elevation
    const eastRidge = (x > 20 && Math.abs(z) < 30) ? (x - 20) * 0.18 : 0;

    // Riverbed Depression: curved stream path from (10, -45) through (22, -10) to (50, 25)
    // River spline distance approximation:
    const riverT = (z + 45) / 70; // 0 at north, 1 at east
    const riverTargetX = 10 + riverT * 38;
    const distToRiver = Math.abs(x - riverTargetX);
    let riverDepression = 0;
    if (z > -45 && z < 25 && distToRiver < 9) {
      riverDepression = -1.6 * Math.cos((distToRiver / 9) * (Math.PI / 2));
    }

    const baseElevation = 2.4;
    return (baseElevation + hill1 + hill2 + hill3 + centerMound + eastRidge + riverDepression) * edgeFactor;
  }

  /**
   * Construct The Verdant Reach complete 3D scene
   */
  static generate(maxAnisotropy = 4, isSoftwareGl = false): WorldBundle {
    const worldGroup = new THREE.Group();
    worldGroup.name = 'verdant_reach_world';

    // 1. Procedural Textures
    const grassTex = TextureGenerator.createGrassTexture(maxAnisotropy);
    const stoneTex = TextureGenerator.createStoneTexture(maxAnisotropy);
    const pathTex = TextureGenerator.createPathTexture(maxAnisotropy);
    const waterTex = TextureGenerator.createWaterTexture(maxAnisotropy);
    const barkTex = TextureGenerator.createBarkTexture(maxAnisotropy);

    // 2. Main Terrain Mesh (Displaced Plane with Skirt)
    const terrainGeo = new THREE.PlaneGeometry(180, 180, 80, 80);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = this.getTerrainHeight(vx, vz);
      posAttr.setY(i, vy);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false,
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = !isSoftwareGl;
    worldGroup.add(terrainMesh);

    // 3. Fractured Floating Rock Underside (Inverted craggy cone)
    const stoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.88,
      metalness: 0.15,
      flatShading: true,
    });

    const undersideGeo = new THREE.ConeGeometry(82, 50, 20, 6, true);
    undersideGeo.rotateX(Math.PI);
    undersideGeo.translate(0, -25, 0);

    const uPos = undersideGeo.attributes.position;
    for (let i = 0; i < uPos.count; i++) {
      const px = uPos.getX(i);
      const py = uPos.getY(i);
      const pz = uPos.getZ(i);
      const noise = Math.sin(px * 0.18) * Math.cos(pz * 0.18) * 5.0;
      uPos.setX(i, px + noise * 0.5);
      uPos.setZ(i, pz + noise * 0.5);
    }
    undersideGeo.computeVertexNormals();

    const undersideMesh = new THREE.Mesh(undersideGeo, stoneMat);
    undersideMesh.receiveShadow = !isSoftwareGl;
    worldGroup.add(undersideMesh);

    // 4. Overgrown Worn Cobblestone Paths (InstancedMesh)
    // Three trails radiating from starting plaza: North-East (to River), West (to Ruins), South-East (to Watchtower)
    const pathPoints: [number, number][] = [];

    // Trail 1: North-East to River & Waterfall
    for (let t = 0; t <= 1; t += 0.04) {
      const px = THREE.MathUtils.lerp(0, 32, t);
      const pz = THREE.MathUtils.lerp(0, -18, t) + Math.sin(t * Math.PI) * 4;
      pathPoints.push([px, pz]);
    }

    // Trail 2: West to Sunken Ruin Sanctum
    for (let t = 0; t <= 1; t += 0.04) {
      const px = THREE.MathUtils.lerp(0, -32, t);
      const pz = THREE.MathUtils.lerp(0, 16, t) + Math.sin(t * Math.PI) * 3;
      pathPoints.push([px, pz]);
    }

    // Trail 3: South-East to Promontory Watchtower
    for (let t = 0; t <= 1; t += 0.04) {
      const px = THREE.MathUtils.lerp(0, 36, t);
      const pz = THREE.MathUtils.lerp(0, 24, t) - Math.sin(t * Math.PI) * 3;
      pathPoints.push([px, pz]);
    }

    const flagstoneGeo = new THREE.BoxGeometry(1.6, 0.12, 1.6);
    const flagstoneMat = new THREE.MeshStandardMaterial({
      map: pathTex,
      roughness: 0.8,
      metalness: 0.1,
    });
    const flagstoneInstanced = new THREE.InstancedMesh(flagstoneGeo, flagstoneMat, pathPoints.length);
    flagstoneInstanced.castShadow = false;
    flagstoneInstanced.receiveShadow = !isSoftwareGl;

    pathPoints.forEach(([px, pz], idx) => {
      const py = this.getTerrainHeight(px, pz) + 0.04;
      const angle = (idx * 0.4) % (Math.PI * 2);
      const scale = 0.85 + (idx % 3) * 0.1;

      _tempMatrix.makeRotationY(angle);
      _tempMatrix.setPosition(px, py, pz);
      _tempMatrix.scale(new THREE.Vector3(scale, 1, scale));
      flagstoneInstanced.setMatrixAt(idx, _tempMatrix);
    });
    flagstoneInstanced.instanceMatrix.needsUpdate = true;
    flagstoneInstanced.computeBoundingSphere();
    worldGroup.add(flagstoneInstanced);

    // 5. Whispering River & Waterfall Basin (Animated Cyan Water)
    const riverGeo = new THREE.PlaneGeometry(16, 75, 12, 32);
    riverGeo.rotateX(-Math.PI / 2);
    riverGeo.rotateY(Math.PI / 4);

    // Deform river plane along stream slope
    const rPos = riverGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const rx = rPos.getX(i) + 26;
      const rz = rPos.getZ(i) - 8;
      rPos.setX(i, rx);
      rPos.setZ(i, rz);
      // Place water nestled just inside riverbed depression
      const ry = this.getTerrainHeight(rx, rz) + 0.25;
      rPos.setY(i, Math.max(0.4, ry));
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
    const riverMesh = new THREE.Mesh(riverGeo, waterMat);
    riverMesh.receiveShadow = !isSoftwareGl;
    worldGroup.add(riverMesh);

    // Rustic Timber Footbridge across river at (24, -10)
    const bridgeGroup = new THREE.Group();
    const bridgeY = this.getTerrainHeight(24, -10) + 0.6;
    bridgeGroup.position.set(24, bridgeY, -10);
    bridgeGroup.rotation.y = -Math.PI / 3;

    // Bridge Planks
    for (let p = -3; p <= 3; p++) {
      const plankGeo = new THREE.BoxGeometry(3.2, 0.15, 0.7);
      const plankMat = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.85 });
      const plank = new THREE.Mesh(plankGeo, plankMat);
      plank.position.set(0, 0, p * 0.85);
      plank.castShadow = !isSoftwareGl;
      bridgeGroup.add(plank);
    }
    // Bridge Handrails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x3d2516, roughness: 0.9 });
    for (const side of [-1.5, 1.5]) {
      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), railMat);
      post1.position.set(side, 0.6, -2.5);
      bridgeGroup.add(post1);
      const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), railMat);
      post2.position.set(side, 0.6, 2.5);
      bridgeGroup.add(post2);
      const rope = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 5.2), railMat);
      rope.position.set(side, 1.1, 0);
      bridgeGroup.add(rope);
    }
    worldGroup.add(bridgeGroup);

    // 6. Landmark: The Ancient Monolith Beacon (Central starting clearing)
    const beaconGroup = new THREE.Group();
    beaconGroup.name = 'ancient_beacon';
    const beaconBaseY = this.getTerrainHeight(0, 0);
    beaconGroup.position.set(0, beaconBaseY, 0);

    // Part 1: Stepped octagonal stone dais
    const daisGeo = new THREE.CylinderGeometry(8.5, 9.5, 1.2, 8);
    const daisMesh = new THREE.Mesh(daisGeo, stoneMat);
    daisMesh.position.y = 0.6;
    daisMesh.castShadow = !isSoftwareGl;
    daisMesh.receiveShadow = !isSoftwareGl;
    beaconGroup.add(daisMesh);

    // Part 2: Inner altar pedestal
    const altarGeo = new THREE.CylinderGeometry(4.8, 5.4, 1.0, 8);
    const altarMesh = new THREE.Mesh(altarGeo, stoneMat);
    altarMesh.position.y = 1.6;
    altarMesh.castShadow = !isSoftwareGl;
    beaconGroup.add(altarMesh);

    // Parts 3-6: 4 Cardinal Runic Pillars with emerald capstones
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const px = Math.cos(angle) * 6.2;
      const pz = Math.sin(angle) * 6.2;
      const pillarGeo = new THREE.BoxGeometry(1.3, 8.0, 1.3);
      const pillarMesh = new THREE.Mesh(pillarGeo, stoneMat);
      pillarMesh.position.set(px, 4.0, pz);
      pillarMesh.castShadow = !isSoftwareGl;
      beaconGroup.add(pillarMesh);

      // Accent capstone
      const capGeo = new THREE.ConeGeometry(0.95, 1.4, 4);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x059669,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.8,
      });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.set(px, 8.5, pz);
      capMesh.rotateY(angle);
      beaconGroup.add(capMesh);
    }

    // Parts 7-8: Rotating Runic Bronze Concentric Rings
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.25,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
    });
    const rings: THREE.Group[] = [];

    const ring1Group = new THREE.Group();
    const ring1Geo = new THREE.TorusGeometry(3.4, 0.18, 12, 32);
    const ring1Mesh = new THREE.Mesh(ring1Geo, ringMat);
    ring1Group.add(ring1Mesh);
    ring1Group.position.set(0, 5.2, 0);
    beaconGroup.add(ring1Group);
    rings.push(ring1Group);

    const ring2Group = new THREE.Group();
    const ring2Geo = new THREE.TorusGeometry(2.4, 0.15, 12, 28);
    const ring2Mesh = new THREE.Mesh(ring2Geo, ringMat);
    ring2Group.add(ring2Mesh);
    ring2Group.position.set(0, 5.2, 0);
    beaconGroup.add(ring2Group);
    rings.push(ring2Group);

    // Part 9: Hovering Emerald Power Core (Dodecahedron)
    const coreGeo = new THREE.DodecahedronGeometry(1.1, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 5.2, 0);
    beaconGroup.add(coreMesh);

    // Part 10: Beacon Light
    const beaconLight = new THREE.PointLight(0x34d399, 1.8, 32);
    beaconLight.position.set(0, 5.4, 0);
    beaconGroup.add(beaconLight);

    // Part 11: Skyward Aether Beam (Activated state)
    const beamGeo = new THREE.CylinderGeometry(0.7, 1.3, 140, 16, 1, true);
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

    // 7. Landmark: The Sunken Ruin Sanctum & Arch of Antiquity (South-West: -34, 18)
    const ruinGroup = new THREE.Group();
    const ruinY = this.getTerrainHeight(-34, 18);
    ruinGroup.position.set(-34, ruinY, 18);
    ruinGroup.rotation.y = Math.PI / 6;

    // Stepped Base Platform
    const rPlat = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 10), stoneMat);
    rPlat.position.y = 0.4;
    rPlat.receiveShadow = !isSoftwareGl;
    ruinGroup.add(rPlat);

    // Grand Portal Arch of Antiquity
    const archPillar1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9.0, 1.6), stoneMat);
    archPillar1.position.set(-3.5, 4.5, 0);
    archPillar1.castShadow = !isSoftwareGl;
    ruinGroup.add(archPillar1);

    const archPillar2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9.0, 1.6), stoneMat);
    archPillar2.position.set(3.5, 4.5, 0);
    archPillar2.castShadow = !isSoftwareGl;
    ruinGroup.add(archPillar2);

    const archLintel = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.4, 2.0), stoneMat);
    archLintel.position.set(0, 9.4, 0);
    archLintel.castShadow = !isSoftwareGl;
    ruinGroup.add(archLintel);

    // Surrounding fallen Colonnade columns
    for (let c = 0; c < 4; c++) {
      const colHeight = 3.5 + (c % 2) * 2.5;
      const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, colHeight, 8), stoneMat);
      colMesh.position.set(-6 + c * 4, colHeight / 2, -3.5);
      colMesh.castShadow = !isSoftwareGl;
      ruinGroup.add(colMesh);
    }
    worldGroup.add(ruinGroup);

    // 8. Landmark: The Sunward Promontory Watchtower (East Ridge: 38, 25)
    const towerGroup = new THREE.Group();
    const towerY = this.getTerrainHeight(38, 25);
    towerGroup.position.set(38, towerY, 25);
    towerGroup.rotation.y = -Math.PI / 4;

    // Octagonal Tower Base
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.2, 8.0, 8), stoneMat);
    tBase.position.y = 4.0;
    tBase.castShadow = !isSoftwareGl;
    towerGroup.add(tBase);

    // Upper Battlements & Window Slits
    const tTop = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 4.6, 2.0, 8), stoneMat);
    tTop.position.y = 8.8;
    tTop.castShadow = !isSoftwareGl;
    towerGroup.add(tTop);

    worldGroup.add(towerGroup);

    // 9. Distant Floating Mountain Islets & Peaks (Immense scale & environmental depth)
    const distantIsles: [number, number, number, number][] = [
      [-140, 35, -80, 24],
      [160, 45, -90, 32],
      [-120, -15, 130, 28],
      [150, 15, 120, 26],
      [0, 60, -180, 42],
      [-70, 75, 190, 35],
    ];

    distantIsles.forEach(([dx, dy, dz, radius]) => {
      const dGroup = new THREE.Group();
      dGroup.position.set(dx, dy, dz);

      // Top green crag
      const dTop = new THREE.Mesh(
        new THREE.DodecahedronGeometry(radius, 1),
        new THREE.MeshStandardMaterial({
          color: 0x22543d,
          roughness: 0.9,
          metalness: 0.05,
          flatShading: true,
        })
      );
      dGroup.add(dTop);

      // Under crag keel
      const dKeel = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.9, radius * 1.5, 7),
        stoneMat
      );
      dKeel.rotateX(Math.PI);
      dKeel.position.y = -radius * 0.7;
      dGroup.add(dKeel);

      worldGroup.add(dGroup);
    });

    // 10. Procedural Forests: Pines & Ancient Oaks (Composite 3-8 parts each)
    const treeLocations: [number, number, 'pine' | 'oak'][] = [
      // Elder Pine Forest (West & North-West)
      [-18, 14, 'pine'], [-24, 25, 'pine'], [-32, -12, 'pine'], [-42, 6, 'pine'],
      [-28, -28, 'pine'], [-16, -34, 'pine'], [-38, -22, 'pine'], [-48, 18, 'pine'],
      // Sunward Basin Grove (East & South)
      [18, 18, 'oak'], [28, 8, 'pine'], [32, -18, 'oak'], [22, -32, 'pine'],
      [14, -22, 'oak'], [12, 32, 'pine'], [26, 38, 'oak'], [44, 12, 'pine'],
      // Island Edge Sentinel Trees
      [-52, -16, 'pine'], [48, -26, 'pine'], [-8, 48, 'oak'], [8, -48, 'pine'],
    ];

    treeLocations.forEach(([tx, tz, type], idx) => {
      const ty = this.getTerrainHeight(tx, tz);
      if (ty < 0.5) return;

      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx, ty, tz);
      const s = 0.85 + (idx % 4) * 0.1;
      treeGroup.scale.set(s, s, s);

      if (type === 'pine') {
        // Pine Trunk
        const trunkH = 6 + (idx % 3) * 1.5;
        const trunkGeo = new THREE.CylinderGeometry(0.35, 0.75, trunkH, 8);
        trunkGeo.translate(0, trunkH / 2, 0);
        const trunkMesh = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.9 }));
        trunkMesh.castShadow = !isSoftwareGl;
        treeGroup.add(trunkMesh);

        // 3 Layered Pine Foliage Cones
        const pineColors = [0x1e3a29, 0x22543d, 0x2d6a4f];
        for (let l = 0; l < 3; l++) {
          const r = 3.4 - l * 0.8;
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry(r, 3.0, 7),
            new THREE.MeshStandardMaterial({
              color: pineColors[l],
              roughness: 0.85,
              metalness: 0.05,
              flatShading: true,
            })
          );
          cone.position.y = trunkH - 0.6 + l * 2.0;
          cone.castShadow = !isSoftwareGl;
          treeGroup.add(cone);
        }
      } else {
        // Ancient Spire Oak
        const trunkH = 4.5;
        const trunkGeo = new THREE.CylinderGeometry(0.6, 0.95, trunkH, 8);
        trunkGeo.translate(0, trunkH / 2, 0);
        const trunkMesh = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.9 }));
        trunkMesh.castShadow = !isSoftwareGl;
        treeGroup.add(trunkMesh);

        // Spreading Foliage Clumps
        const oakMat = new THREE.MeshStandardMaterial({
          color: 0x3d8557,
          roughness: 0.8,
          flatShading: true,
        });
        const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.0, 1), oakMat);
        canopy1.position.set(0, trunkH + 1.8, 0);
        canopy1.castShadow = !isSoftwareGl;
        treeGroup.add(canopy1);

        const canopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 1), oakMat);
        canopy2.position.set(1.5, trunkH + 1.2, 1.2);
        treeGroup.add(canopy2);
      }

      worldGroup.add(treeGroup);
    });

    // 11. Instanced Grass & Fern Clumps across Rolling Hills (320 instances)
    const grassClumpCount = 320;
    const clumpGeo = new THREE.ConeGeometry(0.7, 0.9, 5);
    clumpGeo.translate(0, 0.45, 0);
    const clumpMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });
    const grassInstanced = new THREE.InstancedMesh(clumpGeo, clumpMat, grassClumpCount);
    grassInstanced.receiveShadow = !isSoftwareGl;

    const grassPalette = [
      new THREE.Color(0x34d399), // Emerald
      new THREE.Color(0x22c55e), // Green
      new THREE.Color(0x15803d), // Deep forest
      new THREE.Color(0x84cc16), // Sunlit lime
    ];

    let gIdx = 0;
    for (let i = 0; i < grassClumpCount; i++) {
      // Deterministic distribution across plateau
      const radius = 8 + (i * 0.18) % 52;
      const angle = i * 2.39996; // Golden angle for natural dispersion
      const gx = Math.cos(angle) * radius;
      const gz = Math.sin(angle) * radius;
      const gy = this.getTerrainHeight(gx, gz);

      if (gy > 0.8) {
        const scale = 0.6 + (i % 5) * 0.12;
        _tempMatrix.makeRotationY(angle);
        _tempMatrix.setPosition(gx, gy, gz);
        _tempMatrix.scale(new THREE.Vector3(scale, scale, scale));
        grassInstanced.setMatrixAt(gIdx, _tempMatrix);
        grassInstanced.setColorAt(gIdx, grassPalette[i % grassPalette.length]);
        gIdx++;
      }
    }
    grassInstanced.instanceMatrix.needsUpdate = true;
    if (grassInstanced.instanceColor) grassInstanced.instanceColor.needsUpdate = true;
    grassInstanced.computeBoundingSphere();
    worldGroup.add(grassInstanced);

    // 12. Collectible Ancient Drift Shards (4 Key Relics at Landmarks)
    const shardsMap = new Map<string, { mesh: THREE.Group; data: ShardRelic }>();

    const shardConfigs: ShardRelic[] = [
      {
        id: 'shard_verdant_heart',
        name: 'Verdant Heart Shard',
        region: 'The Verdant Reach',
        position: [-34, 0, 18], // At Sunken Ruin Sanctum Altar
        collected: false,
        loreSnippet: 'Pulsing with primeval plant resonance from before the Great Drift.',
        element: 'verdant',
      },
      {
        id: 'shard_sunward_ridge',
        name: 'Sunward Crest Shard',
        region: 'The Verdant Reach',
        position: [38, 0, 25], // At Sunward Promontory Watchtower
        collected: false,
        loreSnippet: 'Absorbed celestial dawn light across centuries of untethered flight.',
        element: 'solar',
      },
      {
        id: 'shard_elder_groove',
        name: 'Elder Spire Relic',
        region: 'The Verdant Reach',
        position: [-28, 0, -28], // Deep in Elder Pine Grove
        collected: false,
        loreSnippet: 'Vibrates faintly when pointed towards the central monolith.',
        element: 'aether',
      },
      {
        id: 'shard_waterfall_basin',
        name: 'Tears of Aether',
        region: 'The Verdant Reach',
        position: [28, 0, -12], // Hovering above Whispering River Bridge
        collected: false,
        loreSnippet: 'A crystalline tear crystallized in zero gravity during the separation.',
        element: 'lunar',
      },
    ];

    const elementColors: Record<string, { color: number; emissive: number }> = {
      verdant: { color: 0x34d399, emissive: 0x059669 },
      solar: { color: 0xfbbf24, emissive: 0xd97706 },
      aether: { color: 0x38bdf8, emissive: 0x0284c7 },
      lunar: { color: 0xc084fc, emissive: 0x7e22ce },
    };

    shardConfigs.forEach((sc) => {
      const sy = this.getTerrainHeight(sc.position[0], sc.position[2]) + 1.6;
      sc.position[1] = sy;

      const sGroup = new THREE.Group();
      sGroup.position.set(sc.position[0], sy, sc.position[2]);

      const colors = elementColors[sc.element] || elementColors.verdant;

      // Octahedron crystal core
      const cGeo = new THREE.OctahedronGeometry(0.7, 0);
      const cMat = new THREE.MeshStandardMaterial({
        color: colors.color,
        emissive: colors.emissive,
        emissiveIntensity: 0.95,
        roughness: 0.15,
        metalness: 0.85,
      });
      const crystalMesh = new THREE.Mesh(cGeo, cMat);
      sGroup.add(crystalMesh);

      // Orbit ring
      const oGeo = new THREE.TorusGeometry(1.05, 0.05, 8, 24);
      const oMat = new THREE.MeshBasicMaterial({ color: colors.color, transparent: true, opacity: 0.65 });
      const orbitMesh = new THREE.Mesh(oGeo, oMat);
      orbitMesh.rotateX(Math.PI / 4);
      sGroup.add(orbitMesh);

      // Light glow
      const sLight = new THREE.PointLight(colors.color, 0.9, 10);
      sGroup.add(sLight);

      worldGroup.add(sGroup);
      shardsMap.set(sc.id, { mesh: sGroup, data: sc });
    });

    // 13. Ambient Cloud Sea Plane below archipelago
    const cloudGeo = new THREE.PlaneGeometry(500, 500, 8, 8);
    cloudGeo.rotateX(-Math.PI / 2);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.position.y = -35;
    worldGroup.add(cloudMesh);

    // Beacon Data
    const beaconData: BeaconStatus = {
      id: 'verdant_monolith_beacon',
      name: 'Verdant Monolith Beacon',
      activated: false,
      activationProgress: 0,
      requiredShards: 4,
    };

    let totalTime = 0;

    const update = (delta: number) => {
      totalTime += delta;

      // Animate Beacon Rings
      rings[0].rotation.x += delta * 0.45;
      rings[0].rotation.y += delta * 0.35;
      rings[1].rotation.z += delta * 0.55;
      rings[1].rotation.x -= delta * 0.25;

      // Core bobbing
      coreMesh.position.y = 5.2 + Math.sin(totalTime * 2.0) * 0.25;
      coreMesh.rotation.y += delta * 0.8;

      // Water UV flow scroll
      waterTex.offset.x = (totalTime * 0.08) % 1.0;
      waterTex.offset.y = (totalTime * 0.03) % 1.0;

      // Shard hover & spin
      shardsMap.forEach((entry) => {
        if (!entry.data.collected) {
          entry.mesh.rotation.y += delta * 1.5;
          const baseY = entry.data.position[1];
          entry.mesh.position.y = baseY + Math.sin(totalTime * 2.5 + entry.mesh.position.x) * 0.25;
        }
      });

      // Beacon activation beam animation
      if (beaconData.activated) {
        if (beamMat.opacity < 0.85) {
          beamMat.opacity = Math.min(0.85, beamMat.opacity + delta * 0.6);
        }
        beamMesh.rotation.y += delta * 0.5;
        beaconLight.intensity = 2.5 + Math.sin(totalTime * 4) * 0.6;
      }
    };

    const dispose = () => {
      terrainGeo.dispose();
      terrainMat.dispose();
      undersideGeo.dispose();
      stoneMat.dispose();
      flagstoneGeo.dispose();
      flagstoneMat.dispose();
      riverGeo.dispose();
      waterMat.dispose();
      grassTex.dispose();
      stoneTex.dispose();
      pathTex.dispose();
      waterTex.dispose();
      barkTex.dispose();
    };

    return {
      group: worldGroup,
      shards: shardsMap,
      beacon: {
        mesh: beaconGroup,
        rings,
        coreMesh,
        beamMesh,
        light: beaconLight,
        data: beaconData,
      },
      getTerrainHeight: (x, z) => this.getTerrainHeight(x, z),
      update,
      dispose,
    };
  }
}
