import type { RPGSceneConfig } from './scene-registry';

export const grudgeWarlordsScenes: RPGSceneConfig[] = [
  {
    id: 'warlords-crusade-island',
    name: 'Crusade Island',
    description: 'Medieval port city with secret passages and Easter eggs. Starting zone for crusaders.',
    game: 'Grudge Warlords',
    terrain: 'islands',
    skybox: 'daytime',
    mapSize: 8000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, DirectionalLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.4, 0.65, 0.9, 1);

      const camera = new ArcRotateCamera('camera', Math.PI / 4, Math.PI / 3.5, 400, new Vector3(0, 20, 0), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 12000;

      const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, 0.3), scene);
      sun.intensity = 1.3;
      sun.diffuse = new Color3(1, 0.95, 0.85);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.4;
      ambient.groundColor = new Color3(0.2, 0.3, 0.1);

      // Island terrain
      const island = MeshBuilder.CreateGround('island', { width: 600, height: 600, subdivisions: 48 }, scene);
      const islandMat = new StandardMaterial('islandMat', scene);
      islandMat.diffuseColor = new Color3(0.35, 0.55, 0.25);
      island.material = islandMat;
      island.receiveShadows = true;

      // Water plane
      const water = MeshBuilder.CreateGround('water', { width: 2000, height: 2000 }, scene);
      water.position.y = -2;
      const waterMat = new StandardMaterial('waterMat', scene);
      waterMat.diffuseColor = new Color3(0.15, 0.35, 0.65);
      waterMat.alpha = 0.8;
      waterMat.specularColor = new Color3(0.4, 0.4, 0.5);
      water.material = waterMat;

      // Port dock placeholder
      const dock = MeshBuilder.CreateBox('dock', { width: 30, height: 1, depth: 80 }, scene);
      dock.position = new Vector3(250, 0, 0);
      const dockMat = new StandardMaterial('dockMat', scene);
      dockMat.diffuseColor = new Color3(0.4, 0.25, 0.12);
      dock.material = dockMat;

      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 600;
      scene.fogEnd = 6000;
      scene.fogColor = new Color3(0.5, 0.65, 0.85);

      return scene;
    }
  },
  {
    id: 'warlords-fabled-island',
    name: 'Fabled Island',
    description: 'Mystical island with ancient ruins and magical atmosphere. High-level zone.',
    game: 'Grudge Warlords',
    terrain: 'islands',
    skybox: 'fantasy',
    mapSize: 6000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, DirectionalLight, PointLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.2, 0.15, 0.35, 1);

      const camera = new ArcRotateCamera('camera', 0, Math.PI / 3, 350, new Vector3(0, 30, 0), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 8000;

      const sun = new DirectionalLight('sun', new Vector3(-1, -1.5, 0.5), scene);
      sun.intensity = 0.8;
      sun.diffuse = new Color3(0.8, 0.7, 1);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.3;
      ambient.diffuse = new Color3(0.6, 0.5, 0.8);

      // Mystical glow lights
      const glow1 = new PointLight('glow1', new Vector3(100, 20, 50), scene);
      glow1.intensity = 0.6;
      glow1.diffuse = new Color3(0.5, 0.2, 0.8);

      const glow2 = new PointLight('glow2', new Vector3(-80, 15, -60), scene);
      glow2.intensity = 0.6;
      glow2.diffuse = new Color3(0.2, 0.5, 0.8);

      // Island
      const island = MeshBuilder.CreateGround('island', { width: 500, height: 500, subdivisions: 40 }, scene);
      const islandMat = new StandardMaterial('islandMat', scene);
      islandMat.diffuseColor = new Color3(0.25, 0.35, 0.2);
      island.material = islandMat;

      // Water
      const water = MeshBuilder.CreateGround('water', { width: 2000, height: 2000 }, scene);
      water.position.y = -3;
      const waterMat = new StandardMaterial('waterMat', scene);
      waterMat.diffuseColor = new Color3(0.1, 0.15, 0.35);
      waterMat.alpha = 0.85;
      water.material = waterMat;

      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.0004;
      scene.fogColor = new Color3(0.15, 0.12, 0.25);

      return scene;
    }
  },
  {
    id: 'warlords-piglin-outpost',
    name: 'Piglin Outpost',
    description: 'Enemy-controlled outpost with hellish red atmosphere. Raid zone.',
    game: 'Grudge Warlords',
    terrain: 'mountains',
    skybox: 'hellscape',
    mapSize: 4000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, DirectionalLight, PointLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.15, 0.05, 0.05, 1);

      const camera = new ArcRotateCamera('camera', Math.PI / 2, Math.PI / 3, 200, Vector3.Zero(), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 5000;

      const light = new DirectionalLight('light', new Vector3(-0.5, -1, -0.5), scene);
      light.intensity = 0.9;
      light.diffuse = new Color3(1, 0.5, 0.3);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.2;
      ambient.diffuse = new Color3(0.5, 0.2, 0.1);

      // Lava glow
      const lavaLight = new PointLight('lavaGlow', new Vector3(0, 5, 0), scene);
      lavaLight.intensity = 0.5;
      lavaLight.diffuse = new Color3(1, 0.3, 0);

      const ground = MeshBuilder.CreateGround('ground', { width: 400, height: 400, subdivisions: 32 }, scene);
      const groundMat = new StandardMaterial('groundMat', scene);
      groundMat.diffuseColor = new Color3(0.3, 0.15, 0.1);
      ground.material = groundMat;

      scene.fogMode = Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.0005;
      scene.fogColor = new Color3(0.2, 0.05, 0.02);

      return scene;
    }
  },
  {
    id: 'warlords-arena',
    name: 'Floating Arena',
    description: 'Floating arena where players choose race and class. Spawn/lobby zone.',
    game: 'Grudge Warlords',
    terrain: 'arena',
    skybox: 'grudgeBrawl',
    mapSize: 2000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, DirectionalLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.05, 0.05, 0.1, 1);

      const camera = new ArcRotateCamera('camera', 0, Math.PI / 4, 150, new Vector3(0, 10, 0), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 3000;

      const light = new DirectionalLight('light', new Vector3(0, -1, 0.5), scene);
      light.intensity = 1.2;
      light.diffuse = new Color3(0.9, 0.85, 1);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.3;

      // Floating platform
      const platform = MeshBuilder.CreateCylinder('platform', { diameter: 120, height: 5, tessellation: 64 }, scene);
      platform.position.y = -2.5;
      const platMat = new StandardMaterial('platMat', scene);
      platMat.diffuseColor = new Color3(0.25, 0.25, 0.3);
      platMat.specularColor = new Color3(0.3, 0.3, 0.4);
      platform.material = platMat;

      // Arena ring
      const ring = MeshBuilder.CreateTorus('ring', { diameter: 130, thickness: 3, tessellation: 64 }, scene);
      ring.position.y = 0.5;
      const ringMat = new StandardMaterial('ringMat', scene);
      ringMat.diffuseColor = new Color3(0.8, 0.2, 0.2);
      ringMat.emissiveColor = new Color3(0.4, 0.05, 0.05);
      ring.material = ringMat;

      return scene;
    }
  }
];
