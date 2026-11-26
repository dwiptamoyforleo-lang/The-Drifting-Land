/**
 * Entity Management System for The Drifting Land.
 * Builds and coordinates interactive 3D world entities:
 * - Settlers, Researchers, Merchants, Scouts, Travelers, Lost Explorers, and Village Leaders
 * - Trading Creatures (Mosskeeper, Drift Collector, Moon Moth, Rift Broker)
 * - Lightweight NPC schedules (walking, resting, guarding, trading, sheltering)
 * - Harvestable resource nodes and atmospheric wisps
 * - Shares geometries/materials via SharedAssets and supports chunk streaming & WorldStateStore
 */

import * as THREE from 'three';
import { WorldEntityDefinition, NpcBehaviorState } from '../types/game';
import { WORLD_ENTITIES } from '../data/entities';
import { isTraderAvailable } from '../data/traders';
import { SharedAssets } from '../engine/sharedAssets';
import { WorldStateStore } from '../services/worldStateStore';

export interface RuntimeEntity {
  def: WorldEntityDefinition;
  group: THREE.Group;
  harvested?: boolean;
  traderAvailable?: boolean;
  streamVisible?: boolean;
  currentBehavior?: NpcBehaviorState;
  patrolIndex?: number;
  patrolTimer?: number;
  update?: (
    delta: number,
    totalTime: number,
    timeState: any,
    discoveries: string[],
    distSq?: number
  ) => void;
  dispose: () => void;
}

export class EntityManager {
  public group: THREE.Group;
  private entities: Map<string, RuntimeEntity> = new Map();
  private isSoftwareGl: boolean;
  private worldStateStore?: WorldStateStore;
  private regionId: string = 'verdant_reach';

  constructor(scene: THREE.Scene, isSoftwareGl = false) {
    this.group = new THREE.Group();
    this.group.name = 'world_entities';
    this.isSoftwareGl = isSoftwareGl;
    scene.add(this.group);
  }

  /**
   * Populate region entities from catalog
   */
  populate(
    getTerrainHeight: (x: number, z: number) => number,
    worldStateStore?: WorldStateStore,
    regionId = 'verdant_reach'
  ): void {
    this.clear();
    this.worldStateStore = worldStateStore;
    this.regionId = regionId;

    if (regionId !== 'verdant_reach') {
      return;
    }

    WORLD_ENTITIES.forEach((def) => {
      const y = getTerrainHeight(def.position[0], def.position[2]);
      const entity = this.createEntity(def, y, getTerrainHeight);
      if (entity) {
        if (def.type === 'COLLECTIBLE' || def.type === 'CREATURE') {
          const ts = worldStateStore?.getEntityHarvestTimestamp(
            regionId,
            def.position[0],
            def.position[2],
            def.id
          );
          if (ts && ts > 0) {
            entity.harvested = true;
            entity.group.visible = false;
          }
        }
        this.entities.set(def.id, entity);
        this.group.add(entity.group);
      }
    });
  }

  private createEntity(
    def: WorldEntityDefinition,
    groundY: number,
    getTerrainHeight: (x: number, z: number) => number
  ): RuntimeEntity | null {
    const entityGroup = new THREE.Group();
    entityGroup.position.set(def.position[0], groundY, def.position[2]);
    if (def.rotationY) entityGroup.rotation.y = def.rotationY;

    if (def.type === 'NPC' || def.type === 'TRADER') {
      return this.createNpcOrTrader(def, entityGroup, groundY, getTerrainHeight);
    } else if (def.type === 'CREATURE') {
      return this.createAetherWisp(def, entityGroup, groundY);
    } else if (def.type === 'COLLECTIBLE') {
      return this.createResourceNode(def, entityGroup);
    }

    return null;
  }

  private mat(key: string, color: number, opts?: Partial<THREE.MeshStandardMaterialParameters>): THREE.MeshStandardMaterial {
    return SharedAssets.getMaterial(`ent_${key}`, () =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts })
    );
  }

  private createNpcOrTrader(
    def: WorldEntityDefinition,
    group: THREE.Group,
    _groundY: number,
    getTerrainHeight: (x: number, z: number) => number
  ): RuntimeEntity {
    switch (def.id) {
      case 'npc_elder_soren':
        this.buildElderSorenMesh(group);
        break;
      case 'npc_trader_orin':
        this.buildTraderOrinMesh(group);
        break;
      case 'npc_elian_mason':
        this.buildElianMasonMesh(group);
        break;
      case 'npc_mira_homesteader':
        this.buildMiraHomesteaderMesh(group);
        break;
      case 'npc_wayfarer_ren':
        this.buildWayfarerRenMesh(group);
        break;
      case 'npc_archivist_vaelen':
        this.buildArchivistVaelenMesh(group);
        break;
      case 'npc_scout_kira':
        this.buildScoutKiraMesh(group);
        break;
      case 'npc_fenn_cartographer':
        this.buildFennCartographerMesh(group);
        break;
      case 'npc_mosskeeper':
        this.buildMosskeeperMesh(group);
        break;
      case 'npc_drift_collector':
        this.buildDriftCollectorMesh(group);
        break;
      case 'npc_moon_moth':
        this.buildMoonMothMesh(group);
        break;
      case 'npc_rift_broker':
        this.buildRiftBrokerMesh(group);
        break;
      default:
        this.buildSurveyorKaelenMesh(group);
    }

    let patrolIndex = 0;
    let patrolTimer = 3.0;
    let currentBehavior: NpcBehaviorState = 'RESTING';

    const entity: RuntimeEntity = {
      def,
      group,
      traderAvailable: true,
      streamVisible: true,
      currentBehavior,
      patrolIndex,
      patrolTimer,
      update: (dt, totalTime, timeState, discoveries, distSq = 0) => {
        // 1. Trading Creature dynamic visibility check
        if (def.type === 'TRADER' && def.tradeCatalogId) {
          const available = isTraderAvailable(def.tradeCatalogId, timeState, discoveries);
          entity.traderAvailable = available;
          group.visible = available && entity.streamVisible !== false;
          if (!available) return;
        }

        // Skip animation/schedule work when very far (> 72m)
        if (distSq > 72 * 72) {
          return;
        }

        // 2. Behavioral schedule execution
        if (def.schedule) {
          const isRedMoon = timeState?.isRedMoon;
          const isNight = timeState?.phaseName === 'NIGHT';
          const isStorm = timeState?.weatherName === 'STORMS' || timeState?.weatherName === 'RAIN';

          let activeBehavior: NpcBehaviorState = def.schedule.dayBehavior;
          if (isRedMoon) {
            activeBehavior = def.schedule.redMoonBehavior;
          } else if (isStorm) {
            activeBehavior = def.schedule.stormBehavior;
          } else if (isNight) {
            activeBehavior = def.schedule.nightBehavior;
          }
          currentBehavior = activeBehavior;

          if (activeBehavior === 'WALKING' && def.schedule.patrolPoints && def.schedule.patrolPoints.length > 0) {
            patrolTimer -= dt;
            if (patrolTimer <= 0) {
              patrolTimer = 4.0;
              patrolIndex = (patrolIndex + 1) % def.schedule.patrolPoints.length;
            }

            const target = def.schedule.patrolPoints[patrolIndex];
            const dx = target[0] - group.position.x;
            const dz = target[2] - group.position.z;
            const dist = Math.hypot(dx, dz);

            if (dist > 0.2) {
              const targetYaw = Math.atan2(dx, dz);
              if (distSq < 40 * 40) {
                group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetYaw, dt * 3.0);
              } else {
                group.rotation.y = targetYaw;
              }
              const step = Math.min(dist, 1.2 * dt);
              group.position.x += Math.sin(group.rotation.y) * step;
              group.position.z += Math.cos(group.rotation.y) * step;
              group.position.y = getTerrainHeight(group.position.x, group.position.z);
            }
          } else if (activeBehavior === 'SHELTERING' && def.schedule.shelterPosition) {
            const sx = def.schedule.shelterPosition[0];
            const sz = def.schedule.shelterPosition[2];
            const dx = sx - group.position.x;
            const dz = sz - group.position.z;
            if (Math.hypot(dx, dz) > 0.3) {
              group.rotation.y = Math.atan2(dx, dz);
              group.position.x += Math.sin(group.rotation.y) * 1.5 * dt;
              group.position.z += Math.cos(group.rotation.y) * 1.5 * dt;
              group.position.y = getTerrainHeight(group.position.x, group.position.z);
            }
          }
        }

        // 3. Subtle breathing only when close & visible
        if (group.visible && distSq < 35 * 35) {
          group.position.y += Math.sin(totalTime * 2.0 + (def.position[0] % 5)) * 0.0015;
        }
      },
      dispose: () => {},
    };

    return entity;
  }

  // --- Shared Visual Model Builders ---

  private buildElderSorenMesh(group: THREE.Group): void {
    const robeMat = this.mat('soren_robe', 0x334155);
    const sashMat = this.mat('soren_sash', 0x059669, { roughness: 0.7 });
    const headMat = this.mat('head_silver', 0x94a3b8, { roughness: 0.8 });
    const staffMat = this.mat('wood_staff', 0x78350f, { roughness: 0.6 });
    const gemMat = this.mat('amber_gem', 0xf59e0b, { emissive: 0xd97706, emissiveIntensity: 0.8 });

    const robe = new THREE.Mesh(
      SharedAssets.getGeometry('npc_robe_tall', () => new THREE.CylinderGeometry(0.35, 0.45, 1.3, 8)),
      robeMat
    );
    robe.position.y = 0.65;
    group.add(robe);

    const sash = new THREE.Mesh(
      SharedAssets.getGeometry('npc_sash', () => new THREE.CylinderGeometry(0.37, 0.38, 0.25, 8)),
      sashMat
    );
    sash.position.y = 0.85;
    group.add(sash);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('npc_head_24', () => new THREE.SphereGeometry(0.24, 8, 8)),
      headMat
    );
    head.position.y = 1.45;
    group.add(head);

    const staff = new THREE.Mesh(
      SharedAssets.getGeometry('npc_staff', () => new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6)),
      staffMat
    );
    staff.position.set(0.4, 0.9, 0.3);
    group.add(staff);

    const gem = new THREE.Mesh(
      SharedAssets.getGeometry('npc_dodeca_12', () => new THREE.DodecahedronGeometry(0.12, 0)),
      gemMat
    );
    gem.position.set(0.4, 1.8, 0.3);
    group.add(gem);
  }

  private buildTraderOrinMesh(group: THREE.Group): void {
    const coatMat = this.mat('orin_coat', 0xb45309, { roughness: 0.8 });
    const pouchMat = this.mat('orin_pouch', 0x451a03, { roughness: 0.9 });
    const visorMat = this.mat('orin_visor', 0x0284c7, { metalness: 0.5, roughness: 0.3 });
    const headMat = this.mat('head_slate', 0x64748b);

    const coat = new THREE.Mesh(
      SharedAssets.getGeometry('npc_coat_11', () => new THREE.CylinderGeometry(0.34, 0.4, 1.1, 8)),
      coatMat
    );
    coat.position.y = 0.65;
    group.add(coat);

    const pouch = new THREE.Mesh(
      SharedAssets.getGeometry('npc_dodeca_15', () => new THREE.DodecahedronGeometry(0.15, 0)),
      pouchMat
    );
    pouch.position.set(0.35, 0.6, 0.1);
    group.add(pouch);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('npc_head_22', () => new THREE.SphereGeometry(0.22, 8, 8)),
      headMat
    );
    head.position.y = 1.35;
    group.add(head);

    const visor = new THREE.Mesh(
      SharedAssets.getGeometry('npc_visor', () => new THREE.BoxGeometry(0.3, 0.08, 0.15)),
      visorMat
    );
    visor.position.set(0, 1.4, 0.2);
    group.add(visor);
  }

  private buildElianMasonMesh(group: THREE.Group): void {
    const apronMat = this.mat('elian_apron', 0x57534e, { roughness: 0.9 });
    const hammerMat = this.mat('elian_hammer', 0x0f172a, { metalness: 0.6, roughness: 0.4 });
    const headMat = this.mat('head_stone', 0x78716c);

    const torso = new THREE.Mesh(
      SharedAssets.getGeometry('npc_torso_box', () => new THREE.BoxGeometry(0.65, 0.8, 0.45)),
      apronMat
    );
    torso.position.y = 0.8;
    group.add(torso);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('npc_head_22', () => new THREE.SphereGeometry(0.22, 8, 8)),
      headMat
    );
    head.position.y = 1.35;
    group.add(head);

    const hammer = new THREE.Mesh(
      SharedAssets.getGeometry('npc_hammer', () => new THREE.BoxGeometry(0.15, 0.25, 0.15)),
      hammerMat
    );
    hammer.position.set(0.4, 0.7, 0.2);
    group.add(hammer);
  }

  private buildMiraHomesteaderMesh(group: THREE.Group): void {
    const dressMat = this.mat('mira_dress', 0x15803d);
    const hatMat = this.mat('mira_hat', 0xd97706, { roughness: 0.9 });
    const basketMat = this.mat('mira_basket', 0x92400e, { roughness: 0.95 });
    const headMat = this.mat('head_slate', 0x64748b);

    const dress = new THREE.Mesh(
      SharedAssets.getGeometry('npc_dress', () => new THREE.CylinderGeometry(0.28, 0.45, 1.1, 8)),
      dressMat
    );
    dress.position.y = 0.65;
    group.add(dress);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('npc_head_20', () => new THREE.SphereGeometry(0.2, 8, 8)),
      headMat
    );
    head.position.y = 1.35;
    group.add(head);

    const hat = new THREE.Mesh(
      SharedAssets.getGeometry('npc_straw_hat', () => new THREE.CylinderGeometry(0.45, 0.45, 0.06, 10)),
      hatMat
    );
    hat.position.y = 1.48;
    group.add(hat);

    const basket = new THREE.Mesh(
      SharedAssets.getGeometry('npc_basket', () => new THREE.BoxGeometry(0.3, 0.25, 0.25)),
      basketMat
    );
    basket.position.set(-0.35, 0.55, 0.15);
    group.add(basket);
  }

  private buildWayfarerRenMesh(group: THREE.Group): void {
    const cloakMat = this.mat('ren_cloak', 0x1e293b, { roughness: 0.8 });
    const packMat = this.mat('ren_pack', 0x854d0e, { roughness: 0.9 });
    const headMat = this.mat('head_dark_slate', 0x475569);

    const cloak = new THREE.Mesh(
      SharedAssets.getGeometry('npc_cloak_ren', () => new THREE.CylinderGeometry(0.32, 0.42, 1.1, 8)),
      cloakMat
    );
    cloak.position.y = 0.65;
    group.add(cloak);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('npc_head_22', () => new THREE.SphereGeometry(0.22, 8, 8)),
      headMat
    );
    head.position.y = 1.35;
    group.add(head);

    const pack = new THREE.Mesh(
      SharedAssets.getGeometry('npc_pack_ren', () => new THREE.BoxGeometry(0.45, 0.55, 0.35)),
      packMat
    );
    pack.position.set(0, 0.8, -0.3);
    group.add(pack);
  }

  private buildSurveyorKaelenMesh(group: THREE.Group): void {
    const coatMat = this.mat('kaelen_coat', 0x1e3a5f, { roughness: 0.7 });
    const headMat = this.mat('head_dark_slate', 0x475569, { roughness: 0.8 });
    const hatMat = this.mat('kaelen_hat', 0x334155);

    const coat = new THREE.Mesh(
      SharedAssets.getGeometry('npc_coat_kaelen', () => new THREE.CylinderGeometry(0.3, 0.38, 0.9, 8)),
      coatMat
    );
    coat.position.y = 0.75;
    group.add(coat);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('npc_head_22', () => new THREE.SphereGeometry(0.22, 8, 8)),
      headMat
    );
    head.position.y = 1.35;
    group.add(head);

    const hat = new THREE.Mesh(
      SharedAssets.getGeometry('npc_hat_kaelen', () => new THREE.CylinderGeometry(0.42, 0.42, 0.05, 10)),
      hatMat
    );
    hat.position.y = 1.5;
    group.add(hat);
  }

  private buildArchivistVaelenMesh(group: THREE.Group): void {
    const robeMat = this.mat('vaelen_robe', 0x4c1d95, { roughness: 0.8 });
    const scrollMat = this.mat('vaelen_scroll', 0xfef08a, { roughness: 0.6 });
    const headMat = this.mat('head_slate', 0x64748b);

    const robe = new THREE.Mesh(
      SharedAssets.getGeometry('npc_robe_vaelen', () => new THREE.CylinderGeometry(0.32, 0.46, 1.25, 8)),
      robeMat
    );
    robe.position.y = 0.65;
    group.add(robe);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('npc_head_22', () => new THREE.SphereGeometry(0.22, 8, 8)),
      headMat
    );
    head.position.y = 1.4;
    group.add(head);

    const scroll = new THREE.Mesh(
      SharedAssets.getGeometry('npc_scroll', () => new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6)),
      scrollMat
    );
    scroll.rotation.z = Math.PI / 4;
    scroll.position.set(0.3, 0.8, 0.2);
    group.add(scroll);
  }

  private buildScoutKiraMesh(group: THREE.Group): void {
    const cowlMat = this.mat('kira_cowl', 0x164e63);
    const scopeMat = this.mat('kira_scope', 0xf59e0b, { metalness: 0.7, roughness: 0.3 });

    const body = new THREE.Mesh(
      SharedAssets.getGeometry('npc_body_kira', () => new THREE.CylinderGeometry(0.28, 0.36, 1.1, 8)),
      cowlMat
    );
    body.position.y = 0.65;
    group.add(body);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('npc_head_21', () => new THREE.SphereGeometry(0.21, 8, 8)),
      cowlMat
    );
    head.position.y = 1.35;
    group.add(head);

    const scope = new THREE.Mesh(
      SharedAssets.getGeometry('npc_scope', () => new THREE.CylinderGeometry(0.04, 0.06, 0.45, 6)),
      scopeMat
    );
    scope.rotation.x = Math.PI / 3;
    scope.position.set(0.2, 1.25, 0.25);
    group.add(scope);
  }

  private buildFennCartographerMesh(group: THREE.Group): void {
    const jacketMat = this.mat('fenn_jacket', 0x713f12, { roughness: 0.9 });
    const sextantMat = this.mat('fenn_sextant', 0xeab308, { metalness: 0.7, roughness: 0.3 });
    const headMat = this.mat('head_slate', 0x64748b);

    const body = new THREE.Mesh(
      SharedAssets.getGeometry('npc_body_fenn', () => new THREE.CylinderGeometry(0.3, 0.38, 1.0, 8)),
      jacketMat
    );
    body.position.y = 0.6;
    group.add(body);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('npc_head_22', () => new THREE.SphereGeometry(0.22, 8, 8)),
      headMat
    );
    head.position.y = 1.25;
    group.add(head);

    const sextant = new THREE.Mesh(
      SharedAssets.getGeometry('npc_dodeca_12', () => new THREE.DodecahedronGeometry(0.12, 0)),
      sextantMat
    );
    sextant.position.set(0.3, 0.7, 0.2);
    group.add(sextant);
  }

  private buildMosskeeperMesh(group: THREE.Group): void {
    const barkMat = this.mat('moss_bark', 0x3f2e1a, { roughness: 0.95 });
    const mossMat = this.mat('moss_cap', 0x16a34a, { roughness: 0.9 });
    const eyeMat = this.mat('moss_eye', 0x4ade80, { emissive: 0x22c55e, emissiveIntensity: 0.9 });

    const body = new THREE.Mesh(
      SharedAssets.getGeometry('moss_body', () => new THREE.CylinderGeometry(0.6, 0.8, 1.8, 7)),
      barkMat
    );
    body.position.y = 0.9;
    group.add(body);

    const canopy = new THREE.Mesh(
      SharedAssets.getGeometry('moss_canopy', () => new THREE.DodecahedronGeometry(0.9, 1)),
      mossMat
    );
    canopy.position.y = 2.1;
    group.add(canopy);

    const eyeGeo = SharedAssets.getGeometry('moss_eye_geo', () => new THREE.SphereGeometry(0.08, 4, 4));
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.25, 1.4, 0.65);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.25, 1.4, 0.65);
    group.add(eyeR);
  }

  private buildDriftCollectorMesh(group: THREE.Group): void {
    const cloakMat = this.mat('dc_cloak', 0x78716c, { roughness: 0.9 });
    const packMat = this.mat('dc_pack', 0xa16207);
    const brassMat = this.mat('dc_brass', 0xd97706, { metalness: 0.6, roughness: 0.3 });

    const body = new THREE.Mesh(
      SharedAssets.getGeometry('dc_body', () => new THREE.CylinderGeometry(0.35, 0.45, 1.2, 8)),
      cloakMat
    );
    body.position.y = 0.65;
    group.add(body);

    const pack = new THREE.Mesh(
      SharedAssets.getGeometry('dc_pack_geo', () => new THREE.BoxGeometry(0.7, 0.9, 0.55)),
      packMat
    );
    pack.position.set(0, 0.9, -0.4);
    group.add(pack);

    const head = new THREE.Mesh(
      SharedAssets.getGeometry('npc_head_24', () => new THREE.SphereGeometry(0.24, 8, 8)),
      cloakMat
    );
    head.position.y = 1.4;
    group.add(head);

    const goggles = new THREE.Mesh(
      SharedAssets.getGeometry('dc_goggles', () => new THREE.CylinderGeometry(0.07, 0.07, 0.35, 6)),
      brassMat
    );
    goggles.rotation.z = Math.PI / 2;
    goggles.position.set(0, 1.45, 0.2);
    group.add(goggles);
  }

  private buildMoonMothMesh(group: THREE.Group): void {
    const mothMat = this.mat('moth_body', 0xe2e8f0, {
      emissive: 0x93c5fd,
      emissiveIntensity: 0.7,
      roughness: 0.4,
    });
    const wingMat = this.mat('moth_wing', 0xbfdbfe, {
      emissive: 0x60a5fa,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.75,
      roughness: 0.2,
    });

    const body = new THREE.Mesh(
      SharedAssets.getGeometry('moth_body_geo', () => new THREE.CylinderGeometry(0.25, 0.15, 1.1, 6)),
      mothMat
    );
    body.position.y = 1.0;
    group.add(body);

    const antGeo = SharedAssets.getGeometry('moth_ant', () => new THREE.CylinderGeometry(0.03, 0.01, 0.6, 4));
    const antL = new THREE.Mesh(antGeo, mothMat);
    antL.position.set(-0.15, 1.8, 0.15);
    antL.rotation.z = -0.3;
    group.add(antL);

    const antR = new THREE.Mesh(antGeo, mothMat);
    antR.position.set(0.15, 1.8, 0.15);
    antR.rotation.z = 0.3;
    group.add(antR);

    const wingGeo = SharedAssets.getGeometry('moth_wing_geo', () => new THREE.PlaneGeometry(1.2, 1.5));
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-0.7, 1.1, -0.1);
    wingL.rotation.y = Math.PI / 6;
    group.add(wingL);

    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.set(0.7, 1.1, -0.1);
    wingR.rotation.y = -Math.PI / 6;
    group.add(wingR);
  }

  private buildRiftBrokerMesh(group: THREE.Group): void {
    const robeMat = this.mat('rb_robe', 0x09090b, { roughness: 0.5, metalness: 0.3 });
    const riftGlowMat = this.mat('rb_glow', 0xa855f7, {
      emissive: 0x7e22ce,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    });

    const robe = new THREE.Mesh(
      SharedAssets.getGeometry('rb_robe_geo', () => new THREE.CylinderGeometry(0.3, 0.5, 1.4, 7)),
      robeMat
    );
    robe.position.y = 1.0;
    group.add(robe);

    const cowl = new THREE.Mesh(
      SharedAssets.getGeometry('rb_cowl_geo', () => new THREE.ConeGeometry(0.35, 0.5, 6)),
      robeMat
    );
    cowl.position.y = 1.8;
    group.add(cowl);

    const eyeGlow = new THREE.Mesh(
      SharedAssets.getGeometry('rb_eye_geo', () => new THREE.BoxGeometry(0.25, 0.05, 0.05)),
      riftGlowMat
    );
    eyeGlow.position.set(0, 1.65, 0.18);
    group.add(eyeGlow);

    const crystalGeo = SharedAssets.getGeometry('rb_crystal_geo', () => new THREE.OctahedronGeometry(0.12, 0));
    for (let i = 0; i < 3; i++) {
      const crystal = new THREE.Mesh(crystalGeo, riftGlowMat);
      const ang = (i * Math.PI * 2) / 3;
      crystal.position.set(Math.cos(ang) * 0.7, 1.1, Math.sin(ang) * 0.7);
      group.add(crystal);
    }
  }

  private createResourceNode(def: WorldEntityDefinition, group: THREE.Group): RuntimeEntity {
    const geo = SharedAssets.getGeometry('ent_res_node', () => new THREE.DodecahedronGeometry(0.6, 0));
    const mat = SharedAssets.getMaterial('ent_res_mat', () =>
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        roughness: 0.8,
        emissive: 0x065f46,
        emissiveIntensity: 0.3,
      })
    );
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.5;
    mesh.castShadow = !this.isSoftwareGl;
    group.add(mesh);

    const entity: RuntimeEntity = {
      def,
      group,
      streamVisible: true,
      update: (_dt, totalTime, _timeState, _discoveries, distSq = 0) => {
        if (!entity.harvested && entity.streamVisible !== false && distSq < 48 * 48) {
          mesh.rotation.y = totalTime * 0.4;
        }
      },
      dispose: () => {},
    };
    return entity;
  }

  private createAetherWisp(def: WorldEntityDefinition, group: THREE.Group, groundY: number): RuntimeEntity {
    const isCrimson = def.id.includes('crimson');
    const wispGeo = SharedAssets.getGeometry('ent_wisp_geo', () => new THREE.SphereGeometry(0.3, 8, 8));
    const wispMat = SharedAssets.getMaterial(
      isCrimson ? 'ent_wisp_crimson' : 'ent_wisp_cyan',
      () =>
        new THREE.MeshStandardMaterial({
          color: isCrimson ? 0xff0044 : 0x67e8f9,
          emissive: isCrimson ? 0xd90429 : 0x06b6d4,
          emissiveIntensity: 0.9,
          roughness: 0.2,
        })
    );
    const wispMesh = new THREE.Mesh(wispGeo, wispMat);
    group.add(wispMesh);

    const entity: RuntimeEntity = {
      def,
      group,
      streamVisible: true,
      update: (_dt, totalTime, _timeState, _discoveries, distSq = 0) => {
        if (!entity.harvested && entity.streamVisible !== false && distSq < 55 * 55) {
          const floatY = groundY + 1.2 + Math.sin(totalTime * 2.5 + def.position[0]) * 0.4;
          group.position.y = floatY;
          wispMesh.rotation.y = totalTime * 1.5;
        }
      },
      dispose: () => {},
    };
    return entity;
  }

  public syncStreaming(isActive: (x: number, z: number) => boolean, isVisible: (x: number, z: number) => boolean): void {
    this.entities.forEach((entity) => {
      if (entity.harvested) {
        entity.group.visible = false;
        return;
      }
      const x = entity.group.position.x;
      const z = entity.group.position.z;
      const visible = entity.def.type === 'NPC' || entity.def.type === 'TRADER' ? isVisible(x, z) : isActive(x, z);
      entity.streamVisible = visible;
      if (entity.def.type === 'TRADER') {
        entity.group.visible = visible && entity.traderAvailable !== false;
      } else {
        entity.group.visible = visible;
      }
    });
  }

  public getEntity(id: string): RuntimeEntity | undefined {
    return this.entities.get(id);
  }

  public getEntities(): RuntimeEntity[] {
    return Array.from(this.entities.values());
  }

  public getVisibleCount(): number {
    let count = 0;
    this.entities.forEach((e) => {
      if (e.group.visible && !e.harvested) count++;
    });
    return count;
  }

  public getNearestInteractable(playerPos: THREE.Vector3, maxDist = 3.5): RuntimeEntity | null {
    let closest: RuntimeEntity | null = null;
    let minDistSq = maxDist * maxDist;

    this.entities.forEach((entity) => {
      if (!entity.group.visible || entity.harvested) return;
      const dSq = entity.group.position.distanceToSquared(playerPos);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closest = entity;
      }
    });
    return closest;
  }

  public harvestEntity(id: string): WorldEntityDefinition | null {
    const entity = this.entities.get(id);
    if (!entity || entity.harvested) return null;
    entity.harvested = true;
    entity.group.visible = false;
    this.worldStateStore?.setEntityHarvested(
      this.regionId,
      entity.def.position[0],
      entity.def.position[2],
      id,
      Date.now()
    );
    return entity.def;
  }

  public update(
    dt: number,
    totalTime: number,
    timeState: any,
    discoveries: string[],
    playerPos?: THREE.Vector3
  ): void {
    this.entities.forEach((entity) => {
      if (entity.harvested) return;
      if (entity.update) {
        const distSq = playerPos ? entity.group.position.distanceToSquared(playerPos) : 0;
        entity.update(dt, totalTime, timeState, discoveries, distSq);
      }
    });
  }

  public clear(): void {
    this.entities.forEach((e) => e.dispose());
    this.entities.clear();
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      SharedAssets.disposeObject3DSafe(child);
    }
  }

  public dispose(): void {
    this.clear();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
