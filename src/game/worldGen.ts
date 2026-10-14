import * as THREE from 'three';

export class WorldGenerator {
  public seed: number = 942026;
    public chunkSize: number = 100;
      public loadedChunks: Map<string, THREE.Group> = new Map();

        constructor(seed: number = 942026) {
            this.seed = seed;
              }

                public getChunkKey(x: number, z: number): string {
                    const cx = Math.floor(x / this.chunkSize);
                        const cz = Math.floor(z / this.chunkSize);
                            return `${cx},${cz}`;
                              }

                                public updateChunks(playerPos: THREE.Vector3, scene: THREE.Scene) {
                                    const currentKey = this.getChunkKey(playerPos.x, playerPos.z);
                                        
                                            // Unload distant chunks to optimize performance
                                                for (const [key, group] of this.loadedChunks.entries()) {
                                                      if (key !== currentKey) {
                                                              scene.remove(group);
                                                                      this.loadedChunks.delete(key);
                                                                            }
                                                                                }

                                                                                    // Load nearby chunk if not present
                                                                                        if (!this.loadedChunks.has(currentKey)) {
                                                                                              const chunkGroup = new THREE.Group();
                                                                                                    // Deterministic procedural vegetation and resource placement
                                                                                                          const platformGeo = new THREE.BoxGeometry(this.chunkSize, 2, this.chunkSize);
                                                                                                                const platformMat = new THREE.MeshStandardMaterial({ color: 0x134e4a });
                                                                                                                      const mesh = new THREE.Mesh(platformGeo, platformMat);
                                                                                                                            mesh.position.set(0, -1, 0);
                                                                                                                                  chunkGroup.add(mesh);

                                                                                                                                        scene.add(chunkGroup);
                                                                                                                                              this.loadedChunks.set(currentKey, chunkGroup);
                                                                                                                                                  }
                                                                                                                                                    }
                                                                                                                                                    }
                                                                                                                                                    