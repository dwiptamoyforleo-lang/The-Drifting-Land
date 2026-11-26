import * as THREE from '../vendor/three.js';

/**
 * Compute local deck surface height matching Collision.js so all props sit flush on the ground.
 * @param {object} def
 * @param {number} lx
 * @param {number} lz
 * @returns {number}
 */
export function deckLocalY(def, lx, lz) {
  const r = Math.max(0.01, def.radius);
  const dist = Math.sqrt(lx * lx + lz * lz);
  const norm = Math.min(1, dist / r);
  const crown = Math.max(0, 1 - norm * norm) * (def.crownHeight ?? 0.55);
  const rimDrop = norm > 0.86 ? ((norm - 0.86) / 0.14) * 0.35 : 0;
  return crown - rimDrop;
}

/**
 * Deterministic pseudo-random helper for consistent island flora/ruin placement.
 * @param {string} seedStr
 * @param {number} index
 */
function seeded(seedStr, index) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= index * 374761393;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * Builds rich multi-part Three.js islands and interactive landmarks.
 */
export class IslandFactory {
  /**
   * @param {import('./ProceduralTextures.js').ProceduralTextures} textures
   */
  constructor(textures) {
    this.textures = textures;
    this._materials = this._createSharedMaterials();
    this._disposables = [];
  }

  _createSharedMaterials() {
    return {
      turfShallows: new THREE.MeshStandardMaterial({ map: this.textures.turf, roughness: 0.9, metalness: 0.02 }),
      turfMoor: new THREE.MeshStandardMaterial({ map: this.textures.moorTurf, roughness: 0.92, metalness: 0.02 }),
      turfRime: new THREE.MeshStandardMaterial({ map: this.textures.rimeTurf, roughness: 0.72, metalness: 0.08 }),
      cliff: new THREE.MeshStandardMaterial({ map: this.textures.cliff, roughness: 0.95, metalness: 0.02 }),
      stone: new THREE.MeshStandardMaterial({ map: this.textures.stone, roughness: 0.88, metalness: 0.05 }),
      wood: new THREE.MeshStandardMaterial({ map: this.textures.wood, roughness: 0.86, metalness: 0.04 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xd9a84e, roughness: 0.28, metalness: 0.88 }),
      iron: new THREE.MeshStandardMaterial({ color: 0x2c3338, roughness: 0.52, metalness: 0.72 }),
      bark: new THREE.MeshStandardMaterial({ color: 0x523927, roughness: 0.94, metalness: 0.0 }),
      leafLight: new THREE.MeshStandardMaterial({ color: 0x6ca13b, roughness: 0.85, metalness: 0.0 }),
      leafDark: new THREE.MeshStandardMaterial({ color: 0x3b6b28, roughness: 0.88, metalness: 0.0 }),
      leafRime: new THREE.MeshStandardMaterial({ color: 0x89b3bd, roughness: 0.78, metalness: 0.05 }),
      streamer: new THREE.MeshStandardMaterial({ color: 0xe68952, roughness: 0.75, side: THREE.DoubleSide }),
      water: new THREE.MeshStandardMaterial({ color: 0xc2eaf8, emissive: 0x326a8a, emissiveIntensity: 0.25, transparent: true, opacity: 0.76, roughness: 0.15 }),
      cloak: new THREE.MeshStandardMaterial({ color: 0x28475c, roughness: 0.85 }),
      husk: new THREE.MeshStandardMaterial({ color: 0x9aa3a6, roughness: 0.95 }),
    };
  }

  /**
   * @param {object} def
   */
  buildIsland(def) {
    const group = new THREE.Group();
    group.name = `island_${def.id}`;
    group.position.set(def.basePos[0], def.basePos[1], def.basePos[2]);

    const r = def.radius;
    const crownH = def.crownHeight ?? 0.55;

    // 1. Sculpted domed plateau top mesh
    const topGeo = new THREE.CylinderGeometry(r * 0.98, r * 1.01, 0.7, 24, 3);
    const posAttr = topGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      if (vy > 0) {
        posAttr.setY(i, deckLocalY(def, vx, vz));
      } else {
        posAttr.setY(i, -0.65);
      }
    }
    topGeo.computeVertexNormals();
    this._disposables.push(topGeo);

    const turfMat =
      def.biome === 'rime'
        ? this._materials.turfRime
        : def.biome === 'hollowmoor'
          ? this._materials.turfMoor
          : this._materials.turfShallows;

    const topMesh = new THREE.Mesh(topGeo, turfMat);
    topMesh.receiveShadow = true;
    topMesh.castShadow = true;
    group.add(topMesh);

    // 2. Sculpted rocky crag underbelly (primary cone + 3 offset crag spurs)
    const cragDepth = r * 1.45;
    const cragGeo = new THREE.ConeGeometry(r * 0.97, cragDepth, 14);
    cragGeo.rotateX(Math.PI);
    this._disposables.push(cragGeo);
    const cragMesh = new THREE.Mesh(cragGeo, this._materials.cliff);
    cragMesh.position.y = -0.65 - cragDepth * 0.5;
    cragMesh.castShadow = true;
    cragMesh.receiveShadow = true;
    group.add(cragMesh);

    for (let s = 0; s < 3; s++) {
      const ang = seeded(def.id, 10 + s) * Math.PI * 2;
      const sr = r * (0.42 + seeded(def.id, 20 + s) * 0.25);
      const spurH = cragDepth * (0.45 + seeded(def.id, 30 + s) * 0.35);
      const spurGeo = new THREE.ConeGeometry(r * 0.36, spurH, 7);
      spurGeo.rotateX(Math.PI);
      this._disposables.push(spurGeo);
      const spur = new THREE.Mesh(spurGeo, this._materials.cliff);
      spur.position.set(Math.cos(ang) * sr, -0.7 - spurH * 0.5, Math.sin(ang) * sr);
      group.add(spur);
    }

    // 3. Wooden / stone bridges extending from the island
    const bridgeMeshes = [];
    const bridges = (def.bridges || []).map((b) => {
      const bridgeCopy = { ...b, extended: b.requiresVane ? Boolean(b.extended) : true };
      const bGroup = new THREE.Group();
      const hw = (b.width || 3.2) * 0.5;
      const len = b.length || 4.0;
      const yStart = b.yStart ?? 0.1;
      const yEnd = b.yEnd ?? yStart;
      const yMid = (yStart + yEnd) * 0.5;
      const pitch = Math.atan2(yStart - yEnd, len);

      bGroup.position.set(b.x || 0, yMid - 0.12, b.z || 0);
      bGroup.rotation.y = b.yaw || 0;

      const deckGeo = new THREE.BoxGeometry(b.width || 3.2, 0.24, Math.hypot(len, yEnd - yStart));
      this._disposables.push(deckGeo);
      const deckMesh = new THREE.Mesh(deckGeo, this._materials.wood);
      deckMesh.rotation.x = pitch;
      deckMesh.receiveShadow = true;
      deckMesh.castShadow = true;
      bGroup.add(deckMesh);

      // Rail posts along bridge sides
      const postGeo = new THREE.BoxGeometry(0.14, 0.72, 0.14);
      this._disposables.push(postGeo);
      [-1, 1].forEach((side) => {
        [-len * 0.38, 0, len * 0.38].forEach((pz) => {
          const post = new THREE.Mesh(postGeo, this._materials.wood);
          const t = (pz + len * 0.5) / len;
          post.position.set(side * (hw - 0.12), 0.38 + (yEnd - yStart) * (t - 0.5), pz);
          bGroup.add(post);
        });
      });

      bGroup.visible = bridgeCopy.extended;
      group.add(bGroup);
      bridgeMeshes.push({ data: bridgeCopy, group: bGroup });
      return bridgeCopy;
    });

    // 4. Colliders & atmospheric ruin pillars around the perimeter
    const colliders = [];
    const ruinCount = def.props?.ruins || 0;
    const pillarGeo = new THREE.CylinderGeometry(0.48, 0.58, 3.2, 8);
    const capGeo = new THREE.BoxGeometry(1.3, 0.35, 1.3);
    this._disposables.push(pillarGeo, capGeo);

    for (let i = 0; i < ruinCount; i++) {
      const baseAngle = ((i + 0.5) / Math.max(1, ruinCount)) * Math.PI * 2 + seeded(def.id, 50 + i) * 0.5;
      // Keep central spawn/bridge corridor along X=0 clearer
      const adjustedAngle = Math.abs(Math.cos(baseAngle)) < 0.35 ? baseAngle + 0.55 : baseAngle;
      const dist = r * (0.64 + seeded(def.id, 70 + i) * 0.22);
      const px = Math.cos(adjustedAngle) * dist;
      const pz = Math.sin(adjustedAngle) * dist;
      const py = deckLocalY(def, px, pz);
      const hScale = 0.65 + seeded(def.id, 90 + i) * 0.75;

      const ruinGroup = new THREE.Group();
      ruinGroup.position.set(px, py, pz);
      const col = new THREE.Mesh(pillarGeo, this._materials.stone);
      col.scale.y = hScale;
      col.position.y = 1.6 * hScale;
      col.castShadow = true;
      col.receiveShadow = true;
      ruinGroup.add(col);

      if (i % 2 === 0) {
        const cap = new THREE.Mesh(capGeo, this._materials.stone);
        cap.position.y = 3.2 * hScale + 0.14;
        cap.rotation.y = adjustedAngle;
        ruinGroup.add(cap);
      }
      group.add(ruinGroup);

      colliders.push({ x: px, y: py, z: pz, radius: 0.62, height: 3.3 * hScale, active: true });
    }

    // 5. Stylized multi-part trees
    const treeCount = def.props?.trees || 0;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 2.2, 7);
    const crownGeo1 = new THREE.DodecahedronGeometry(1.15, 0);
    const crownGeo2 = new THREE.DodecahedronGeometry(0.8, 0);
    this._disposables.push(trunkGeo, crownGeo1, crownGeo2);

    for (let t = 0; t < treeCount; t++) {
      const ang = Math.PI * (0.22 + t * 0.68) + seeded(def.id, 130 + t) * 0.4;
      const dist = r * 0.68;
      const tx = Math.cos(ang) * dist;
      const tz = Math.sin(ang) * dist;
      const ty = deckLocalY(def, tx, tz);
      const tree = new THREE.Group();
      tree.position.set(tx, ty, tz);

      const trunk = new THREE.Mesh(trunkGeo, this._materials.bark);
      trunk.position.y = 1.05;
      trunk.castShadow = true;
      tree.add(trunk);

      const leafMat = def.biome === 'rime' ? this._materials.leafRime : t % 2 === 0 ? this._materials.leafLight : this._materials.leafDark;
      const c1 = new THREE.Mesh(crownGeo1, leafMat);
      c1.position.set(0, 2.45, 0);
      c1.castShadow = true;
      const c2 = new THREE.Mesh(crownGeo2, leafMat);
      c2.position.set(0.48, 2.85, -0.2);
      tree.add(c1, c2);
      group.add(tree);

      colliders.push({ x: tx, y: ty, z: tz, radius: 0.45, height: 2.5, active: true });
    }

    // 6. Wind streamers (cloth ribbons showing sky-lane breeze)
    const streamers = [];
    const streamerCount = def.props?.streamers || 0;
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 2.8, 6);
    const ribbonGeo = new THREE.PlaneGeometry(1.7, 0.34, 5, 1);
    ribbonGeo.translate(0.85, 0, 0);
    this._disposables.push(poleGeo, ribbonGeo);

    for (let s = 0; s < streamerCount; s++) {
      const sx = (s % 2 === 0 ? -1 : 1) * (r * 0.72);
      const sz = s < 2 ? -r * 0.35 : r * 0.35;
      const sy = deckLocalY(def, sx, sz);
      const pole = new THREE.Mesh(poleGeo, this._materials.wood);
      pole.position.set(sx, sy + 1.4, sz);
      group.add(pole);

      const ribbon = new THREE.Mesh(ribbonGeo, this._materials.streamer);
      ribbon.position.set(sx, sy + 2.6, sz);
      group.add(ribbon);
      streamers.push(ribbon);
    }

    // 7. Waterfall ribbon spilling off cliff edge
    let waterfallMesh = null;
    if (def.props?.waterfall) {
      const wfGeo = new THREE.PlaneGeometry(2.2, 16, 2, 6);
      this._disposables.push(wfGeo);
      waterfallMesh = new THREE.Mesh(wfGeo, this._materials.water);
      waterfallMesh.position.set(r * 0.78, -8.1, 0);
      waterfallMesh.rotation.y = Math.PI * 0.5;
      group.add(waterfallMesh);
    }

    // 8. Stilled Husk / Mural / Chalk Marks
    if (def.props?.stilledHusk) {
      const husk = new THREE.Group();
      const hx = -2.4;
      const hz = 1.4;
      husk.position.set(hx, deckLocalY(def, hx, hz), hz);
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.7, 7), this._materials.husk);
      body.position.y = 0.85;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), this._materials.husk);
      head.position.y = 1.82;
      this._disposables.push(body.geometry, head.geometry);
      husk.add(body, head);
      group.add(husk);
    }

    // 9. Interactive entities attached to this island
    const interactables = [];

    if (def.wayglassPickup) {
      const wg = this._buildWayglassPedestal(def, def.wayglassPickup);
      group.add(wg.mesh);
      interactables.push(wg.interactable);
    }

    if (def.brazier) {
      const bz = this._buildBrazier(def, def.brazier);
      group.add(bz.mesh);
      interactables.push(bz.interactable);
    }

    if (def.beacon) {
      const bc = this._buildBeacon(def, def.beacon);
      group.add(bc.mesh);
      interactables.push(bc.interactable);
    }

    if (def.echo) {
      const ec = this._buildEchoShrine(def, def.echo);
      group.add(ec.mesh);
      interactables.push(ec.interactable);
    }

    if (def.npc) {
      const npc = this._buildNPC(def, def.npc);
      group.add(npc.mesh);
      interactables.push(npc.interactable);
    }

    if (def.mural) {
      const ml = this._buildMural(def, def.mural);
      group.add(ml.mesh);
      interactables.push(ml.interactable);
    }

    if (def.chalk) {
      const ch = this._buildChalk(def, def.chalk);
      group.add(ch.mesh);
      interactables.push(ch.interactable);
    }

    let vaneGate = null;
    if (def.vaneGate) {
      const vg = this._buildVaneGate(def, def.vaneGate);
      group.add(vg.mesh);
      interactables.push(vg.interactable);
      vaneGate = vg.interactable;
    }

    const updrafts = (def.updrafts || []).map((u) => {
      const ud = this._buildUpdraft(def, u);
      group.add(ud.mesh);
      return ud;
    });

    const hollowLamps = (def.hollowLamps || []).map((hl, idx) => {
      const lamp = this._buildHollowLamp(def, hl, idx);
      group.add(lamp.mesh);
      return lamp;
    });

    if (def.latticeHeart) {
      const lh = this._buildLatticeHeart(def, def.latticeHeart);
      group.add(lh.mesh);
      interactables.push(lh.interactable);
    }

    return {
      ...def,
      group,
      bridges,
      bridgeMeshes,
      colliders,
      streamers,
      waterfallMesh,
      interactables,
      updrafts,
      hollowLamps,
      vaneGate,
      anchored: false,
      anchoredTime: null,
    };
  }

  _buildWayglassPedestal(def, cfg) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 1.05, 8), this._materials.stone);
    plinth.position.y = 0.52;
    const brassRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 24), this._materials.brass);
    brassRing.position.y = 1.42;
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x8fd6e8, emissive: 0x4ca8c4, emissiveIntensity: 0.9, transparent: true, opacity: 0.78 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), lensMat);
    lens.position.y = 1.42;
    const light = new THREE.PointLight(0x8fd6e8, 1.6, 8);
    light.position.y = 1.5;

    this._disposables.push(plinth.geometry, brassRing.geometry, lens.geometry, lensMat);
    g.add(plinth, brassRing, lens, light);

    const interactable = {
      type: 'wayglass',
      id: 'wayglass_pickup',
      label: 'Take the Wayglass',
      localPos: new THREE.Vector3(cfg.x, y + 1.1, cfg.z),
      radius: 2.8,
      collected: false,
      mesh: g,
      lens,
      brassRing,
    };
    return { mesh: g, interactable };
  }

  _buildBrazier(def, cfg) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 0.7, 8), this._materials.iron);
    base.position.y = 0.35;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.36, 0.35, 10), this._materials.brass);
    bowl.position.y = 0.85;
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xffb35a, emissive: 0xff7b24, emissiveIntensity: 1.8 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.65, 7), flameMat);
    flame.position.y = 1.25;
    const light = new THREE.PointLight(0xff9d4a, 2.2, 11);
    light.position.y = 1.5;

    this._disposables.push(base.geometry, bowl.geometry, flame.geometry, flameMat);
    g.add(base, bowl, flame, light);

    return {
      mesh: g,
      interactable: {
        type: 'brazier',
        id: `${def.id}_brazier`,
        label: 'Warm Ember Lantern',
        localPos: new THREE.Vector3(cfg.x, y + 1.0, cfg.z),
        radius: 2.8,
        flame,
      },
    };
  }

  _buildBeacon(def, cfg) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);

    const step1 = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.9, 0.45, 10), this._materials.stone);
    step1.position.y = 0.22;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 1.8, 8), this._materials.stone);
    pillar.position.y = 1.25;
    const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.08, 8, 24), this._materials.brass);
    cradle.position.y = 2.45;
    const ringInner = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 24), this._materials.brass);
    ringInner.position.y = 2.45;
    ringInner.rotation.x = Math.PI * 0.35;

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x627482,
      emissive: 0xff8c2b,
      emissiveIntensity: 0.15,
      roughness: 0.3,
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), coreMat);
    core.position.y = 2.45;

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffc46b,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.65, 42, 10, 1, true), beamMat);
    beam.position.y = 23.5;
    beam.visible = false;

    const light = new THREE.PointLight(0xffa742, 0.4, 18);
    light.position.y = 2.8;

    this._disposables.push(step1.geometry, pillar.geometry, cradle.geometry, ringInner.geometry, core.geometry, coreMat, beam.geometry, beamMat);
    g.add(step1, pillar, cradle, ringInner, core, beam, light);

    return {
      mesh: g,
      interactable: {
        type: 'beacon',
        id: cfg.id,
        name: cfg.name,
        unlocksRegion: cfg.unlocksRegion,
        islandId: def.id,
        label: `Light ${cfg.name}`,
        localPos: new THREE.Vector3(cfg.x, y + 1.8, cfg.z),
        radius: 3.4,
        lit: false,
        core,
        coreMat,
        cradle,
        ringInner,
        beam,
        light,
      },
    };
  }

  _buildEchoShrine(def, cfg) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);

    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.5, 0.9, 6), this._materials.stone);
    ped.position.y = 0.45;
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x8fd6e8,
      emissive: 0x4fc3e0,
      emissiveIntensity: 1.25,
      roughness: 0.15,
      metalness: 0.2,
    });
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), shardMat);
    shard.position.y = 1.55;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 8, 22), this._materials.brass);
    ring.position.y = 1.55;

    this._disposables.push(ped.geometry, shard.geometry, shardMat, ring.geometry);
    g.add(ped, shard, ring);

    return {
      mesh: g,
      interactable: {
        type: 'echo',
        id: cfg.id,
        title: cfg.title,
        text: cfg.text,
        label: `Attune ${cfg.title}`,
        localPos: new THREE.Vector3(cfg.x, y + 1.4, cfg.z),
        radius: 2.9,
        collected: false,
        shard,
        shardMat,
        ring,
      },
    };
  }

  _buildNPC(def, cfg) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);

    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.55, 8), this._materials.cloak);
    robe.position.y = 0.78;
    const shawl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.48, 0.55, 8), this._materials.streamer);
    shawl.position.y = 1.25;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 10), this._materials.cloak);
    hood.position.y = 1.72;
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.9, 6), this._materials.wood);
    staff.position.set(0.48, 0.95, 0.12);
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffd284, emissive: 0xff9d4a, emissiveIntensity: 1.5 });
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), lanternMat);
    lantern.position.set(0.48, 1.85, 0.12);

    this._disposables.push(robe.geometry, shawl.geometry, hood.geometry, staff.geometry, lantern.geometry, lanternMat);
    g.add(robe, shawl, hood, staff, lantern);

    return {
      mesh: g,
      interactable: {
        type: 'npc',
        id: cfg.id,
        name: cfg.name,
        lines: cfg.lines,
        lineIndex: 0,
        label: `Speak with ${cfg.name}`,
        localPos: new THREE.Vector3(cfg.x, y + 1.2, cfg.z),
        radius: 3.1,
      },
    };
  }

  _buildMural(def, cfg) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.0, 0.35), this._materials.stone);
    slab.position.y = 1.0;
    const inlay = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 20), this._materials.brass);
    inlay.position.set(0, 1.18, 0.19);
    this._disposables.push(slab.geometry, inlay.geometry);
    g.add(slab, inlay);

    return {
      mesh: g,
      interactable: {
        type: 'mural',
        id: `${def.id}_mural`,
        title: cfg.title,
        text: cfg.text,
        label: 'Examine Carved Mural',
        localPos: new THREE.Vector3(cfg.x, y + 1.1, cfg.z),
        radius: 3.0,
      },
    };
  }

  _buildChalk(def, cfg) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);

    const cairn = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.65, 6), this._materials.stone);
    cairn.position.y = 0.32;
    const markMat = new THREE.MeshBasicMaterial({ color: 0xf3ecd8 });
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.28, 12), markMat);
    mark.rotation.x = -Math.PI / 2;
    mark.position.y = 0.05;
    this._disposables.push(cairn.geometry, mark.geometry, markMat);
    g.add(cairn, mark);

    return {
      mesh: g,
      interactable: {
        type: 'chalk',
        id: `${def.id}_chalk`,
        text: cfg.text,
        label: "Read Wren's Chalk Note",
        localPos: new THREE.Vector3(cfg.x, y + 0.6, cfg.z),
        radius: 2.8,
      },
    };
  }

  _buildVaneGate(def, cfg) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.7, 8), this._materials.stone);
    post.position.y = 1.35;
    const rotor = new THREE.Group();
    rotor.position.set(0, 2.35, 0.22);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 10), this._materials.brass);
    hub.rotation.x = Math.PI / 2;
    rotor.add(hub);

    const bladeGeo = new THREE.BoxGeometry(0.24, 1.15, 0.04);
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(bladeGeo, this._materials.brass);
      const a = (b / 4) * Math.PI * 2;
      blade.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
      blade.rotation.z = a + Math.PI * 0.5;
      rotor.add(blade);
    }

    this._disposables.push(post.geometry, hub.geometry, bladeGeo);
    g.add(post, rotor);

    return {
      mesh: g,
      interactable: {
        type: 'vaneGate',
        id: cfg.id,
        bridgeId: cfg.bridgeId,
        label: `Call Wind on ${cfg.label}`,
        localPos: new THREE.Vector3(cfg.x, y + 1.5, cfg.z),
        radius: 5.5,
        activated: false,
        spinSpeed: 0.4,
        rotor,
      },
    };
  }

  _buildUpdraft(def, cfg) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0x8fd6e8, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
    const baseRing = new THREE.Mesh(new THREE.RingGeometry(cfg.radius * 0.55, cfg.radius * 0.85, 24), ringMat);
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = 0.08;

    const spiralGeo = new THREE.TorusGeometry(cfg.radius * 0.52, 0.05, 6, 20);
    const r1 = new THREE.Mesh(spiralGeo, ringMat);
    r1.rotation.x = Math.PI / 2;
    r1.position.y = 1.6;
    const r2 = new THREE.Mesh(spiralGeo, ringMat);
    r2.rotation.x = Math.PI / 2;
    r2.position.y = 3.2;

    this._disposables.push(baseRing.geometry, spiralGeo, ringMat);
    g.add(baseRing, r1, r2);

    return {
      mesh: g,
      r1,
      r2,
      localPos: new THREE.Vector3(cfg.x, y, cfg.z),
      radius: cfg.radius || 2.3,
      lift: cfg.lift || 11.5,
    };
  }

  _buildHollowLamp(def, cfg, idx) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.cx, cfg.cz) + 1.35;
    g.position.set(cfg.cx, y, cfg.cz);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.55, 6), this._materials.iron);
    cap.position.y = 0.45;
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.58, 6), this._materials.iron);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xc8a4e8, emissive: 0x8d52c4, emissiveIntensity: 1.5 });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), coreMat);
    const auraMat = new THREE.MeshBasicMaterial({ color: 0x9b64cf, transparent: true, opacity: 0.16, depthWrite: false });
    const aura = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 12), auraMat);

    this._disposables.push(cap.geometry, cage.geometry, core.geometry, coreMat, aura.geometry, auraMat);
    g.add(cap, cage, core, aura);

    return {
      id: `${def.id}_lamp_${idx}`,
      cfg,
      mesh: g,
      localPos: new THREE.Vector3(cfg.cx, y, cfg.cz),
    };
  }

  _buildLatticeHeart(def, cfg) {
    const g = new THREE.Group();
    const y = deckLocalY(def, cfg.x, cfg.z);
    g.position.set(cfg.x, y, cfg.z);

    const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.1, 0.5, 16), this._materials.stone);
    dais.position.y = 0.25;
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.08, 10, 36), this._materials.brass);
    ring1.position.y = 2.6;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 10, 32), this._materials.brass);
    ring2.position.y = 2.6;
    ring2.rotation.y = Math.PI * 0.4;
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xf6c978,
      emissive: 0x8fd6e8,
      emissiveIntensity: 1.35,
      roughness: 0.12,
      metalness: 0.4,
    });
    const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), heartMat);
    heart.position.y = 2.6;
    const light = new THREE.PointLight(0xf6c978, 3.0, 24);
    light.position.y = 2.8;

    this._disposables.push(dais.geometry, ring1.geometry, ring2.geometry, heart.geometry, heartMat);
    g.add(dais, ring1, ring2, heart, light);

    return {
      mesh: g,
      interactable: {
        type: 'latticeHeart',
        id: 'lattice_heart',
        label: 'Approach the Lattice Heart',
        localPos: new THREE.Vector3(cfg.x, y + 1.8, cfg.z),
        radius: 4.0,
        ring1,
        ring2,
        heart,
      },
    };
  }

  dispose() {
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables.length = 0;
    for (const m of Object.values(this._materials)) {
      m.dispose();
    }
  }
}
