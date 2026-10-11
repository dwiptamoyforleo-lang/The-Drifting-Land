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
import { MagicalAnchor, WorldFragment, InscriptionLore } from './types';

export class WorldManager {
  public scene: THREE.Scene;
  public walkableMeshes: THREE.Object3D[] = [];
  public animatables: Array<{ update: (time: number, delta: number) => void }> = [];

  // Interactive structures
  public anchors: MagicalAnchor[] = [];
  public fragments: WorldFragment[] = [];
  public inscriptions: InscriptionLore[] = [];

  // Flying speeders
  public speeders: THREE.Group[] = [];

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
  }

  private setupLighting() {
    // Ambient cosmic twilight light
    const ambientLight = new THREE.AmbientLight(0x232938, 1.5);
    this.scene.add(ambientLight);

    // Warm golden sunset rim light from the low horizon clouds
    const sunsetLight = new THREE.DirectionalLight(0xf59e0b, 1.6);
    sunsetLight.position.set(-60, 20, -50);
    this.scene.add(sunsetLight);

    // Cool turquoise reflected light from the giant planet
    const planetLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    planetLight.position.set(70, 80, -90);
    this.scene.add(planetLight);
  }

  /**
   * 1. Sky & Celestial Gas Giant:
   * Colossal turquoise gas giant planet dominating the upper-right sky!
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
    const planetGroup = new THREE.Group();
    planetGroup.position.set(95, 75, -170);

    const planetGeo = new THREE.SphereGeometry(72, 32, 24);
    const planetMesh = new THREE.Mesh(planetGeo, this.matGasGiant);
    planetGroup.add(planetMesh);

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
    planetGroup.add(band);

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
    planetGroup.add(crescent);

    this.scene.add(planetGroup);

    // Slow planetary rotation
    this.animatables.push({
      update: (time) => {
        planetMesh.rotation.y = time * 0.02;
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
      this.animatables.push({
        update: (time) => {
          mound.position.y = origY + Math.sin(time * 0.4 + i) * 1.5;
        }
      });
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

  public update(time: number, delta: number) {
    for (let i = 0; i < this.animatables.length; i++) {
      this.animatables[i].update(time, delta);
    }
  }

  public setQuality(_quality: 'low' | 'balanced' | 'high') {
    // Quality adjustments
  }
}
