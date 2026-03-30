/**
 * Particle Presets — Ported from threejs-games examples/20-particles/
 * Babylon.js ParticleSystem presets for fire, rain, snow, smoke, stars, and sparks.
 */

import * as BABYLON from '@babylonjs/core';

export type ParticlePresetName = 'fire' | 'rain' | 'snow' | 'smoke' | 'stars' | 'sparks' | 'flame';

export interface ParticlePresetOptions {
  position?: BABYLON.Vector3;
  emitter?: BABYLON.AbstractMesh;
  intensity?: number; // 0-1 scale factor for particle count
}

const ASSETS_CDN = import.meta.env?.VITE_ASSETS_URL || 'https://assets.grudge-studio.com';

export function createParticlePreset(
  name: ParticlePresetName,
  scene: BABYLON.Scene,
  options: ParticlePresetOptions = {},
): BABYLON.ParticleSystem {
  const pos = options.position || BABYLON.Vector3.Zero();
  const intensity = options.intensity ?? 1;

  switch (name) {
    case 'fire': return createFire(scene, pos, intensity, options.emitter);
    case 'rain': return createRain(scene, pos, intensity);
    case 'snow': return createSnow(scene, pos, intensity);
    case 'smoke': return createSmoke(scene, pos, intensity, options.emitter);
    case 'stars': return createStars(scene, intensity);
    case 'sparks': return createSparks(scene, pos, intensity, options.emitter);
    case 'flame': return createFlame(scene, pos, intensity, options.emitter);
    default: return createFire(scene, pos, intensity);
  }
}

function createFire(scene: BABYLON.Scene, pos: BABYLON.Vector3, intensity: number, emitter?: BABYLON.AbstractMesh): BABYLON.ParticleSystem {
  const ps = new BABYLON.ParticleSystem('fire', Math.floor(300 * intensity), scene);
  ps.particleTexture = new BABYLON.Texture(`${ASSETS_CDN}/engine-templates/particles/fire.png`, scene);
  ps.emitter = emitter || pos;
  ps.minEmitBox = new BABYLON.Vector3(-0.5, 0, -0.5);
  ps.maxEmitBox = new BABYLON.Vector3(0.5, 0, 0.5);
  ps.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
  ps.color2 = new BABYLON.Color4(1, 0.2, 0, 1);
  ps.colorDead = new BABYLON.Color4(0.2, 0, 0, 0);
  ps.minSize = 0.3;
  ps.maxSize = 1.0;
  ps.minLifeTime = 0.2;
  ps.maxLifeTime = 0.8;
  ps.emitRate = Math.floor(200 * intensity);
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  ps.direction1 = new BABYLON.Vector3(-0.3, 1, -0.3);
  ps.direction2 = new BABYLON.Vector3(0.3, 2, 0.3);
  ps.minEmitPower = 1;
  ps.maxEmitPower = 3;
  ps.gravity = new BABYLON.Vector3(0, -0.5, 0);
  ps.updateSpeed = 0.01;
  return ps;
}

function createRain(scene: BABYLON.Scene, pos: BABYLON.Vector3, intensity: number): BABYLON.ParticleSystem {
  const ps = new BABYLON.ParticleSystem('rain', Math.floor(2000 * intensity), scene);
  ps.particleTexture = new BABYLON.Texture(`${ASSETS_CDN}/engine-templates/particles/raindrop.png`, scene);
  ps.emitter = pos.add(new BABYLON.Vector3(0, 30, 0));
  ps.minEmitBox = new BABYLON.Vector3(-30, 0, -30);
  ps.maxEmitBox = new BABYLON.Vector3(30, 0, 30);
  ps.color1 = new BABYLON.Color4(0.6, 0.7, 0.9, 0.6);
  ps.color2 = new BABYLON.Color4(0.4, 0.5, 0.8, 0.4);
  ps.colorDead = new BABYLON.Color4(0.3, 0.4, 0.7, 0);
  ps.minSize = 0.05;
  ps.maxSize = 0.15;
  ps.minLifeTime = 0.5;
  ps.maxLifeTime = 1.5;
  ps.emitRate = Math.floor(1500 * intensity);
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ps.direction1 = new BABYLON.Vector3(-0.2, -1, -0.2);
  ps.direction2 = new BABYLON.Vector3(0.2, -1, 0.2);
  ps.minEmitPower = 10;
  ps.maxEmitPower = 15;
  ps.gravity = new BABYLON.Vector3(0, -9.8, 0);
  ps.updateSpeed = 0.005;
  return ps;
}

function createSnow(scene: BABYLON.Scene, pos: BABYLON.Vector3, intensity: number): BABYLON.ParticleSystem {
  const ps = new BABYLON.ParticleSystem('snow', Math.floor(1000 * intensity), scene);
  ps.particleTexture = new BABYLON.Texture(`${ASSETS_CDN}/engine-templates/particles/snowflake.png`, scene);
  ps.emitter = pos.add(new BABYLON.Vector3(0, 25, 0));
  ps.minEmitBox = new BABYLON.Vector3(-25, 0, -25);
  ps.maxEmitBox = new BABYLON.Vector3(25, 0, 25);
  ps.color1 = new BABYLON.Color4(1, 1, 1, 0.8);
  ps.color2 = new BABYLON.Color4(0.9, 0.95, 1, 0.6);
  ps.colorDead = new BABYLON.Color4(0.8, 0.85, 0.9, 0);
  ps.minSize = 0.1;
  ps.maxSize = 0.4;
  ps.minLifeTime = 3;
  ps.maxLifeTime = 8;
  ps.emitRate = Math.floor(400 * intensity);
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ps.direction1 = new BABYLON.Vector3(-0.5, -0.5, -0.5);
  ps.direction2 = new BABYLON.Vector3(0.5, -0.3, 0.5);
  ps.minEmitPower = 0.5;
  ps.maxEmitPower = 1.5;
  ps.gravity = new BABYLON.Vector3(0, -0.5, 0);
  ps.updateSpeed = 0.01;
  return ps;
}

function createSmoke(scene: BABYLON.Scene, pos: BABYLON.Vector3, intensity: number, emitter?: BABYLON.AbstractMesh): BABYLON.ParticleSystem {
  const ps = new BABYLON.ParticleSystem('smoke', Math.floor(200 * intensity), scene);
  ps.particleTexture = new BABYLON.Texture(`${ASSETS_CDN}/engine-templates/particles/smoke.png`, scene);
  ps.emitter = emitter || pos;
  ps.minEmitBox = new BABYLON.Vector3(-0.3, 0, -0.3);
  ps.maxEmitBox = new BABYLON.Vector3(0.3, 0, 0.3);
  ps.color1 = new BABYLON.Color4(0.4, 0.4, 0.4, 0.7);
  ps.color2 = new BABYLON.Color4(0.3, 0.3, 0.3, 0.4);
  ps.colorDead = new BABYLON.Color4(0.1, 0.1, 0.1, 0);
  ps.minSize = 0.5;
  ps.maxSize = 2.0;
  ps.minLifeTime = 1;
  ps.maxLifeTime = 4;
  ps.emitRate = Math.floor(80 * intensity);
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  ps.direction1 = new BABYLON.Vector3(-0.3, 1, -0.3);
  ps.direction2 = new BABYLON.Vector3(0.3, 3, 0.3);
  ps.minEmitPower = 0.5;
  ps.maxEmitPower = 2;
  ps.gravity = new BABYLON.Vector3(0, 0.3, 0);
  ps.updateSpeed = 0.01;
  return ps;
}

function createStars(scene: BABYLON.Scene, intensity: number): BABYLON.ParticleSystem {
  const ps = new BABYLON.ParticleSystem('stars', Math.floor(5000 * intensity), scene);
  ps.particleTexture = new BABYLON.Texture(`${ASSETS_CDN}/engine-templates/particles/star.png`, scene);
  ps.emitter = BABYLON.Vector3.Zero();
  ps.minEmitBox = new BABYLON.Vector3(-200, -200, -200);
  ps.maxEmitBox = new BABYLON.Vector3(200, 200, 200);
  ps.color1 = new BABYLON.Color4(1, 1, 1, 1);
  ps.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.8);
  ps.colorDead = new BABYLON.Color4(0.5, 0.6, 0.8, 0);
  ps.minSize = 0.05;
  ps.maxSize = 0.2;
  ps.minLifeTime = 10;
  ps.maxLifeTime = 30;
  ps.emitRate = Math.floor(100 * intensity);
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  ps.direction1 = new BABYLON.Vector3(0, 0, 0);
  ps.direction2 = new BABYLON.Vector3(0, 0, 0);
  ps.minEmitPower = 0;
  ps.maxEmitPower = 0;
  ps.gravity = BABYLON.Vector3.Zero();
  ps.updateSpeed = 0.001;
  return ps;
}

function createSparks(scene: BABYLON.Scene, pos: BABYLON.Vector3, intensity: number, emitter?: BABYLON.AbstractMesh): BABYLON.ParticleSystem {
  const ps = new BABYLON.ParticleSystem('sparks', Math.floor(100 * intensity), scene);
  ps.particleTexture = new BABYLON.Texture(`${ASSETS_CDN}/engine-templates/particles/spark.png`, scene);
  ps.emitter = emitter || pos;
  ps.minEmitBox = BABYLON.Vector3.Zero();
  ps.maxEmitBox = BABYLON.Vector3.Zero();
  ps.color1 = new BABYLON.Color4(1, 0.8, 0.2, 1);
  ps.color2 = new BABYLON.Color4(1, 0.4, 0, 1);
  ps.colorDead = new BABYLON.Color4(0.3, 0.1, 0, 0);
  ps.minSize = 0.02;
  ps.maxSize = 0.08;
  ps.minLifeTime = 0.1;
  ps.maxLifeTime = 0.5;
  ps.emitRate = 0; // Triggered manually via ps.manualEmitCount
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  ps.direction1 = new BABYLON.Vector3(-1, 1, -1);
  ps.direction2 = new BABYLON.Vector3(1, 2, 1);
  ps.minEmitPower = 3;
  ps.maxEmitPower = 8;
  ps.gravity = new BABYLON.Vector3(0, -5, 0);
  ps.updateSpeed = 0.005;
  return ps;
}

function createFlame(scene: BABYLON.Scene, pos: BABYLON.Vector3, intensity: number, emitter?: BABYLON.AbstractMesh): BABYLON.ParticleSystem {
  const ps = new BABYLON.ParticleSystem('flame', Math.floor(150 * intensity), scene);
  ps.particleTexture = new BABYLON.Texture(`${ASSETS_CDN}/engine-templates/particles/fire.png`, scene);
  ps.emitter = emitter || pos;
  ps.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2);
  ps.maxEmitBox = new BABYLON.Vector3(0.2, 0, 0.2);
  ps.color1 = new BABYLON.Color4(1, 0.6, 0, 1);
  ps.color2 = new BABYLON.Color4(1, 0.3, 0, 0.8);
  ps.colorDead = new BABYLON.Color4(0.5, 0, 0, 0);
  ps.minSize = 0.2;
  ps.maxSize = 0.6;
  ps.minLifeTime = 0.3;
  ps.maxLifeTime = 1.0;
  ps.emitRate = Math.floor(100 * intensity);
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  ps.direction1 = new BABYLON.Vector3(0, 1, 0);
  ps.direction2 = new BABYLON.Vector3(0, 3, 0);
  ps.minEmitPower = 1;
  ps.maxEmitPower = 3;
  ps.gravity = new BABYLON.Vector3(0, 0, 0);
  ps.updateSpeed = 0.008;
  return ps;
}

/** Start all presets at designated positions for a particle showcase scene */
export function createParticleShowcase(scene: BABYLON.Scene): BABYLON.ParticleSystem[] {
  const systems: BABYLON.ParticleSystem[] = [];

  const fire = createParticlePreset('fire', scene, { position: new BABYLON.Vector3(-8, 0, 0) });
  fire.start();
  systems.push(fire);

  const smoke = createParticlePreset('smoke', scene, { position: new BABYLON.Vector3(-4, 0, 0) });
  smoke.start();
  systems.push(smoke);

  const rain = createParticlePreset('rain', scene, { position: new BABYLON.Vector3(0, 0, 0), intensity: 0.3 });
  rain.start();
  systems.push(rain);

  const snow = createParticlePreset('snow', scene, { position: new BABYLON.Vector3(4, 0, 0), intensity: 0.3 });
  snow.start();
  systems.push(snow);

  const stars = createParticlePreset('stars', scene, { intensity: 0.2 });
  stars.start();
  systems.push(stars);

  return systems;
}
