/**
 * World and Environment builder for The Drifting World.
 * Features:
 * - Luminous turquoise and teal ocean
 * - Floating islands with rocky undersides & turquoise grass surfaces
 * - Ancient stone ruins, arches, and ruined towers
 * - Mysterious distant long-legged silhouettes (striders)
 * - Stylized fantasy flora, glowing mushrooms, crystals, and trees
 * - Sky dome, distant floating rock formations and atmospheric fog
 */
import * as THREE from 'three';
import { MagicalAnchor, WorldFragment, InscriptionLore } from './types';

export class WorldManager {
  public scene: THREE.Scene;
  public walkableMeshes: THREE.Object3D[] = [];
  public animatables: Array<{ update: (time: number, delta: number) => void }> = [];

  // Interactive structures
  public anchors: MagicalAnchor[] = [];
  public fragments: WorldFragment[] = [];
  public inscriptions: InscriptionLore[] = [];

  // Special structures
  public oceanMesh!: THREE.Mesh;
  public citadelGroup!: THREE.Group;
  public citadelBridge!: THREE.Group;
  public isCitadelRevealed: boolean = false;
  private citadelTargetY: number = 7.0;
  private citadelTargetZ: number = -65.0;

  // Striders
  public striders: THREE.Group[] = [];

  // Motes particle system
  private motesSystem!: THREE.Points;

  // Shared low-poly materials for optimal mobile batching & performance
  private matGrass!: THREE.MeshLambertMaterial;
  private matRock!: THREE.MeshLambertMaterial;
  private matAncientStone!: THREE.MeshLambertMaterial;
  private matRuinPillar!: THREE.MeshLambertMaterial;
  private matCrystalCyan!: THREE.MeshStandardMaterial;
  private matWood!: THREE.MeshLambertMaterial;
  private matFoliageTeal!: THREE.MeshLambertMaterial;
  private matFoliageViolet!: THREE.MeshLambertMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initMaterials();
  }

  private initMaterials() {
    // Turquoise & teal vibrant fantasy grass surface
    this.matGrass = new THREE.MeshLambertMaterial({
      color: 0x14b8a6, // rich teal-turquoise
      flatShading: true,
    });

    // Dark craggy violet/slate underside of floating islands
    this.matRock = new THREE.MeshLambertMaterial({
      color: 0x1e2238, // deep violet-charcoal rock
      flatShading: true,
    });

    // Ancient weathered stone
    this.matAncientStone = new THREE.MeshLambertMaterial({
      color: 0x334155, // slate-500
      flatShading: true,
    });

    this.matRuinPillar = new THREE.MeshLambertMaterial({
      color: 0x475569,
      flatShading: true,
    });

    // Luminous glowing crystals
    this.matCrystalCyan = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.1,
      flatShading: true,
    });

    // Fantasy flora
    this.matWood = new THREE.MeshLambertMaterial({
      color: 0x242436,
      flatShading: true,
    });

    this.matFoliageTeal = new THREE.MeshLambertMaterial({
      color: 0x0d9488,
      flatShading: true,
    });

    this.matFoliageViolet = new THREE.MeshLambertMaterial({
      color: 0x7c3aed,
      flatShading: true,
    });
  }

  public buildWorld() {
    this.setupLighting();
    this.buildSkyAndAtmosphere();
    this.buildLuminousOcean();
    this.buildDistantScenery();
    this.buildDistantStriders();

    // Islands
    this.buildStartingIsland();       // Threshold Island
    this.buildSteppingStones();       // Bridge between islands
    this.buildSecondIsland();         // Twilight Spire Island
    this.buildThirdIsland();          // Meridian Sanctum Island
    this.buildHiddenResonanceCitadel(); // Revealed on resonance

    this.buildAtmosphericMotes();
  }

  private setupLighting() {
    // Atmospheric indigo ambient light for deep shadows
    const ambientLight = new THREE.AmbientLight(0x2d2b55, 1.2);
    this.scene.add(ambientLight);

    // Pale cyan/turquoise directional sunlight
    const dirLight = new THREE.DirectionalLight(0xa5f3fc, 1.6);
    dirLight.position.set(60, 100, 40);
    this.scene.add(dirLight);

    // Subtle violet rim light from below/behind for surreal mood
    const rimLight = new THREE.DirectionalLight(0x6366f1, 0.6);
    rimLight.position.set(-60, -20, -50);
    this.scene.add(rimLight);
  }

  private buildSkyAndAtmosphere() {
    // Fog color matches the horizon of the reference image: deep twilight teal-navy
    this.scene.fog = new THREE.FogExp2(0x0a1626, 0.0075);
    this.scene.background = new THREE.Color(0x0a1626);

    // Large Sky Dome with soft gradient simulation
    const skyGeo = new THREE.SphereGeometry(600, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x0f1c30,
      side: THREE.BackSide,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyMesh);

    // Distant floating rock monoliths suspended in the clouds
    const monolithGeo = new THREE.ConeGeometry(8, 26, 5);
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 220 + Math.random() * 150;
      const monolith = new THREE.Mesh(monolithGeo, this.matRock);
      monolith.rotation.x = Math.PI; // pointing down
      monolith.position.set(
        Math.cos(angle) * dist,
        40 + Math.sin(i * 1.5) * 35,
        Math.sin(angle) * dist
      );
      monolith.scale.set(1.5 + Math.random(), 1.5 + Math.random(), 1.5 + Math.random());
      this.scene.add(monolith);

      // Add gentle bobbing animation to floating monoliths
      const origY = monolith.position.y;
      const speed = 0.4 + Math.random() * 0.3;
      const phase = Math.random() * Math.PI * 2;
      this.animatables.push({
        update: (time) => {
          monolith.position.y = origY + Math.sin(time * speed + phase) * 2.0;
        }
      });
    }
  }

  private buildLuminousOcean() {
    // Vast luminous ocean plane with vertex ripple animation
    const oceanGeo = new THREE.PlaneGeometry(900, 900, 48, 48);
    oceanGeo.rotateX(-Math.PI / 2);

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0d9488,       // luminous teal
      emissive: 0x042f2e,    // deep sea glow
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.2,
      flatShading: true,
    });

    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.y = -11.0;
    this.scene.add(this.oceanMesh);

    // Store original vertex Y for wave animation
    const posAttr = oceanGeo.attributes.position;
    const initialPositions = posAttr.array.slice() as Float32Array;

    this.animatables.push({
      update: (time) => {
        const positions = posAttr.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          const x = initialPositions[i];
          const z = initialPositions[i + 2];
          // Gentle undulating waves
          positions[i + 1] = initialPositions[i + 1] +
            Math.sin(x * 0.03 + time * 1.2) * 0.4 +
            Math.cos(z * 0.04 + time * 0.9) * 0.4;
        }
        posAttr.needsUpdate = true;
      }
    });
  }

  /**
   * Distant Striders / Colossi:
   * Strange, enormous, long-legged silhouettes standing in the distant ocean mist.
   * Matches the mysterious surreal figures in the visual reference!
   */
  private buildDistantStriders() {
    const createStrider = (x: number, z: number, scale: number, rotation: number) => {
      const striderGroup = new THREE.Group();
      striderGroup.position.set(x, -11, z);
      striderGroup.rotation.y = rotation;
      striderGroup.scale.setScalar(scale);

      // Dark silhouette material with slight fog-matching tint
      const matStrider = new THREE.MeshBasicMaterial({
        color: 0x111c2e,
      });

      // Small towering body pod at the top (65m high)
      const bodyGeo = new THREE.ConeGeometry(3, 8, 5);
      const bodyMesh = new THREE.Mesh(bodyGeo, matStrider);
      bodyMesh.position.y = 65;
      bodyMesh.rotation.x = Math.PI * 0.1;
      striderGroup.add(bodyMesh);

      // Glowing mystical eye / sigil in the head
      const eyeGeo = new THREE.SphereGeometry(0.8, 6, 6);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x5eead4 });
      const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
      eyeMesh.position.set(0, 68, 1.8);
      striderGroup.add(eyeMesh);

      // Four ultra-long spindly stilt legs extending into the ocean
      const legGeo = new THREE.CylinderGeometry(0.3, 0.7, 66, 4);
      const legPositions = [
        { x: -5, z: -5, rx: -0.15, rz: -0.12 },
        { x: 5, z: -5, rx: -0.15, rz: 0.12 },
        { x: -6, z: 6, rx: 0.15, rz: -0.14 },
        { x: 6, z: 6, rx: 0.15, rz: 0.14 },
      ];

      legPositions.forEach((pos) => {
        const leg = new THREE.Mesh(legGeo, matStrider);
        leg.position.set(pos.x, 33, pos.z);
        leg.rotation.x = pos.rx;
        leg.rotation.z = pos.rz;
        striderGroup.add(leg);
      });

      this.scene.add(striderGroup);
      this.striders.push(striderGroup);

      // Subtle slow swaying animation
      const swaySpeed = 0.35 + Math.random() * 0.15;
      const swayPhase = Math.random() * Math.PI * 2;
      this.animatables.push({
        update: (time) => {
          bodyMesh.rotation.z = Math.sin(time * swaySpeed + swayPhase) * 0.05;
          bodyMesh.rotation.x = Math.PI * 0.1 + Math.cos(time * swaySpeed * 0.8) * 0.03;
        }
      });
    };

    // Place 4 mysterious striders across different horizons
    createStrider(140, -180, 1.4, -0.6);
    createStrider(-170, -220, 1.7, 0.4);
    createStrider(210, -80, 1.5, -1.2);
    createStrider(-190, 90, 1.3, 1.8);
  }

  private buildDistantScenery() {
    // Distant mountain ranges & rock arches on the horizon
    const mountainGeo = new THREE.ConeGeometry(70, 120, 6);
    const mountainMat = new THREE.MeshLambertMaterial({
      color: 0x141f33,
      flatShading: true,
    });

    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const m = new THREE.Mesh(mountainGeo, mountainMat);
      m.position.set(
        Math.cos(angle) * 440,
        15 + Math.random() * 20,
        Math.sin(angle) * 440
      );
      m.scale.set(1.2 + Math.random() * 0.8, 1.0 + Math.random() * 0.5, 1.2 + Math.random() * 0.8);
      this.scene.add(m);
    }
  }

  /**
   * Helper to create a stylized floating island mesh
   */
  private createFloatingIsland(
    radius: number,
    depth: number,
    position: THREE.Vector3,
    roughness: number = 0.25
  ): { group: THREE.Group; topMesh: THREE.Mesh } {
    const group = new THREE.Group();
    group.position.copy(position);

    // 1. Grassy Top Surface (Walkable)
    const topGeo = new THREE.CylinderGeometry(radius, radius * 0.95, 1.2, 14);
    // Perturb vertices slightly for low-poly organic feel
    const pos = topGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y > 0) {
        pos.setY(i, y + (Math.sin(x * 0.8) + Math.cos(z * 0.8)) * roughness);
      }
    }
    topGeo.computeVertexNormals();

    const topMesh = new THREE.Mesh(topGeo, this.matGrass);
    topMesh.position.y = 0.6;
    group.add(topMesh);
    this.walkableMeshes.push(topMesh);

    // 2. Rocky Craggy Underside (Inverted cone with stalactites)
    const underGeo = new THREE.ConeGeometry(radius * 0.96, depth, 14);
    underGeo.rotateX(Math.PI);
    const underMesh = new THREE.Mesh(underGeo, this.matRock);
    underMesh.position.y = -depth / 2;
    group.add(underMesh);

    // 3. Hanging crystal clusters underneath
    const crystalGeo = new THREE.ConeGeometry(0.8, 4.0, 5);
    crystalGeo.rotateX(Math.PI);
    for (let c = 0; c < 5; c++) {
      const cr = new THREE.Mesh(crystalGeo, this.matCrystalCyan);
      const ang = Math.random() * Math.PI * 2;
      const dist = (radius * 0.4) * Math.random();
      cr.position.set(Math.cos(ang) * dist, -depth * 0.6 - Math.random() * 2, Math.sin(ang) * dist);
      group.add(cr);
    }

    this.scene.add(group);
    return { group, topMesh };
  }

  /**
   * Helper to add stylized fantasy trees and glowing flora
   */
  private addFlora(parent: THREE.Group, x: number, z: number, type: 'tree' | 'bush' | 'crystals') {
    if (type === 'tree') {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(x, 1.2, z);

      // Slender twisted trunk
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.55, 4.5, 5);
      const trunk = new THREE.Mesh(trunkGeo, this.matWood);
      trunk.position.y = 2.25;
      treeGroup.add(trunk);

      // Layered polygonal foliage (Teal & Violet)
      const f1Geo = new THREE.DodecahedronGeometry(2.2, 0);
      const f1 = new THREE.Mesh(f1Geo, this.matFoliageTeal);
      f1.position.set(0, 4.4, 0);
      treeGroup.add(f1);

      const f2Geo = new THREE.DodecahedronGeometry(1.6, 0);
      const f2 = new THREE.Mesh(f2Geo, this.matFoliageViolet);
      f2.position.set(0.6, 5.8, 0.4);
      treeGroup.add(f2);

      parent.add(treeGroup);
    } else if (type === 'crystals') {
      const cGeo = new THREE.ConeGeometry(0.4, 1.8, 5);
      const crystal = new THREE.Mesh(cGeo, this.matCrystalCyan);
      crystal.position.set(x, 1.2, z);
      crystal.rotation.x = (Math.random() - 0.5) * 0.4;
      crystal.rotation.z = (Math.random() - 0.5) * 0.4;
      parent.add(crystal);
    } else {
      // Glow bush
      const bushGeo = new THREE.IcosahedronGeometry(0.9, 0);
      const bush = new THREE.Mesh(bushGeo, this.matFoliageTeal);
      bush.position.set(x, 1.2, z);
      bush.scale.set(1.2, 0.8, 1.1);
      parent.add(bush);
    }
  }

  /**
   * Helper to build Ancient Stone Gateway / Broken Arch
   */
  private buildAncientArch(parent: THREE.Group, x: number, z: number, rotation: number) {
    const archGroup = new THREE.Group();
    archGroup.position.set(x, 1.2, z);
    archGroup.rotation.y = rotation;

    const pillarGeo = new THREE.BoxGeometry(1.4, 7.5, 1.4);
    const p1 = new THREE.Mesh(pillarGeo, this.matAncientStone);
    p1.position.set(-3, 3.75, 0);
    archGroup.add(p1);
    this.walkableMeshes.push(p1);

    const p2 = new THREE.Mesh(pillarGeo, this.matAncientStone);
    p2.position.set(3, 3.75, 0);
    archGroup.add(p2);
    this.walkableMeshes.push(p2);

    // Lintel beam across top
    const lintelGeo = new THREE.BoxGeometry(8.2, 1.2, 1.8);
    const lintel = new THREE.Mesh(lintelGeo, this.matAncientStone);
    lintel.position.set(0, 7.8, 0);
    archGroup.add(lintel);
    this.walkableMeshes.push(lintel);

    // Floating rune ring in the center
    const runeRingGeo = new THREE.TorusGeometry(1.6, 0.15, 6, 12);
    const runeRing = new THREE.Mesh(runeRingGeo, this.matCrystalCyan);
    runeRing.position.set(0, 4.2, 0);
    archGroup.add(runeRing);

    this.animatables.push({
      update: (time) => {
        runeRing.rotation.z = time * 0.5;
        runeRing.rotation.y = Math.sin(time * 0.8) * 0.3;
      }
    });

    parent.add(archGroup);
  }

  /**
   * Helper to create a Magical Anchor pedestal with floating rotating crystal
   */
  private createAnchorStructure(
    id: string,
    name: string,
    subtitle: string,
    description: string,
    pos: [number, number, number],
    color: number,
    connectsTo: string | null
  ) {
    const anchorGroup = new THREE.Group();
    anchorGroup.position.set(...pos);

    // Carved stone pedestal dais
    const baseGeo = new THREE.CylinderGeometry(1.8, 2.4, 0.8, 8);
    const baseMesh = new THREE.Mesh(baseGeo, this.matAncientStone);
    baseMesh.position.y = 0.4;
    anchorGroup.add(baseMesh);
    this.walkableMeshes.push(baseMesh);

    // Inner rune ring
    const ringGeo = new THREE.TorusGeometry(1.2, 0.12, 6, 16);
    ringGeo.rotateX(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, this.matCrystalCyan);
    ringMesh.position.y = 0.85;
    anchorGroup.add(ringMesh);

    // Hovering dual-pyramid crystal obelisk
    const crystalGeo = new THREE.OctahedronGeometry(1.0, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.2,
      flatShading: true,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.y = 2.4;
    crystalMesh.scale.set(0.9, 1.8, 0.9);
    anchorGroup.add(crystalMesh);

    // Point light
    const pointLight = new THREE.PointLight(color, 2.0, 16);
    pointLight.position.set(0, 2.4, 0);
    anchorGroup.add(pointLight);

    // Vertical ethereal beacon beam (cylinder, initially faint)
    const beamGeo = new THREE.CylinderGeometry(0.2, 0.2, 60, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.2,
      wireframe: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 32;
    anchorGroup.add(beam);

    this.scene.add(anchorGroup);

    // Rotating and bobbing animation
    this.animatables.push({
      update: (time) => {
        crystalMesh.rotation.y = time * 1.2;
        crystalMesh.position.y = 2.4 + Math.sin(time * 2.0) * 0.2;
        ringMesh.rotation.z = -time * 0.8;
      }
    });

    const anchorData: MagicalAnchor = {
      id,
      name,
      subtitle,
      description,
      position: pos,
      beamColor: color,
      activated: false,
      connectsTo,
      mesh: anchorGroup,
      crystalMesh,
      light: pointLight,
    };

    this.anchors.push(anchorData);
    return anchorData;
  }

  /**
   * Helper to create a collectible World Fragment
   */
  private createWorldFragment(
    id: string,
    name: string,
    lore: string,
    pos: [number, number, number]
  ) {
    const fragGroup = new THREE.Group();
    fragGroup.position.set(...pos);

    // Floating multifaceted diamond shard
    const fragGeo = new THREE.OctahedronGeometry(0.55, 0);
    const fragMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.0,
      roughness: 0.1,
      metalness: 0.3,
    });
    const shard = new THREE.Mesh(fragGeo, fragMat);
    fragGroup.add(shard);

    // Glowing orbiting mini-ring
    const ringGeo = new THREE.TorusGeometry(0.85, 0.05, 6, 16);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xa5f3fc }));
    fragGroup.add(ring);

    const light = new THREE.PointLight(0x67e8f9, 1.5, 8);
    fragGroup.add(light);

    this.scene.add(fragGroup);

    this.animatables.push({
      update: (time) => {
        shard.rotation.x = time * 1.4;
        shard.rotation.y = time * 1.8;
        ring.rotation.x = Math.PI / 3 + Math.sin(time * 1.5) * 0.4;
        ring.rotation.y = time * 2.2;
        fragGroup.position.y = pos[1] + Math.sin(time * 2.5) * 0.15;
      }
    });

    const fragment: WorldFragment = {
      id,
      name,
      lore,
      position: pos,
      collected: false,
      mesh: fragGroup,
    };

    this.fragments.push(fragment);
    return fragment;
  }

  /**
   * Helper to create Ancient Inscription Stele
   */
  private createInscriptionStele(
    id: string,
    title: string,
    text: string,
    pos: [number, number, number]
  ) {
    const steleGroup = new THREE.Group();
    steleGroup.position.set(...pos);

    // Upright megalithic stone tablet
    const tabletGeo = new THREE.BoxGeometry(1.2, 2.6, 0.4);
    const tablet = new THREE.Mesh(tabletGeo, this.matAncientStone);
    tablet.position.y = 1.3;
    steleGroup.add(tablet);
    this.walkableMeshes.push(tablet);

    // Glowing engraved glyph plate on front
    const glyphGeo = new THREE.PlaneGeometry(0.8, 1.6);
    const glyphMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.8,
    });
    const glyph = new THREE.Mesh(glyphGeo, glyphMat);
    glyph.position.set(0, 1.4, 0.22);
    steleGroup.add(glyph);

    this.scene.add(steleGroup);

    const insc: InscriptionLore = {
      id,
      title,
      text,
      position: pos,
      mesh: steleGroup,
    };

    this.inscriptions.push(insc);
    return insc;
  }

  // 1. Starting Island: The Threshold
  private buildStartingIsland() {
    const { group } = this.createFloatingIsland(18, 16, new THREE.Vector3(0, 0, 0));

    // Monumental broken Gateway Arch
    this.buildAncientArch(group, 0, -10, 0);

    // Ancient Inscription Stele
    this.createInscriptionStele(
      'stele-origins',
      'The First Drift',
      'Before the severing, the sky was a seamless continent. When the core fractured, the land drifted into an eternal sea of turquoise light. Find the three anchors of dawn, twilight, and meridian to awaken the resonance path.',
      [4, 0.8, -4]
    );

    // Anchor Alpha (The Dawn Anchor)
    this.createAnchorStructure(
      'anchor-alpha',
      'The Dawn Anchor',
      'Anchor of the East Skies',
      'An ancient harmonic anchor humming with dormant turquoise energy. Attune it to restore celestial resonance.',
      [0, 0.8, -8],
      0x2dd4bf, // luminous teal
      'anchor-beta'
    );

    // World Fragment #1
    this.createWorldFragment(
      'fragment-alpha',
      'Shard of Origins',
      'A crystalline fragment glowing with the birth-light of the drifting realm.',
      [7.5, 2.0, 6.0]
    );

    // Flora & Rocks
    this.addFlora(group, -8, -4, 'tree');
    this.addFlora(group, 9, -2, 'tree');
    this.addFlora(group, -6, 7, 'tree');
    this.addFlora(group, 8, 4, 'crystals');
    this.addFlora(group, -5, -8, 'bush');
    this.addFlora(group, 4, 8, 'bush');
  }

  // Stepping stones across the chasm between Island 1 and 2
  private buildSteppingStones() {
    const stonePositions = [
      new THREE.Vector3(8, 0.6, -17),
      new THREE.Vector3(13, 1.2, -22),
      new THREE.Vector3(18, 2.0, -25),
      // Path towards Island 3
      new THREE.Vector3(-10, 0.8, -17),
      new THREE.Vector3(-16, 1.4, -22),
      new THREE.Vector3(-22, 1.9, -27),
      // Cross link between 2 and 3
      new THREE.Vector3(2, 2.2, -32),
      new THREE.Vector3(-8, 2.2, -33),
    ];

    const stoneGeo = new THREE.CylinderGeometry(2.0, 1.6, 1.2, 7);
    stonePositions.forEach((pos, idx) => {
      const stone = new THREE.Mesh(stoneGeo, this.matAncientStone);
      stone.position.copy(pos);
      this.scene.add(stone);
      this.walkableMeshes.push(stone);

      // Subtle float animation
      const origY = pos.y;
      this.animatables.push({
        update: (time) => {
          stone.position.y = origY + Math.sin(time * 1.5 + idx * 0.8) * 0.12;
        }
      });
    });
  }

  // 2. Second Island: The Twilight Spire
  private buildSecondIsland() {
    const { group } = this.createFloatingIsland(15, 14, new THREE.Vector3(25, 2.8, -32));

    // Ruined Ancient Spire Tower
    const towerGroup = new THREE.Group();
    towerGroup.position.set(4, 1.2, -3);

    const baseTowerGeo = new THREE.CylinderGeometry(3.5, 4.2, 16, 8);
    const tower = new THREE.Mesh(baseTowerGeo, this.matRuinPillar);
    tower.position.y = 8;
    towerGroup.add(tower);

    // Broken top of tower
    const brokenTopGeo = new THREE.ConeGeometry(3.2, 6, 7);
    const top = new THREE.Mesh(brokenTopGeo, this.matAncientStone);
    top.position.y = 18;
    top.rotation.z = 0.2;
    towerGroup.add(top);

    group.add(towerGroup);

    // Anchor Beta (The Twilight Anchor)
    this.createAnchorStructure(
      'anchor-beta',
      'The Twilight Anchor',
      'Anchor of the High Spire',
      'Resonates with the dusk frequency. When aligned with Dawn and Meridian, the ancient citadel shall reveal its sanctuary.',
      [23, 3.6, -30],
      0x38bdf8, // light blue / cyan
      'anchor-gamma'
    );

    // World Fragment #2
    this.createWorldFragment(
      'fragment-beta',
      'Core of Stillness',
      'Pulsates with tranquil harmony, holding gravity steady across the jagged peaks.',
      [27, 4.5, -36]
    );

    // Inscription Stele #2
    this.createInscriptionStele(
      'stele-threads',
      'Song of the Threads',
      'The threads are not cords of rope, but conduits of spatial intent. What is divided by the abyss can be bound once more through will and resonance.',
      [21, 3.6, -26]
    );

    // Flora
    this.addFlora(group, -6, 2, 'tree');
    this.addFlora(group, 7, 4, 'crystals');
  }

  // 3. Third Island: The Meridian Sanctum
  private buildThirdIsland() {
    const { group } = this.createFloatingIsland(15, 14, new THREE.Vector3(-28, 2.2, -35));

    // Megalithic Stone Circle ruins
    const circleGroup = new THREE.Group();
    circleGroup.position.set(0, 1.2, 0);

    const pillarGeo = new THREE.BoxGeometry(1.2, 5.0, 1.2);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const pil = new THREE.Mesh(pillarGeo, this.matAncientStone);
      pil.position.set(Math.cos(angle) * 7, 2.5, Math.sin(angle) * 7);
      pil.rotation.y = angle;
      if (i % 2 === 1) pil.rotation.z = 0.15; // tilted/broken pillar
      circleGroup.add(pil);
      this.walkableMeshes.push(pil);
    }
    group.add(circleGroup);

    // Anchor Gamma (The Meridian Anchor)
    this.createAnchorStructure(
      'anchor-gamma',
      'The Meridian Anchor',
      'Anchor of the Silent Meridian',
      'The third vertex of the tri-fold seal. Awakening this anchor will finalize the resonance network and reveal the hidden island.',
      [-28, 3.0, -35],
      0x818cf8, // soft indigo-violet
      'citadel'
    );

    // World Fragment #3
    this.createWorldFragment(
      'fragment-gamma',
      'Shard of Continuity',
      'An ancient geometric crystal humming with the frequency of the celestial architects.',
      [-33, 4.0, -32]
    );

    // Inscription Stele #3
    this.createInscriptionStele(
      'stele-zenith',
      'Awakening of Zenith',
      'When all three anchors resonate in unison, the Sunken Zenith will rise from the ocean veil, opening the gate to the Drifting Core.',
      [-24, 3.0, -38]
    );

    this.addFlora(group, 5, -5, 'tree');
    this.addFlora(group, -6, 4, 'crystals');
  }

  // 4. The Hidden Resonance Island: The Drifting Citadel / Sunken Zenith
  // Revealed when all 3 Anchors are activated!
  private buildHiddenResonanceCitadel() {
    this.citadelGroup = new THREE.Group();
    // Initially positioned lower and further back in the heavy mist
    this.citadelGroup.position.set(0, -18.0, -110.0);
    this.citadelGroup.visible = true; // visible as a faint silhouette in fog

    // Huge majestic island
    const { group: citadelIsland, topMesh } = this.createFloatingIsland(24, 22, new THREE.Vector3(0, 0, 0), 0.35);
    this.citadelGroup.add(citadelIsland);

    // Colossal Ancient Temple / Monolith
    const templeGroup = new THREE.Group();
    templeGroup.position.set(0, 1.2, -6);

    // Stepped Pyramid Base
    const step1Geo = new THREE.BoxGeometry(22, 2.5, 22);
    const step1 = new THREE.Mesh(step1Geo, this.matAncientStone);
    step1.position.y = 1.25;
    templeGroup.add(step1);
    this.walkableMeshes.push(step1);

    const step2Geo = new THREE.BoxGeometry(16, 2.5, 16);
    const step2 = new THREE.Mesh(step2Geo, this.matAncientStone);
    step2.position.y = 3.75;
    templeGroup.add(step2);
    this.walkableMeshes.push(step2);

    // The Great Monolith - Visual landmark from prompt!
    const monolithGeo = new THREE.BoxGeometry(3.6, 28, 3.6);
    const monolith = new THREE.Mesh(monolithGeo, this.matAncientStone);
    monolith.position.y = 18;
    templeGroup.add(monolith);

    // Glowing Central Core Sphere: The Heart of the Drifting World
    const coreGeo = new THREE.IcosahedronGeometry(2.4, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 7.5, 4);
    templeGroup.add(coreMesh);

    const coreLight = new THREE.PointLight(0x38bdf8, 3.5, 30);
    coreLight.position.copy(coreMesh.position);
    templeGroup.add(coreLight);

    // Core spin animation
    this.animatables.push({
      update: (time) => {
        coreMesh.rotation.y = time * 0.9;
        coreMesh.rotation.x = time * 0.6;
        coreMesh.position.y = 7.5 + Math.sin(time * 2.0) * 0.3;
      }
    });

    this.citadelGroup.add(templeGroup);
    this.scene.add(this.citadelGroup);

    // Final World Fragment #4: The Heart of the Zenith
    this.createWorldFragment(
      'fragment-zenith',
      'The Celestial Heart',
      'The legendary power core that binds the floating islands of the Drifting World together.',
      [0, 8.5, -67] // will align after citadel rises
    );

    // The Luminous Resonance Bridge of Light (Materializes upon discovery)
    this.citadelBridge = new THREE.Group();
    this.citadelBridge.visible = false;

    // Glowing energy stepping stones connecting from Island 2 & 3 to Citadel
    const bridgeSteps = [
      new THREE.Vector3(0, 3.5, -42),
      new THREE.Vector3(0, 4.3, -48),
      new THREE.Vector3(0, 5.1, -54),
      new THREE.Vector3(0, 6.0, -60),
    ];

    const tileGeo = new THREE.BoxGeometry(4.0, 0.4, 3.5);
    const tileMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      transparent: true,
      opacity: 0.88,
    });

    bridgeSteps.forEach((pos, idx) => {
      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.position.copy(pos);
      this.citadelBridge.add(tile);
      this.walkableMeshes.push(tile);

      this.animatables.push({
        update: (time) => {
          tile.position.y = pos.y + Math.sin(time * 2.0 + idx * 0.7) * 0.08;
        }
      });
    });

    this.scene.add(this.citadelBridge);
  }

  /**
   * Called when the Resonance Thread activates:
   * Smoothly rises the Drifting Citadel into place and reveals the Light Bridge!
   */
  public revealResonanceCitadel() {
    this.isCitadelRevealed = true;
    this.citadelBridge.visible = true;

    // Elevate and bring forward the island
    this.animatables.push({
      update: (_time, delta) => {
        if (this.citadelGroup.position.y < this.citadelTargetY) {
          this.citadelGroup.position.y += (this.citadelTargetY - this.citadelGroup.position.y) * delta * 1.5;
        }
        if (this.citadelGroup.position.z < this.citadelTargetZ) {
          this.citadelGroup.position.z += (this.citadelTargetZ - this.citadelGroup.position.z) * delta * 1.5;
        }
      }
    });

    // Update the position of Fragment #4 so it matches the final location
    const zenithFrag = this.fragments.find(f => f.id === 'fragment-zenith');
    if (zenithFrag && zenithFrag.mesh) {
      zenithFrag.position = [0, 9.8, -65];
      zenithFrag.mesh.position.set(0, 9.8, -65);
    }
  }

  /**
   * Ethereal motes / fireflies hovering in the atmosphere
   */
  private buildAtmosphericMotes() {
    const moteCount = 180;
    const moteGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(moteCount * 3);
    const colors = new Float32Array(moteCount * 3);

    const cyan = new THREE.Color(0x67e8f9);
    const purple = new THREE.Color(0xc084fc);

    for (let i = 0; i < moteCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = 0.5 + Math.random() * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120 - 30;

      const c = Math.random() > 0.5 ? cyan : purple;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    moteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    moteGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const moteMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    this.motesSystem = new THREE.Points(moteGeo, moteMat);
    this.scene.add(this.motesSystem);

    this.animatables.push({
      update: (time) => {
        const posAttr = moteGeo.attributes.position;
        const array = posAttr.array as Float32Array;
        for (let i = 0; i < moteCount; i++) {
          array[i * 3 + 1] += Math.sin(time + i) * 0.015;
          array[i * 3] += Math.cos(time * 0.5 + i) * 0.01;
        }
        posAttr.needsUpdate = true;
      }
    });
  }

  public update(time: number, delta: number) {
    this.animatables.forEach((item) => item.update(time, delta));
  }

  public setQuality(quality: 'low' | 'balanced' | 'high') {
    if (this.motesSystem) {
      this.motesSystem.visible = quality !== 'low';
    }
  }
}
