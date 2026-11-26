import * as THREE from '../vendor/three.js';

/**
 * Animated sunlit cloud-sea below the floating islands plus distant Low Coast silhouettes.
 */
export class SeaPlane {
  /**
   * @param {number} segments
   */
  constructor(segments = 64) {
    this.group = new THREE.Group();

    const geo = new THREE.PlaneGeometry(1500, 1500, segments, segments);
    geo.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.5, 0.4, -0.7).normalize() },
      uSunColor: { value: new THREE.Color(0xffd08a) },
      uHorizonColor: { value: new THREE.Color(0xf4a872) },
      uDeepColor: { value: new THREE.Color(0x164276) },
      uShallowColor: { value: new THREE.Color(0x2d74ad) },
      uFogColor: { value: new THREE.Color(0xd99e7c) },
      uFogDensity: { value: 0.0018 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying float vWave;
        void main() {
          vec3 p = position;
          float w = sin(p.x * 0.045 + uTime * 1.15) * 0.42
                  + cos(p.z * 0.052 - uTime * 0.9) * 0.38
                  + sin((p.x + p.z) * 0.09 + uTime * 1.6) * 0.16;
          p.y += w;
          vWave = w;
          vec4 wp = modelMatrix * vec4(p, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform float uTime;
        varying vec3 vWorldPos;
        varying float vWave;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 n = normalize(vec3(
            sin(vWorldPos.x * 0.11 + uTime * 1.2) * 0.12,
            1.0,
            cos(vWorldPos.z * 0.12 - uTime * 1.0) * 0.12
          ));
          float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
          vec3 base = mix(uDeepColor, uShallowColor, clamp(vWave * 0.5 + 0.5, 0.0, 1.0));
          vec3 skyReflect = mix(uShallowColor, uHorizonColor, fresnel * 0.85);

          vec3 refl = reflect(-normalize(uSunDir), n);
          float spec = pow(max(dot(viewDir, refl), 0.0), 42.0);
          vec3 col = skyReflect + uSunColor * spec * 0.75;

          float dist = length(cameraPosition - vWorldPos);
          float fogFactor = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
          col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.seaMesh = new THREE.Mesh(geo, mat);
    this.seaMesh.position.y = -20;
    this.group.add(this.seaMesh);

    // Distant Low Coast silhouettes along the horizon
    const coastMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d63,
      roughness: 0.95,
      metalness: 0.0,
    });
    const coastGeo = new THREE.ConeGeometry(42, 34, 6);
    this.coastMesh = new THREE.InstancedMesh(coastGeo, coastMat, 18);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.17;
      const r = 460 + (i % 3) * 45;
      dummy.position.set(Math.cos(a) * r, -10 + (i % 4) * 2.5, Math.sin(a) * r);
      dummy.scale.set(1.2 + (i % 3) * 0.4, 0.7 + (i % 4) * 0.35, 1.1 + (i % 2) * 0.5);
      dummy.rotation.y = a;
      dummy.updateMatrix();
      this.coastMesh.setMatrixAt(i, dummy.matrix);
    }
    this.coastMesh.computeBoundingSphere();
    this.group.add(this.coastMesh);
  }

  /**
   * @param {import('../core/DriftClock.js').DriftClock} clock
   * @param {number} elapsed
   * @param {number} fogDensity
   */
  update(clock, elapsed, fogDensity) {
    this.uniforms.uTime.value = elapsed;
    this.uniforms.uSunDir.value.copy(clock.sunDirection);
    this.uniforms.uSunColor.value.copy(clock.sunColor);
    this.uniforms.uHorizonColor.value.copy(clock.horizonColor);
    this.uniforms.uFogColor.value.copy(clock.fogColor);
    this.uniforms.uFogDensity.value = fogDensity;
    const isNight = clock.phase === 'Night';
    this.uniforms.uDeepColor.value.setHex(isNight ? 0x0b1f40 : 0x164276);
    this.uniforms.uShallowColor.value.setHex(isNight ? 0x193d6c : 0x2f7cb4);
  }

  dispose() {
    this.seaMesh.geometry.dispose();
    this.seaMesh.material.dispose();
    this.coastMesh.geometry.dispose();
    this.coastMesh.material.dispose();
  }
}
