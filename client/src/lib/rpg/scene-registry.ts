import type { Scene, Engine } from '@babylonjs/core';

export interface RPGSceneConfig {
  id: string;
  name: string;
  description: string;
  createScene: (engine: Engine, canvas: HTMLCanvasElement) => Promise<Scene>;
  mapSize?: number;
  debugMode?: boolean;
}

export interface RPGSceneState {
  currentSceneId: string | null;
  scenes: Map<string, RPGSceneConfig>;
  activeScene: Scene | null;
  isLoading: boolean;
  debugMode: boolean;
}

const sceneConfigs: RPGSceneConfig[] = [
  {
    id: 'builder',
    name: 'Level Builder',
    description: 'Grid-based procedural level building with terrain editing tools',
    createScene: async (engine, canvas) => createBuilderScene(engine, canvas),
    mapSize: 20000,
    debugMode: true
  },
  {
    id: 'outdoor',
    name: 'Outdoor World',
    description: 'Open world outdoor environment with dynamic terrain',
    createScene: async (engine, canvas) => createOutdoorScene(engine, canvas),
    mapSize: 10000
  },
  {
    id: 'town',
    name: 'Town',
    description: 'Town environment with buildings and NPCs',
    createScene: async (engine, canvas) => createTownScene(engine, canvas),
    mapSize: 5000
  },
  {
    id: 'night',
    name: 'Night Scene',
    description: 'Night-time environment with atmospheric lighting',
    createScene: async (engine, canvas) => createNightScene(engine, canvas),
    mapSize: 8000
  },
  {
    id: 'inn',
    name: 'Inn Interior',
    description: 'Indoor inn environment',
    createScene: async (engine, canvas) => createInnScene(engine, canvas),
    mapSize: 500
  }
];

async function createBuilderScene(engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> {
  const { Scene, Vector3, HemisphericLight, FreeCamera, Color3 } = await import('@babylonjs/core');
  
  const scene = new Scene(engine);
  scene.clearColor = new (await import('@babylonjs/core')).Color4(0.1, 0.12, 0.15, 1);
  
  const camera = new FreeCamera('builderCamera', new Vector3(0, 100, -200), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(canvas, true);
  camera.speed = 10;
  camera.maxZ = 25000;
  
  const light = new HemisphericLight('builderLight', new Vector3(0, 1, 0), scene);
  light.intensity = 1.2;
  light.diffuse = new Color3(1, 0.95, 0.9);
  light.groundColor = new Color3(0.2, 0.25, 0.4);
  
  await createBuilderGrid(scene, engine);
  createSkydome(scene, 20000);
  
  return scene;
}

async function createBuilderGrid(scene: Scene, engine: Engine): Promise<void> {
  const { MeshBuilder, StandardMaterial, Color3, Texture, Vector2 } = await import('@babylonjs/core');
  
  const gridSize = 19;
  const cellSize = 100;
  const totalSize = gridSize * cellSize;
  
  const ground = MeshBuilder.CreateGround('builderGrid', {
    width: totalSize,
    height: totalSize,
    subdivisions: gridSize
  }, scene);
  
  const groundMaterial = new StandardMaterial('gridMaterial', scene);
  groundMaterial.diffuseColor = new Color3(0.3, 0.5, 0.3);
  
  try {
    const grassTexture = new Texture('/assets/rpg/textures/terrain/grass.png', scene);
    grassTexture.uScale = gridSize;
    grassTexture.vScale = gridSize;
    groundMaterial.diffuseTexture = grassTexture;
  } catch (e) {
    console.warn('Could not load grass texture, using fallback');
  }
  
  ground.material = groundMaterial;
  ground.receiveShadows = true;
}

async function createSkydome(scene: Scene, size: number): Promise<void> {
  const { MeshBuilder, StandardMaterial, Texture, Color3 } = await import('@babylonjs/core');
  
  const skybox = MeshBuilder.CreateBox('skyBox', { size: size * 0.8 }, scene);
  const skyboxMaterial = new StandardMaterial('skyBoxMaterial', scene);
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
  skyboxMaterial.specularColor = new Color3(0, 0, 0);
  
  try {
    const { CubeTexture } = await import('@babylonjs/core');
    skyboxMaterial.reflectionTexture = new CubeTexture('/assets/rpg/textures/lighting/skybox', scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  } catch (e) {
    console.warn('Could not load skybox textures');
  }
  
  skybox.material = skyboxMaterial;
}

async function createOutdoorScene(engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> {
  const { Scene, Vector3, HemisphericLight, ArcRotateCamera, Color3, Color4 } = await import('@babylonjs/core');
  
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.5, 0.7, 0.9, 1);
  
  const camera = new ArcRotateCamera('outdoorCamera', Math.PI / 2, Math.PI / 3, 300, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.maxZ = 15000;
  
  const light = new HemisphericLight('outdoorLight', new Vector3(0.5, 1, 0.3), scene);
  light.intensity = 1.5;
  light.diffuse = new Color3(1, 0.95, 0.85);
  
  await createBuilderGrid(scene, engine);
  createSkydome(scene, 10000);
  
  scene.fogMode = (await import('@babylonjs/core')).Scene.FOGMODE_LINEAR;
  scene.fogStart = 500;
  scene.fogEnd = 8000;
  scene.fogColor = new Color3(0.6, 0.7, 0.85);
  
  return scene;
}

async function createTownScene(engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> {
  const { Scene, Vector3, DirectionalLight, ArcRotateCamera, Color3, Color4 } = await import('@babylonjs/core');
  
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.4, 0.6, 0.85, 1);
  
  const camera = new ArcRotateCamera('townCamera', 0, Math.PI / 4, 200, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.maxZ = 6000;
  
  const light = new DirectionalLight('townLight', new Vector3(-1, -2, -1), scene);
  light.intensity = 1.2;
  light.diffuse = new Color3(1, 0.98, 0.9);
  
  await createBuilderGrid(scene, engine);
  
  return scene;
}

async function createNightScene(engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> {
  const { Scene, Vector3, PointLight, ArcRotateCamera, Color3, Color4 } = await import('@babylonjs/core');
  
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.03, 0.08, 1);
  
  const camera = new ArcRotateCamera('nightCamera', Math.PI, Math.PI / 3, 250, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.maxZ = 10000;
  
  const moonLight = new PointLight('moonLight', new Vector3(500, 800, -400), scene);
  moonLight.intensity = 0.8;
  moonLight.diffuse = new Color3(0.7, 0.75, 0.9);
  
  await createBuilderGrid(scene, engine);
  createSkydome(scene, 8000);
  
  scene.fogMode = (await import('@babylonjs/core')).Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0003;
  scene.fogColor = new Color3(0.05, 0.05, 0.12);
  
  return scene;
}

async function createInnScene(engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> {
  const { Scene, Vector3, PointLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');
  
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.15, 0.12, 0.1, 1);
  
  const camera = new ArcRotateCamera('innCamera', 0, Math.PI / 3, 50, new Vector3(0, 5, 0), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 20;
  camera.upperRadiusLimit = 100;
  
  const warmLight = new PointLight('innLight', new Vector3(0, 15, 0), scene);
  warmLight.intensity = 1.5;
  warmLight.diffuse = new Color3(1, 0.85, 0.6);
  
  const floor = MeshBuilder.CreateGround('innFloor', { width: 40, height: 40 }, scene);
  const floorMat = new StandardMaterial('floorMat', scene);
  floorMat.diffuseColor = new Color3(0.4, 0.25, 0.15);
  floor.material = floorMat;
  
  return scene;
}

class SceneRegistry {
  private scenes: Map<string, RPGSceneConfig> = new Map();
  private activeScene: Scene | null = null;
  private engine: Engine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  constructor() {
    sceneConfigs.forEach(config => {
      this.scenes.set(config.id, config);
    });
  }
  
  initialize(engine: Engine, canvas: HTMLCanvasElement) {
    this.engine = engine;
    this.canvas = canvas;
  }
  
  getSceneList(): RPGSceneConfig[] {
    return Array.from(this.scenes.values());
  }
  
  getScene(id: string): RPGSceneConfig | undefined {
    return this.scenes.get(id);
  }
  
  async loadScene(id: string): Promise<Scene | null> {
    const config = this.scenes.get(id);
    if (!config || !this.engine || !this.canvas) return null;
    
    if (this.activeScene) {
      this.activeScene.dispose();
    }
    
    this.activeScene = await config.createScene(this.engine, this.canvas);
    return this.activeScene;
  }
  
  getActiveScene(): Scene | null {
    return this.activeScene;
  }
  
  dispose() {
    if (this.activeScene) {
      this.activeScene.dispose();
      this.activeScene = null;
    }
  }
}

export const sceneRegistry = new SceneRegistry();
export default sceneRegistry;
