// ─── GPU Particle System ──────────────────────────────────────────────────
// Shader-based point particles with Float32Array attribute buffers, pool-based
// emit/recycle, per-particle velocity/gravity/drag/fade/color-lerp/size-lerp.
// Ported from GrudgeStudioNPM patterns, adapted to TypeScript.

import * as THREE from 'three';

export interface ParticleOptions {
  color?: number;
  colorEnd?: number;
  alpha?: number;
  size?: number;
  sizeEnd?: number | null;
  life?: number;
  gravity?: number;
  drag?: number;
  fadeIn?: number;
  fadeOut?: number;
  shrink?: boolean;
  acceleration?: THREE.Vector3;
}

export interface ActiveParticle {
  index: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  color: THREE.Color;
  colorEnd: THREE.Color | null;
  alpha: number;
  size: number;
  sizeEnd: number | null;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  fadeIn: number;
  fadeOut: number;
  shrink: boolean;
}

export interface ParticleSystemOptions {
  maxParticles?: number;
  texture?: THREE.Texture | null;
  blending?: THREE.Blending;
  transparent?: boolean;
  depthWrite?: boolean;
  size?: number;
}

export class ParticleSystem {
  maxParticles: number;
  private particles: ActiveParticle[] = [];
  private freeIndices: number[] = [];

  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  points: THREE.Points;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  private defaultSize: number;

  constructor(options: ParticleSystemOptions = {}) {
    this.maxParticles = options.maxParticles ?? 2000;
    this.defaultSize = options.size ?? 1;

    // Build free index stack (reversed so pop gives lowest first)
    for (let i = this.maxParticles - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }

    // Allocate typed arrays
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 4);
    this.sizes = new Float32Array(this.maxParticles);

    // Build geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Shader material
    const hasTexture = !!options.texture;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: options.texture ?? null },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec4 color;
        varying vec4 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: hasTexture
        ? `
          uniform sampler2D uTexture;
          varying vec4 vColor;
          void main() {
            vec4 texColor = texture2D(uTexture, gl_PointCoord);
            if (texColor.a < 0.1) discard;
            gl_FragColor = vColor * texColor;
          }
        `
        : `
          varying vec4 vColor;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
            gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
          }
        `,
      transparent: options.transparent ?? true,
      blending: options.blending ?? THREE.AdditiveBlending,
      depthWrite: options.depthWrite ?? false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  /** Emit a single particle at the given position with velocity */
  emit(position: THREE.Vector3, velocity: THREE.Vector3, options: ParticleOptions = {}): ActiveParticle | null {
    if (this.freeIndices.length === 0) return null;

    const index = this.freeIndices.pop()!;
    const particle: ActiveParticle = {
      index,
      position: position.clone(),
      velocity: velocity.clone(),
      acceleration: options.acceleration ? options.acceleration.clone() : new THREE.Vector3(),
      color: new THREE.Color(options.color ?? 0xffffff),
      colorEnd: options.colorEnd !== undefined ? new THREE.Color(options.colorEnd) : null,
      alpha: options.alpha ?? 1,
      size: options.size ?? this.defaultSize,
      sizeEnd: options.sizeEnd ?? null,
      life: options.life ?? 1,
      maxLife: options.life ?? 1,
      gravity: options.gravity ?? 0,
      drag: options.drag ?? 0,
      fadeIn: options.fadeIn ?? 0,
      fadeOut: options.fadeOut ?? 0.5,
      shrink: options.shrink ?? true,
    };

    this.particles.push(particle);
    this.writeParticle(particle);
    return particle;
  }

  /** Write a single particle's data to the typed arrays */
  private writeParticle(p: ActiveParticle) {
    const i3 = p.index * 3;
    const i4 = p.index * 4;

    this.positions[i3] = p.position.x;
    this.positions[i3 + 1] = p.position.y;
    this.positions[i3 + 2] = p.position.z;

    // Compute life ratio and alpha with fade
    const lifeRatio = p.life / p.maxLife;
    let alpha = p.alpha;
    if (lifeRatio > 1 - p.fadeIn && p.fadeIn > 0) {
      alpha *= (1 - lifeRatio) / p.fadeIn;
    } else if (lifeRatio < p.fadeOut && p.fadeOut > 0) {
      alpha *= lifeRatio / p.fadeOut;
    }

    // Color lerp
    let color = p.color;
    if (p.colorEnd) {
      color = p.color.clone().lerp(p.colorEnd, 1 - lifeRatio);
    }

    this.colors[i4] = color.r;
    this.colors[i4 + 1] = color.g;
    this.colors[i4 + 2] = color.b;
    this.colors[i4 + 3] = alpha;

    // Size interpolation
    let size = p.size;
    if (p.sizeEnd !== null) {
      size = p.size + (p.sizeEnd - p.size) * (1 - lifeRatio);
    } else if (p.shrink) {
      size = p.size * lifeRatio;
    }
    this.sizes[p.index] = size;
  }

  /** Update all particles — call every frame */
  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Physics
      p.velocity.y -= p.gravity * deltaTime;
      p.velocity.multiplyScalar(1 - p.drag * deltaTime);
      p.velocity.add(p.acceleration.clone().multiplyScalar(deltaTime));
      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));

      p.life -= deltaTime;

      if (p.life <= 0) {
        // Recycle
        this.sizes[p.index] = 0;
        this.freeIndices.push(p.index);
        this.particles.splice(i, 1);
      } else {
        this.writeParticle(p);
      }
    }

    // Flag buffers dirty
    this.geometry.attributes.position.needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;

    this.material.uniforms.uTime.value += deltaTime;
  }

  /** Clear all particles */
  clear() {
    for (const p of this.particles) {
      this.sizes[p.index] = 0;
      this.freeIndices.push(p.index);
    }
    this.particles = [];
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Get the THREE.Points object to add to a scene */
  getObject3D(): THREE.Points {
    return this.points;
  }

  /** Get active particle count */
  getParticleCount(): number {
    return this.particles.length;
  }

  /** Dispose GPU resources */
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
