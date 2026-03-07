import type { RPGSceneConfig } from './scene-registry';

export const grudaWarsScenes: RPGSceneConfig[] = [
  {
    id: 'gruda-pvp-arena',
    name: 'PvP Arena',
    description: 'Competitive arena for faction-based PvP combat. Symmetrical layout.',
    game: 'GRUDA Wars',
    terrain: 'arena',
    skybox: 'grudgeBrawl',
    mapSize: 3000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, DirectionalLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.08, 0.06, 0.12, 1);

      const camera = new ArcRotateCamera('camera', Math.PI / 4, Math.PI / 3.5, 200, new Vector3(0, 5, 0), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 4000;

      const light = new DirectionalLight('light', new Vector3(-0.3, -1, 0.5), scene);
      light.intensity = 1.1;
      light.diffuse = new Color3(0.9, 0.8, 0.7);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.25;
      ambient.diffuse = new Color3(0.4, 0.3, 0.5);

      // Arena floor
      const floor = MeshBuilder.CreateGround('arenaFloor', { width: 200, height: 200, subdivisions: 16 }, scene);
      const floorMat = new StandardMaterial('floorMat', scene);
      floorMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
      floor.material = floorMat;

      // Arena walls
      const wallMat = new StandardMaterial('wallMat', scene);
      wallMat.diffuseColor = new Color3(0.3, 0.15, 0.15);

      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const wall = MeshBuilder.CreateBox(`wall${i}`, { width: 200, height: 15, depth: 2 }, scene);
        wall.position = new Vector3(Math.sin(angle) * 100, 7.5, Math.cos(angle) * 100);
        wall.rotation.y = angle;
        wall.material = wallMat;
      }

      return scene;
    }
  },
  {
    id: 'gruda-faction-battleground',
    name: 'Faction Battleground',
    description: 'Large-scale faction warfare map with capture points and defensive structures.',
    game: 'GRUDA Wars',
    terrain: 'plains',
    skybox: 'sunset',
    mapSize: 8000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, DirectionalLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.2, 0.15, 0.3, 1);

      const camera = new ArcRotateCamera('camera', Math.PI / 3, Math.PI / 4, 500, Vector3.Zero(), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 10000;

      const sun = new DirectionalLight('sun', new Vector3(-1, -1.5, 0.8), scene);
      sun.intensity = 1.0;
      sun.diffuse = new Color3(1, 0.6, 0.3);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.3;
      ambient.diffuse = new Color3(0.6, 0.4, 0.3);

      const ground = MeshBuilder.CreateGround('ground', { width: 800, height: 800, subdivisions: 40 }, scene);
      const groundMat = new StandardMaterial('groundMat', scene);
      groundMat.diffuseColor = new Color3(0.35, 0.3, 0.2);
      ground.material = groundMat;

      // Capture point markers
      const markerMat = new StandardMaterial('markerMat', scene);
      markerMat.diffuseColor = new Color3(0.8, 0.8, 0.2);
      markerMat.emissiveColor = new Color3(0.3, 0.3, 0.05);

      const positions = [
        new Vector3(0, 5, 0),
        new Vector3(200, 5, 150),
        new Vector3(-200, 5, -150),
      ];

      positions.forEach((pos, i) => {
        const marker = MeshBuilder.CreateCylinder(`capture${i}`, { diameter: 20, height: 10 }, scene);
        marker.position = pos;
        marker.material = markerMat;
      });

      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 400;
      scene.fogEnd = 5000;
      scene.fogColor = new Color3(0.25, 0.18, 0.3);

      return scene;
    }
  },
  {
    id: 'gruda-siege',
    name: 'Siege Map',
    description: 'Castle siege scenario with defensive walls and siege equipment positions.',
    game: 'GRUDA Wars',
    terrain: 'mountains',
    skybox: 'daytime',
    mapSize: 5000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, DirectionalLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.4, 0.5, 0.7, 1);

      const camera = new ArcRotateCamera('camera', -Math.PI / 4, Math.PI / 3, 400, new Vector3(0, 30, 0), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 6000;

      const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, 0.3), scene);
      sun.intensity = 1.2;
      sun.diffuse = new Color3(1, 0.95, 0.9);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.35;

      const ground = MeshBuilder.CreateGround('ground', { width: 500, height: 500, subdivisions: 32 }, scene);
      const groundMat = new StandardMaterial('groundMat', scene);
      groundMat.diffuseColor = new Color3(0.35, 0.4, 0.25);
      ground.material = groundMat;

      // Castle walls
      const wallMat = new StandardMaterial('castleWall', scene);
      wallMat.diffuseColor = new Color3(0.5, 0.5, 0.45);

      const frontWall = MeshBuilder.CreateBox('frontWall', { width: 200, height: 25, depth: 5 }, scene);
      frontWall.position = new Vector3(0, 12.5, -80);
      frontWall.material = wallMat;

      const leftWall = MeshBuilder.CreateBox('leftWall', { width: 5, height: 25, depth: 160 }, scene);
      leftWall.position = new Vector3(-100, 12.5, 0);
      leftWall.material = wallMat;

      const rightWall = MeshBuilder.CreateBox('rightWall', { width: 5, height: 25, depth: 160 }, scene);
      rightWall.position = new Vector3(100, 12.5, 0);
      rightWall.material = wallMat;

      // Towers
      for (const x of [-100, 100]) {
        const tower = MeshBuilder.CreateCylinder(`tower_${x}`, { diameter: 15, height: 35 }, scene);
        tower.position = new Vector3(x, 17.5, -80);
        tower.material = wallMat;
      }

      return scene;
    }
  }
];
