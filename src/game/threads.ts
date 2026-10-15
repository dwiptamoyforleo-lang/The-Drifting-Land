import * as THREE from 'three';

export class ThreadManager {
  private scene: THREE.Scene;
  private ringMesh!: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initThreads();
  }

  private initThreads() {
    const ringGeo = new THREE.TorusGeometry(12, 0.15, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.position.set(0, 16, -20);
    this.ringMesh.rotation.x = Math.PI / 2;
    this.scene.add(this.ringMesh);
  }

  public update(time: number, delta: number) {
    if (this.ringMesh) {
      this.ringMesh.rotation.z = time * 0.3;
    }
  }

  public evaluateResonance(anchors: { activated: boolean }[] = []): boolean {
    const activeCount = anchors.filter(a => a.activated).length;
    if (this.ringMesh) {
      const mat = this.ringMesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.color.setHex(activeCount >= 3 ? 0xa855f7 : 0x38bdf8);
      }
    }
    return activeCount >= 3;
  }
}
