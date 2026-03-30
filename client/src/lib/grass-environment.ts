import * as BABYLON from '@babylonjs/core';

export interface GrassEnvironmentOptions {
  scene: BABYLON.Scene;
  groundSize?: number;
  skyboxSize?: number;
}

export function createGrassEnvironment(options: GrassEnvironmentOptions): {
  ground: BABYLON.Mesh;
  skybox: BABYLON.Mesh;
  sun: BABYLON.DirectionalLight;
  ambient: BABYLON.HemisphericLight;
} {
  const { scene, groundSize = 100, skyboxSize = 500 } = options;

  // Create ground with grass texture procedurally
  const ground = BABYLON.MeshBuilder.CreateGround('grassGround', {
    width: groundSize,
    height: groundSize,
    subdivisions: 32
  }, scene);
  
  // Create grass material
  const grassMaterial = new BABYLON.StandardMaterial('grassMaterial', scene);
  
  // Create procedural grass texture
  const grassTexture = new BABYLON.DynamicTexture('grassTexture', 512, scene, true);
  const ctx = grassTexture.getContext();
  
  // Base green color
  ctx.fillStyle = '#4a7c39';
  ctx.fillRect(0, 0, 512, 512);
  
  // Add grass variation
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = Math.random() * 40 - 20;
    const r = Math.max(0, Math.min(255, 74 + shade));
    const g = Math.max(0, Math.min(255, 124 + shade * 1.5));
    const b = Math.max(0, Math.min(255, 57 + shade * 0.5));
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, 2, 4);
  }
  
  // Add darker spots for depth
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = 'rgba(30, 60, 20, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 8 + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  grassTexture.update();
  
  grassMaterial.diffuseTexture = grassTexture;
  (grassMaterial.diffuseTexture as BABYLON.Texture).uScale = 10;
  (grassMaterial.diffuseTexture as BABYLON.Texture).vScale = 10;
  grassMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
  ground.material = grassMaterial;
  ground.receiveShadows = true;
  
  // Create skybox with gradient sky
  const skybox = BABYLON.MeshBuilder.CreateBox('skyBox', { size: skyboxSize }, scene);
  const skyboxMaterial = new BABYLON.StandardMaterial('skyBoxMaterial', scene);
  skyboxMaterial.backFaceCulling = false;
  
  // Create procedural sky texture
  const skyTexture = new BABYLON.DynamicTexture('skyTexture', 512, scene, true);
  const skyCtx = skyTexture.getContext();
  
  // Create gradient sky
  const gradient = skyCtx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#1e3a5f'); // Dark blue at top
  gradient.addColorStop(0.3, '#4a90c2'); // Medium blue
  gradient.addColorStop(0.6, '#87ceeb'); // Light blue
  gradient.addColorStop(0.85, '#e0f0ff'); // Very light blue near horizon
  gradient.addColorStop(1, '#ffffff'); // White at horizon
  
  skyCtx.fillStyle = gradient;
  skyCtx.fillRect(0, 0, 512, 512);
  
  // Add some clouds
  skyCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (let i = 0; i < 15; i++) {
    const cx = Math.random() * 512;
    const cy = 100 + Math.random() * 200;
    const width = 40 + Math.random() * 80;
    const height = 20 + Math.random() * 30;
    
    // Draw cloud as overlapping circles
    for (let j = 0; j < 5; j++) {
      const ox = cx + (Math.random() - 0.5) * width;
      const oy = cy + (Math.random() - 0.5) * height * 0.5;
      const radius = 15 + Math.random() * 25;
      skyCtx.beginPath();
      skyCtx.arc(ox, oy, radius, 0, Math.PI * 2);
      skyCtx.fill();
    }
  }
  
  skyTexture.update();
  
  skyboxMaterial.reflectionTexture = skyTexture;
  skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
  skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.disableLighting = true;
  skyboxMaterial.emissiveTexture = skyTexture;
  skybox.material = skyboxMaterial;
  skybox.infiniteDistance = true;
  
  // Create bright ambient light (sky light)
  const ambient = new BABYLON.HemisphericLight('ambientLight', new BABYLON.Vector3(0, 1, 0), scene);
  ambient.intensity = 1.0;
  ambient.groundColor = new BABYLON.Color3(0.4, 0.45, 0.35);
  ambient.diffuse = new BABYLON.Color3(1.0, 1.0, 1.0);
  ambient.specular = new BABYLON.Color3(0.5, 0.5, 0.5);
  
  // Create bright sun (directional light)
  const sun = new BABYLON.DirectionalLight('sunLight', new BABYLON.Vector3(-0.5, -1, -0.3), scene);
  sun.intensity = 1.8;
  sun.diffuse = new BABYLON.Color3(1.0, 0.98, 0.9);
  sun.specular = new BABYLON.Color3(1.0, 1.0, 0.95);
  
  // Add shadows
  const shadowGenerator = new BABYLON.ShadowGenerator(1024, sun);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 32;
  
  // Add some trees/bushes as simple shapes for environment
  const treePositions = [
    { x: 15, z: 10 }, { x: -20, z: 15 }, { x: 25, z: -18 },
    { x: -15, z: -25 }, { x: 30, z: 5 }, { x: -30, z: -10 },
    { x: 10, z: 30 }, { x: -25, z: 25 }, { x: 35, z: 20 },
    { x: -35, z: -5 }, { x: 5, z: -35 }, { x: 20, z: -30 }
  ];
  
  treePositions.forEach((pos, i) => {
    createSimpleTree(scene, pos.x, pos.z, shadowGenerator, i);
  });
  
  // Add some rocks
  const rockPositions = [
    { x: 8, z: 5 }, { x: -12, z: 8 }, { x: 18, z: -10 },
    { x: -8, z: -15 }, { x: 22, z: 12 }, { x: -18, z: 18 }
  ];
  
  rockPositions.forEach((pos, i) => {
    createRock(scene, pos.x, pos.z, shadowGenerator, i);
  });
  
  // Add animated grass blades
  createAnimatedGrass(scene, ground, shadowGenerator);
  
  console.log('[GrassEnvironment] Created outdoor grass environment');
  
  return { ground, skybox, sun, ambient };
}

function createAnimatedGrass(
  scene: BABYLON.Scene,
  ground: BABYLON.Mesh,
  shadowGenerator: BABYLON.ShadowGenerator
): void {
  // Create a grass blade mesh template
  const grassBlade = BABYLON.MeshBuilder.CreatePlane('grassBladeTemplate', {
    width: 0.08,
    height: 0.4,
    sideOrientation: BABYLON.Mesh.DOUBLESIDE
  }, scene);
  grassBlade.isVisible = false;
  
  // Create grass material with gradient
  const grassBladeMaterial = new BABYLON.StandardMaterial('grassBladeMat', scene);
  
  // Create gradient texture for grass blade
  const bladeTexture = new BABYLON.DynamicTexture('bladeTexture', 64, scene, true);
  const bladeCtx = bladeTexture.getContext();
  
  const bladeGradient = bladeCtx.createLinearGradient(0, 0, 0, 64);
  bladeGradient.addColorStop(0, '#2d5a1e'); // Dark at base
  bladeGradient.addColorStop(0.3, '#4a8c2a');
  bladeGradient.addColorStop(0.7, '#6ab83a');
  bladeGradient.addColorStop(1, '#8cd44c'); // Light at tip
  
  bladeCtx.fillStyle = bladeGradient;
  bladeCtx.fillRect(0, 0, 64, 64);
  bladeTexture.update();
  bladeTexture.hasAlpha = true;
  
  grassBladeMaterial.diffuseTexture = bladeTexture;
  grassBladeMaterial.specularColor = new BABYLON.Color3(0.1, 0.15, 0.05);
  grassBladeMaterial.backFaceCulling = false;
  grassBlade.material = grassBladeMaterial;
  
  // Create grass instances in patches
  const grassPatches: BABYLON.Mesh[] = [];
  const patchRadius = 35;
  const grassDensity = 800; // Number of grass blades per patch
  
  // Create multiple grass clusters
  for (let patch = 0; patch < 3; patch++) {
    const patchMesh = grassBlade.clone(`grassPatch_${patch}`);
    patchMesh.isVisible = true;
    
    // Create instances for this patch
    const matrices: BABYLON.Matrix[] = [];
    
    for (let i = 0; i < grassDensity; i++) {
      // Random position within patch radius, avoiding trees/rocks area
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * patchRadius;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      
      // Skip if too close to center or too far
      if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;
      
      const height = 0.15 + Math.random() * 0.25;
      const rotation = Math.random() * Math.PI;
      const tilt = (Math.random() - 0.5) * 0.3;
      
      const matrix = BABYLON.Matrix.Compose(
        new BABYLON.Vector3(0.8 + Math.random() * 0.4, height / 0.4, 1),
        BABYLON.Quaternion.FromEulerAngles(tilt, rotation, 0),
        new BABYLON.Vector3(x, height * 0.5, z)
      );
      matrices.push(matrix);
    }
    
    if (matrices.length > 0) {
      patchMesh.thinInstanceSetBuffer('matrix', new Float32Array(matrices.length * 16), 16);
      matrices.forEach((m, i) => {
        patchMesh.thinInstanceSetMatrixAt(i, m);
      });
      grassPatches.push(patchMesh);
    }
  }
  
  // Store original matrices for wind animation
  const originalMatrices: BABYLON.Matrix[][] = [];
  
  grassPatches.forEach((patch) => {
    const matrices: BABYLON.Matrix[] = [];
    const count = patch.thinInstanceCount;
    const buffer = patch.thinInstanceGetWorldMatrices();
    for (let i = 0; i < count; i++) {
      matrices.push(buffer[i].clone());
    }
    originalMatrices.push(matrices);
  });
  
  // Animate grass with wind effect using rotation on the whole patch
  let windTime = 0;
  scene.onBeforeRenderObservable.add(() => {
    windTime += scene.getEngine().getDeltaTime() * 0.001;
    
    // Subtle wind sway by rotating entire patches slightly
    grassPatches.forEach((patch, patchIndex) => {
      const windStrength = 0.06;
      const windFreq = 1.5;
      const sway = Math.sin(windTime * windFreq + patchIndex * 0.5) * windStrength;
      
      patch.rotation.x = sway;
      patch.rotation.z = Math.cos(windTime * windFreq * 0.7 + patchIndex) * windStrength * 0.5;
    });
  });
}

function createSimpleTree(
  scene: BABYLON.Scene, 
  x: number, 
  z: number, 
  shadowGenerator: BABYLON.ShadowGenerator,
  index: number
): void {
  const trunkHeight = 2 + Math.random() * 1.5;
  const trunkRadius = 0.15 + Math.random() * 0.1;
  const foliageRadius = 1.5 + Math.random() * 1;
  
  // Trunk
  const trunk = BABYLON.MeshBuilder.CreateCylinder(`treeTrunk_${index}`, {
    height: trunkHeight,
    diameter: trunkRadius * 2
  }, scene);
  trunk.position = new BABYLON.Vector3(x, trunkHeight / 2, z);
  
  const trunkMaterial = new BABYLON.StandardMaterial(`trunkMat_${index}`, scene);
  trunkMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.25, 0.15);
  trunk.material = trunkMaterial;
  
  // Foliage (multiple spheres for fuller look)
  const foliage = BABYLON.MeshBuilder.CreateSphere(`treeFoliage_${index}`, {
    diameter: foliageRadius * 2,
    segments: 8
  }, scene);
  foliage.position = new BABYLON.Vector3(x, trunkHeight + foliageRadius * 0.6, z);
  
  const foliageMaterial = new BABYLON.StandardMaterial(`foliageMat_${index}`, scene);
  const greenShade = 0.3 + Math.random() * 0.2;
  foliageMaterial.diffuseColor = new BABYLON.Color3(0.2, greenShade, 0.15);
  foliage.material = foliageMaterial;
  
  // Add to shadow casters
  shadowGenerator.addShadowCaster(trunk);
  shadowGenerator.addShadowCaster(foliage);
}

function createRock(
  scene: BABYLON.Scene, 
  x: number, 
  z: number, 
  shadowGenerator: BABYLON.ShadowGenerator,
  index: number
): void {
  const size = 0.3 + Math.random() * 0.5;
  
  const rock = BABYLON.MeshBuilder.CreatePolyhedron(`rock_${index}`, {
    type: Math.floor(Math.random() * 3),
    size: size
  }, scene);
  rock.position = new BABYLON.Vector3(x, size * 0.4, z);
  rock.rotation = new BABYLON.Vector3(
    Math.random() * Math.PI,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI
  );
  
  const rockMaterial = new BABYLON.StandardMaterial(`rockMat_${index}`, scene);
  const grayShade = 0.3 + Math.random() * 0.2;
  rockMaterial.diffuseColor = new BABYLON.Color3(grayShade, grayShade * 0.95, grayShade * 0.9);
  rock.material = rockMaterial;
  
  shadowGenerator.addShadowCaster(rock);
}

export function setupPlayModeEnvironment(scene: BABYLON.Scene): void {
  // Check if grass environment already exists
  const existingGrassGround = scene.getMeshByName('grassGround');
  if (existingGrassGround) {
    console.log('[GrassEnvironment] Environment already exists');
    return;
  }
  
  // Hide any existing ground objects to prevent z-fighting
  scene.meshes.forEach(mesh => {
    const name = mesh.name.toLowerCase();
    if (name === 'ground' || name.includes('ground-') || name === 'floor' || name === 'terrain') {
      mesh.isVisible = false;
      console.log(`[GrassEnvironment] Hiding existing ground: ${mesh.name}`);
    }
  });
  
  createGrassEnvironment({ scene });
}
