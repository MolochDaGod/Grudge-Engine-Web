import * as BABYLON from '@babylonjs/core';

export interface ParticleEffect {
  name: string;
  position: BABYLON.Vector3;
  lifetime?: number;
  emitRate?: number;
  speed?: number;
  gravity?: BABYLON.Vector3;
  color1?: BABYLON.Color4;
  color2?: BABYLON.Color4;
}

export class ParticleSystemManager {
  private scene: BABYLON.Scene;
  private systems: Map<string, BABYLON.ParticleSystem> = new Map();

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  createBloodEffect(position: BABYLON.Vector3): void {
    const ps = new BABYLON.ParticleSystem('blood', 500, this.scene);
    ps.particleTexture = new BABYLON.DynamicTexture('bloodTexture', 64, this.scene);
    
    ps.emitter = position;
    ps.minEmitPower = 1;
    ps.maxEmitPower = 3;
    ps.minLifeTime = 0.5;
    ps.maxLifeTime = 1.5;
    ps.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
    ps.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
    ps.gravity = new BABYLON.Vector3(0, -9.81, 0);
    ps.targetStopDuration = 0.5;
    ps.disposeOnStop = true;

    ps.addColorGradient(0, new BABYLON.Color4(1, 0, 0, 1));
    ps.addColorGradient(1, new BABYLON.Color4(0.5, 0, 0, 0));
    ps.start();
    this.systems.set(`blood-${Date.now()}`, ps);
  }

  createDustEffect(position: BABYLON.Vector3): void {
    const ps = new BABYLON.ParticleSystem('dust', 200, this.scene);
    ps.particleTexture = new BABYLON.DynamicTexture('dustTexture', 64, this.scene);

    ps.emitter = position;
    ps.minEmitPower = 0.5;
    ps.maxEmitPower = 2;
    ps.minLifeTime = 1;
    ps.maxLifeTime = 2.5;
    ps.minEmitBox = new BABYLON.Vector3(-0.3, -0.1, -0.3);
    ps.maxEmitBox = new BABYLON.Vector3(0.3, 0.3, 0.3);
    ps.gravity = new BABYLON.Vector3(0, -2, 0);
    ps.targetStopDuration = 0.5;
    ps.disposeOnStop = true;

    ps.addColorGradient(0, new BABYLON.Color4(0.8, 0.8, 0.8, 0.8));
    ps.addColorGradient(1, new BABYLON.Color4(0.6, 0.6, 0.6, 0));
    ps.start();
    this.systems.set(`dust-${Date.now()}`, ps);
  }

  createSpellEffect(position: BABYLON.Vector3, color: BABYLON.Color4 = new BABYLON.Color4(0, 1, 1, 1)): void {
    const ps = new BABYLON.ParticleSystem('spell', 300, this.scene);
    ps.particleTexture = new BABYLON.DynamicTexture('spellTexture', 64, this.scene);

    ps.emitter = position;
    ps.minEmitPower = 2;
    ps.maxEmitPower = 5;
    ps.minLifeTime = 1;
    ps.maxLifeTime = 2;
    ps.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
    ps.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
    ps.gravity = new BABYLON.Vector3(0, -1, 0);
    ps.targetStopDuration = 0.3;
    ps.disposeOnStop = true;

    ps.addColorGradient(0, color);
    ps.addColorGradient(0.5, new BABYLON.Color4(color.r, color.g, color.b, 0.5));
    ps.addColorGradient(1, new BABYLON.Color4(color.r, color.g, color.b, 0));
    ps.start();
    this.systems.set(`spell-${Date.now()}`, ps);
  }

  createExplosion(position: BABYLON.Vector3): void {
    const ps = new BABYLON.ParticleSystem('explosion', 500, this.scene);
    ps.particleTexture = new BABYLON.DynamicTexture('explosionTexture', 64, this.scene);

    ps.emitter = position;
    ps.minEmitPower = 3;
    ps.maxEmitPower = 8;
    ps.minLifeTime = 0.8;
    ps.maxLifeTime = 2;
    ps.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
    ps.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
    ps.gravity = new BABYLON.Vector3(0, -5, 0);
    ps.targetStopDuration = 0.2;
    ps.disposeOnStop = true;

    ps.addColorGradient(0, new BABYLON.Color4(1, 1, 0, 1));
    ps.addColorGradient(0.3, new BABYLON.Color4(1, 0.5, 0, 0.8));
    ps.addColorGradient(1, new BABYLON.Color4(0.3, 0.3, 0.3, 0));
    ps.start();
    this.systems.set(`explosion-${Date.now()}`, ps);
  }

  dispose(): void {
    this.systems.forEach(ps => ps.dispose());
    this.systems.clear();
  }
}

let particleManager: ParticleSystemManager | null = null;

export function createParticleManager(scene: BABYLON.Scene): ParticleSystemManager {
  if (particleManager) particleManager.dispose();
  particleManager = new ParticleSystemManager(scene);
  return particleManager;
}

export function getParticleManager(): ParticleSystemManager | null {
  return particleManager;
}
