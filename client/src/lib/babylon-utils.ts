import * as BABYLON from '@babylonjs/core';
import {
  Scene,
  Texture,
  CubeTexture,
  ParticleSystem,
  SpriteManager,
  Sprite,
  Vector3,
  Color4,
  StandardMaterial,
  PBRMaterial,
  AbstractMesh
} from '@babylonjs/core';

export interface TextureConfig {
  url: string;
  name?: string;
  invertY?: boolean;
  samplingMode?: number;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export interface ParticleConfig {
  name: string;
  capacity?: number;
  emitter: Vector3 | AbstractMesh;
  textureUrl?: string;
  minEmitBox?: Vector3;
  maxEmitBox?: Vector3;
  color1?: Color4;
  color2?: Color4;
  colorDead?: Color4;
  minSize?: number;
  maxSize?: number;
  minLifeTime?: number;
  maxLifeTime?: number;
  emitRate?: number;
  gravity?: Vector3;
  direction1?: Vector3;
  direction2?: Vector3;
  minAngularSpeed?: number;
  maxAngularSpeed?: number;
  minEmitPower?: number;
  maxEmitPower?: number;
  updateSpeed?: number;
  blendMode?: number;
}

export interface SpriteConfig {
  name: string;
  managerName: string;
  textureUrl: string;
  capacity?: number;
  cellWidth?: number;
  cellHeight?: number;
  position?: Vector3;
  size?: number;
  isPickable?: boolean;
}

export function createTexture(scene: Scene, config: TextureConfig): Texture {
  const texture = new Texture(
    config.url,
    scene,
    false,
    config.invertY ?? true,
    config.samplingMode ?? Texture.TRILINEAR_SAMPLINGMODE,
    config.onLoad,
    (message) => config.onError?.(message || 'Failed to load texture')
  );
  
  if (config.name) {
    texture.name = config.name;
  }
  
  return texture;
}

export function createCubeTexture(
  scene: Scene,
  rootUrl: string,
  extensions?: string[],
  noMipmap?: boolean
): CubeTexture {
  return new CubeTexture(
    rootUrl,
    scene,
    extensions,
    noMipmap
  );
}

export function createHDRTexture(scene: Scene, url: string): CubeTexture {
  return CubeTexture.CreateFromPrefilteredData(url, scene);
}

export function createParticleSystem(scene: Scene, config: ParticleConfig): ParticleSystem {
  const capacity = config.capacity ?? 2000;
  const particleSystem = new ParticleSystem(config.name, capacity, scene);
  
  if (config.textureUrl) {
    particleSystem.particleTexture = new Texture(config.textureUrl, scene);
  } else {
    particleSystem.particleTexture = new Texture('https://playground.babylonjs.com/textures/flare.png', scene);
  }
  
  particleSystem.emitter = config.emitter;
  
  particleSystem.minEmitBox = config.minEmitBox ?? new Vector3(-0.5, 0, -0.5);
  particleSystem.maxEmitBox = config.maxEmitBox ?? new Vector3(0.5, 0, 0.5);
  
  particleSystem.color1 = config.color1 ?? new Color4(1, 0.5, 0, 1);
  particleSystem.color2 = config.color2 ?? new Color4(1, 0.2, 0, 1);
  particleSystem.colorDead = config.colorDead ?? new Color4(0, 0, 0, 0);
  
  particleSystem.minSize = config.minSize ?? 0.1;
  particleSystem.maxSize = config.maxSize ?? 0.5;
  
  particleSystem.minLifeTime = config.minLifeTime ?? 0.3;
  particleSystem.maxLifeTime = config.maxLifeTime ?? 1.5;
  
  particleSystem.emitRate = config.emitRate ?? 100;
  
  particleSystem.gravity = config.gravity ?? new Vector3(0, -9.81, 0);
  
  particleSystem.direction1 = config.direction1 ?? new Vector3(-1, 8, -1);
  particleSystem.direction2 = config.direction2 ?? new Vector3(1, 8, 1);
  
  particleSystem.minAngularSpeed = config.minAngularSpeed ?? 0;
  particleSystem.maxAngularSpeed = config.maxAngularSpeed ?? Math.PI;
  
  particleSystem.minEmitPower = config.minEmitPower ?? 1;
  particleSystem.maxEmitPower = config.maxEmitPower ?? 3;
  
  particleSystem.updateSpeed = config.updateSpeed ?? 0.005;
  
  if (config.blendMode !== undefined) {
    particleSystem.blendMode = config.blendMode;
  } else {
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;
  }
  
  return particleSystem;
}

export function createFireParticles(scene: Scene, emitter: Vector3 | AbstractMesh, name = 'fire'): ParticleSystem {
  return createParticleSystem(scene, {
    name,
    capacity: 2000,
    emitter,
    textureUrl: 'https://playground.babylonjs.com/textures/flare.png',
    minEmitBox: new Vector3(-0.1, 0, -0.1),
    maxEmitBox: new Vector3(0.1, 0, 0.1),
    color1: new Color4(1, 0.5, 0, 1),
    color2: new Color4(1, 0.2, 0, 1),
    colorDead: new Color4(0, 0, 0, 0),
    minSize: 0.1,
    maxSize: 0.5,
    minLifeTime: 0.2,
    maxLifeTime: 0.8,
    emitRate: 200,
    gravity: new Vector3(0, 0, 0),
    direction1: new Vector3(-0.5, 2, -0.5),
    direction2: new Vector3(0.5, 4, 0.5),
    minEmitPower: 0.5,
    maxEmitPower: 1.5,
    blendMode: ParticleSystem.BLENDMODE_ADD
  });
}

export function createSmokeParticles(scene: Scene, emitter: Vector3 | AbstractMesh, name = 'smoke'): ParticleSystem {
  return createParticleSystem(scene, {
    name,
    capacity: 1000,
    emitter,
    textureUrl: 'https://playground.babylonjs.com/textures/smoke.png',
    minEmitBox: new Vector3(-0.2, 0, -0.2),
    maxEmitBox: new Vector3(0.2, 0, 0.2),
    color1: new Color4(0.6, 0.6, 0.6, 0.8),
    color2: new Color4(0.4, 0.4, 0.4, 0.6),
    colorDead: new Color4(0.2, 0.2, 0.2, 0),
    minSize: 0.3,
    maxSize: 1.5,
    minLifeTime: 1,
    maxLifeTime: 3,
    emitRate: 50,
    gravity: new Vector3(0, 1, 0),
    direction1: new Vector3(-0.3, 1, -0.3),
    direction2: new Vector3(0.3, 2, 0.3),
    minEmitPower: 0.5,
    maxEmitPower: 1,
    blendMode: ParticleSystem.BLENDMODE_STANDARD
  });
}

export function createSparkParticles(scene: Scene, emitter: Vector3 | AbstractMesh, name = 'sparks'): ParticleSystem {
  return createParticleSystem(scene, {
    name,
    capacity: 500,
    emitter,
    textureUrl: 'https://playground.babylonjs.com/textures/flare.png',
    minEmitBox: new Vector3(-0.05, 0, -0.05),
    maxEmitBox: new Vector3(0.05, 0, 0.05),
    color1: new Color4(1, 0.8, 0.2, 1),
    color2: new Color4(1, 0.6, 0, 1),
    colorDead: new Color4(1, 0.4, 0, 0),
    minSize: 0.02,
    maxSize: 0.08,
    minLifeTime: 0.1,
    maxLifeTime: 0.4,
    emitRate: 100,
    gravity: new Vector3(0, -5, 0),
    direction1: new Vector3(-2, 4, -2),
    direction2: new Vector3(2, 6, 2),
    minEmitPower: 2,
    maxEmitPower: 5,
    blendMode: ParticleSystem.BLENDMODE_ADD
  });
}

export function createSpriteManager(
  scene: Scene,
  name: string,
  textureUrl: string,
  capacity: number,
  cellWidth: number,
  cellHeight: number
): SpriteManager {
  return new SpriteManager(
    name,
    textureUrl,
    capacity,
    { width: cellWidth, height: cellHeight },
    scene
  );
}

export function createSprite(
  manager: SpriteManager,
  name: string,
  position?: Vector3,
  size?: number
): Sprite {
  const sprite = new Sprite(name, manager);
  
  if (position) {
    sprite.position = position;
  }
  
  if (size) {
    sprite.size = size;
  }
  
  return sprite;
}

export function createAnimatedSprite(
  manager: SpriteManager,
  name: string,
  fromCell: number,
  toCell: number,
  loop: boolean,
  delay: number,
  position?: Vector3
): Sprite {
  const sprite = new Sprite(name, manager);
  
  if (position) {
    sprite.position = position;
  }
  
  sprite.playAnimation(fromCell, toCell, loop, delay);
  
  return sprite;
}

export function applyTextureToMaterial(
  material: StandardMaterial | PBRMaterial,
  textureType: 'diffuse' | 'normal' | 'specular' | 'emissive' | 'ambient' | 'bump' | 'albedo' | 'metallic' | 'roughness',
  texture: Texture
): void {
  if (material instanceof PBRMaterial) {
    switch (textureType) {
      case 'albedo':
      case 'diffuse':
        material.albedoTexture = texture;
        break;
      case 'normal':
      case 'bump':
        material.bumpTexture = texture;
        break;
      case 'metallic':
        material.metallicTexture = texture;
        break;
      case 'roughness':
        material.metallicTexture = texture;
        material.useRoughnessFromMetallicTextureAlpha = false;
        material.useRoughnessFromMetallicTextureGreen = true;
        break;
      case 'emissive':
        material.emissiveTexture = texture;
        break;
      case 'ambient':
        material.ambientTexture = texture;
        break;
    }
  } else if (material instanceof StandardMaterial) {
    switch (textureType) {
      case 'diffuse':
      case 'albedo':
        material.diffuseTexture = texture;
        break;
      case 'normal':
      case 'bump':
        material.bumpTexture = texture;
        break;
      case 'specular':
        material.specularTexture = texture;
        break;
      case 'emissive':
        material.emissiveTexture = texture;
        break;
      case 'ambient':
        material.ambientTexture = texture;
        break;
    }
  }
}

export function disposeTexture(texture: Texture): void {
  if (texture) {
    texture.dispose();
  }
}

export function disposeParticleSystem(particleSystem: ParticleSystem): void {
  if (particleSystem) {
    particleSystem.stop();
    particleSystem.dispose();
  }
}

export function disposeSpriteManager(manager: SpriteManager): void {
  if (manager) {
    manager.dispose();
  }
}

export const TextureFilters = {
  NEAREST: Texture.NEAREST_SAMPLINGMODE,
  BILINEAR: Texture.BILINEAR_SAMPLINGMODE,
  TRILINEAR: Texture.TRILINEAR_SAMPLINGMODE,
  NEAREST_NEAREST: Texture.NEAREST_NEAREST,
  LINEAR_LINEAR: Texture.LINEAR_LINEAR,
  LINEAR_LINEAR_MIPLINEAR: Texture.LINEAR_LINEAR_MIPLINEAR
};

export const ParticleBlendModes = {
  ONE_ONE: ParticleSystem.BLENDMODE_ONEONE,
  STANDARD: ParticleSystem.BLENDMODE_STANDARD,
  ADD: ParticleSystem.BLENDMODE_ADD,
  MULTIPLY: ParticleSystem.BLENDMODE_MULTIPLY
};

export interface FrameGraphConfig {
  name: string;
  debugMode?: boolean;
}

export async function isFrameGraphSupported(): Promise<boolean> {
  try {
    const FrameGraphModule = await import('@babylonjs/core/FrameGraph/frameGraph');
    return !!(FrameGraphModule && FrameGraphModule.FrameGraph);
  } catch {
    return false;
  }
}

export async function isNodeRenderGraphSupported(): Promise<boolean> {
  try {
    const NodeRenderGraphModule = await import('@babylonjs/core/FrameGraph/Node/nodeRenderGraph');
    return !!(NodeRenderGraphModule && NodeRenderGraphModule.NodeRenderGraph);
  } catch {
    return false;
  }
}

export async function getFrameGraphModule(): Promise<any | null> {
  try {
    return await import('@babylonjs/core/FrameGraph/frameGraph');
  } catch (e) {
    console.warn('FrameGraph not available:', e);
    return null;
  }
}

export async function getNodeRenderGraphModule(): Promise<any | null> {
  try {
    return await import('@babylonjs/core/FrameGraph/Node/nodeRenderGraph');
  } catch (e) {
    console.warn('NodeRenderGraph not available:', e);
    return null;
  }
}

export function loadTextureAsync(
  scene: Scene,
  url: string,
  options?: {
    invertY?: boolean;
    samplingMode?: number;
  }
): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const texture = new Texture(
      url,
      scene,
      false,
      options?.invertY ?? true,
      options?.samplingMode ?? Texture.TRILINEAR_SAMPLINGMODE,
      () => resolve(texture),
      (message) => reject(new Error(message || 'Failed to load texture'))
    );
  });
}

export function loadCubeTextureAsync(
  scene: Scene,
  rootUrl: string,
  extensions?: string[]
): Promise<CubeTexture> {
  return new Promise((resolve, reject) => {
    const cubeTexture = new CubeTexture(
      rootUrl,
      scene,
      extensions,
      false,
      undefined,
      () => resolve(cubeTexture),
      (message, exception) => reject(new Error(typeof message === 'string' ? message : 'Failed to load cube texture'))
    );
  });
}

export function createGPUParticleSystem(
  scene: Scene,
  config: ParticleConfig
): BABYLON.GPUParticleSystem | ParticleSystem {
  const capacity = config.capacity ?? 2000;
  
  if (BABYLON.GPUParticleSystem.IsSupported) {
    const gpuParticleSystem = new BABYLON.GPUParticleSystem(config.name, { capacity }, scene);
    
    if (config.textureUrl) {
      gpuParticleSystem.particleTexture = new Texture(config.textureUrl, scene);
    } else {
      gpuParticleSystem.particleTexture = new Texture('https://playground.babylonjs.com/textures/flare.png', scene);
    }
    
    gpuParticleSystem.emitter = config.emitter;
    gpuParticleSystem.minEmitBox = config.minEmitBox ?? new Vector3(-0.5, 0, -0.5);
    gpuParticleSystem.maxEmitBox = config.maxEmitBox ?? new Vector3(0.5, 0, 0.5);
    gpuParticleSystem.color1 = config.color1 ?? new Color4(1, 0.5, 0, 1);
    gpuParticleSystem.color2 = config.color2 ?? new Color4(1, 0.2, 0, 1);
    gpuParticleSystem.colorDead = config.colorDead ?? new Color4(0, 0, 0, 0);
    gpuParticleSystem.minSize = config.minSize ?? 0.1;
    gpuParticleSystem.maxSize = config.maxSize ?? 0.5;
    gpuParticleSystem.minLifeTime = config.minLifeTime ?? 0.3;
    gpuParticleSystem.maxLifeTime = config.maxLifeTime ?? 1.5;
    gpuParticleSystem.emitRate = config.emitRate ?? 100;
    gpuParticleSystem.gravity = config.gravity ?? new Vector3(0, -9.81, 0);
    gpuParticleSystem.direction1 = config.direction1 ?? new Vector3(-1, 8, -1);
    gpuParticleSystem.direction2 = config.direction2 ?? new Vector3(1, 8, 1);
    gpuParticleSystem.minAngularSpeed = config.minAngularSpeed ?? 0;
    gpuParticleSystem.maxAngularSpeed = config.maxAngularSpeed ?? Math.PI;
    gpuParticleSystem.minEmitPower = config.minEmitPower ?? 1;
    gpuParticleSystem.maxEmitPower = config.maxEmitPower ?? 3;
    gpuParticleSystem.updateSpeed = config.updateSpeed ?? 0.005;
    
    return gpuParticleSystem;
  }
  
  return createParticleSystem(scene, config);
}
