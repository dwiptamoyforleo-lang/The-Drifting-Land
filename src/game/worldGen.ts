/**
 * Procedural Open-World Generation Engine for THE DRIFTING LAND
 * Generates natural, continuous organic terrain with rolling hills, mountains,
 * rivers, forests, caves, and ancient ruins (non-blocky, realistic 3D mesh).
 */
import * as THREE from 'three';

// Fast deterministic 2D Simplex/Perlin gradient noise generator
class Noise2D {
  private perm: Uint8Array = new Uint8Array(512);

  constructor(seed: number = 942026) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    // Seeded shuffle
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);

    return this.lerp(x1, x2, v);
  }
}

export interface TerrainFeature {
  type: 'tree' | 'rock' | 'ruin' | 'water' | 'crystal' | 'cave_entrance';
  position: THREE.Vector3;
  mesh: THREE.Object3D;
}

export class WorldGenerator {
  public seed: number;
  public chunkSize: number = 96;
  public chunkResolution: number = 32;
  public loadedChunks: Map<string, THREE.Group> = new Map();
  public walkableMeshes: THREE.Object3D[] = [];

  private noise: Noise2D;
  private detailNoise: Noise2D;

  // Shared reusable materials
  private matTerrainGrass!: THREE.MeshStandardMaterial;
  private matTerrainRock!: THREE.MeshStandardMaterial;
  private matTreeTrunk!: THREE.MeshStandardMaterial;
  private matTreeFoliagePine!: THREE.MeshStandardMaterial;
  private matTreeFoliageLuminous!: THREE.MeshStandardMaterial;
  private matRiverWater!: THREE.MeshStandardMaterial;
  private matAncientStone!: THREE.MeshStandardMaterial;
  private matCrystalGlowing!: THREE.MeshBasicMaterial;

  constructor(seed: number = 942026) {
    this.seed = seed;
    this.noise = new Noise2D(seed);
    this.detailNoise = new Noise2D(seed + 1337);
    this.initMaterials();
  }

  private initMaterials() {
    this.matTerrainGrass = new THREE.MeshStandardMaterial({
      color: 0x1e3a2f,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    this.matTerrainRock = new THREE.MeshStandardMaterial({
      color: 0x272e38,
      roughness: 0.9,
      metalness: 0.15,
      flatShading: true,
    });

    this.matTreeTrunk = new THREE.MeshStandardMaterial({
      color: 0x3d2b1f,
      roughness: 0.8,
    });

    this.matTreeFoliagePine = new THREE.MeshStandardMaterial({
      color: 0x11463a,
      roughness: 0.7,
      flatShading: true,
    });

    this.matTreeFoliageLuminous = new THREE.MeshStandardMaterial({
      color: 0x0d9488,
      emissive: 0x064e3b,
      emissiveIntensity: 0.4,
      roughness: 0.5,
      flatShading: true,
    });

    this.matRiverWater = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.25,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.82,
    });

    this.matAncientStone = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.65,
      metalness: 0.3,
      flatShading: true,
    });

    this.matCrystalGlowing = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });
  }

  /**
   * Analytical continuous terrain elevation function at any (x, z) coordinate.
   * Creates seamless hills, mountain ridges, valleys, and riverbeds.
   */
  public getTerrainHeight(x: number, z: number): number {
    // Distance from world spawn (0, 0)
    const distFromOrigin = Math.sqrt(x * x + z * z);

    // Keep spawn area and main hub relatively level and comfortable for player
    let baseH = 0;
    if (distFromOrigin < 28) {
      const blend = distFromOrigin / 28;
      baseH = 4.0 * (1 - blend * blend);
    }

    // Macro continental noise: rolling hills and mountain ridges
    const nx1 = x * 0.007;
    const nz1 = z * 0.007;
    const macro = this.noise.noise(nx1, nz1) * 22.0;

    // Medium terrain ridges and plateaus
    const nx2 = x * 0.02;
    const nz2 = z * 0.02;
    const meso = this.detailNoise.noise(nx2, nz2) * 8.5;

    // Micro surface roughness
    const nx3 = x * 0.06;
    const nz3 = z * 0.06;
    const micro = this.noise.noise(nx3, nz3) * 1.8;

    // River carve: serpentine valley winding across the landscape
    const riverCurve = Math.sin(x * 0.015) * 35.0;
    const distToRiver = Math.abs(z - (riverCurve - 20));
    let riverCarve = 0;
    if (distToRiver < 18) {
      const riverFactor = 1.0 - (distToRiver / 18);
      riverCarve = riverFactor * riverFactor * 7.5;
    }

    // Floating island edge dropoff beyond radius of 240m
    let islandDrop = 0;
    if (distFromOrigin > 160) {
      const edge = (distFromOrigin - 160) * 0.45;
      islandDrop = edge * edge * 0.15;
    }

    let elevation = baseH + macro + meso + micro - riverCarve - islandDrop;

    // Ensure spawn plaza stays around 4.2 height
    if (distFromOrigin < 15) {
      elevation = Math.max(elevation, 4.0);
    }

    return elevation;
  }

  public getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public updateChunks(playerPos: THREE.Vector3, scene: THREE.Scene, globalWalkable: THREE.Object3D[]) {
    const currentCx = Math.floor(playerPos.x / this.chunkSize);
    const currentCz = Math.floor(playerPos.z / this.chunkSize);

    const activeKeys = new Set<string>();
    const chunkRadius = 1; // 3x3 active grid (288m x 288m seamless open world)

    for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
      for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
        const cx = currentCx + dx;
        const cz = currentCz + dz;
        const key = this.getChunkKey(cx, cz);
        activeKeys.add(key);

        if (!this.loadedChunks.has(key)) {
          const chunkGroup = this.generateChunk(cx, cz);
          scene.add(chunkGroup);
          this.loadedChunks.set(key, chunkGroup);
        }
      }
    }

    // Unload distant chunks to preserve mobile GPU & memory
    for (const [key, group] of this.loadedChunks.entries()) {
      if (!activeKeys.has(key)) {
        scene.remove(group);
        this.disposeChunk(group);
        this.loadedChunks.delete(key);
      }
    }

    // Refresh walkable collision references
    globalWalkable.length = 0;
    for (const group of this.loadedChunks.values()) {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && child.userData.isWalkable) {
          globalWalkable.push(child);
        }
      });
    }
  }

  private generateChunk(cx: number, cz: number): THREE.Group {
    const chunkGroup = new THREE.Group();
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;

    // 1. Organic Terrain Mesh using PlaneGeometry
    const res = this.chunkResolution;
    const terrainGeo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, res, res);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const count = posAttr.count;

    const colors = new Float32Array(count * 3);
    const colorRock = new THREE.Color(0x334155);
    const colorGrass = new THREE.Color(0x1e3a2f);
    const colorLush = new THREE.Color(0x14532d);
    const colorSnow = new THREE.Color(0x94a3b8);
    const colorRiverBed = new THREE.Color(0x1e293b);

    for (let i = 0; i < count; i++) {
      const localX = posAttr.getX(i);
      const localZ = posAttr.getZ(i);

      const worldX = startX + localX + this.chunkSize / 2;
      const worldZ = startZ + localZ + this.chunkSize / 2;

      const y = this.getTerrainHeight(worldX, worldZ);
      posAttr.setY(i, y);

      // Vertex color blending based on elevation and slope
      let vertColor: THREE.Color;
      if (y < 0.5) {
        vertColor = colorRiverBed;
      } else if (y > 20) {
        vertColor = colorSnow;
      } else if (y > 11) {
        vertColor = colorRock;
      } else if (y > 3) {
        vertColor = colorGrass;
      } else {
        vertColor = colorLush;
      }

      colors[i * 3] = vertColor.r;
      colors[i * 3 + 1] = vertColor.g;
      colors[i * 3 + 2] = vertColor.b;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.position.set(startX + this.chunkSize / 2, 0, startZ + this.chunkSize / 2);
    terrainMesh.receiveShadow = true;
    terrainMesh.userData.isWalkable = true;
    chunkGroup.add(terrainMesh);

    // 2. River Surface in Valley (if river crosses this chunk)
    const riverY = -0.4;
    const riverGeo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMesh = new THREE.Mesh(riverGeo, this.matRiverWater);
    riverMesh.position.set(startX + this.chunkSize / 2, riverY, startZ + this.chunkSize / 2);
    chunkGroup.add(riverMesh);

    // 3. Procedural Forest, Vegetation & Boulders
    const rngSeed = Math.abs(cx * 73856093 ^ cz * 19349663);
    const numTrees = 8 + (rngSeed % 7);

    for (let i = 0; i < numTrees; i++) {
      const offsetX = ((rngSeed * (i + 1) * 17) % (this.chunkSize - 16)) - this.chunkSize / 2 + 8;
      const offsetZ = ((rngSeed * (i + 1) * 31) % (this.chunkSize - 16)) - this.chunkSize / 2 + 8;

      const wx = startX + this.chunkSize / 2 + offsetX;
      const wz = startZ + this.chunkSize / 2 + offsetZ;
      const distFromCenter = Math.sqrt(wx * wx + wz * wz);

      // Don't spawn trees directly on top of starting hub platform
      if (distFromCenter < 18) continue;

      const wy = this.getTerrainHeight(wx, wz);
      if (wy > 1.2 && wy < 18) {
        const isLuminous = (i % 3 === 0);
        const tree = this.createTree(isLuminous);
        tree.position.set(wx, wy, wz);
        const scale = 0.85 + ((i * 13) % 4) * 0.15;
        tree.scale.set(scale, scale, scale);
        chunkGroup.add(tree);
      }
    }

    // 4. Ancient Ruins, Pillars & Arches
    if ((cx + cz) % 2 === 0) {
      const rx = startX + this.chunkSize / 2 + 12;
      const rz = startZ + this.chunkSize / 2 - 14;
      const ry = this.getTerrainHeight(rx, rz);
      if (ry > 2) {
        const ruin = this.createAncientRuinArch();
        ruin.position.set(rx, ry, rz);
        chunkGroup.add(ruin);
      }
    }

    // 5. Giant Basalt Boulders
    const numRocks = 4 + (rngSeed % 4);
    for (let i = 0; i < numRocks; i++) {
      const ox = ((rngSeed * (i + 5) * 23) % (this.chunkSize - 12)) - this.chunkSize / 2 + 6;
      const oz = ((rngSeed * (i + 5) * 47) % (this.chunkSize - 12)) - this.chunkSize / 2 + 6;
      const wx = startX + this.chunkSize / 2 + ox;
      const wz = startZ + this.chunkSize / 2 + oz;
      const wy = this.getTerrainHeight(wx, wz);

      if (wy > 2 && wy < 22) {
        const rock = this.createBoulder();
        rock.position.set(wx, wy + 0.5, wz);
        rock.userData.isWalkable = true;
        chunkGroup.add(rock);
      }
    }

    // 6. Natural Cave Feature on Chunk (cx=1, cz=-1)
    if (cx === 1 && cz === -1) {
      const cave = this.createCaveGrotto();
      const caveX = startX + 25;
      const caveZ = startZ + 25;
      const caveY = this.getTerrainHeight(caveX, caveZ);
      cave.position.set(caveX, caveY, caveZ);
      chunkGroup.add(cave);
    }

    return chunkGroup;
  }

  private createTree(luminous: boolean): THREE.Group {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 4.2, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.matTreeTrunk);
    trunk.position.y = 2.1;
    group.add(trunk);

    // Multi-tier layered coniferous / celestial foliage canopy
    const foliageMat = luminous ? this.matTreeFoliageLuminous : this.matTreeFoliagePine;
    const tiers = 3;
    for (let t = 0; t < tiers; t++) {
      const radius = 2.2 - t * 0.5;
      const coneGeo = new THREE.ConeGeometry(radius, 2.2, 6);
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = 3.2 + t * 1.3;
      group.add(cone);
    }

    // Bioluminescent glow bulb on luminous trees
    if (luminous) {
      const bulbGeo = new THREE.SphereGeometry(0.35, 6, 6);
      const bulb = new THREE.Mesh(bulbGeo, this.matCrystalGlowing);
      bulb.position.y = 6.2;
      group.add(bulb);
    }

    return group;
  }

  private createBoulder(): THREE.Mesh {
    const geo = new THREE.DodecahedronGeometry(1.4, 0);
    const mesh = new THREE.Mesh(geo, this.matTerrainRock);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    mesh.scale.set(1.2, 0.8, 1.4);
    return mesh;
  }

  private createAncientRuinArch(): THREE.Group {
    const group = new THREE.Group();

    // Left pillar
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.5, 1.2), this.matAncientStone);
    leftPillar.position.set(-2.8, 3.25, 0);
    leftPillar.userData.isWalkable = true;
    group.add(leftPillar);

    // Right pillar
    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.5, 1.2), this.matAncientStone);
    rightPillar.position.set(2.8, 3.25, 0);
    rightPillar.userData.isWalkable = true;
    group.add(rightPillar);

    // Lintel arch crossbeam
    const arch = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.2, 1.6), this.matAncientStone);
    arch.position.set(0, 6.8, 0);
    arch.userData.isWalkable = true;
    group.add(arch);

    // Ancient glowing runic core embedded in arch
    const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), this.matCrystalGlowing);
    rune.position.set(0, 5.8, 0);
    group.add(rune);

    return group;
  }

  private createCaveGrotto(): THREE.Group {
    const group = new THREE.Group();

    // Natural stone arch overhang forming cave entrance
    const caveRoof = new THREE.Mesh(new THREE.TorusGeometry(5.5, 2.2, 6, 12, Math.PI), this.matTerrainRock);
    caveRoof.position.set(0, 2.5, 0);
    caveRoof.rotation.x = Math.PI / 2;
    caveRoof.userData.isWalkable = true;
    group.add(caveRoof);

    // Luminous crystal formations inside cave grotto
    for (let c = 0; c < 3; c++) {
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.0, 5), this.matCrystalGlowing);
      crystal.position.set((c - 1) * 1.8, 1.0, -3.5);
      crystal.rotation.x = 0.2;
      group.add(crystal);
    }

    return group;
  }

  private disposeChunk(group: THREE.Group) {
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      }
    });
  }

  public destroy() {
    for (const group of this.loadedChunks.values()) {
      this.disposeChunk(group);
    }
    this.loadedChunks.clear();
    this.walkableMeshes.length = 0;
  }
}