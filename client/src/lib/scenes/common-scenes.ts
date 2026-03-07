import type { RPGSceneConfig } from './scene-registry';

export const commonScenes: RPGSceneConfig[] = [
  {
    id: 'outdoor',
    name: 'Outdoor World',
    description: 'Open world outdoor environment with dynamic terrain and fog',
    game: 'Common',
    terrain: 'plains',
    skybox: 'daytime',
    mapSize: 10000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial, Texture } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.5, 0.7, 0.9, 1);

      const camera = new ArcRotateCamera('outdoorCamera', Math.PI / 2, Math.PI / 3, 300, Vector3.Zero(), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 15000;

      const light = new HemisphericLight('outdoorLight', new Vector3(0.5, 1, 0.3), scene);
      light.intensity = 1.5;
      light.diffuse = new Color3(1, 0.95, 0.85);

      const ground = MeshBuilder.CreateGround('ground', { width: 1000, height: 1000, subdivisions: 32 }, scene);
      const groundMat = new StandardMaterial('groundMat', scene);
      groundMat.diffuseColor = new Color3(0.3, 0.5, 0.3);
      ground.material = groundMat;
      ground.receiveShadows = true;

      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 500;
      scene.fogEnd = 8000;
      scene.fogColor = new Color3(0.6, 0.7, 0.85);

      return scene;
    }
  },
  {
    id: 'night',
    name: 'Night Scene',
    description: 'Night-time environment with atmospheric moonlight and fog',
    game: 'Common',
    terrain: 'plains',
    skybox: 'night',
    mapSize: 8000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, PointLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.02, 0.03, 0.08, 1);

      const camera = new ArcRotateCamera('nightCamera', Math.PI, Math.PI / 3, 250, Vector3.Zero(), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 10000;

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.15;
      ambient.diffuse = new Color3(0.3, 0.3, 0.5);

      const moonLight = new PointLight('moonLight', new Vector3(500, 800, -400), scene);
      moonLight.intensity = 0.8;
      moonLight.diffuse = new Color3(0.7, 0.75, 0.9);

      const ground = MeshBuilder.CreateGround('ground', { width: 800, height: 800, subdivisions: 24 }, scene);
      const groundMat = new StandardMaterial('groundMat', scene);
      groundMat.diffuseColor = new Color3(0.15, 0.2, 0.15);
      ground.material = groundMat;

      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.0003;
      scene.fogColor = new Color3(0.05, 0.05, 0.12);

      return scene;
    }
  },
  {
    id: 'inn',
    name: 'Inn Interior',
    description: 'Warm indoor tavern/inn with firelight ambiance',
    game: 'Common',
    terrain: 'arena',
    skybox: 'night',
    mapSize: 500,
    createScene: async (engine, canvas) => {
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

      const accentLight = new PointLight('fireLight', new Vector3(-5, 3, -5), scene);
      accentLight.intensity = 0.8;
      accentLight.diffuse = new Color3(1, 0.5, 0.2);

      const floor = MeshBuilder.CreateGround('innFloor', { width: 40, height: 40 }, scene);
      const floorMat = new StandardMaterial('floorMat', scene);
      floorMat.diffuseColor = new Color3(0.4, 0.25, 0.15);
      floor.material = floorMat;

      // Walls
      const wallMat = new StandardMaterial('wallMat', scene);
      wallMat.diffuseColor = new Color3(0.35, 0.25, 0.18);

      const wallBack = MeshBuilder.CreateBox('wallBack', { width: 40, height: 12, depth: 0.5 }, scene);
      wallBack.position = new Vector3(0, 6, 20);
      wallBack.material = wallMat;

      const wallLeft = MeshBuilder.CreateBox('wallLeft', { width: 0.5, height: 12, depth: 40 }, scene);
      wallLeft.position = new Vector3(-20, 6, 0);
      wallLeft.material = wallMat;

      const wallRight = MeshBuilder.CreateBox('wallRight', { width: 0.5, height: 12, depth: 40 }, scene);
      wallRight.position = new Vector3(20, 6, 0);
      wallRight.material = wallMat;

      return scene;
    }
  }
];
