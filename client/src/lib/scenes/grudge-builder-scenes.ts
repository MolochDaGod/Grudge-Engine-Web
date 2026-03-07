import type { RPGSceneConfig } from './scene-registry';

export const grudgeBuilderScenes: RPGSceneConfig[] = [
  {
    id: 'builder',
    name: 'Level Builder',
    description: 'Grid-based procedural level building with terrain editing tools.',
    game: 'Grudge Builder',
    terrain: 'plains',
    skybox: 'daytime',
    mapSize: 20000,
    debugMode: true,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, HemisphericLight, FreeCamera, Color3, Color4, MeshBuilder, StandardMaterial, Texture } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.1, 0.12, 0.15, 1);

      const camera = new FreeCamera('builderCamera', new Vector3(0, 100, -200), scene);
      camera.setTarget(Vector3.Zero());
      camera.attachControl(canvas, true);
      camera.speed = 10;
      camera.maxZ = 25000;

      const light = new HemisphericLight('builderLight', new Vector3(0, 1, 0), scene);
      light.intensity = 1.2;
      light.diffuse = new Color3(1, 0.95, 0.9);
      light.groundColor = new Color3(0.2, 0.25, 0.4);

      // Grid terrain
      const gridSize = 19;
      const cellSize = 100;
      const totalSize = gridSize * cellSize;

      const ground = MeshBuilder.CreateGround('builderGrid', {
        width: totalSize,
        height: totalSize,
        subdivisions: gridSize
      }, scene);

      const groundMat = new StandardMaterial('gridMaterial', scene);
      groundMat.diffuseColor = new Color3(0.3, 0.5, 0.3);
      ground.material = groundMat;
      ground.receiveShadows = true;

      // Skybox
      const skybox = MeshBuilder.CreateBox('skyBox', { size: 16000 }, scene);
      const skyboxMat = new StandardMaterial('skyBoxMaterial', scene);
      skyboxMat.backFaceCulling = false;
      skyboxMat.diffuseColor = new Color3(0, 0, 0);
      skyboxMat.specularColor = new Color3(0, 0, 0);
      skybox.material = skyboxMat;

      return scene;
    }
  },
  {
    id: 'builder-desert',
    name: 'Desert Builder',
    description: 'Desert-themed sandbox for building arid environments with sand dunes.',
    game: 'Grudge Builder',
    terrain: 'desert',
    skybox: 'daytime',
    mapSize: 15000,
    debugMode: true,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, HemisphericLight, DirectionalLight, FreeCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.7, 0.6, 0.4, 1);

      const camera = new FreeCamera('camera', new Vector3(0, 80, -150), scene);
      camera.setTarget(Vector3.Zero());
      camera.attachControl(canvas, true);
      camera.speed = 8;
      camera.maxZ = 20000;

      const sun = new DirectionalLight('sun', new Vector3(-0.3, -1, 0.5), scene);
      sun.intensity = 1.5;
      sun.diffuse = new Color3(1, 0.9, 0.7);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.4;
      ambient.diffuse = new Color3(1, 0.95, 0.8);

      const ground = MeshBuilder.CreateGround('desert', { width: 1500, height: 1500, subdivisions: 40 }, scene);
      const sandMat = new StandardMaterial('sandMat', scene);
      sandMat.diffuseColor = new Color3(0.76, 0.7, 0.5);
      ground.material = sandMat;

      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 300;
      scene.fogEnd = 5000;
      scene.fogColor = new Color3(0.75, 0.68, 0.5);

      return scene;
    }
  }
];
