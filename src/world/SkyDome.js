import * as THREE from '../vendor/three.js';

/**
 * Custom shader sky dome responding seamlessly to DriftClock phases (Dawn/Day/Dusk/Night).
 */
export class SkyDome {
  constructor() {
    const geo = new THREE.SphereGeometry(780, 32, 20);
    this.uniforms = {
      uZenith: { value: new THREE.Color(0x1b3a6b) },
      uHorizon: { value: new THREE.Color(0xf4a872) },
      uSunColor: { value: new THREE.Color(0xffd08a) },
      uSunDir: { value: new THREE.Vector3(0.5, 0.4, -0.7).normalize() },
      uStarOpacity: { value: 0.15 },
      uTime: { value: 0 },
    };

    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.uniforms,
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uSunColor;
        uniform vec3 uSunDir;
        uniform float uStarOpacity;
        uniform float uTime;
        varying vec3 vWorldDir;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);
          float horizonMix = pow(1.0 - h, 2.4);
          vec3 col = mix(uZenith, uHorizon, horizonMix);

          // Soft solar corona & disc
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          col += uSunColor * pow(sunDot, 10.0) * 0.45;
          col += uSunColor * smoothstep(0.9965, 0.9992, sunDot) * 1.15;

          // Subtle drifting sky cloud bands
          vec2 cloudUv = dir.xz / (abs(dir.y) + 0.32);
          float c1 = sin(cloudUv.x * 1.3 + uTime * 0.015) * cos(cloudUv.y * 1.1 - uTime * 0.01);
          float cloudMask = smoothstep(0.25, 0.85, c1 * 0.5 + 0.5) * smoothstep(0.04, 0.35, h) * (1.0 - smoothstep(0.6, 0.95, h));
          col = mix(col, mix(uHorizon, vec3(1.0, 0.97, 0.92), 0.55), cloudMask * 0.16);

          // Night stars
          if (uStarOpacity > 0.01 && dir.y > 0.05) {
            vec3 cell = floor(dir * 260.0);
            float starVal = hash(cell);
            float twinkle = 0.7 + 0.3 * sin(uTime * 2.2 + starVal * 40.0);
            float star = step(0.9945, starVal) * twinkle * smoothstep(0.05, 0.35, dir.y);
            col += vec3(0.92, 0.96, 1.0) * star * uStarOpacity;
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }

  /**
   * @param {import('../core/DriftClock.js').DriftClock} clock
   * @param {THREE.Vector3} centerPos
   * @param {number} elapsed
   */
  update(clock, centerPos, elapsed) {
    this.mesh.position.copy(centerPos);
    this.uniforms.uZenith.value.copy(clock.zenithColor);
    this.uniforms.uHorizon.value.copy(clock.horizonColor);
    this.uniforms.uSunColor.value.copy(clock.sunColor);
    this.uniforms.uSunDir.value.copy(clock.sunDirection);
    this.uniforms.uStarOpacity.value = clock.starOpacity;
    this.uniforms.uTime.value = elapsed;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
