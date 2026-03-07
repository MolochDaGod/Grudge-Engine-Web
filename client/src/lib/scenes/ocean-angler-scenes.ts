import type { RPGSceneConfig } from './scene-registry';

export const oceanAnglerScenes: RPGSceneConfig[] = [
  {
    id: 'ocean-open-sea',
    name: 'Open Ocean',
    description: 'Vast open ocean with dynamic waves and distant islands on the horizon.',
    game: 'Ocean Angler',
    terrain: 'islands',
    skybox: 'daytime',
    mapSize: 15000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, DirectionalLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.45, 0.65, 0.9, 1);

      const camera = new ArcRotateCamera('camera', Math.PI / 2, Math.PI / 4, 100, new Vector3(0, 5, 0), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 20000;

      const sun = new DirectionalLight('sun', new Vector3(-0.3, -1, 0.5), scene);
      sun.intensity = 1.4;
      sun.diffuse = new Color3(1, 0.95, 0.85);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.5;
      ambient.diffuse = new Color3(0.7, 0.8, 1);
      ambient.groundColor = new Color3(0.1, 0.2, 0.4);

      // Ocean surface
      const ocean = MeshBuilder.CreateGround('ocean', { width: 3000, height: 3000, subdivisions: 64 }, scene);
      const oceanMat = new StandardMaterial('oceanMat', scene);
      oceanMat.diffuseColor = new Color3(0.1, 0.3, 0.6);
      oceanMat.specularColor = new Color3(0.5, 0.6, 0.7);
      oceanMat.alpha = 0.9;
      ocean.material = oceanMat;

      // Distant island silhouette
      const distantIsland = MeshBuilder.CreateSphere('distantIsland', { diameter: 200, segments: 16 }, scene);
      distantIsland.position = new Vector3(1200, -80, 800);
      distantIsland.scaling.y = 0.3;
      const islandMat = new StandardMaterial('islandMat', scene);
      islandMat.diffuseColor = new Color3(0.2, 0.35, 0.15);
      distantIsland.material = islandMat;

      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 300;
      scene.fogEnd = 8000;
      scene.fogColor = new Color3(0.55, 0.7, 0.9);

      return scene;
    }
  },
  {
    id: 'ocean-fishing-pier',
    name: 'Fishing Pier',
    description: 'Wooden fishing pier at dusk. Relaxed fishing gameplay zone.',
    game: 'Ocean Angler',
    terrain: 'islands',
    skybox: 'sunset',
    mapSize: 2000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, DirectionalLight, PointLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.3, 0.25, 0.45, 1);

      const camera = new ArcRotateCamera('camera', -Math.PI / 6, Math.PI / 4, 80, new Vector3(0, 5, 20), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 3000;

      const sun = new DirectionalLight('sun', new Vector3(1, -0.8, 0.3), scene);
      sun.intensity = 0.8;
      sun.diffuse = new Color3(1, 0.6, 0.3);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.3;
      ambient.diffuse = new Color3(0.5, 0.35, 0.3);

      // Lantern light
      const lantern = new PointLight('lantern', new Vector3(0, 8, 30), scene);
      lantern.intensity = 0.6;
      lantern.diffuse = new Color3(1, 0.8, 0.4);

      // Water
      const water = MeshBuilder.CreateGround('water', { width: 500, height: 500 }, scene);
      water.position.y = -1;
      const waterMat = new StandardMaterial('waterMat', scene);
      waterMat.diffuseColor = new Color3(0.1, 0.2, 0.4);
      waterMat.alpha = 0.85;
      water.material = waterMat;

      // Pier
      const pierMat = new StandardMaterial('pierMat', scene);
      pierMat.diffuseColor = new Color3(0.4, 0.25, 0.12);

      const pier = MeshBuilder.CreateBox('pier', { width: 8, height: 0.5, depth: 60 }, scene);
      pier.position = new Vector3(0, 1, 20);
      pier.material = pierMat;

      // Pier supports
      for (let z = -5; z <= 45; z += 10) {
        const post = MeshBuilder.CreateCylinder(`post_${z}`, { diameter: 0.5, height: 4 }, scene);
        post.position = new Vector3(-3, -0.5, z);
        post.material = pierMat;
        const post2 = MeshBuilder.CreateCylinder(`post2_${z}`, { diameter: 0.5, height: 4 }, scene);
        post2.position = new Vector3(3, -0.5, z);
        post2.material = pierMat;
      }

      // Shore
      const shore = MeshBuilder.CreateGround('shore', { width: 100, height: 40 }, scene);
      shore.position = new Vector3(0, 0.2, -15);
      const shoreMat = new StandardMaterial('shoreMat', scene);
      shoreMat.diffuseColor = new Color3(0.7, 0.65, 0.45);
      shore.material = shoreMat;

      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 200;
      scene.fogEnd = 2000;
      scene.fogColor = new Color3(0.35, 0.25, 0.4);

      return scene;
    }
  },
  {
    id: 'ocean-port-town',
    name: 'Port Town',
    description: 'Bustling coastal town with a harbor, market, and ship docks.',
    game: 'Ocean Angler',
    terrain: 'islands',
    skybox: 'daytime',
    mapSize: 4000,
    createScene: async (engine, canvas) => {
      const { Scene, Vector3, DirectionalLight, HemisphericLight, ArcRotateCamera, Color3, Color4, MeshBuilder, StandardMaterial } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.45, 0.6, 0.85, 1);

      const camera = new ArcRotateCamera('camera', Math.PI / 3, Math.PI / 3.5, 300, new Vector3(0, 15, 0), scene);
      camera.attachControl(canvas, true);
      camera.maxZ = 6000;

      const sun = new DirectionalLight('sun', new Vector3(-0.5, -1.2, 0.3), scene);
      sun.intensity = 1.3;
      sun.diffuse = new Color3(1, 0.95, 0.88);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.4;

      // Land
      const land = MeshBuilder.CreateGround('land', { width: 400, height: 300, subdivisions: 24 }, scene);
      land.position.z = -50;
      const landMat = new StandardMaterial('landMat', scene);
      landMat.diffuseColor = new Color3(0.4, 0.5, 0.3);
      land.material = landMat;

      // Harbor water
      const harbor = MeshBuilder.CreateGround('harbor', { width: 600, height: 400 }, scene);
      harbor.position = new Vector3(0, -0.5, 150);
      const harborMat = new StandardMaterial('harborMat', scene);
      harborMat.diffuseColor = new Color3(0.12, 0.3, 0.55);
      harborMat.alpha = 0.85;
      harbor.material = harborMat;

      // Building placeholders
      const buildingMat = new StandardMaterial('buildingMat', scene);
      buildingMat.diffuseColor = new Color3(0.6, 0.55, 0.45);

      const buildings = [
        { w: 20, h: 15, d: 20, pos: new Vector3(-60, 7.5, -80) },
        { w: 25, h: 12, d: 15, pos: new Vector3(-20, 6, -90) },
        { w: 30, h: 18, d: 20, pos: new Vector3(30, 9, -70) },
        { w: 15, h: 10, d: 25, pos: new Vector3(80, 5, -85) },
      ];

      buildings.forEach((b, i) => {
        const building = MeshBuilder.CreateBox(`building${i}`, { width: b.w, height: b.h, depth: b.d }, scene);
        building.position = b.pos;
        building.material = buildingMat;
      });

      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 400;
      scene.fogEnd = 4000;
      scene.fogColor = new Color3(0.5, 0.6, 0.8);

      return scene;
    }
  }
];
