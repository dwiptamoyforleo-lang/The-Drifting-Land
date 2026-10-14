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
}
