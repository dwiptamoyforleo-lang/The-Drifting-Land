/**
 * The Drifting Land — World & Sci-Fi Megacity Environment
 * Accurately matches image_a02531e0.jpg:
 * - Colossal Turquoise Gas Giant Planet in the upper right sky with glowing crescent
 * - Golden / amber sunset cloud sea rolling beneath the sky citadels
 * - Industrial metallic observation deck with control console, monitors, keypads, and conduit pipes
 * - Towering sci-fi megacity citadels with glowing neon signs (cyan, magenta, amber, green alien glyphs)
 * - Elevated walkable sky-bridges connecting the massive towers
 * - Distinctive geodesic polyhedral dome habitat on the right tower
 * - Flying aerial speeders cruising between towers with red and cyan thruster trails
 * - Highly optimized low-poly geometry & shared materials for 60 FPS on Android
 */
import * as THREE from 'three';
import {
  MagicalAnchor,
  WorldFragment,
  InscriptionLore,
  TimeOfDay,
  WorldNPC,
  HarvestableResource,
  WorldCheckpoint,
  WorldWildlife,
  TreasureCache,
} from './types';

export class WorldManager {
  public scene: THREE.Scene;
  public walkableMeshes: THREE.Object3D[] = [];
  public animatables: Array<{ update: (time: number, delta: number) => void }> = [];

  // Interactive structures
  public anchors: MagicalAnchor[] = [];
  public fragments: WorldFragment[] = [];
  public inscriptions: InscriptionLore[] = [];
  public npcs: WorldNPC[] = [];
  public resources: HarvestableResource[] = [];
  public checkpoints: WorldCheckpoint[] = [];
  public wildlife: WorldWildlife[] = [];
  public treasures: TreasureCache[] = [];

  // Flying speeders
  public speeders: THREE.Group[] = [];

  // Performance optimization structures
  public localLights: Array<{ light: THREE.PointLight; worldPos: THREE.Vector3; maxDistSq: number }> = [];
  public cloudMounds: Array<{ mesh: THREE.Mesh; origY: number; index: number }> = [];
  private lightCullTimer: number = 0;

  // Day & Night Cycle + Red Moon
  public timeOfDay: TimeOfDay = 'day';
  public dayCycleTime: number = 0; // 0 to 120 seconds cycle
  public redMoonActive: boolean = false;
  private ambientLight!: THREE.AmbientLight;
  private sunsetLight!: THREE.DirectionalLight;
  private planetLight!: THREE.DirectionalLight;
  private celestialGasGiantMesh!: THREE.Mesh;
  private celestialGasGiantGroup!: THREE.Group;
  private redMoonMesh!: THREE.Mesh;
  private redMoonLight!: THREE.PointLight;

  // Wildlife / Creatures & Custom Vegetation
  public skyRays: THREE.Group[] = [];
  public aerowisps: THREE.Group[] = [];
  public currentRegion: number = 1;

  // Shared low-poly materials for maximum mobile performance
  private matSteelDark!: THREE.MeshStandardMaterial;
  private matSteelPanel!: THREE.MeshLambertMaterial;
  private matSteelGrate!: THREE.MeshLambertMaterial;
  private matBrassPipes!: THREE.MeshStandardMaterial;
  private matNeonCyan!: THREE.MeshBasicMaterial;
  private matNeonMagenta!: THREE.MeshBasicMaterial;
  private matNeonAmber!: THREE.MeshBasicMaterial;
  private matNeonGreen!: THREE.MeshBasicMaterial;
  private matScreenGlow!: THREE.MeshBasicMaterial;
  private matDomeGlass!: THREE.MeshStandardMaterial;
  private matGasGiant!: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initMaterials();
  }

  private initMaterials() {
    this.matSteelDark = new THREE.MeshStandardMaterial({
      color: 0x181c24, // dark industrial steel
      roughness: 0.4,
      metalness: 0.6,
      flatShading: true,
    });

    this.matSteelPanel = new THREE.MeshLambertMaterial({
      color: 0x222933,
      flatShading: true,
    });

    this.matSteelGrate = new THREE.MeshLambertMaterial({
      color: 0x2e3642,
      flatShading: true,
    });

    this.matBrassPipes = new THREE.MeshStandardMaterial({
      color: 0xd97706, // copper/brass conduit pipes
      roughness: 0.3,
      metalness: 0.8,
    });

    // Vibrant holographic neon materials (matching image signs!)
    this.matNeonCyan = new THREE.MeshBasicMaterial({ color: 0x00f0c0 });
    this.matNeonMagenta = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    this.matNeonAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.matNeonGreen = new THREE.MeshBasicMaterial({ color: 0x10b981 });

    this.matScreenGlow = new THREE.MeshBasicMaterial({ color: 0x34d399 });

    this.matDomeGlass = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.2,
      flatShading: true,
    });

    this.matGasGiant = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // vibrant turquoise/aquamarine
      emissive: 0x083344,
      emissiveIntensity: 0.3,
      roughness: 0.6,
      metalness: 0.1,
    });
  }

  public buildWorld() {
    this.setupLighting();
    this.buildSkyAndGasGiant();
    this.buildGoldenCloudSea();
    this.buildForegroundObservationDeck();
    this.buildIndustrialConsole();
    this.buildSkyCitadels();
    this.buildSkyBridges();
    this.buildGeodesicDomes();
    this.buildAerialSpeeders();
    this.buildQuantumAnchors();
    this.buildWildlifeAndCreatures();
    this.buildBioluminescentFlora();
    this.buildAncientRuinsAndRelics();
    this.buildNPCs();
    this.buildHarvestableResources();
    this.buildWorldCheckpoints();
    this.initPerformanceOptimizations();
  }

  private setupLighting() {
    // Ambient cosmic twilight light
    this.ambientLight = new THREE.AmbientLight(0x232938, 1.5);
    this.scene.add(this.ambientLight);

    // Warm golden sunset rim light from the low horizon clouds
    this.sunsetLight = new THREE.DirectionalLight(0xf59e0b, 1.6);
    this.sunsetLight.position.set(-60, 20, -50);
    this.scene.add(this.sunsetLight);

    // Cool turquoise reflected light from the giant planet
    this.planetLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    this.planetLight.position.set(70, 80, -90);
    this.scene.add(this.planetLight);
  }

  /**
   * 1. Sky, Celestial Gas Giant, and Rare Red Moon:
   * Colossal turquoise gas giant planet dominating the upper-right sky,
   * plus the rare Red Moon celestial phenomenon!
   */
  private buildSkyAndGasGiant() {
    // Atmospheric fog: Golden/amber cloud sea fading into deep cosmic indigo
    const fogColor = new THREE.Color(0x543216);
    this.scene.fog = new THREE.FogExp2(fogColor.getHex(), 0.0055);
    this.scene.background = new THREE.Color(0x0a101d);

    // Deep space celestial sky dome
    const skyGeo = new THREE.SphereGeometry(750, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x080e1a,
      side: THREE.BackSide,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // COLOSSAL TURQUOISE GAS GIANT PLANET (Upper-right sky from screenshot!)
    this.celestialGasGiantGroup = new THREE.Group();
    this.celestialGasGiantGroup.position.set(95, 75, -170);

    const planetGeo = new THREE.SphereGeometry(72, 32, 24);
    this.celestialGasGiantMesh = new THREE.Mesh(planetGeo, this.matGasGiant);
    this.celestialGasGiantGroup.add(this.celestialGasGiantMesh);

    // Atmospheric Band Rings on the Gas Giant
    const bandGeo = new THREE.RingGeometry(73, 76, 32);
    const bandMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.rotation.x = Math.PI / 3;
    this.celestialGasGiantGroup.add(band);

    // Glowing crescent rim
    const crescentGeo = new THREE.RingGeometry(72, 79, 32);
    const crescentMat = new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const crescent = new THREE.Mesh(crescentGeo, crescentMat);
    crescent.position.z = 2;
    this.celestialGasGiantGroup.add(crescent);

    this.scene.add(this.celestialGasGiantGroup);

    // RARE RED MOON (Unstable Celestial Eclipse Event!)
    const redMoonGeo = new THREE.SphereGeometry(22, 24, 16);
    const redMoonMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x991b1b,
      emissiveIntensity: 0.8,
      roughness: 0.4,
      metalness: 0.1,
    });
    this.redMoonMesh = new THREE.Mesh(redMoonGeo, redMoonMat);
    this.redMoonMesh.position.set(-85, 95, -140);
    this.redMoonMesh.visible = false; // triggered during red_moon event
    this.scene.add(this.redMoonMesh);

    this.redMoonLight = new THREE.PointLight(0xef4444, 0, 280);
    this.redMoonLight.position.copy(this.redMoonMesh.position);
    this.scene.add(this.redMoonLight);

    // Slow planetary rotation
    this.animatables.push({
      update: (time) => {
        this.celestialGasGiantMesh.rotation.y = time * 0.02;
      }
    });
  }

  /**
   * 2. Golden / Amber Cloud Sea:
   * Volumetric-looking rolling sunset clouds below the citadels!
   */
  private buildGoldenCloudSea() {
    const cloudGroup = new THREE.Group();
    cloudGroup.position.set(0, -14, -60);

    const cloudMoundGeo = new THREE.DodecahedronGeometry(18, 1);
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xb45309, // warm golden amber
      flatShading: true,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < 28; i++) {
      const mound = new THREE.Mesh(cloudMoundGeo, cloudMat);
      const angle = (i / 28) * Math.PI * 2;
      const dist = 30 + (i % 5) * 18;
      mound.position.set(
        Math.cos(angle) * dist,
        (Math.sin(i * 1.5) * 6),
        Math.sin(angle) * dist - 20
      );
      mound.scale.set(1.6, 0.7, 1.6);
      cloudGroup.add(mound);

      const origY = mound.position.y;
      this.cloudMounds.push({ mesh: mound, origY, index: i });
    }

    this.scene.add(cloudGroup);
  }

  /**
   * 3. Foreground Metallic Observation Deck / Catwalk:
   * Where the player stands, overlooking the megacity!
   */
  private buildForegroundObservationDeck() {
    const deckGroup = new THREE.Group();
    deckGroup.position.set(0, 3.8, 0);

    // Deck Walkway Platform (Walkable)
    const floorGeo = new THREE.BoxGeometry(16, 0.8, 14);
    const floor = new THREE.Mesh(floorGeo, this.matSteelGrate);
    deckGroup.add(floor);
    this.walkableMeshes.push(floor);

    // Tread panel borders
    const borderGeo = new THREE.BoxGeometry(16.4, 0.9, 0.6);
    const frontBorder = new THREE.Mesh(borderGeo, this.matSteelDark);
    frontBorder.position.set(0, 0.1, -6.8);
    deckGroup.add(frontBorder);

    // Handrails on left, right, and front edge
    const railPostGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6);
    const railBarGeo = new THREE.BoxGeometry(16, 0.08, 0.08);

    const railTop = new THREE.Mesh(railBarGeo, this.matSteelDark);
    railTop.position.set(0, 1.2, -6.8);
    deckGroup.add(railTop);

    for (let p = -7; p <= 7; p += 2.5) {
      const post = new THREE.Mesh(railPostGeo, this.matSteelDark);
      post.position.set(p, 0.6, -6.8);
      deckGroup.add(post);
    }

    this.scene.add(deckGroup);
  }

  /**
   * 4. Industrial Control Console on the Railing (Matching Screenshot Bottom-Left!):
   * Dual CRT/LED screens, keypads, yellow/red buttons, copper conduit pipes!
   */
  private buildIndustrialConsole() {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(-2.5, 4.2, -5.6);
    consoleGroup.rotation.x = -0.35; // angled control desk

    // Slanted Console Desk Body
    const deskGeo = new THREE.BoxGeometry(3.6, 1.2, 0.9);
    const desk = new THREE.Mesh(deskGeo, this.matSteelDark);
    consoleGroup.add(desk);

    // Left Green Terminal Screen (Glowing wave/text readout)
    const screenGeo = new THREE.PlaneGeometry(1.2, 0.65);
    const leftScreen = new THREE.Mesh(screenGeo, this.matScreenGlow);
    leftScreen.position.set(-0.9, 0.05, 0.46);
    consoleGroup.add(leftScreen);

    // Right Secondary Display Screen
    const rightScreenGeo = new THREE.PlaneGeometry(0.9, 0.45);
    const rightScreen = new THREE.Mesh(rightScreenGeo, this.matScreenGlow);
    rightScreen.position.set(0.6, 0.15, 0.46);
    consoleGroup.add(rightScreen);

    // Keypad Button Array (Yellow, Red, Grey buttons)
    const btnGeo = new THREE.BoxGeometry(0.12, 0.12, 0.06);
    const btnYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const btnRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const btnGreyMat = new THREE.MeshBasicMaterial({ color: 0x64748b });

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const mat = (r === 0 && c === 0) ? btnYellowMat : (c === 3 ? btnRedMat : btnGreyMat);
        const btn = new THREE.Mesh(btnGeo, mat);
        btn.position.set(0.2 + c * 0.2, -0.2 - r * 0.18, 0.48);
        consoleGroup.add(btn);
      }
    }

    // Exposed Copper / Brass Conduit Pipes running along the console (matching image!)
    const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.2, 8);
    pipeGeo.rotateZ(Math.PI / 2);
    const pipe1 = new THREE.Mesh(pipeGeo, this.matBrassPipes);
    pipe1.position.set(0, -0.45, 0.42);
    consoleGroup.add(pipe1);

    const pipe2 = new THREE.Mesh(pipeGeo, this.matBrassPipes);
    pipe2.position.set(0, -0.55, 0.42);
    consoleGroup.add(pipe2);

    this.scene.add(consoleGroup);
  }

  /**
   * 5. The Sky Citadels & Vertical Megastructures with Glowing Neon Signs:
   * Matching the iconic towers, signs, and Japanese/alien glyphs from the image!
   */
  private buildSkyCitadels() {
    // A. Left Tower (With multiple glowing vertical neon signs!)
    const leftTowerGroup = new THREE.Group();
    leftTowerGroup.position.set(-22, -10, -28);

    const leftTowerGeo = new THREE.BoxGeometry(14, 110, 16);
    const leftTower = new THREE.Mesh(leftTowerGeo, this.matSteelDark);
    leftTower.position.y = 45;
    leftTowerGroup.add(leftTower);

    // Glowing Neon Signs on Left Tower (Matching image!)
    // 1. Magenta Alien Glyph Sign: [サヨナラ]
    const signMagenta = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.4, 0.2),
      this.matNeonMagenta
    );
    signMagenta.position.set(6.8, 48, 2);
    signMagenta.rotation.y = Math.PI / 2;
    leftTowerGroup.add(signMagenta);

    // 2. Cyan Vertical Neon Strip Sign
    const signCyan = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 8.5, 0.2),
      this.matNeonCyan
    );
    signCyan.position.set(6.8, 38, 5);
    signCyan.rotation.y = Math.PI / 2;
    leftTowerGroup.add(signCyan);

    // 3. Amber Neon Sign
    const signAmber = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.2, 0.2),
      this.matNeonAmber
    );
    signAmber.position.set(6.8, 30, -2);
    signAmber.rotation.y = Math.PI / 2;
    leftTowerGroup.add(signAmber);

    // 4. Green Neon Sign
    const signGreen = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 7.0, 0.2),
      this.matNeonGreen
    );
    signGreen.position.set(6.8, 60, -4);
    signGreen.rotation.y = Math.PI / 2;
    leftTowerGroup.add(signGreen);

    this.scene.add(leftTowerGroup);

    // B. Center Megacity Spire (Giant central skyscraper with sky-bridge connections)
    const centerTowerGroup = new THREE.Group();
    centerTowerGroup.position.set(4, -10, -65);

    const centerColGeo = new THREE.CylinderGeometry(10, 14, 130, 8);
    const centerCol = new THREE.Mesh(centerColGeo, this.matSteelDark);
    centerCol.position.y = 55;
    centerTowerGroup.add(centerCol);

    // Upper Antenna Gantry
    const antennaGeo = new THREE.CylinderGeometry(0.4, 0.8, 32, 6);
    const antenna = new THREE.Mesh(antennaGeo, this.matSteelPanel);
    antenna.position.set(0, 135, 0);
    centerTowerGroup.add(antenna);

    // Cyan beacon at top of antenna
    const topLight = new THREE.PointLight(0x00f0c0, 2.5, 45);
    topLight.position.set(0, 150, 0);
    centerTowerGroup.add(topLight);

    this.scene.add(centerTowerGroup);

    // C. Right Towers (With Geodesic Dome on top!)
    const rightTowerGroup = new THREE.Group();
    rightTowerGroup.position.set(32, -10, -38);

    const rightTowerGeo = new THREE.BoxGeometry(18, 95, 20);
    const rightTower = new THREE.Mesh(rightTowerGeo, this.matSteelDark);
    rightTower.position.y = 38;
    rightTowerGroup.add(rightTower);

    // Cyan vertical neon sign on right tower
    const rightCyanSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 9.0, 0.2),
      this.matNeonCyan
    );
    rightCyanSign.position.set(-8.8, 32, 4);
    rightCyanSign.rotation.y = -Math.PI / 2;
    rightTowerGroup.add(rightCyanSign);

    this.scene.add(rightTowerGroup);

    // Pulsing neon light effect
    this.animatables.push({
      update: (time) => {
        const pulse = 0.85 + Math.sin(time * 3.0) * 0.15;
        this.matNeonCyan.color.setRGB(0 * pulse, 0.94 * pulse, 0.75 * pulse);
        this.matNeonMagenta.color.setRGB(0.96 * pulse, 0.25 * pulse, 0.37 * pulse);
      }
    });
  }

  /**
   * 6. Elevated Walkable Sky-Bridges Linking Towers:
   */
  private buildSkyBridges() {
    // Main Walkable Sky-Bridge connecting Observation Deck to Center Tower
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0, 3.8, -26);

    const bridgeFloorGeo = new THREE.BoxGeometry(4.2, 0.8, 42);
    const bridgeFloor = new THREE.Mesh(bridgeFloorGeo, this.matSteelGrate);
    bridgeGroup.add(bridgeFloor);
    this.walkableMeshes.push(bridgeFloor);

    // Side safety railings along bridge
    const railGeo = new THREE.BoxGeometry(0.2, 1.2, 42);
    const leftRail = new THREE.Mesh(railGeo, this.matSteelDark);
    leftRail.position.set(-2.0, 0.6, 0);
    bridgeGroup.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, this.matSteelDark);
    rightRail.position.set(2.0, 0.6, 0);
    bridgeGroup.add(rightRail);

    // High Sky-Bridges in the background connecting towers together (visual scenery)
    const highBridgeGeo = new THREE.BoxGeometry(26, 2.5, 3.5);
    const highBridge1 = new THREE.Mesh(highBridgeGeo, this.matSteelPanel);
    highBridge1.position.set(-10, 48, -45);
    this.scene.add(highBridge1);

    const highBridge2 = new THREE.Mesh(highBridgeGeo, this.matSteelPanel);
    highBridge2.position.set(16, 36, -52);
    this.scene.add(highBridge2);

    this.scene.add(bridgeGroup);
  }

  /**
   * 7. Geodesic Polyhedral Dome Habitat (Top of the Right Tower from Screenshot!):
   */
  private buildGeodesicDomes() {
    const domeGroup = new THREE.Group();
    domeGroup.position.set(32, 44, -38);

    // Faceted icosahedral geodesic dome
    const domeGeo = new THREE.IcosahedronGeometry(7.5, 1);
    const dome = new THREE.Mesh(domeGeo, this.matDomeGlass);
    domeGroup.add(dome);

    const domeLight = new THREE.PointLight(0x67e8f9, 2.0, 24);
    domeLight.position.set(0, 2, 0);
    domeGroup.add(domeLight);

    this.scene.add(domeGroup);
  }

  /**
   * 8. Flying Aerial Speeders / Hover Vehicles Cruising Between Towers:
   * With glowing red and cyan twin engine trail thrusters!
   */
  private buildAerialSpeeders() {
    const createSpeeder = (startY: number, speed: number, radiusX: number, radiusZ: number) => {
      const speederGroup = new THREE.Group();
      speederGroup.position.set(0, startY, -35);

      // Sleek chassis
      const bodyGeo = new THREE.BoxGeometry(1.6, 0.65, 3.8);
      const body = new THREE.Mesh(bodyGeo, this.matSteelDark);
      speederGroup.add(body);

      // Glowing cockpit windshield
      const cabinGeo = new THREE.BoxGeometry(1.2, 0.45, 1.6);
      const cabin = new THREE.Mesh(cabinGeo, this.matScreenGlow);
      cabin.position.set(0, 0.4, 0.2);
      speederGroup.add(cabin);

      // Twin Engine Thruster Beams (Glowing red/cyan engine light trails)
      const thrusterGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.0, 6);
      thrusterGeo.rotateX(Math.PI / 2);
      const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      const t1 = new THREE.Mesh(thrusterGeo, thrusterMat);
      t1.position.set(-0.6, 0, 3.2);
      speederGroup.add(t1);

      const t2 = new THREE.Mesh(thrusterGeo, thrusterMat);
      t2.position.set(0.6, 0, 3.2);
      speederGroup.add(t2);

      this.scene.add(speederGroup);
      this.speeders.push(speederGroup);

      // Cruise motion through the sky canyons
      this.animatables.push({
        update: (time) => {
          const t = time * speed;
          speederGroup.position.x = Math.sin(t) * radiusX;
          speederGroup.position.z = -35 + Math.cos(t) * radiusZ;
          speederGroup.position.y = startY + Math.sin(t * 1.5) * 1.2;
          speederGroup.rotation.y = Math.cos(t) * 0.9;
        }
      });
    };

    createSpeeder(12.0, 0.4, 28, 18);
    createSpeeder(24.0, 0.35, 36, 22);
    createSpeeder(6.0, 0.45, 20, 14);
  }

  /**
   * 9. Quantum Beacons / Anchors & Data Cores to discover:
   */
  private buildQuantumAnchors() {
    // Anchor Alpha: Observation Deck Relay
    this.createAnchorStructure(
      'anchor-alpha',
      'Observation Terminal Alpha',
      'The Drifting Land Primary Deck',
      'Calibrated to monitor planetary atmospheric drift and transit speeders.',
      [5, 4.6, -3],
      0x00f0c0,
      'anchor-beta'
    );

    // Anchor Beta: Mid-Bridge Quantum Anchor
    this.createAnchorStructure(
      'anchor-beta',
      'Sky-Bridge Transit Anchor',
      'Mid-Span Gateway Relay',
      'Stabilizes the elevated transit catwalk between Sector 4 and the central citadel.',
      [0, 4.6, -26],
      0x38bdf8,
      'anchor-gamma'
    );

    // Anchor Gamma: Geodesic Dome Core
    this.createAnchorStructure(
      'anchor-gamma',
      'Geodesic Dome Sub-Relay',
      'Sector 9 Research Habitat',
      'Synchronizes the three quantum relays to reveal the Celestial Core.',
      [26, 4.6, -36],
      0xf43f5e,
      'citadel'
    );

    // World Fragments (Encrypted Data Cores)
    this.createWorldFragment(
      'fragment-alpha',
      'Data Core: Genesis Orbit',
      'Telemetry logs detailing the founding of The Drifting Land above the amber clouds.',
      [-4, 5.2, -2]
    );

    this.createWorldFragment(
      'fragment-beta',
      'Data Core: Transit Corridor',
      'Flight routing plans for civilian speeders navigating the cloud canyons.',
      [0, 5.2, -40]
    );

    this.createInscriptionStele(
      'stele-terminal',
      'Terminal Log: Atmospheric Survey',
      'Altitude: 1,420m. Gas Giant Kepler-94d visible at Azimuth 140°. Cloud temperature steady at 18.4°C.',
      [3.2, 4.6, -5]
    );
  }

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

    // Octagonal steel dais
    const baseGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.6, 8);
    const baseMesh = new THREE.Mesh(baseGeo, this.matSteelDark);
    baseMesh.position.y = 0.3;
    anchorGroup.add(baseMesh);
    this.walkableMeshes.push(baseMesh);

    // Hovering Quantum Obelisk
    const crystalGeo = new THREE.OctahedronGeometry(0.85, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.y = 2.0;
    crystalMesh.scale.set(0.8, 1.5, 0.8);
    anchorGroup.add(crystalMesh);

    const pointLight = new THREE.PointLight(color, 2.2, 14);
    pointLight.position.set(0, 2.0, 0);
    anchorGroup.add(pointLight);

    // Vertical holographic beacon beam
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 60, 6);
    const beamMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.35,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 30;
    anchorGroup.add(beam);

    this.scene.add(anchorGroup);

    this.animatables.push({
      update: (time) => {
        crystalMesh.rotation.y = time * 1.4;
        crystalMesh.position.y = 2.0 + Math.sin(time * 2.2) * 0.15;
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

  private createWorldFragment(
    id: string,
    name: string,
    lore: string,
    pos: [number, number, number]
  ) {
    const fragGroup = new THREE.Group();
    fragGroup.position.set(...pos);

    const fragGeo = new THREE.OctahedronGeometry(0.45, 0);
    const fragMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
    });
    const shard = new THREE.Mesh(fragGeo, fragMat);
    fragGroup.add(shard);

    const ringGeo = new THREE.TorusGeometry(0.7, 0.04, 6, 16);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x67e8f9 }));
    fragGroup.add(ring);

    this.scene.add(fragGroup);

    this.animatables.push({
      update: (time) => {
        shard.rotation.x = time * 1.5;
        shard.rotation.y = time * 2.0;
        ring.rotation.x = time * 1.8;
        fragGroup.position.y = pos[1] + Math.sin(time * 2.5) * 0.12;
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

  private createInscriptionStele(
    id: string,
    title: string,
    text: string,
    pos: [number, number, number]
  ) {
    const termGroup = new THREE.Group();
    termGroup.position.set(...pos);

    const boxGeo = new THREE.BoxGeometry(0.8, 1.4, 0.4);
    const box = new THREE.Mesh(boxGeo, this.matSteelDark);
    box.position.y = 0.7;
    termGroup.add(box);
    this.walkableMeshes.push(box);

    const screenGeo = new THREE.PlaneGeometry(0.6, 0.5);
    const screen = new THREE.Mesh(screenGeo, this.matScreenGlow);
    screen.position.set(0, 0.9, 0.21);
    termGroup.add(screen);

    this.scene.add(termGroup);

    const insc: InscriptionLore = {
      id,
      title,
      text,
      position: pos,
      mesh: termGroup,
    };

    this.inscriptions.push(insc);
    return insc;
  }

  public revealResonanceCitadel() {
    // Activates primary quantum energy beacon on the central tower
    const beaconLight = new THREE.DirectionalLight(0x00f0c0, 2.5);
    beaconLight.position.set(0, 100, -65);
    this.scene.add(beaconLight);
  }

  /**
   * 8. Living World Wildlife & Floating Aerial Creatures (Sky Rays & Aerowisps)
   */
  private buildWildlifeAndCreatures() {
    // Sky Rays: majestic drifting manta-like celestial creatures navigating high currents
    const rayMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.35,
      roughness: 0.5,
      flatShading: true,
    });

    for (let r = 0; r < 4; r++) {
      const rayGroup = new THREE.Group();
      // Body
      const bodyGeo = new THREE.ConeGeometry(1.8, 4.2, 5);
      const body = new THREE.Mesh(bodyGeo, rayMat);
      body.rotation.x = Math.PI / 2;
      rayGroup.add(body);

      // Wings
      const wingGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,
        -4.2, 0, 1.2,
        0, 0, 2.8,
        0, 0, 0,
        4.2, 0, 1.2,
        0, 0, 2.8,
      ]);
      wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      wingGeo.computeVertexNormals();
      const wings = new THREE.Mesh(wingGeo, rayMat);
      rayGroup.add(wings);

      const spawnX = -40 + r * 28;
      const spawnY = 22 + r * 6;
      const spawnZ = -60 - r * 25;
      rayGroup.position.set(spawnX, spawnY, spawnZ);
      this.scene.add(rayGroup);
      this.skyRays.push(rayGroup);

      const initialZ = spawnZ;
      const speed = 4.5 + r * 1.5;
      this.animatables.push({
        update: (time, dt) => {
          // Gentle undulation & cruising flight
          rayGroup.position.z += speed * dt;
          if (rayGroup.position.z > 40) {
            rayGroup.position.z = initialZ - 80;
          }
          rayGroup.position.y = spawnY + Math.sin(time * 1.5 + r) * 2.2;
          wings.rotation.z = Math.sin(time * 3.0 + r) * 0.22;
        }
      });
    }

    // Aerowisps: glowing orb spirits dancing around the catwalks
    const wispMat = new THREE.MeshBasicMaterial({ color: 0xa7f3d0 });
    const wispGeo = new THREE.SphereGeometry(0.24, 8, 8);

    for (let w = 0; w < 6; w++) {
      const wisp = new THREE.Mesh(wispGeo, wispMat);
      const light = new THREE.PointLight(0x34d399, 1.2, 6);
      wisp.add(light);
      wisp.position.set(-6 + w * 2.5, 5.4, -4 - (w % 3) * 6);
      this.scene.add(wisp);
      this.aerowisps.push(wisp as unknown as THREE.Group);

      const origPos = wisp.position.clone();
      this.animatables.push({
        update: (time) => {
          wisp.position.x = origPos.x + Math.cos(time * 1.2 + w) * 1.8;
          wisp.position.y = origPos.y + Math.sin(time * 2.0 + w) * 0.8;
          wisp.position.z = origPos.z + Math.sin(time * 1.2 + w) * 1.8;
        }
      });
    }
  }

  /**
   * 9. Bioluminescent Flora & Strange Sky-Vegetation
   */
  private buildBioluminescentFlora() {
    const floraGroup = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

    // Planters on the deck corners
    for (let i = 0; i < 4; i++) {
      const x = (i % 2 === 0 ? -7.2 : 7.2);
      const z = (i < 2 ? 6.0 : -6.0);

      // Planter box
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), this.matSteelDark);
      box.position.set(x, 4.4, z);
      floraGroup.add(box);
      this.walkableMeshes.push(box);

      // Bioluminescent stalks
      for (let s = 0; s < 3; s++) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.4, 5), stemMat);
        stalk.position.set(x + (s - 1) * 0.25, 5.2, z + (s === 1 ? 0.2 : -0.2));
        stalk.rotation.z = (s - 1) * 0.15;
        floraGroup.add(stalk);

        const bulb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), bulbMat);
        bulb.position.set(0, 0.75, 0);
        stalk.add(bulb);
      }
    }
    this.scene.add(floraGroup);
  }

  /**
   * 10. Ancient Ruins & Forgotten Technology Relics
   */
  private buildAncientRuinsAndRelics() {
    const ruinsGroup = new THREE.Group();
    const matRuinStone = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8,
      flatShading: true,
    });

    // Broken celestial pillar near the far bridge terminus
    const pillarGeo = new THREE.CylinderGeometry(0.8, 0.9, 5.5, 6);
    const brokenPillar = new THREE.Mesh(pillarGeo, matRuinStone);
    brokenPillar.position.set(-6.5, 6.2, -44);
    brokenPillar.rotation.z = 0.18;
    ruinsGroup.add(brokenPillar);
    this.walkableMeshes.push(brokenPillar);

    const runeGeo = new THREE.BoxGeometry(0.08, 0.8, 0.08);
    const runeMesh = new THREE.Mesh(runeGeo, this.matNeonAmber);
    runeMesh.position.set(0.7, 0, 0);
    brokenPillar.add(runeMesh);

    this.scene.add(ruinsGroup);
  }

  /**
   * Dynamic Day-and-Night & Red Moon Controller
   */
  public setTimeOfDay(time: TimeOfDay) {
    this.timeOfDay = time;

    if (time === 'day') {
      this.ambientLight.color.setHex(0x384259);
      this.ambientLight.intensity = 1.8;
      this.sunsetLight.color.setHex(0xfef08a);
      this.sunsetLight.intensity = 1.8;
      this.sunsetLight.position.set(-50, 70, -40);
      this.planetLight.intensity = 1.0;
      this.scene.fog = new THREE.FogExp2(0x334155, 0.0045);
      if (this.redMoonMesh) this.redMoonMesh.visible = false;
      if (this.redMoonLight) this.redMoonLight.intensity = 0;
      this.redMoonActive = false;
    } else if (time === 'sunset') {
      this.ambientLight.color.setHex(0x232938);
      this.ambientLight.intensity = 1.5;
      this.sunsetLight.color.setHex(0xf59e0b);
      this.sunsetLight.intensity = 1.6;
      this.sunsetLight.position.set(-60, 20, -50);
      this.planetLight.intensity = 1.2;
      this.scene.fog = new THREE.FogExp2(0x543216, 0.0055);
      if (this.redMoonMesh) this.redMoonMesh.visible = false;
      if (this.redMoonLight) this.redMoonLight.intensity = 0;
      this.redMoonActive = false;
    } else if (time === 'night') {
      this.ambientLight.color.setHex(0x0f172a);
      this.ambientLight.intensity = 0.9;
      this.sunsetLight.intensity = 0.3;
      this.planetLight.color.setHex(0x38bdf8);
      this.planetLight.intensity = 2.0;
      this.scene.fog = new THREE.FogExp2(0x0a101d, 0.0065);
      if (this.redMoonMesh) this.redMoonMesh.visible = false;
      if (this.redMoonLight) this.redMoonLight.intensity = 0;
      this.redMoonActive = false;
    } else if (time === 'red_moon') {
      // Rare ominous Red Moon Phenomenon!
      this.ambientLight.color.setHex(0x450a0a);
      this.ambientLight.intensity = 1.4;
      this.sunsetLight.color.setHex(0xdc2626);
      this.sunsetLight.intensity = 1.2;
      this.planetLight.intensity = 0.5;
      this.scene.fog = new THREE.FogExp2(0x280505, 0.006);
      if (this.redMoonMesh) this.redMoonMesh.visible = true;
      if (this.redMoonLight) this.redMoonLight.intensity = 3.5;
      this.redMoonActive = true;
    }
  }

  public triggerRareRedMoonEvent() {
    this.setTimeOfDay('red_moon');
  }

  /**
   * 11. Living World NPCs & Settlement Population
   * Includes Village Leader, Merchants, Settlers, Scouts, Travelers with campfire,
   * Lost Explorers, Ancient Guardians, Dimension Researchers, and Wandering Traders.
   */
  private buildNPCs() {
    const matSuitDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 });
    const matPlating = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.8 });
    const matGoldPlating = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.9, emissive: 0x78350f, emissiveIntensity: 0.3 });
    const matEmeraldSuit = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.4, metalness: 0.4 });
    const matNomadCloak = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8, metalness: 0.1 });
    const matGolemStone = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.3 });
    const matGolemMoss = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6, metalness: 0.1 });
    const matScavengerFeather = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5, metalness: 0.3 });

    const createHumanoidMesh = (suitMat: THREE.Material, visorColorHex: number, scale: number = 1.0) => {
      const group = new THREE.Group();
      group.scale.set(scale, scale, scale);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.24, 0.85, 0.26);
      const legL = new THREE.Mesh(legGeo, suitMat);
      legL.position.set(-0.16, 0.425, 0);
      const legR = new THREE.Mesh(legGeo, suitMat);
      legR.position.set(0.16, 0.425, 0);
      group.add(legL, legR);

      // Torso
      const torsoGeo = new THREE.BoxGeometry(0.55, 0.75, 0.35);
      const torso = new THREE.Mesh(torsoGeo, matPlating);
      torso.position.set(0, 1.2, 0);
      group.add(torso);

      // Head with glowing visor
      const headGeo = new THREE.BoxGeometry(0.36, 0.38, 0.38);
      const head = new THREE.Mesh(headGeo, suitMat);
      head.position.set(0, 1.75, 0);
      const visorGeo = new THREE.BoxGeometry(0.3, 0.14, 0.12);
      const visorMat = new THREE.MeshBasicMaterial({ color: visorColorHex });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.02, 0.16);
      head.add(visor);
      group.add(head);

      return { group, head, torso, legL, legR };
    };

    // -------------------------------------------------------------
    // 1. OVERSEER BENNETT (Village Leader / Settlement Governor)
    // -------------------------------------------------------------
    const bennettRig = createHumanoidMesh(matGoldPlating, 0xf59e0b, 1.05);
    const bennettMesh = bennettRig.group;
    bennettMesh.position.set(0.0, 4.2, -1.0);
    this.scene.add(bennettMesh);

    // Overseer Command Staff with rotating ring
    const staffGroup = new THREE.Group();
    staffGroup.position.set(0.38, 0.9, 0.2);
    const staffPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.8, 6), matGoldPlating);
    staffPole.position.y = 0.9;
    const staffOrb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), this.matNeonAmber);
    staffOrb.position.y = 1.85;
    const staffRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 12), this.matNeonCyan);
    staffRing.position.y = 1.85;
    staffGroup.add(staffPole, staffOrb, staffRing);
    bennettMesh.add(staffGroup);

    this.animatables.push({
      update: (time) => {
        staffRing.rotation.x = time * 2.0;
        staffRing.rotation.y = time * 1.5;
        bennettRig.torso.position.y = 1.2 + Math.sin(time * 1.8) * 0.015;
      }
    });

    this.npcs.push({
      id: 'npc-bennett',
      name: 'Overseer Bennett',
      role: 'Haven Settlement Governor',
      settlement: 'Aero-Haven Sanctuary',
      behavior: 'standing',
      position: [0.0, 4.2, -1.0],
      dialogue: {
        id: 'bennett-greeting',
        speaker: 'Overseer Bennett',
        title: 'Haven Settlement Governor',
        greeting: 'Welcome to Aero-Haven Command Dais, Pathfinder. Our atmospheric domes are holding, but island strata are fracturing into the lower turquoise aether. How fare our quantum anchors?',
        options: [
          {
            label: 'What is our colony settlement status?',
            response: 'We have survived three solar fractures. Our botanists are growing lumenvine crops, but we require all three quantum anchors harmonized to stabilize the drifting bedrock.',
            rewardCoins: 60,
            rewardXp: 80,
          },
          {
            label: 'Where can I trade or resupply?',
            response: 'Trader Oakhaven maintains our primary supply depot on the western promenade. He accepts Drift Coins for tools, medical salves, and emergency survival gear.',
          },
          {
            label: 'I will keep exploring the archipelago.',
            response: 'Stay vigilant upon the catwalks. The abyss below offers no footing.',
          },
        ],
      },
      mesh: bennettMesh,
    });

    // -------------------------------------------------------------
    // 2. TRADER OAKHAVEN (Aero-Haven General Outfitter & Merchant)
    // -------------------------------------------------------------
    const oakhavenRig = createHumanoidMesh(matSuitDark, 0x38bdf8);
    const oakhavenMesh = oakhavenRig.group;
    oakhavenMesh.position.set(-6.0, 4.2, 5.0);
    oakhavenMesh.rotation.y = 0.6;
    this.scene.add(oakhavenMesh);

    // Merchant Market Stall Awning & Crates
    const stallGroup = new THREE.Group();
    stallGroup.position.set(-6.0, 4.2, 5.0);
    // Awning roof
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.08, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 })
    );
    awning.position.set(0, 2.5, 0);
    awning.rotation.x = 0.15;
    // Awning posts
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const p1 = new THREE.Mesh(postGeo, postMat); p1.position.set(-1.0, 1.25, -0.7);
    const p2 = new THREE.Mesh(postGeo, postMat); p2.position.set(1.0, 1.25, -0.7);
    const p3 = new THREE.Mesh(postGeo, postMat); p3.position.set(-1.0, 1.25, 0.7);
    const p4 = new THREE.Mesh(postGeo, postMat); p4.position.set(1.0, 1.25, 0.7);
    // Crates on table
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.6), this.matSteelDark);
    table.position.set(0, 0.4, 0.5);
    const crateA = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), this.matBrassPipes);
    crateA.position.set(-0.4, 0.95, 0.5);
    const crateB = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), this.matSteelGrate);
    crateB.position.set(0.35, 0.92, 0.5);
    // Hanging lantern
    const stallLantern = new THREE.PointLight(0x38bdf8, 1.4, 5);
    stallLantern.position.set(0, 2.2, 0);
    stallGroup.add(awning, p1, p2, p3, p4, table, crateA, crateB, stallLantern);
    this.scene.add(stallGroup);

    this.npcs.push({
      id: 'npc-oakhaven',
      name: 'Trader Oakhaven',
      role: 'Aero-Haven General Outfitter',
      settlement: 'Aero-Haven Marketplace',
      isTrader: true,
      traderId: 'trader-haven',
      behavior: 'standing',
      position: [-6.0, 4.2, 5.0],
      dialogue: {
        id: 'oakhaven-greeting',
        speaker: 'Trader Oakhaven',
        title: 'Aero-Haven General Outfitter',
        greeting: 'Ah, voyager! Stocking up before braving the sky-bridges? I have got fresh recovery salves, kinetic suits, and emergency survival gear straight from the Haven fabrication bay.',
        options: [
          {
            label: '[TRADE] Browse Haven Outfitter Goods & Gear',
            response: 'Opening Haven marketplace. Spend your Drift Coins wisely, friend!',
            openShop: true,
            openTradeTraderId: 'trader-haven',
          },
          {
            label: 'What gear do you recommend for exploring?',
            response: 'Equip the Kinetic Exo-Weave Suit and Magnetic Thruster Boots. They reduce fall impact damage by 40% and boost your sprint speed significantly.',
            rewardCoins: 35,
            rewardXp: 50,
          },
          {
            label: 'How do I earn more Drift Coins?',
            response: 'Complete explorer quests, discover uncharted sectors, activate ancient shrines, or sell harvested crystals and salvaged relics directly to me.',
          },
        ],
      },
      mesh: oakhavenMesh,
    });

    // -------------------------------------------------------------
    // 3. SETTLER THORNE (Hydroponic Cultivator / Harvester)
    // -------------------------------------------------------------
    const thorneRig = createHumanoidMesh(matEmeraldSuit, 0x10b981);
    const thorneMesh = thorneRig.group;
    thorneMesh.position.set(5.5, 4.2, 3.5);
    thorneMesh.rotation.y = -1.4;
    this.scene.add(thorneMesh);

    // Planter box with glowing Lumenvine sprouts
    const planterBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.8), this.matSteelDark);
    planterBox.position.set(5.5, 4.4, 3.0);
    const sprout1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.5, 5), this.matNeonGreen);
    sprout1.position.set(5.2, 4.8, 3.0);
    const sprout2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.65, 5), this.matNeonCyan);
    sprout2.position.set(5.8, 4.9, 3.0);
    this.scene.add(planterBox, sprout1, sprout2);

    this.animatables.push({
      update: (time) => {
        sprout1.scale.y = 1.0 + Math.sin(time * 2.0) * 0.08;
        sprout2.scale.y = 1.0 + Math.cos(time * 1.8) * 0.08;
        thorneRig.torso.rotation.x = Math.sin(time * 1.5) * 0.05;
      }
    });

    this.npcs.push({
      id: 'npc-thorne',
      name: 'Settler Thorne',
      role: 'Haven Hydroponic Cultivator',
      settlement: 'Haven Botanical Terraces',
      behavior: 'tending',
      position: [5.5, 4.2, 3.5],
      dialogue: {
        id: 'thorne-greeting',
        speaker: 'Settler Thorne',
        title: 'Haven Hydroponic Cultivator',
        greeting: 'Careful around the Lumenvine sprouts! These bioluminescent fibers provide both illumination and breathable atmospheric oxygen for the whole colony.',
        options: [
          {
            label: 'Can I use Lumenvine fibers for crafting?',
            response: 'Certainly! Combine Lumenvine fibers with glass crystals or alloy fragments in the Fabricator [C key] to forge a portable Lumenvine Lantern.',
            rewardCoins: 45,
            rewardXp: 60,
          },
          {
            label: 'How do these plants survive at this altitude?',
            response: 'They drink planetary aether directly from Kepler-94d auroras. Their glowing sap possesses immense regenerative properties.',
          },
        ],
      },
      mesh: thorneMesh,
    });

    // -------------------------------------------------------------
    // 4. EXPLORER VAEL (Aero-Vanguard Pathfinder)
    // -------------------------------------------------------------
    const vaelRig = createHumanoidMesh(matSuitDark, 0x22d3ee);
    const vaelMesh = vaelRig.group;
    vaelMesh.position.set(-3.5, 4.2, 2.5);
    vaelMesh.rotation.y = 0.8;
    this.scene.add(vaelMesh);

    // Floating data pad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.02), this.matScreenGlow);
    pad.position.set(0.3, 1.25, 0.3);
    pad.rotation.x = 0.5;
    vaelMesh.add(pad);

    this.animatables.push({
      update: (time) => {
        vaelMesh.position.y = 4.2 + Math.sin(time * 2.0) * 0.02;
        pad.position.y = 1.25 + Math.sin(time * 3.0) * 0.03;
      }
    });

    this.npcs.push({
      id: 'npc-vael',
      name: 'Explorer Vael',
      role: 'Aero-Vanguard Pathfinder',
      settlement: 'Aero-Haven Outpost',
      behavior: 'scanning',
      position: [-3.5, 4.2, 2.5],
      dialogue: {
        id: 'vael-greeting',
        speaker: 'Explorer Vael',
        title: 'Aero-Vanguard Pathfinder',
        greeting: 'Greetings, voyager. The Great Drift is accelerating. Island strata are fragmenting into the lower turquoise aether. Have you calibrated your telemetry compass?',
        options: [
          {
            label: 'What caused the Great Drift?',
            response: 'Centuries ago, the ancient planetary harmonic anchors lost synchronization. Without all three anchors humming in unison, the gravity matrices collapsed.',
          },
          {
            label: 'Where should I start exploring?',
            response: 'Follow the northern catwalk toward the mid-bridge. Be careful near the abyss edge—activate each checkpoint shrine you find so your quantum matrix can reconstitute if you slip.',
            rewardXp: 50,
          },
          {
            label: 'How do I reach the higher sky citadels?',
            response: 'Attune all three quantum anchors across the sectors. When synchronized, the celestial resonance elevator awakens and lifts you into the higher clouds.',
          },
        ],
      },
      mesh: vaelMesh,
    });

    // -------------------------------------------------------------
    // 5. TRAVELER JORAH (Sitting Nomad by Warm Campfire)
    // -------------------------------------------------------------
    const jorahRig = createHumanoidMesh(matNomadCloak, 0xf97316, 0.95);
    const jorahMesh = jorahRig.group;
    jorahMesh.position.set(8.0, 4.6, -18.0);
    jorahMesh.rotation.y = -2.4;
    // Lower rig to seated pose
    jorahRig.legL.rotation.x = Math.PI / 2;
    jorahRig.legR.rotation.x = Math.PI / 2;
    jorahRig.legL.position.set(-0.16, 0.2, 0.25);
    jorahRig.legR.position.set(0.16, 0.2, 0.25);
    jorahRig.torso.position.y = 0.65;
    jorahRig.head.position.y = 1.2;
    this.scene.add(jorahMesh);

    // Warm Campfire Hearth
    const fireGroup = new THREE.Group();
    fireGroup.position.set(8.0, 4.6, -18.0);
    // Stone ring
    const stoneRingGeo = new THREE.TorusGeometry(0.45, 0.1, 6, 10);
    stoneRingGeo.rotateX(Math.PI / 2);
    const fireStones = new THREE.Mesh(stoneRingGeo, matPlating);
    fireStones.position.y = 0.08;
    // Burning logs
    const logGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const log1 = new THREE.Mesh(logGeo, logMat); log1.rotation.set(0.4, 0.4, 0.8); log1.position.y = 0.12;
    const log2 = new THREE.Mesh(logGeo, logMat); log2.rotation.set(-0.4, -0.4, -0.8); log2.position.y = 0.12;
    // Animated Flame Cone
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const flameCone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), flameMat);
    flameCone.position.y = 0.35;
    // Inner fire glow light
    const fireLight = new THREE.PointLight(0xf59e0b, 2.4, 7);
    fireLight.position.y = 0.45;
    fireGroup.add(fireStones, log1, log2, flameCone, fireLight);
    this.scene.add(fireGroup);

    this.animatables.push({
      update: (time) => {
        flameCone.scale.set(
          1.0 + Math.sin(time * 12.0) * 0.15,
          1.0 + Math.cos(time * 14.0) * 0.2,
          1.0 + Math.sin(time * 10.0) * 0.15
        );
        fireLight.intensity = 2.0 + Math.sin(time * 15.0) * 0.5;
      }
    });

    this.npcs.push({
      id: 'npc-jorah',
      name: 'Traveler Jorah',
      role: 'Wandering Nomad & Storyteller',
      settlement: 'Mid-Bridge Campfire Haven',
      behavior: 'sitting',
      position: [8.0, 4.6, -18.0],
      dialogue: {
        id: 'jorah-greeting',
        speaker: 'Traveler Jorah',
        title: 'Wandering Nomad',
        greeting: 'Pull up a stone and warm your hands, voyager. The high altitude wind is bitter today. Rest a spell by this campfire—its warmth soothes kinetic bruises and rapidly restores your stamina.',
        options: [
          {
            label: 'Tell me stories of the ancient sky cities.',
            response: 'Before the Great Drift shattered the crust, all citadels were bound in one celestial ring. Travelers rode gliders upon the golden solar thermal tides without fear of falling.',
            rewardCoins: 50,
            rewardXp: 75,
          },
          {
            label: 'How does this fire burn in thin aether?',
            response: 'Fed with slow-burning Aether-resin moss. Stand close whenever you are exhausted to regenerate your health and stamina!',
            rewardCoins: 30,
            rewardXp: 40,
          },
        ],
      },
      mesh: jorahMesh,
    });

    // -------------------------------------------------------------
    // 6. SCOUT TALIA (Horizon Lookout & Cloud Recon)
    // -------------------------------------------------------------
    const taliaRig = createHumanoidMesh(matSuitDark, 0x06b6d4, 0.98);
    const taliaMesh = taliaRig.group;
    taliaMesh.position.set(-16.0, 5.4, -12.0);
    taliaMesh.rotation.y = 1.8;
    this.scene.add(taliaMesh);

    // Binocular Rangefinder Visor
    const binoGeo = new THREE.BoxGeometry(0.32, 0.12, 0.18);
    const bino = new THREE.Mesh(binoGeo, this.matNeonCyan);
    bino.position.set(0, 1.76, 0.22);
    taliaMesh.add(bino);

    this.npcs.push({
      id: 'npc-talia',
      name: 'Scout Talia',
      role: 'Horizon Lookout & Storm Scout',
      settlement: 'Western Cantilever Outlook',
      behavior: 'guarding',
      position: [-16.0, 5.4, -12.0],
      dialogue: {
        id: 'talia-greeting',
        speaker: 'Scout Talia',
        title: 'Horizon Lookout',
        greeting: 'Keep a firm hand on the rail! Down in the turquoise cloud sea, I can spot migrating Cloudgrazers and a pod of Storm Rays gliding past Sector 03.',
        options: [
          {
            label: 'Are there any hazards on the horizon?',
            response: 'Watch for gravitational shearing near the bridge edges. If you slip into the void, your quantum recall matrix will reconstitute you at the last synchronized checkpoint.',
            rewardCoins: 40,
            rewardXp: 60,
          },
          {
            label: 'What is that grand spire in the clouds?',
            response: 'The Drifting Citadel! Its gates remain locked until the triad of Quantum Anchors are attuned into celestial resonance.',
          },
        ],
      },
      mesh: taliaMesh,
    });

    // -------------------------------------------------------------
    // 7. LOST SCOUT CORIN (Stranded Explorer with Distress Beacon)
    // -------------------------------------------------------------
    const corinRig = createHumanoidMesh(matSuitDark, 0xeab308, 0.95);
    const corinMesh = corinRig.group;
    corinMesh.position.set(-10.5, 3.8, -32.0);
    corinMesh.rotation.y = 0.5;
    // Kneeling posture
    corinRig.legL.rotation.x = Math.PI / 2.2;
    corinRig.legR.rotation.x = Math.PI / 1.5;
    corinRig.torso.position.y = 0.75;
    corinRig.torso.rotation.x = 0.2;
    corinRig.head.position.y = 1.25;
    this.scene.add(corinMesh);

    // Sparking Distress Beacon
    const beaconBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.2), this.matBrassPipes);
    beaconBox.position.set(-10.2, 3.95, -31.8);
    const beaconLight = new THREE.PointLight(0xeab308, 1.8, 6);
    beaconLight.position.set(-10.2, 4.3, -31.8);
    this.scene.add(beaconBox, beaconLight);

    this.animatables.push({
      update: (time) => {
        // Intermittent distress pulse
        beaconLight.intensity = Math.sin(time * 8.0) > 0.2 ? 3.0 : 0.2;
      }
    });

    this.npcs.push({
      id: 'npc-corin',
      name: 'Lost Scout Corin',
      role: 'Stranded Scout',
      settlement: 'Fractured Lower Catwalks',
      behavior: 'stranded',
      position: [-10.5, 3.8, -32.0],
      dialogue: {
        id: 'corin-greeting',
        speaker: 'Lost Scout Corin',
        title: 'Stranded Scout',
        greeting: '*Crackling suit speaker* Help! My suit thruster sputtered when the catwalk fractured. I am stranded down here on this severed catwalk ledge!',
        options: [
          {
            label: 'Hold on, take this emergency recovery salve!',
            response: 'Thank the stars! That stabilized my bio-vitals. Here—take this cache of 150 Drift Coins and this rare Quantum Anchor Key for saving my life!',
            rewardCoins: 150,
            rewardXp: 200,
          },
          {
            label: 'Can you climb back up to Haven?',
            response: 'Yes, now that my knee servo is patched, I can use my reserve grapple once the winds die down. Thank you, voyager!',
            rewardCoins: 50,
            rewardXp: 50,
          },
        ],
      },
      mesh: corinMesh,
    });

    // -------------------------------------------------------------
    // 8. SCHOLAR SILAS (Citadel Astrogator)
    // -------------------------------------------------------------
    const silasRig = createHumanoidMesh(matSuitDark, 0xa855f7);
    const silasMesh = silasRig.group;
    silasMesh.position.set(2.5, 4.6, -24.0);
    silasMesh.rotation.y = -2.2;
    this.scene.add(silasMesh);

    // Floating orb astrolabe
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), this.matNeonMagenta);
    orb.position.set(-0.35, 1.35, 0.3);
    silasMesh.add(orb);

    this.animatables.push({
      update: (time) => {
        orb.position.y = 1.35 + Math.sin(time * 2.5) * 0.06;
        orb.rotation.y = time * 2.0;
      }
    });

    this.npcs.push({
      id: 'npc-silas',
      name: 'Scholar Silas',
      role: 'Citadel Astrogator',
      settlement: 'Mid-Bridge Astronomical Outpost',
      behavior: 'scanning',
      position: [2.5, 4.6, -24.0],
      dialogue: {
        id: 'silas-greeting',
        speaker: 'Scholar Silas',
        title: 'Citadel Astrogator',
        greeting: 'The sky tides are restless today. Look upward—can you feel the gravitational resonance of the colossal turquoise gas giant above us?',
        options: [
          {
            label: 'Tell me about the Red Moon.',
            response: 'When the planetary alignment reaches its apex, Kepler-94d turns blood crimson. Ancient dimensional rifts become permeable during this rare celestial event.',
            rewardCoins: 50,
            rewardXp: 75,
          },
          {
            label: 'What are these data cores?',
            response: 'Encrypted archives of the ancient builders. Gather them to unlock memories of the drifting civilizations before the Great Drift split the world.',
          },
          {
            label: 'Safe travels, Silas.',
            response: 'May the solar winds hold your footing steady upon the sky-bridges, voyager.',
          },
        ],
      },
      mesh: silasMesh,
    });

    // -------------------------------------------------------------
    // 9. MECHANIC KIRA (Sub-Relay Engineer)
    // -------------------------------------------------------------
    const kiraRig = createHumanoidMesh(matSuitDark, 0x10b981);
    const kiraMesh = kiraRig.group;
    kiraMesh.position.set(22.0, 4.4, -36.0);
    kiraMesh.rotation.y = -1.2;
    this.scene.add(kiraMesh);

    this.npcs.push({
      id: 'npc-kira',
      name: 'Mechanic Kira',
      role: 'Sub-Relay Engineer',
      settlement: 'Geodesic Biosphere Lab Entry',
      behavior: 'standing',
      position: [22.0, 4.4, -36.0],
      dialogue: {
        id: 'kira-greeting',
        speaker: 'Mechanic Kira',
        title: 'Sub-Relay Engineer',
        greeting: 'Watch your step around the power conduits! The geodesic dome atmospheric shield is pulling high wattage from Anchor Gamma.',
        options: [
          {
            label: 'Need any materials?',
            response: 'The conduit couplings along the catwalks need raw Aether Crystals. Harvest any glowing blue crystals you spot and trade them in the supply depot!',
            rewardCoins: 40,
            rewardXp: 60,
          },
          {
            label: 'Is the geodesic dome safe?',
            response: 'The polyhedral dome is sealed against high-altitude ionizing radiation. It is one of the only true sanctuaries remaining in Sector 04.',
          },
        ],
      },
      mesh: kiraMesh,
    });

    // -------------------------------------------------------------
    // 10. THE WANDERING MOSSKEEPER (Ancient Arboreal Golem & Trader)
    // -------------------------------------------------------------
    const mosskeeperGroup = new THREE.Group();
    mosskeeperGroup.position.set(18.0, 4.4, -30.0);
    // Golem bulky stone torso
    const golemTorso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 0.7), matGolemStone);
    golemTorso.position.y = 1.7;
    // Mossy overgrown shoulders
    const golemMoss = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.8), matGolemMoss);
    golemMoss.position.y = 2.25;
    // Glowing emerald heart core
    const heartCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), this.matNeonGreen);
    heartCore.position.set(0, 1.7, 0.38);
    // Golem stone head
    const golemHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), matGolemStone);
    golemHead.position.set(0, 2.55, 0);
    const golemEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), this.matNeonGreen);
    golemEyeL.position.set(-0.14, 2.55, 0.26);
    const golemEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), this.matNeonGreen);
    golemEyeR.position.set(0.14, 2.55, 0.26);
    // Heavy stone legs
    const golemLegL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.1, 0.45), matGolemStone);
    golemLegL.position.set(-0.35, 0.55, 0);
    const golemLegR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.1, 0.45), matGolemStone);
    golemLegR.position.set(0.35, 0.55, 0);
    // Sprouting flower on shoulder
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), this.matNeonMagenta);
    flower.position.set(-0.55, 2.45, 0.1);
    mosskeeperGroup.add(golemTorso, golemMoss, heartCore, golemHead, golemEyeL, golemEyeR, golemLegL, golemLegR, flower);
    this.scene.add(mosskeeperGroup);

    // Wandering patrol logic along garden span
    let mossDir = 1;
    let mossProgress = 0.0;
    const mossP1 = new THREE.Vector3(18.0, 4.4, -30.0);
    const mossP2 = new THREE.Vector3(24.0, 4.4, -42.0);

    this.animatables.push({
      update: (_time, delta) => {
        mossProgress += delta * 0.08 * mossDir;
        if (mossProgress >= 1.0) {
          mossProgress = 1.0;
          mossDir = -1;
        } else if (mossProgress <= 0.0) {
          mossProgress = 0.0;
          mossDir = 1;
        }
        mosskeeperGroup.position.lerpVectors(mossP1, mossP2, mossProgress);
        // Face movement direction
        mosskeeperGroup.rotation.y = mossDir > 0 ? -1.0 : 2.14;
        // Walking sway
        const walkSwing = Math.sin(mossProgress * 24.0) * 0.25;
        golemLegL.rotation.x = walkSwing;
        golemLegR.rotation.x = -walkSwing;
      }
    });

    this.npcs.push({
      id: 'npc-mosskeeper',
      name: 'The Mosskeeper',
      role: 'Ancient Arboreal Golem',
      settlement: 'Geodesic Biosphere Gardens',
      isTrader: true,
      traderId: 'trader-mosskeeper',
      behavior: 'patrolling',
      patrolPoints: [[18.0, 4.4, -30.0], [24.0, 4.4, -42.0]],
      position: [18.0, 4.4, -30.0],
      dialogue: {
        id: 'mosskeeper-greeting',
        speaker: 'The Mosskeeper',
        title: 'Ancient Arboreal Golem',
        greeting: '*Deep rumbling stone-wood voice* Little sprout of the metallic towers... The gardens still breathe. Do you seek the ancient seeds and botanical elixirs of the drifting earth?',
        options: [
          {
            label: '[TRADE] Browse Botanical Elixirs & Luminescent Flora',
            response: 'The earth still whispers in my bark. Examine my botanical harvest.',
            openShop: true,
            openTradeTraderId: 'trader-mosskeeper',
          },
          {
            label: 'Who grew these geodesic gardens?',
            response: 'The First Cultivators before the Great Drift. I tend their blooming branches across the centuries.',
            rewardCoins: 50,
            rewardXp: 80,
          },
        ],
      },
      mesh: mosskeeperGroup,
    });

    // -------------------------------------------------------------
    // 11. THE DRIFT COLLECTOR (Nomadic Avian Scrap Broker)
    // -------------------------------------------------------------
    const collectorRig = createHumanoidMesh(matScavengerFeather, 0x38bdf8, 1.02);
    const collectorMesh = collectorRig.group;
    collectorMesh.position.set(-14.0, 5.0, -26.0);
    collectorMesh.rotation.y = 0.9;
    this.scene.add(collectorMesh);

    // Heavy salvage sack overflowing with metal pipes and gears
    const sack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), matNomadCloak);
    sack.position.set(0, 1.1, -0.42);
    const scrapBit1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), this.matBrassPipes);
    scrapBit1.position.set(0.18, 1.6, -0.4);
    scrapBit1.rotation.z = 0.4;
    collectorMesh.add(sack, scrapBit1);

    this.npcs.push({
      id: 'npc-collector',
      name: 'The Drift Collector',
      role: 'Nomadic Aviary Scavenger',
      settlement: 'Catwalk Scaffolding Outpost',
      isTrader: true,
      traderId: 'trader-collector',
      behavior: 'standing',
      position: [-14.0, 5.0, -26.0],
      dialogue: {
        id: 'collector-greeting',
        speaker: 'The Drift Collector',
        title: 'Nomadic Aviary Scavenger',
        greeting: '*Chuckle-squawk* Clinking alloys! Shiny fragments! You step right up to the Drift Collector! Anything that fell from the citadels, I have got cataloged and priced!',
        options: [
          {
            label: '[TRADE] Browse Salvaged Relics & Scrap Alloys',
            response: 'Shiny coins for shiny fragments! Let us deal, voyager!',
            openShop: true,
            openTradeTraderId: 'trader-collector',
          },
          {
            label: 'Where do you find all these parts?',
            response: 'I scavenge the shattered underbelly of the sky catwalks. If a courier drops a shipment, it becomes my inventory!',
            rewardCoins: 40,
            rewardXp: 50,
          },
        ],
      },
      mesh: collectorMesh,
    });

    // -------------------------------------------------------------
    // 12. DIMENSION RESEARCHER ZEPHYR (Chrono & Void Specialist)
    // -------------------------------------------------------------
    const zephyrRig = createHumanoidMesh(matSuitDark, 0xa855f7, 1.0);
    const zephyrMesh = zephyrRig.group;
    zephyrMesh.position.set(0.0, 5.0, -56.0);
    zephyrMesh.rotation.y = 3.14;
    this.scene.add(zephyrMesh);

    // Floating concentric Chrono-Rings
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 6, 16), this.matNeonMagenta);
    ring1.position.set(0, 1.4, 0.4);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 6, 16), this.matNeonCyan);
    ring2.position.set(0, 1.4, 0.4);
    zephyrMesh.add(ring1, ring2);

    this.animatables.push({
      update: (time) => {
        ring1.rotation.x = time * 2.2;
        ring1.rotation.y = time * 1.6;
        ring2.rotation.x = -time * 1.8;
        ring2.rotation.z = time * 2.5;
      }
    });

    this.npcs.push({
      id: 'npc-zephyr',
      name: 'Dimension Researcher Zephyr',
      role: 'Spacetime Resonator Specialist',
      settlement: 'Citadel Sanctum Perimeter',
      behavior: 'scanning',
      position: [0.0, 5.0, -56.0],
      dialogue: {
        id: 'zephyr-greeting',
        speaker: 'Researcher Zephyr',
        title: 'Spacetime Resonator Specialist',
        greeting: 'The spacetime curvature around this sector is bending! We are standing at the threshold of a dimensional fracture. Can you hear the harmonic hum of the Citadel?',
        options: [
          {
            label: 'What occurs during the Red Moon phenomenon?',
            response: 'The planetary gravitational matrix aligns directly with Kepler-94d iron core. Dimensional boundaries turn permeable, exposing rare relics and lunar dust.',
            rewardCoins: 80,
            rewardXp: 120,
          },
          {
            label: 'How can I unlock alternate dimensions?',
            response: 'Attune all three quantum anchors and synchronize your dimensional matrix via the Navigation menu.',
          },
        ],
      },
      mesh: zephyrMesh,
    });

    // -------------------------------------------------------------
    // 13. ANCIENT GUARDIAN AEON (Monumental Stone Sentinel)
    // -------------------------------------------------------------
    const aeonGroup = new THREE.Group();
    aeonGroup.position.set(0.0, 5.2, -68.0);
    aeonGroup.scale.set(1.4, 1.4, 1.4);
    // Monumental Guardian Stone Torso
    const aeonTorso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.8), matGolemStone);
    aeonTorso.position.y = 1.9;
    // Runic Chest Glyph Plaque (cyan emissive)
    const runicChest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.84), this.matNeonCyan);
    runicChest.position.set(0, 1.9, 0);
    // Massive Stone Pauldrons
    const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.7), matGoldPlating);
    pauldronL.position.set(-0.85, 2.4, 0);
    const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.7), matGoldPlating);
    pauldronR.position.set(0.85, 2.4, 0);
    // Sentinel Head with slit eye visor
    const aeonHead = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), matGolemStone);
    aeonHead.position.set(0, 2.85, 0);
    const aeonVisor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.64), this.matNeonCyan);
    aeonVisor.position.set(0, 2.85, 0);
    // Towering Energy Poleaxe
    const poleaxe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.8, 6), this.matBrassPipes);
    poleaxe.position.set(0.85, 1.9, 0.4);
    const poleaxeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.5), this.matNeonCyan);
    poleaxeBlade.position.set(0.85, 3.4, 0.65);
    aeonGroup.add(aeonTorso, runicChest, pauldronL, pauldronR, aeonHead, aeonVisor, poleaxe, poleaxeBlade);
    this.scene.add(aeonGroup);

    this.animatables.push({
      update: (time) => {
        // Runic pulse
        const pulse = 0.8 + Math.sin(time * 2.0) * 0.2;
        runicChest.scale.set(1.0, 1.0, 1.0 + Math.sin(time * 3.0) * 0.02);
        poleaxeBlade.position.y = 3.4 + Math.sin(time * 2.0) * 0.03;
      }
    });

    this.npcs.push({
      id: 'npc-guardian-aeon',
      name: 'Ancient Guardian Aeon',
      role: 'Citadel Sanctum Sentinel',
      settlement: 'Drifting Citadel Portal Gateway',
      behavior: 'guarding',
      position: [0.0, 5.2, -68.0],
      dialogue: {
        id: 'aeon-greeting',
        speaker: 'Ancient Guardian Aeon',
        title: 'Citadel Sanctum Sentinel',
        greeting: '*A colossal resonant voice echoes inside your mind* MORTAL TRAVELER. YOU STAND BEFORE THE THRESHOLD OF THE DRIFTING CITADEL SANCTUM. STATE YOUR INTENT.',
        options: [
          {
            label: 'I seek to restore harmony to the Drifting World.',
            response: 'THE ARCHIPELAGO HAS WEPT FOR CENTURIES. HARMONIZE THE THREE QUANTUM ANCHORS. ONLY WHEN ALL THREE BEAMS REACH THE HEAVENS SHALL THE CITADEL CORE REVEAL ITS TRUTHS.',
            rewardCoins: 100,
            rewardXp: 150,
          },
          {
            label: 'Who carved your stone frame?',
            response: 'THOSE WHO MASTERED GRAVITATION BEFORE THE SEPARATION. WE WERE LEFT AS SENTINELS TO PRESERVE THE HARMONIC HEART.',
            rewardCoins: 50,
            rewardXp: 75,
          },
        ],
      },
      mesh: aeonGroup,
    });
  }

  /**
   * 12. Harvestable Resources & Collectible Relics across the world
   */
  private buildHarvestableResources() {
    const matCrystal = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });

    const matAlloy = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      emissive: 0x334155,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.9,
    });

    const matChrono = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.9,
    });

    const matWood = new THREE.MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.8,
      metalness: 0.1,
    });

    const matStone = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
      metalness: 0.2,
    });

    const matFlora = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });

    const matAmber = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });

    const matVoid = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.7,
      roughness: 0.4,
    });

    const spawnResource = (
      id: string,
      name: string,
      itemType: string,
      coinValue: number,
      xpValue: number,
      pos: [number, number, number],
      mat: THREE.Material,
      geo: THREE.BufferGeometry
    ) => {
      const group = new THREE.Group();
      group.position.set(...pos);

      // Hovering stone/metal pedestal
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.4, 6), this.matSteelDark);
      ped.position.y = -0.4;
      group.add(ped);

      // Glowing floating item mesh
      const itemMesh = new THREE.Mesh(geo, mat);
      itemMesh.position.y = 0.2;
      group.add(itemMesh);

      // Glow light
      const light = new THREE.PointLight(0x38bdf8, 1.2, 5);
      light.position.y = 0.3;
      group.add(light);

      this.scene.add(group);

      const resItem: HarvestableResource = {
        id,
        name,
        itemType,
        coinValue,
        xpValue,
        position: pos,
        collected: false,
        mesh: group,
      };
      this.resources.push(resItem);

      this.animatables.push({
        update: (time) => {
          if (resItem.collected) return;
          itemMesh.rotation.y = time * 1.5;
          itemMesh.rotation.x = Math.sin(time) * 0.3;
          itemMesh.position.y = 0.2 + Math.sin(time * 2.5) * 0.12;
        }
      });
    };

    // 1. Aether Crystal 1 - Observation Deck West Balcony
    spawnResource(
      'res-crystal-1',
      'Aether Crystal',
      'material',
      25,
      50,
      [-6.0, 4.6, -2.0],
      matCrystal,
      new THREE.DodecahedronGeometry(0.24, 0)
    );

    // 2. Aether Crystal 2 - Observation Deck East Overlook
    spawnResource(
      'res-crystal-2',
      'Aether Crystal',
      'material',
      25,
      50,
      [6.0, 4.6, 2.5],
      matCrystal,
      new THREE.DodecahedronGeometry(0.24, 0)
    );

    // 3. Ancient Titanium Alloy - Mid-Bridge Span
    spawnResource(
      'res-alloy-1',
      'Titanium Alloy Scrap',
      'material',
      40,
      80,
      [-1.8, 5.0, -16.0],
      matAlloy,
      new THREE.BoxGeometry(0.32, 0.22, 0.45)
    );

    // 4. Aether Crystal 3 - Far Bridge Approach
    spawnResource(
      'res-crystal-3',
      'Aether Crystal',
      'material',
      25,
      50,
      [1.8, 5.0, -32.0],
      matCrystal,
      new THREE.DodecahedronGeometry(0.24, 0)
    );

    // 5. Chrono-Relic Capsule - Geodesic Outpost
    spawnResource(
      'res-chrono-1',
      'Chrono-Relic Capsule',
      'artifact',
      75,
      150,
      [18.0, 4.8, -37.0],
      matChrono,
      new THREE.OctahedronGeometry(0.28, 0)
    );

    // 6. Quantum Core Relic - Ancient Broken Pillar Ruin
    spawnResource(
      'res-relic-2',
      'Quantum Core Relic',
      'artifact',
      100,
      200,
      [-5.0, 5.4, -42.0],
      matChrono,
      new THREE.IcosahedronGeometry(0.3, 0)
    );

    // 7. Petrified Driftwood - Observation Deck Landing
    spawnResource(
      'res-wood-1',
      'Petrified Driftwood',
      'mat-wood',
      15,
      30,
      [-4.0, 4.4, 5.0],
      matWood,
      new THREE.CylinderGeometry(0.12, 0.16, 0.6, 6)
    );

    // 8. Petrified Driftwood - Mid-Bridge Approach
    spawnResource(
      'res-wood-2',
      'Petrified Driftwood',
      'mat-wood',
      15,
      30,
      [1.5, 4.8, -12.0],
      matWood,
      new THREE.CylinderGeometry(0.12, 0.16, 0.6, 6)
    );

    // 9. Basalt Strata Fragment - West Balcony
    spawnResource(
      'res-stone-1',
      'Basalt Strata Fragment',
      'mat-stone',
      15,
      35,
      [-7.5, 4.4, 1.5],
      matStone,
      new THREE.DodecahedronGeometry(0.25, 0)
    );

    // 10. Basalt Strata Fragment - Sky Bridge Overlook
    spawnResource(
      'res-stone-2',
      'Basalt Strata Fragment',
      'mat-stone',
      15,
      35,
      [-2.0, 4.8, -26.0],
      matStone,
      new THREE.DodecahedronGeometry(0.25, 0)
    );

    // 11. Lumenvine Fibers - Observation Overlook Garden
    spawnResource(
      'res-lumenvine-1',
      'Lumenvine Tendril',
      'mat-lumenvine',
      25,
      45,
      [5.5, 4.4, 6.0],
      matFlora,
      new THREE.TorusGeometry(0.22, 0.08, 6, 12)
    );

    // 12. Amber Solar Resin - Geodesic Dome Exterior
    spawnResource(
      'res-amber-1',
      'Amber Solar Resin',
      'mat-amber-resin',
      30,
      50,
      [16.0, 4.6, -34.0],
      matAmber,
      new THREE.OctahedronGeometry(0.22, 0)
    );

    // 13. Void Drift Residue - Rift Edge
    spawnResource(
      'res-void-1',
      'Void Drift Residue',
      'mat-void-dust',
      45,
      70,
      [-4.0, 5.0, -36.0],
      matVoid,
      new THREE.IcosahedronGeometry(0.24, 0)
    );

    // 14. Floating Spring Aether - Hydro-Condensor Pod
    spawnResource(
      'res-spring-1',
      'Floating Spring Aether',
      'mat-spring-water',
      20,
      40,
      [2.5, 4.4, 7.0],
      matCrystal,
      new THREE.SphereGeometry(0.2, 8, 8)
    );
  }

  /**
   * 13. Functional Checkpoint Beacons with Radiant Activation Pillars
   */
  private buildWorldCheckpoints() {
    const cpList: Array<{ id: string; name: string; sector: string; pos: [number, number, number] }> = [
      {
        id: 'cp-observation',
        name: 'Observation Matrix Beacon',
        sector: 'Sector 01: Observation Deck',
        pos: [0, 4.2, 1.0],
      },
      {
        id: 'cp-midbridge',
        name: 'Mid-Bridge Sky Shrine',
        sector: 'Sector 02: Sky-Bridges',
        pos: [0, 4.6, -20.0],
      },
      {
        id: 'cp-geodesic',
        name: 'Geodesic Terminal Gateway',
        sector: 'Sector 04: Geodesic Domes',
        pos: [20.0, 4.4, -38.0],
      },
      {
        id: 'cp-citadel',
        name: 'Citadel Threshold Sanctum',
        sector: 'Sector 03: The Drifting Citadel',
        pos: [0, 4.6, -46.0],
      },
    ];

    cpList.forEach((item) => {
      const group = new THREE.Group();
      group.position.set(...item.pos);

      // Stepped octagonal base
      const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.25, 8);
      const base = new THREE.Mesh(baseGeo, this.matSteelDark);
      base.position.y = 0.125;
      group.add(base);
      this.walkableMeshes.push(base);

      // Inner glowing energy ring
      const ringGeo = new THREE.RingGeometry(0.5, 0.75, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, this.matNeonCyan);
      ring.position.y = 0.26;
      group.add(ring);

      // Levitating diamond prism beacon
      const prismGeo = new THREE.OctahedronGeometry(0.35, 0);
      const prismMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const prism = new THREE.Mesh(prismGeo, prismMat);
      prism.position.y = 1.35;
      group.add(prism);

      // Vertical beacon light beam (semi-transparent cylinder)
      const beamGeo = new THREE.CylinderGeometry(0.12, 0.35, 18.0, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.25,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 9.0;
      group.add(beam);

      // Point Light
      const light = new THREE.PointLight(0x06b6d4, 1.5, 8);
      light.position.y = 1.5;
      group.add(light);

      this.scene.add(group);

      this.animatables.push({
        update: (time) => {
          prism.rotation.y = time * 1.8;
          prism.position.y = 1.35 + Math.sin(time * 3.0) * 0.08;
        }
      });

      this.checkpoints.push({
        id: item.id,
        name: item.name,
        sectorName: item.sector,
        position: item.pos,
        activated: false,
        mesh: group,
        light,
      });
    });
  }

  public initPerformanceOptimizations() {
    this.localLights = [];
    this.scene.updateMatrixWorld(true);

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.PointLight) {
        // Exclude redMoonLight (global eclipse sky phenomenon with 280m radius)
        if (obj !== this.redMoonLight) {
          const worldPos = new THREE.Vector3();
          obj.getWorldPosition(worldPos);
          const baseDist = obj.distance > 0 ? obj.distance : 14;
          const maxDist = baseDist + 12;
          this.localLights.push({
            light: obj,
            worldPos,
            maxDistSq: maxDist * maxDist,
          });
        }
      }
    });

    // Freeze static groups and meshes so Three.js skips updating their matrices every frame
    const dynamicKeywords = ['speeder', 'ray', 'wisp', 'prism', 'crystal', 'item', 'torch', 'flame', 'needle', 'humanoid', 'torso', 'leg', 'arm', 'head', 'gasgiant', 'ring', 'dome'];
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        let isDynamic = false;
        let curr: THREE.Object3D | null = obj;
        while (curr && curr !== this.scene) {
          const name = (curr.name || '').toLowerCase();
          for (let k = 0; k < dynamicKeywords.length; k++) {
            if (name.includes(dynamicKeywords[k])) {
              isDynamic = true;
              break;
            }
          }
          if (isDynamic) break;
          curr = curr.parent;
        }

        if (!isDynamic) {
          obj.matrixAutoUpdate = false;
          obj.updateMatrix();
        }
      }
    });
  }

  public update(time: number, delta: number, playerPos?: THREE.Vector3) {
    // 1. Consolidated golden cloud sea animation (tight loop, zero closures)
    const numClouds = this.cloudMounds.length;
    for (let i = 0; i < numClouds; i++) {
      const c = this.cloudMounds[i];
      c.mesh.position.y = c.origY + Math.sin(time * 0.4 + c.index) * 1.5;
    }

    // 2. Animatables
    const animCount = this.animatables.length;
    for (let i = 0; i < animCount; i++) {
      this.animatables[i].update(time, delta);
    }

    // 3. Dynamic PointLight distance culling (reduces GPU fragment shader light loops from 35+ to 2-4)
    if (playerPos) {
      this.lightCullTimer += delta;
      if (this.lightCullTimer >= 0.05) { // 20 Hz throttle
        this.lightCullTimer = 0;
        const px = playerPos.x;
        const py = playerPos.y;
        const pz = playerPos.z;
        const numLights = this.localLights.length;
        for (let i = 0; i < numLights; i++) {
          const entry = this.localLights[i];
          const wp = entry.worldPos;
          const dx = px - wp.x;
          const dy = py - wp.y;
          const dz = pz - wp.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          entry.light.visible = distSq <= entry.maxDistSq;
        }
      }
    }

    // 4. NPC smooth facing reaction to player proximity using squared distance (zero Math.sqrt)
    if (playerPos) {
      const px = playerPos.x;
      const pz = playerPos.z;
      const npcs = this.npcs;
      const numNpcs = npcs.length;
      for (let i = 0; i < numNpcs; i++) {
        const npc = npcs[i];
        if (!npc.mesh || npc.behavior === 'patrolling') continue;
        const nx = npc.mesh.position.x;
        const nz = npc.mesh.position.z;
        const dx = px - nx;
        const dz = pz - nz;
        const distSq = dx * dx + dz * dz;
        if (distSq < 42.25) { // 6.5m * 6.5m
          const targetAngle = Math.atan2(dx, dz);
          npc.mesh.rotation.y = THREE.MathUtils.lerp(npc.mesh.rotation.y, targetAngle, Math.min(1.0, 4.0 * delta));
        }
      }
    }

    // 5. Progressive Day-Night Cycle (120 seconds for full loop, unless locked)
    this.dayCycleTime += delta;
    if (this.dayCycleTime > 120) {
      this.dayCycleTime = 0;
    }

    // Determine current phase based on cycle time
    // 0-45s: Day | 45-70s: Sunset | 70-105s: Night | 105-120s: Rare Red Moon window (10% chance)
    if (this.dayCycleTime < 45 && this.timeOfDay !== 'day') {
      this.setTimeOfDay('day');
    } else if (this.dayCycleTime >= 45 && this.dayCycleTime < 70 && this.timeOfDay !== 'sunset') {
      this.setTimeOfDay('sunset');
    } else if (this.dayCycleTime >= 70 && this.dayCycleTime < 105 && this.timeOfDay !== 'night') {
      this.setTimeOfDay('night');
    } else if (this.dayCycleTime >= 105 && this.timeOfDay !== 'red_moon') {
      this.setTimeOfDay('red_moon');
    }
  }

  public setQuality(quality: 'low' | 'balanced' | 'high') {
    const margin = quality === 'low' ? 6 : quality === 'balanced' ? 10 : 16;
    for (let i = 0; i < this.localLights.length; i++) {
      const entry = this.localLights[i];
      const baseDist = entry.light.distance > 0 ? entry.light.distance : 14;
      const maxDist = baseDist + margin;
      entry.maxDistSq = maxDist * maxDist;
    }
  }
}
