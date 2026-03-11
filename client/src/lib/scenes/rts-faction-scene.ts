import type { RPGSceneConfig } from './scene-registry';

export const rtsFactionScenes: RPGSceneConfig[] = [
  {
    id: 'rts-faction-battle',
    name: 'Faction Battle',
    description: 'Three-faction RTS battle map with Orc, Elf, and Human base positions. Large terrain with resources.',
    game: 'GRUDA Wars',
    terrain: 'plains',
    skybox: 'daytime',
    mapSize: 10000,
    createScene: async (engine, canvas) => {
      const {
        Scene, Vector3, DirectionalLight, HemisphericLight, ArcRotateCamera,
        Color3, Color4, MeshBuilder, StandardMaterial, ShadowGenerator,
        Texture, Animation, ParticleSystem
      } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.45, 0.6, 0.85, 1);
      scene.ambientColor = new Color3(0.3, 0.3, 0.35);

      // ─── RTS Camera (top-down with zoom/pan) ───
      const camera = new ArcRotateCamera('rtsCamera', -Math.PI / 4, Math.PI / 3.2, 300, new Vector3(0, 0, 0), scene);
      camera.attachControl(canvas, true);
      camera.lowerRadiusLimit = 50;
      camera.upperRadiusLimit = 800;
      camera.lowerBetaLimit = 0.3;
      camera.upperBetaLimit = Math.PI / 2.5;
      camera.panningSensibility = 20;
      camera.wheelPrecision = 10;
      camera.maxZ = 12000;

      // ─── Lighting ───
      const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, 0.3), scene);
      sun.intensity = 1.3;
      sun.diffuse = new Color3(1.0, 0.95, 0.85);
      sun.position = new Vector3(200, 400, 200);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.4;
      ambient.diffuse = new Color3(0.5, 0.55, 0.6);
      ambient.groundColor = new Color3(0.15, 0.12, 0.1);

      // Shadow generator
      const shadowGen = new ShadowGenerator(2048, sun);
      shadowGen.useBlurExponentialShadowMap = true;
      shadowGen.blurKernel = 32;
      shadowGen.darkness = 0.25;

      // ─── Main Terrain ───
      const ground = MeshBuilder.CreateGround('terrain', {
        width: 800, height: 800, subdivisions: 64
      }, scene);
      const groundMat = new StandardMaterial('terrainMat', scene);
      groundMat.diffuseColor = new Color3(0.35, 0.45, 0.2);
      groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
      ground.material = groundMat;
      ground.receiveShadows = true;

      // ─── Faction Base Zones (3 colored pads) ───
      const factionPositions: { name: string; pos: [number, number]; color: Color3 }[] = [
        { name: 'Orc Base', pos: [-250, -250], color: new Color3(0.3, 0.5, 0.25) },
        { name: 'Elf Base', pos: [250, -250], color: new Color3(0.18, 0.55, 0.43) },
        { name: 'Human Base', pos: [0, 280], color: new Color3(0.23, 0.35, 0.6) },
      ];

      factionPositions.forEach(({ name, pos, color }, i) => {
        const pad = MeshBuilder.CreateGround(`basePad_${i}`, { width: 120, height: 120 }, scene);
        pad.position = new Vector3(pos[0], 0.05, pos[1]);
        const padMat = new StandardMaterial(`baseMat_${i}`, scene);
        padMat.diffuseColor = color;
        padMat.specularColor = Color3.Black();
        padMat.alpha = 0.6;
        pad.material = padMat;

        // Base flag pole
        const pole = MeshBuilder.CreateCylinder(`pole_${i}`, { diameter: 1, height: 20 }, scene);
        pole.position = new Vector3(pos[0], 10, pos[1]);
        const poleMat = new StandardMaterial(`poleMat_${i}`, scene);
        poleMat.diffuseColor = new Color3(0.4, 0.35, 0.3);
        pole.material = poleMat;
        shadowGen.addShadowCaster(pole);

        // Flag banner
        const flag = MeshBuilder.CreatePlane(`flag_${i}`, { width: 8, height: 5 }, scene);
        flag.position = new Vector3(pos[0] + 4, 17, pos[1]);
        const flagMat = new StandardMaterial(`flagMat_${i}`, scene);
        flagMat.diffuseColor = color;
        flagMat.emissiveColor = color.scale(0.3);
        flagMat.backFaceCulling = false;
        flag.material = flagMat;
      });

      // ─── Central Water Feature ───
      const water = MeshBuilder.CreateGround('water', { width: 100, height: 60, subdivisions: 4 }, scene);
      water.position = new Vector3(0, 0.1, 0);
      const waterMat = new StandardMaterial('waterMat', scene);
      waterMat.diffuseColor = new Color3(0.15, 0.3, 0.5);
      waterMat.specularColor = new Color3(0.5, 0.5, 0.5);
      waterMat.alpha = 0.7;
      water.material = waterMat;

      // ─── Gold Mines (3 - one per faction approach) ───
      const minePositions = [
        new Vector3(-120, 0, -120),
        new Vector3(120, 0, -120),
        new Vector3(0, 0, 150),
      ];
      const goldMat = new StandardMaterial('goldMat', scene);
      goldMat.diffuseColor = new Color3(0.85, 0.7, 0.2);
      goldMat.emissiveColor = new Color3(0.2, 0.15, 0.0);

      minePositions.forEach((pos, i) => {
        const mine = MeshBuilder.CreateBox(`goldMine_${i}`, { width: 8, height: 6, depth: 8 }, scene);
        mine.position = pos.add(new Vector3(0, 3, 0));
        mine.material = goldMat;
        shadowGen.addShadowCaster(mine);
      });

      // ─── Forest Clusters (tree placeholders) ───
      const treeMat = new StandardMaterial('treeMat', scene);
      treeMat.diffuseColor = new Color3(0.15, 0.4, 0.15);

      const trunkMat = new StandardMaterial('trunkMat', scene);
      trunkMat.diffuseColor = new Color3(0.4, 0.25, 0.15);

      const treePositions = [
        // NW forest
        ...Array.from({ length: 20 }, () => new Vector3(
          -300 + Math.random() * 100, 0, 50 + Math.random() * 150
        )),
        // NE forest
        ...Array.from({ length: 20 }, () => new Vector3(
          200 + Math.random() * 100, 0, 50 + Math.random() * 150
        )),
        // South forest
        ...Array.from({ length: 15 }, () => new Vector3(
          -100 + Math.random() * 200, 0, -300 + Math.random() * 80
        )),
      ];

      treePositions.forEach((pos, i) => {
        const trunk = MeshBuilder.CreateCylinder(`trunk_${i}`, { diameter: 1.5, height: 8 }, scene);
        trunk.position = pos.add(new Vector3(0, 4, 0));
        trunk.material = trunkMat;
        shadowGen.addShadowCaster(trunk);

        const crown = MeshBuilder.CreateSphere(`crown_${i}`, { diameter: 8, segments: 6 }, scene);
        crown.position = pos.add(new Vector3(0, 10, 0));
        crown.material = treeMat;
        shadowGen.addShadowCaster(crown);
      });

      // ─── Stone Quarries ───
      const stoneMat = new StandardMaterial('stoneMat', scene);
      stoneMat.diffuseColor = new Color3(0.5, 0.5, 0.5);

      [new Vector3(-200, 0, 0), new Vector3(200, 0, 0)].forEach((pos, i) => {
        const quarry = MeshBuilder.CreateBox(`quarry_${i}`, { width: 10, height: 4, depth: 10 }, scene);
        quarry.position = pos.add(new Vector3(0, 2, 0));
        quarry.material = stoneMat;
        shadowGen.addShadowCaster(quarry);
      });

      // ─── Fog ───
      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 500;
      scene.fogEnd = 3000;
      scene.fogColor = new Color3(0.45, 0.55, 0.7);

      return scene;
    }
  },
  {
    id: 'rts-skirmish',
    name: 'Skirmish Arena',
    description: '1v1 skirmish map with two base positions and central resource point.',
    game: 'GRUDA Wars',
    terrain: 'arena',
    skybox: 'sunset',
    mapSize: 5000,
    createScene: async (engine, canvas) => {
      const {
        Scene, Vector3, DirectionalLight, HemisphericLight, ArcRotateCamera,
        Color3, Color4, MeshBuilder, StandardMaterial, ShadowGenerator
      } = await import('@babylonjs/core');

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.3, 0.2, 0.4, 1);

      const camera = new ArcRotateCamera('camera', Math.PI / 4, Math.PI / 3.5, 200, Vector3.Zero(), scene);
      camera.attachControl(canvas, true);
      camera.lowerRadiusLimit = 30;
      camera.upperRadiusLimit = 500;
      camera.maxZ = 6000;

      const sun = new DirectionalLight('sun', new Vector3(-0.5, -1.5, 0.5), scene);
      sun.intensity = 1.1;
      sun.diffuse = new Color3(1.0, 0.7, 0.4);

      const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
      ambient.intensity = 0.3;
      ambient.diffuse = new Color3(0.5, 0.4, 0.5);

      const ground = MeshBuilder.CreateGround('ground', { width: 400, height: 400, subdivisions: 32 }, scene);
      const groundMat = new StandardMaterial('groundMat', scene);
      groundMat.diffuseColor = new Color3(0.3, 0.35, 0.2);
      ground.material = groundMat;
      ground.receiveShadows = true;

      // Two base zones
      [
        { pos: new Vector3(-140, 0.05, 0), color: new Color3(0.5, 0.2, 0.2) },
        { pos: new Vector3(140, 0.05, 0), color: new Color3(0.2, 0.2, 0.5) },
      ].forEach(({ pos, color }, i) => {
        const pad = MeshBuilder.CreateGround(`base_${i}`, { width: 60, height: 60 }, scene);
        pad.position = pos;
        const mat = new StandardMaterial(`baseMat_${i}`, scene);
        mat.diffuseColor = color;
        mat.alpha = 0.5;
        pad.material = mat;
      });

      // Central capture point
      const capMat = new StandardMaterial('capMat', scene);
      capMat.diffuseColor = new Color3(0.8, 0.7, 0.2);
      capMat.emissiveColor = new Color3(0.3, 0.25, 0.05);

      const capPoint = MeshBuilder.CreateCylinder('capturePoint', { diameter: 20, height: 1 }, scene);
      capPoint.position = new Vector3(0, 0.5, 0);
      capPoint.material = capMat;

      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 300;
      scene.fogEnd = 2000;
      scene.fogColor = new Color3(0.3, 0.25, 0.35);

      return scene;
    }
  }
];
