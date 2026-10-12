/**
 *  * Core type definitions for The Drifting World
  */
  import * as THREE from 'three';

  export type GraphicsQuality = 'low' | 'balanced' | 'high';
  export type CameraMode = 'third_person' | 'first_person' | 'second_person';
  export type TimeOfDay = 'day' | 'sunset' | 'night' | 'red_moon';

  export interface GameSettings {
    graphicsQuality: GraphicsQuality;
      sensitivity: number;        // 0.5 to 2.5
        audioEnabled: boolean;
          ambientVolume: number;     // 0.0 to 1.0
            sfxVolume: number;         // 0.0 to 1.0
              showFps: boolean;
                cameraMode: CameraMode;
                  joystickSize: 'small' | 'medium' | 'large';
                    buttonOpacity: number;     // 0.4 to 1.0
                    }

                    export interface InventoryItem {
                      id: string;
                        name: string;
                          description: string;
                            category: 'material' | 'artifact' | 'consumable' | 'key_item';
                              quantity: number;
                                valueCoins: number;
                                  icon: string;
                                  }

                                  export interface Quest {
                                    id: string;
                                      title: string;
                                        description: string;
                                          targetCount: number;
                                            currentCount: number;
                                              rewardXp: number;
                                                rewardCoins: number;
                                                  completed: boolean;
                                                    sectorId: number;
                                                    }

                                                    export interface WorldFragment {
                                                      id: string;
                                                        name: string;
                                                          lore: string;
                                                            position: [number, number, number];
                                                              collected: boolean;
                                                                mesh?: THREE.Object3D;
                                                                }

                                                                export interface MagicalAnchor {
                                                                  id: string;
                                                                    name: string;
                                                                      subtitle: string;
                                                                        description: string;
                                                                          position: [number, number, number];
                                                                            beamColor: number;
                                                                              activated: boolean;
                                                                                connectsTo: string | null;
                                                                                  mesh?: THREE.Object3D;
                                                                                    crystalMesh?: THREE.Mesh;
                                                                                      light?: THREE.PointLight;
                                                                                      }

                                                                                      export interface InscriptionLore {
                                                                                        id: string;
                                                                                          title: string;
                                                                                            text: string;
                                                                                              position: [number, number, number];
                                                                                                mesh?: THREE.Object3D;
                                                                                                }

                                                                                                export interface InteractableObject {
                                                                                                  id: string;
                                                                                                    type: 'anchor' | 'fragment' | 'inscription' | 'citadel_core' | 'npc' | 'resource' | 'checkpoint';
                                                                                                      title: string;
                                                                                                        prompt: string;
                                                                                                          distance: number;
                                                                                                            position: THREE.Vector3;
                                                                                                              onInteract: () => void;
                                                                                                              }

                                                                                                              export interface DialogueOption {
                                                                                                                label: string;
                                                                                                                  response: string;
                                                                                                                    nextDialogId?: string;
                                                                                                                      rewardCoins?: number;
                                                                                                                        rewardXp?: number;
                                                                                                                          questTriggerId?: string;
                                                                                                                          }

                                                                                                                          export interface DialogueNode {
                                                                                                                            id: string;
                                                                                                                              speaker: string;
                                                                                                                                title: string;
                                                                                                                                  greeting: string;
                                                                                                                                    options: DialogueOption[];
                                                                                                                                    }

                                                                                                                                    export interface WorldNPC {
                                                                                                                                      id: string;
                                                                                                                                        name: string;
                                                                                                                                          role: string;
                                                                                                                                            position: [number, number, number];
                                                                                                                                              dialogue: DialogueNode;
                                                                                                                                                mesh?: THREE.Object3D;
                                                                                                                                                }

                                                                                                                                                export interface HarvestableResource {
                                                                                                                                                  id: string;
                                                                                                                                                    name: string;
                                                                                                                                                      itemType: string;
                                                                                                                                                        coinValue: number;
                                                                                                                                                          xpValue: number;
                                                                                                                                                            position: [number, number, number];
                                                                                                                                                              collected: boolean;
                                                                                                                                                                mesh?: THREE.Object3D;
                                                                                                                                                                }

                                                                                                                                                                export interface WorldCheckpoint {
                                                                                                                                                                  id: string;
                                                                                                                                                                    name: string;
                                                                                                                                                                      sectorName: string;
                                                                                                                                                                        position: [number, number, number];
                                                                                                                                                                          activated: boolean;
                                                                                                                                                                            mesh?: THREE.Object3D;
                                                                                                                                                                              light?: THREE.PointLight;
                                                                                                                                                                              }

                                                                                                                                                                              export interface GameProgress {
                                                                                                                                                                                activatedAnchors: string[];
                                                                                                                                                                                  collectedFragments: string[];
                                                                                                                                                                                    resonanceDiscovered: boolean;
                                                                                                                                                                                      citadelExplored: boolean;
                                                                                                                                                                                        lastCheckpoint: [number, number, number];
                                                                                                                                                                                          activatedCheckpoints: string[];
                                                                                                                                                                                            collectedResources: string[];
                                                                                                                                                                                              coins: number;
                                                                                                                                                                                                inventory: InventoryItem[];
                                                                                                                                                                                                  completedQuests: string[];
                                                                                                                                                                                                    redMoonWitnessed: boolean;
                                                                                                                                                                                                    }

                                                                                                                                                                                                    export interface TelemetryData {
                                                                                                                                                                                                      headingDegrees: number;
                                                                                                                                                                                                        temperatureCelsius: number;
                                                                                                                                                                                                          elevationMeters: number;
                                                                                                                                                                                                            timeOfDay: TimeOfDay;
                                                                                                                                                                                                              timeLabel: string;
                                                                                                                                                                                                              }

                                                                                                                                                                                                              export interface UserProfile {
                                                                                                                                                                                                                username: string;
                                                                                                                                                                                                                  xp: number;
                                                                                                                                                                                                                    level: number;
                                                                                                                                                                                                                      coins: number;
                                                                                                                                                                                                                        selectedSector: number;
                                                                                                                                                                                                                          unlockedSectors: number[];
                                                                                                                                                                                                                          }

                                                                                                                                                                                                                          export interface SectorInfo {
                                                                                                                                                                                                                            id: number;
                                                                                                                                                                                                                              name: string;
                                                                                                                                                                                                                                subtitle: string;
                                                                                                                                                                                                                                  description: string;
                                                                                                                                                                                                                                    altitudeMeters: number;
                                                                                                                                                                                                                                      difficulty: 'Standard' | 'Advanced' | 'Extreme';
                                                                                                                                                                                                                                        recommendedLevel: number;
                                                                                                                                                                                                                                          discoveries: string[];
                                                                                                                                                                                                                                            creaturesAndHazards: string;
                                                                                                                                                                                                                                              completionPercentage?: number;
                                                                                                                                                                                                                                                spawnPoint: [number, number, number];
                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                export interface PerformanceStats {
                                                                                                                                                                                                                                                  fps: number;
                                                                                                                                                                                                                                                    drawCalls: number;
                                                                                                                                                                                                                                                      triangles: number;
                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                      
 */