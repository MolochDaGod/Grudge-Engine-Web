// ─── Particle Emitter ─────────────────────────────────────────────────────
// Configurable emitter that drives a ParticleSystem. Supports shape spawning
// (point, sphere, box, circle), direction+spread, rate & burst emission.
// Ported from GrudgeStudioNPM patterns, adapted to TypeScript.

import * as THREE from 'three';
import { ParticleSystem, type ParticleOptions } from './particle-system';

export type EmitterShape = 'point' | 'sphere' | 'box' | 'circle' | 'cone';

export interface ParticleEmitterOptions {
  position?: THREE.Vector3;
  direction?: THREE.Vector3;
  rate?: number;
  burst?: number;
  spread?: number;
  speedMin?: number;
  speedMax?: number;
  lifeMin?: number;
  lifeMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  color?: number;
  colorEnd?: number | null;
  alpha?: number;
  gravity?: number;
  drag?: number;
  shape?: EmitterShape;
  shapeRadius?: number;
  shapeSize?: THREE.Vector3;
  duration?: number;
  onEmit?: ((pos: THREE.Vector3, vel: THREE.Vector3, opts: ParticleOptions) => void) | null;
}

export class ParticleEmitter {
  system: ParticleSystem;
  position: THREE.Vector3;
  direction: THREE.Vector3;

  rate: number;
  spread: number;
  speedMin: number;
  speedMax: number;
  lifeMin: number;
  lifeMax: number;
  sizeMin: number;
  sizeMax: number;

  color: number;
  colorEnd: number | null;
  alpha: number;
  gravity: number;
  drag: number;

  enabled: boolean = true;
  private emitTimer: number = 0;
  duration: number;
  private elapsed: number = 0;

  shape: EmitterShape;
  shapeRadius: number;
  shapeSize: THREE.Vector3;

  onEmit: ((pos: THREE.Vector3, vel: THREE.Vector3, opts: ParticleOptions) => void) | null;

  constructor(system: ParticleSystem, options: ParticleEmitterOptions = {}) {
    this.system = system;
    this.position = options.position ? options.position.clone() : new THREE.Vector3();
    this.direction = options.direction ? options.direction.clone().normalize() : new THREE.Vector3(0, 1, 0);

    this.rate = options.rate ?? 10;
    this.spread = options.spread ?? Math.PI / 6;
    this.speedMin = options.speedMin ?? 1;
    this.speedMax = options.speedMax ?? 3;
    this.lifeMin = options.lifeMin ?? 1;
    this.lifeMax = options.lifeMax ?? 2;
    this.sizeMin = options.sizeMin ?? 0.5;
    this.sizeMax = options.sizeMax ?? 1.5;

    this.color = options.color ?? 0xffffff;
    this.colorEnd = options.colorEnd ?? null;
    this.alpha = options.alpha ?? 1;
    this.gravity = options.gravity ?? 0;
    this.drag = options.drag ?? 0;

    this.duration = options.duration ?? -1;

    this.shape = options.shape ?? 'point';
    this.shapeRadius = options.shapeRadius ?? 1;
    this.shapeSize = options.shapeSize ? options.shapeSize.clone() : new THREE.Vector3(1, 1, 1);

    this.onEmit = options.onEmit ?? null;
  }

  /** Set emitter position */
  setPosition(x: number | THREE.Vector3, y?: number, z?: number): this {
    if (x instanceof THREE.Vector3) {
      this.position.copy(x);
    } else {
      this.position.set(x, y!, z!);
    }
    return this;
  }

  /** Set emission direction */
  setDirection(x: number | THREE.Vector3, y?: number, z?: number): this {
    if (x instanceof THREE.Vector3) {
      this.direction.copy(x).normalize();
    } else {
      this.direction.set(x, y!, z!).normalize();
    }
    return this;
  }

  /** Get spawn position based on emitter shape */
  private getSpawnPosition(): THREE.Vector3 {
    const pos = this.position.clone();

    switch (this.shape) {
      case 'sphere': {
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(2 * Math.random() - 1);
        const r = Math.cbrt(Math.random()) * this.shapeRadius;
        pos.x += r * Math.sin(theta) * Math.cos(phi);
        pos.y += r * Math.sin(theta) * Math.sin(phi);
        pos.z += r * Math.cos(theta);
        break;
      }
      case 'box':
        pos.x += (Math.random() - 0.5) * this.shapeSize.x;
        pos.y += (Math.random() - 0.5) * this.shapeSize.y;
        pos.z += (Math.random() - 0.5) * this.shapeSize.z;
        break;
      case 'circle': {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * this.shapeRadius;
        pos.x += Math.cos(angle) * radius;
        pos.z += Math.sin(angle) * radius;
        break;
      }
      case 'cone': {
        const coneAngle = Math.random() * Math.PI * 2;
        const coneR = Math.random() * this.shapeRadius;
        pos.x += Math.cos(coneAngle) * coneR;
        pos.z += Math.sin(coneAngle) * coneR;
        break;
      }
      case 'point':
      default:
        break;
    }

    return pos;
  }

  /** Compute particle velocity with spread */
  private getVelocity(): THREE.Vector3 {
    const speed = this.speedMin + Math.random() * (this.speedMax - this.speedMin);
    const velocity = this.direction.clone();

    const spreadX = (Math.random() - 0.5) * 2 * this.spread;
    const spreadY = (Math.random() - 0.5) * 2 * this.spread;

    const axis1 = new THREE.Vector3(1, 0, 0);
    if (Math.abs(this.direction.x) > 0.9) {
      axis1.set(0, 1, 0);
    }
    const axis2 = new THREE.Vector3().crossVectors(this.direction, axis1).normalize();
    axis1.crossVectors(axis2, this.direction).normalize();

    velocity.applyAxisAngle(axis1, spreadX);
    velocity.applyAxisAngle(axis2, spreadY);
    velocity.multiplyScalar(speed);

    return velocity;
  }

  /** Emit a single particle */
  emitOne() {
    const position = this.getSpawnPosition();
    const velocity = this.getVelocity();

    const options: ParticleOptions = {
      life: this.lifeMin + Math.random() * (this.lifeMax - this.lifeMin),
      size: this.sizeMin + Math.random() * (this.sizeMax - this.sizeMin),
      color: this.color,
      colorEnd: this.colorEnd ?? undefined,
      alpha: this.alpha,
      gravity: this.gravity,
      drag: this.drag,
    };

    if (this.onEmit) {
      this.onEmit(position, velocity, options);
    }

    return this.system.emit(position, velocity, options);
  }

  /** Emit a burst of N particles at once */
  emitBurst(count: number): this {
    for (let i = 0; i < count; i++) {
      this.emitOne();
    }
    return this;
  }

  /** Update emitter — call every frame to emit at the configured rate */
  update(deltaTime: number): this {
    if (!this.enabled) return this;

    if (this.duration > 0) {
      this.elapsed += deltaTime;
      if (this.elapsed >= this.duration) {
        this.enabled = false;
        return this;
      }
    }

    if (this.rate > 0) {
      this.emitTimer += deltaTime;
      const interval = 1 / this.rate;
      while (this.emitTimer >= interval) {
        this.emitOne();
        this.emitTimer -= interval;
      }
    }

    return this;
  }

  /** Reset emitter state */
  reset(): this {
    this.elapsed = 0;
    this.emitTimer = 0;
    this.enabled = true;
    return this;
  }

  /** Stop emission */
  stop(): this {
    this.enabled = false;
    return this;
  }

  /** Start emission */
  start(): this {
    this.enabled = true;
    return this;
  }
}
