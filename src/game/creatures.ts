/**
 * Hostile Creatures, Mobs, Boss Encounters, and Loot Tables for THE DRIFTING LAND
 * Implements distinct movement patterns, functional AI states, hit detection,
 * combat feedback, attack cooldowns, defeat states, and configurable loot drops.
 */
import * as THREE from 'three';
import { HostileCreature, LootDrop, ItemRarity } from './types';
import { ITEM_DATABASE } from './itemDatabase';

export interface CombatHitResult {
  hit: boolean;
  creatureName?: string;
  damageDealt?: number;
  defeated?: boolean;
  isBoss?: boolean;
  lootItems?: Array<{ itemId: string; name: string; count: number; rarity: ItemRarity }>;
  rareDropNotification?: string;
  message?: string;
}

export class CreatureManager {
  private scene: THREE.Scene;
  public creatures: HostileCreature[] = [];
  public moonDeerMesh?: THREE.Group;
  public moonDeerPosition: THREE.Vector3 = new THREE.Vector3(-16.0, 4.4, -28.0);
  public moonDeerStudied: boolean = false;

  // Active boss tracking for HUD health bar
  public activeBoss: HostileCreature | null = null;

  // Shared low-poly materials for maximum performance
  private matGuardianMetal!: THREE.MeshStandardMaterial;
  private matGuardianEyeRed!: THREE.MeshBasicMaterial;
  private matGuardianEyeDormant!: THREE.MeshBasicMaterial;
  private matHoundFur!: THREE.MeshStandardMaterial;
  private matPredatorWing!: THREE.MeshStandardMaterial;
  private matBasaltStone!: THREE.MeshStandardMaterial;
  private matRiftVoid!: THREE.MeshStandardMaterial;
  private matTitanArmor!: THREE.MeshStandardMaterial;
  private matTitanCore!: THREE.MeshBasicMaterial;
  private matMoonDeer!: THREE.MeshStandardMaterial;
  private matMoonAntler!: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initMaterials();
    this.buildHostileCreatures();
    this.buildPeacefulMoonDeer();
  }

  private initMaterials() {
    this.matGuardianMetal = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.7,
      flatShading: true,
    });

    this.matGuardianEyeRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.matGuardianEyeDormant = new THREE.MeshBasicMaterial({ color: 0x475569 });

    this.matHoundFur = new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.3,
      roughness: 0.7,
    });

    this.matPredatorWing = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      flatShading: true,
    });

    this.matBasaltStone = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
      metalness: 0.2,
      flatShading: true,
    });

    this.matRiftVoid = new THREE.MeshStandardMaterial({
      color: 0x581c87,
      emissive: 0x3b0764,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      wireframe: false,
    });

    this.matTitanArmor = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.3,
      metalness: 0.8,
      flatShading: true,
    });

    this.matTitanCore = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    this.matMoonDeer = new THREE.MeshStandardMaterial({
      color: 0xf0fdf4,
      emissive: 0x059669,
      emissiveIntensity: 0.25,
      roughness: 0.4,
    });

    this.matMoonAntler = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
  }

  private buildHostileCreatures() {
    const creatureDefs: Array<{
      id: string;
      name: string;
      mobType: HostileCreature['mobType'];
      health: number;
      attackPower: number;
      attackCooldown: number;
      detectionRange: number;
      attackRange: number;
      speed: number;
      homePos: [number, number, number];
      lootTable: LootDrop[];
      rareDropNotification: string;
      isBoss?: boolean;
    }> = [
      // 1. Forest Nest Scout (Small agile guardian protecting its clutch)
      {
        id: 'creature-nest-scout',
        name: 'Igneous Emberhound',
        mobType: 'nest_scout',
        health: 50,
        attackPower: 8,
        attackCooldown: 1.2,
        detectionRange: 8.5,
        attackRange: 2.2,
        speed: 4.8,
        homePos: [14.0, 4.4, -14.0],
        lootTable: [
          { itemId: 'mat-ember-shard', chance: 0.45, minQty: 1, maxQty: 2, rarity: 'uncommon' },
          { itemId: 'mat-wood', chance: 0.8, minQty: 2, maxQty: 4, rarity: 'common' },
        ],
        rareDropNotification: 'Obtained Ember Shard from defeated Emberhound!',
      },
      // 2. Ruin Guardian (Ancient mechanical golem near ruined arches)
      {
        id: 'creature-ruin-guardian',
        name: 'Awakened Ruin Guardian',
        mobType: 'ruin_guardian',
        health: 110,
        attackPower: 18,
        attackCooldown: 2.0,
        detectionRange: 9.5,
        attackRange: 2.8,
        speed: 2.4,
        homePos: [-14.0, 4.4, -36.0],
        lootTable: [
          { itemId: 'mat-ancient-gear', chance: 0.4, minQty: 1, maxQty: 2, rarity: 'rare' },
          { itemId: 'mat-titanium', chance: 0.7, minQty: 1, maxQty: 3, rarity: 'rare' },
          { itemId: 'mat-stone', chance: 0.9, minQty: 3, maxQty: 6, rarity: 'common' },
        ],
        rareDropNotification: 'Recovered precision Ancient Clockwork Gear from Ruin Guardian!',
      },
      // 3. Cliff Predator (Flying winged menace soaring along the precipices)
      {
        id: 'creature-storm-ray',
        name: 'Storm Ray Predator',
        mobType: 'storm_ray_predator',
        health: 65,
        attackPower: 12,
        attackCooldown: 1.6,
        detectionRange: 12.0,
        attackRange: 3.2,
        speed: 5.5,
        homePos: [24.0, 9.2, -28.0],
        lootTable: [
          { itemId: 'mat-storm-core', chance: 0.35, minQty: 1, maxQty: 1, rarity: 'rare' },
          { itemId: 'mat-celestine', chance: 0.65, minQty: 1, maxQty: 3, rarity: 'uncommon' },
        ],
        rareDropNotification: 'Extracted pulsing Storm Core from Cliff Predator!',
      },
      // 4. Armored Basalt Golem (Heavy defender around rare mineral crags)
      {
        id: 'creature-armored-golem',
        name: 'Armored Basalt Golem',
        mobType: 'armored_golem',
        health: 140,
        attackPower: 22,
        attackCooldown: 2.4,
        detectionRange: 8.0,
        attackRange: 2.6,
        speed: 1.8,
        homePos: [20.0, 4.8, -12.0],
        lootTable: [
          { itemId: 'mat-armored-carapace', chance: 0.6, minQty: 1, maxQty: 2, rarity: 'uncommon' },
          { itemId: 'mat-stone', chance: 1.0, minQty: 4, maxQty: 8, rarity: 'common' },
          { itemId: 'mat-celestine', chance: 0.3, minQty: 1, maxQty: 2, rarity: 'uncommon' },
        ],
        rareDropNotification: 'Salvaged dense Basalt Golem Carapace!',
      },
      // 5. Dimensional Rift Stalker (Phasing entity near unstable portal)
      {
        id: 'creature-rift-stalker',
        name: 'Dimensional Rift Stalker',
        mobType: 'rift_stalker',
        health: 85,
        attackPower: 16,
        attackCooldown: 1.4,
        detectionRange: 11.0,
        attackRange: 2.8,
        speed: 5.2,
        homePos: [30.0, 8.2, -42.0],
        lootTable: [
          { itemId: 'mat-rift-crystal', chance: 0.3, minQty: 1, maxQty: 1, rarity: 'epic' },
          { itemId: 'mat-void-dust', chance: 0.75, minQty: 2, maxQty: 4, rarity: 'rare' },
        ],
        rareDropNotification: 'EPIC DISCOVERY: Displaced Rift Crystal acquired!',
      },
      // 6. Colossal Regional Boss: Ancient Titan Automaton
      {
        id: 'boss-citadel-titan',
        name: 'Titan of the Drifting Citadel',
        mobType: 'ancient_titan_boss',
        health: 260,
        attackPower: 28,
        attackCooldown: 2.5,
        detectionRange: 16.0,
        attackRange: 4.2,
        speed: 2.6,
        homePos: [0.0, 5.2, -56.0],
        lootTable: [
          { itemId: 'mat-titan-relic', chance: 1.0, minQty: 1, maxQty: 1, rarity: 'mythic' },
          { itemId: 'mat-ancient-gear', chance: 1.0, minQty: 3, maxQty: 5, rarity: 'rare' },
          { itemId: 'mat-chrono-core', chance: 0.65, minQty: 1, maxQty: 2, rarity: 'epic' },
        ],
        rareDropNotification: 'MYTHIC VICTORY: Colossus Power Core liberated from the Citadel Titan!',
        isBoss: true,
      },
    ];

    creatureDefs.forEach((def) => {
      const homeVec = new THREE.Vector3(...def.homePos);
      const meshGroup = this.createCreatureMesh(def.mobType, homeVec, def.isBoss);
      this.scene.add(meshGroup);

      const eyeLight = meshGroup.getObjectByName('eyeLight') as THREE.PointLight | undefined;

      this.creatures.push({
        id: def.id,
        name: def.name,
        mobType: def.mobType,
        health: def.health,
        maxHealth: def.health,
        attackPower: def.attackPower,
        attackCooldown: def.attackCooldown,
        attackTimer: 0,
        detectionRange: def.detectionRange,
        attackRange: def.attackRange,
        speed: def.speed,
        state: 'idle',
        position: homeVec.clone(),
        homePosition: homeVec.clone(),
        mesh: meshGroup,
        eyeLight,
        lootTable: def.lootTable,
        rareDropNotification: def.rareDropNotification,
        respawnTime: def.isBoss ? 120.0 : 65.0,
        respawnTimer: 0,
        isBoss: def.isBoss,
      });
    });
  }

  private createCreatureMesh(type: HostileCreature['mobType'], pos: THREE.Vector3, isBoss?: boolean): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(pos);

    switch (type) {
      case 'nest_scout': {
        // Fast quadruped body
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.45, 1.1);
        const body = new THREE.Mesh(bodyGeo, this.matHoundFur);
        body.position.y = 0.5;
        group.add(body);

        // Head with pointed ears
        const headGeo = new THREE.ConeGeometry(0.25, 0.45, 4);
        headGeo.rotateX(Math.PI / 2);
        const head = new THREE.Mesh(headGeo, this.matHoundFur);
        head.position.set(0, 0.65, 0.65);
        group.add(head);

        // Glowing red eyes
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), this.matGuardianEyeRed);
        eyeL.position.set(-0.12, 0.72, 0.75);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.12;
        group.add(eyeL, eyeR);
        break;
      }

      case 'ruin_guardian': {
        // Ancient bulky bipedal mechanical golem
        const torsoGeo = new THREE.BoxGeometry(1.2, 1.4, 0.8);
        const torso = new THREE.Mesh(torsoGeo, this.matGuardianMetal);
        torso.position.y = 1.6;
        group.add(torso);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.35, 1.0, 0.45);
        const legL = new THREE.Mesh(legGeo, this.matGuardianMetal);
        legL.position.set(-0.4, 0.5, 0);
        const legR = legL.clone();
        legR.position.x = 0.4;
        group.add(legL, legR);

        // Arms with heavy stone fists
        const armGeo = new THREE.BoxGeometry(0.35, 1.1, 0.4);
        const armL = new THREE.Mesh(armGeo, this.matGuardianMetal);
        armL.position.set(-0.8, 1.5, 0.1);
        const armR = armL.clone();
        armR.position.x = 0.8;
        group.add(armL, armR);

        // Cyclopean ocular visor
        const eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const eyeMesh = new THREE.Mesh(eyeGeo, this.matGuardianEyeDormant);
        eyeMesh.name = 'eyeMesh';
        eyeMesh.position.set(0, 2.0, 0.42);
        group.add(eyeMesh);

        // Eye point light (activates when alerted)
        const eyeLight = new THREE.PointLight(0xef4444, 0, 8);
        eyeLight.name = 'eyeLight';
        eyeLight.position.set(0, 2.0, 0.6);
        group.add(eyeLight);
        break;
      }

      case 'storm_ray_predator': {
        // Airborne soaring predator
        const bodyGeo = new THREE.ConeGeometry(0.9, 2.8, 5);
        bodyGeo.rotateX(Math.PI / 2);
        const body = new THREE.Mesh(bodyGeo, this.matPredatorWing);
        body.position.y = 1.0;
        group.add(body);

        // Swept wings
        const wingGeo = new THREE.BoxGeometry(3.6, 0.1, 1.2);
        const wings = new THREE.Mesh(wingGeo, this.matPredatorWing);
        wings.name = 'wings';
        wings.position.set(0, 1.05, 0.2);
        group.add(wings);
        break;
      }

      case 'armored_golem': {
        // Basalt crab/turtle boulder creature
        const shellGeo = new THREE.DodecahedronGeometry(0.9, 0);
        shellGeo.scale(1.2, 0.8, 1.2);
        const shell = new THREE.Mesh(shellGeo, this.matBasaltStone);
        shell.position.y = 0.75;
        group.add(shell);

        // Basalt armor plates
        for (let i = 0; i < 4; i++) {
          const footGeo = new THREE.BoxGeometry(0.35, 0.4, 0.35);
          const foot = new THREE.Mesh(footGeo, this.matBasaltStone);
          const angle = (i * Math.PI) / 2 + Math.PI / 4;
          foot.position.set(Math.cos(angle) * 0.7, 0.2, Math.sin(angle) * 0.7);
          group.add(foot);
        }
        break;
      }

      case 'rift_stalker': {
        // Ethereal shadowy creature with lavender glow
        const stalkerBody = new THREE.ConeGeometry(0.7, 1.8, 5);
        const body = new THREE.Mesh(stalkerBody, this.matRiftVoid);
        body.position.y = 1.1;
        group.add(body);

        const crestGeo = new THREE.TorusGeometry(0.45, 0.08, 6, 12);
        const crest = new THREE.Mesh(crestGeo, this.matRiftVoid);
        crest.name = 'crest';
        crest.position.y = 1.8;
        crest.rotation.x = Math.PI / 3;
        group.add(crest);
        break;
      }

      case 'ancient_titan_boss': {
        // Colossal 5-meter tall guardian boss
        const titanTorso = new THREE.BoxGeometry(2.4, 2.8, 1.6);
        const torso = new THREE.Mesh(titanTorso, this.matTitanArmor);
        torso.position.y = 3.2;
        group.add(torso);

        // Giant glowing chest core
        const coreGeo = new THREE.OctahedronGeometry(0.55, 0);
        const core = new THREE.Mesh(coreGeo, this.matTitanCore);
        core.name = 'titanCore';
        core.position.set(0, 3.2, 0.88);
        group.add(core);

        // Colossal legs
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 0.8), this.matTitanArmor);
        legL.position.set(-0.8, 1.0, 0);
        const legR = legL.clone();
        legR.position.x = 0.8;
        group.add(legL, legR);

        // Energy fists
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.8), this.matTitanArmor);
        armL.name = 'armL';
        armL.position.set(-1.6, 2.8, 0.2);
        const armR = armL.clone();
        armR.name = 'armR';
        armR.position.x = 1.6;
        group.add(armL, armR);

        // Crown / Horns
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 4), this.matTitanCore);
        crown.position.set(-0.5, 4.8, 0);
        crown.rotation.z = -0.3;
        const crownR = crown.clone();
        crownR.position.x = 0.5;
        crownR.rotation.z = 0.3;
        group.add(crown, crownR);
        break;
      }
    }

    return group;
  }

  private buildPeacefulMoonDeer() {
    this.moonDeerMesh = new THREE.Group();
    this.moonDeerMesh.position.copy(this.moonDeerPosition);

    // Elegant quadruped torso
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.6, 1.5);
    const body = new THREE.Mesh(bodyGeo, this.matMoonDeer);
    body.position.y = 1.0;
    this.moonDeerMesh.add(body);

    // Slender legs
    for (let i = 0; i < 4; i++) {
      const legGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.0, 6);
      const leg = new THREE.Mesh(legGeo, this.matMoonDeer);
      const x = i % 2 === 0 ? -0.28 : 0.28;
      const z = i < 2 ? 0.55 : -0.55;
      leg.position.set(x, 0.5, z);
      this.moonDeerMesh.add(leg);
    }

    // Slender neck & graceful head
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.8, 6);
    neckGeo.rotateX(Math.PI / 4);
    const neck = new THREE.Mesh(neckGeo, this.matMoonDeer);
    neck.position.set(0, 1.45, 0.65);
    this.moonDeerMesh.add(neck);

    const headGeo = new THREE.ConeGeometry(0.18, 0.5, 5);
    headGeo.rotateX(Math.PI / 2);
    const head = new THREE.Mesh(headGeo, this.matMoonDeer);
    head.position.set(0, 1.75, 0.95);
    this.moonDeerMesh.add(head);

    // Shimmering cyan celestial antlers
    const antlerGeo = new THREE.TorusGeometry(0.35, 0.04, 6, 10, Math.PI);
    const antlerL = new THREE.Mesh(antlerGeo, this.matMoonAntler);
    antlerL.position.set(-0.25, 2.05, 0.85);
    antlerL.rotation.y = Math.PI / 4;
    const antlerR = antlerL.clone();
    antlerR.position.x = 0.25;
    antlerR.rotation.y = -Math.PI / 4;
    this.moonDeerMesh.add(antlerL, antlerR);

    // Ambient soft blue aura light
    const deerLight = new THREE.PointLight(0x38bdf8, 1.5, 7);
    deerLight.position.set(0, 1.8, 0.8);
    this.moonDeerMesh.add(deerLight);

    this.scene.add(this.moonDeerMesh);
  }

  public update(
    time: number,
    delta: number,
    playerPos: THREE.Vector3,
    onPlayerDamaged?: (amount: number, reason: string) => void
  ) {
    const px = playerPos.x;
    const py = playerPos.y;
    const pz = playerPos.z;

    this.activeBoss = null;

    const numMobs = this.creatures.length;
    for (let i = 0; i < numMobs; i++) {
      const mob = this.creatures[i];
      if (!mob.mesh) continue;

      // Handle defeat and respawn
      if (mob.state === 'defeated') {
        mob.respawnTimer = (mob.respawnTimer || 0) + delta;
        if (mob.respawnTimer >= (mob.respawnTime || 60)) {
          // Respawn creature
          mob.health = mob.maxHealth;
          mob.state = 'idle';
          mob.position.copy(mob.homePosition);
          mob.mesh.position.copy(mob.homePosition);
          mob.mesh.scale.set(1, 1, 1);
          mob.mesh.visible = true;
          mob.respawnTimer = 0;
        }
        continue;
      }

      // Distance to player
      const dx = px - mob.position.x;
      const dy = py - mob.position.y;
      const dz = pz - mob.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq);

      if (mob.isBoss && dist < 32.0 && mob.health > 0) {
        this.activeBoss = mob;
      }

      // Attack cooldown timer
      if (mob.attackTimer > 0) {
        mob.attackTimer -= delta;
      }

      // AI State Machine
      if (dist <= mob.detectionRange) {
        // Alerted / Chasing
        mob.state = dist <= mob.attackRange ? 'attacking' : 'chasing';

        // Rotate toward player
        const targetAngle = Math.atan2(dx, dz);
        mob.mesh.rotation.y = targetAngle;

        // Visual alert cues (eye light turn on)
        if (mob.eyeLight) {
          mob.eyeLight.intensity = 2.0;
        }
        const eyeMesh = mob.mesh.getObjectByName('eyeMesh') as THREE.Mesh | undefined;
        if (eyeMesh) {
          eyeMesh.material = this.matGuardianEyeRed;
        }

        if (mob.state === 'chasing') {
          // Move toward player
          const dirX = dx / dist;
          const dirZ = dz / dist;
          mob.position.x += dirX * mob.speed * delta;
          mob.position.z += dirZ * mob.speed * delta;
          mob.mesh.position.copy(mob.position);
        } else if (mob.state === 'attacking') {
          // In attack range
          if (mob.attackTimer <= 0) {
            mob.attackTimer = mob.attackCooldown;
            if (onPlayerDamaged) {
              onPlayerDamaged(mob.attackPower, mob.name);
            }
          }
        }
      } else {
        // Return to home position / idle
        mob.state = 'idle';
        if (mob.eyeLight) {
          mob.eyeLight.intensity = 0;
        }
        const eyeMesh = mob.mesh.getObjectByName('eyeMesh') as THREE.Mesh | undefined;
        if (eyeMesh) {
          eyeMesh.material = this.matGuardianEyeDormant;
        }

        const hdx = mob.homePosition.x - mob.position.x;
        const hdz = mob.homePosition.z - mob.position.z;
        const homeDistSq = hdx * hdx + hdz * hdz;
        if (homeDistSq > 1.0) {
          const homeDist = Math.sqrt(homeDistSq);
          mob.position.x += (hdx / homeDist) * (mob.speed * 0.5) * delta;
          mob.position.z += (hdz / homeDist) * (mob.speed * 0.5) * delta;
          mob.mesh.position.copy(mob.position);
          mob.mesh.rotation.y = Math.atan2(hdx, hdz);
        }
      }

      // Creature specific animation
      if (mob.mobType === 'storm_ray_predator') {
        const wings = mob.mesh.getObjectByName('wings');
        if (wings) {
          wings.rotation.z = Math.sin(time * 6.0) * 0.25;
        }
      } else if (mob.mobType === 'ancient_titan_boss') {
        const core = mob.mesh.getObjectByName('titanCore');
        if (core) {
          core.rotation.y = time * 2.5;
        }
      }
    }

    // Peaceful Moon Deer idle breathing and gentle head look
    if (this.moonDeerMesh) {
      this.moonDeerMesh.position.y = this.moonDeerPosition.y + Math.sin(time * 1.5) * 0.03;
    }
  }

  public handlePlayerAttack(
    playerPos: THREE.Vector3,
    lookDir: THREE.Vector3,
    damage: number
  ): CombatHitResult {
    let closestMob: HostileCreature | null = null;
    let minDist = 3.6; // Melee attack reach

    for (let i = 0; i < this.creatures.length; i++) {
      const mob = this.creatures[i];
      if (mob.state === 'defeated') continue;

      const dx = mob.position.x - playerPos.x;
      const dy = mob.position.y - playerPos.y;
      const dz = mob.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < minDist) {
        // Check if creature is roughly in front of player
        const toMob = new THREE.Vector3(dx, dy, dz).normalize();
        const dot = toMob.dot(lookDir);
        if (dot > 0.2 || dist < 1.8) {
          minDist = dist;
          closestMob = mob;
        }
      }
    }

    if (!closestMob) {
      return { hit: false };
    }

    // Apply damage
    closestMob.health = Math.max(0, closestMob.health - damage);

    // Hit reaction
    if (closestMob.mesh) {
      closestMob.mesh.position.y += 0.15;
      setTimeout(() => {
        if (closestMob?.mesh) closestMob.mesh.position.y = closestMob.homePosition.y;
      }, 100);
    }

    // Check defeat
    if (closestMob.health <= 0) {
      closestMob.state = 'defeated';
      if (closestMob.mesh) {
        closestMob.mesh.scale.set(0.1, 0.1, 0.1);
        closestMob.mesh.visible = false;
      }

      // Roll loot from configurable loot table
      const droppedLoot: Array<{ itemId: string; name: string; count: number; rarity: ItemRarity }> = [];
      let wonRareItem = false;

      closestMob.lootTable.forEach((drop) => {
        const roll = Math.random();
        if (roll <= drop.chance) {
          const qty = Math.floor(Math.random() * (drop.maxQty - drop.minQty + 1)) + drop.minQty;
          const item = ITEM_DATABASE[drop.itemId];
          const itemName = item ? item.name : drop.itemId;
          droppedLoot.push({
            itemId: drop.itemId,
            name: itemName,
            count: qty,
            rarity: drop.rarity,
          });
          if (drop.rarity === 'rare' || drop.rarity === 'epic' || drop.rarity === 'legendary' || drop.rarity === 'mythic') {
            wonRareItem = true;
          }
        }
      });

      return {
        hit: true,
        creatureName: closestMob.name,
        damageDealt: damage,
        defeated: true,
        isBoss: closestMob.isBoss,
        lootItems: droppedLoot,
        rareDropNotification: wonRareItem ? closestMob.rareDropNotification : undefined,
        message: `Defeated ${closestMob.name}!`,
      };
    }

    return {
      hit: true,
      creatureName: closestMob.name,
      damageDealt: damage,
      defeated: false,
      isBoss: closestMob.isBoss,
      message: `Hit ${closestMob.name} for ${damage} damage! (${closestMob.health}/${closestMob.maxHealth} HP remaining)`,
    };
  }

  public communeWithMoonDeer(): { success: boolean; itemId: string; name: string; rarity: ItemRarity; message: string } {
    if (this.moonDeerStudied) {
      return {
        success: false,
        itemId: '',
        name: 'Moon Deer',
        rarity: 'legendary',
        message: 'The Moon Deer bows peacefully in celestial resonance. You already hold its blessed antler.',
      };
    }

    this.moonDeerStudied = true;
    const item = ITEM_DATABASE['mat-moonlit-antler'];
    return {
      success: true,
      itemId: 'mat-moonlit-antler',
      name: item.name,
      rarity: 'legendary',
      message: 'Peacefully communed with the Moon Deer! Bestowed with a glowing Moonlit Antler.',
    };
  }
}
