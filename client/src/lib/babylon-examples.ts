import * as BABYLON from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials';
import * as GUI from '@babylonjs/gui';

export interface SceneExample {
  id: string;
  name: string;
  category: string;
  description: string;
  create: (scene: BABYLON.Scene) => void;
}

export const BABYLON_EXAMPLES: SceneExample[] = [
  {
    id: 'basic-primitives',
    name: 'Basic Primitives',
    category: 'Basics',
    description: 'Create box, sphere, cylinder, ground primitives',
    create: (scene) => {
      const box = BABYLON.MeshBuilder.CreateBox("box", { size: 1 }, scene);
      box.position.x = -2;
      box.position.y = 0.5;
      
      const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
      sphere.position.y = 0.5;
      
      const cylinder = BABYLON.MeshBuilder.CreateCylinder("cylinder", { height: 1, diameter: 0.8 }, scene);
      cylinder.position.x = 2;
      cylinder.position.y = 0.5;
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
      const gridMat = new GridMaterial("gridMat", scene);
      gridMat.majorUnitFrequency = 5;
      gridMat.gridRatio = 0.5;
      ground.material = gridMat;
    }
  },
  {
    id: 'pbr-materials',
    name: 'PBR Materials',
    category: 'Materials',
    description: 'Physically based rendering materials with metallic and roughness',
    create: (scene) => {
      const spheres: BABYLON.Mesh[] = [];
      for (let i = 0; i < 5; i++) {
        const sphere = BABYLON.MeshBuilder.CreateSphere(`sphere${i}`, { diameter: 1 }, scene);
        sphere.position.x = (i - 2) * 1.5;
        sphere.position.y = 0.5;
        
        const pbr = new BABYLON.PBRMaterial(`pbr${i}`, scene);
        pbr.metallic = i / 4;
        pbr.roughness = 1 - (i / 4);
        pbr.albedoColor = new BABYLON.Color3(0.8, 0.2, 0.2);
        sphere.material = pbr;
        spheres.push(sphere);
      }
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 12, height: 6 }, scene);
      const groundMat = new BABYLON.PBRMaterial("groundMat", scene);
      groundMat.albedoColor = new BABYLON.Color3(0.2, 0.2, 0.2);
      groundMat.metallic = 0;
      groundMat.roughness = 0.8;
      ground.material = groundMat;
    }
  },
  {
    id: 'animated-rotation',
    name: 'Animated Rotation',
    category: 'Animation',
    description: 'Continuous mesh rotation using beforeRender',
    create: (scene) => {
      const box = BABYLON.MeshBuilder.CreateBox("animBox", { size: 1.5 }, scene);
      box.position.y = 1;
      
      const mat = new BABYLON.StandardMaterial("animMat", scene);
      mat.emissiveColor = new BABYLON.Color3(0.2, 0.5, 0.8);
      mat.diffuseColor = new BABYLON.Color3(0.4, 0.7, 1);
      box.material = mat;
      
      scene.registerBeforeRender(() => {
        box.rotation.y += 0.01;
        box.rotation.x += 0.005;
      });
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);
    }
  },
  {
    id: 'particle-system',
    name: 'Particle System',
    category: 'Effects',
    description: 'Fire-like particle effect with custom emitter',
    create: (scene) => {
      const emitter = BABYLON.MeshBuilder.CreateSphere("emitter", { diameter: 0.5 }, scene);
      emitter.position.y = 0.25;
      emitter.isVisible = false;
      
      const particleSystem = new BABYLON.ParticleSystem("particles", 2000, scene);
      particleSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
      particleSystem.emitter = emitter;
      particleSystem.minEmitBox = new BABYLON.Vector3(-0.1, 0, -0.1);
      particleSystem.maxEmitBox = new BABYLON.Vector3(0.1, 0, 0.1);
      
      particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
      particleSystem.color2 = new BABYLON.Color4(1, 0.2, 0, 1);
      particleSystem.colorDead = new BABYLON.Color4(0.2, 0, 0, 0);
      
      particleSystem.minSize = 0.1;
      particleSystem.maxSize = 0.5;
      particleSystem.minLifeTime = 0.3;
      particleSystem.maxLifeTime = 1.5;
      particleSystem.emitRate = 500;
      
      particleSystem.direction1 = new BABYLON.Vector3(-0.5, 1, -0.5);
      particleSystem.direction2 = new BABYLON.Vector3(0.5, 2, 0.5);
      particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
      
      particleSystem.start();
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);
    }
  },
  {
    id: 'point-light-shadows',
    name: 'Point Light + Shadows',
    category: 'Lighting',
    description: 'Dynamic shadows with point light source',
    create: (scene) => {
      const light = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(0, 4, 0), scene);
      light.intensity = 1;
      light.diffuse = new BABYLON.Color3(1, 0.9, 0.7);
      
      const shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
      shadowGenerator.useBlurExponentialShadowMap = true;
      
      const box = BABYLON.MeshBuilder.CreateBox("box", { size: 1 }, scene);
      box.position.y = 0.5;
      shadowGenerator.addShadowCaster(box);
      
      const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 0.8 }, scene);
      sphere.position = new BABYLON.Vector3(1.5, 0.4, 1);
      shadowGenerator.addShadowCaster(sphere);
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
      ground.receiveShadows = true;
      
      const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
      groundMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
      ground.material = groundMat;
      
      scene.registerBeforeRender(() => {
        light.position.x = Math.sin(Date.now() / 1000) * 3;
        light.position.z = Math.cos(Date.now() / 1000) * 3;
      });
    }
  },
  {
    id: 'glow-layer',
    name: 'Glow Layer Effect',
    category: 'Effects',
    description: 'Glowing materials using GlowLayer post-process',
    create: (scene) => {
      const gl = new BABYLON.GlowLayer("glow", scene);
      gl.intensity = 1.5;
      
      const colors = [
        new BABYLON.Color3(1, 0, 0),
        new BABYLON.Color3(0, 1, 0),
        new BABYLON.Color3(0, 0, 1),
        new BABYLON.Color3(1, 1, 0),
        new BABYLON.Color3(1, 0, 1),
      ];
      
      for (let i = 0; i < 5; i++) {
        const sphere = BABYLON.MeshBuilder.CreateSphere(`glowSphere${i}`, { diameter: 0.6 }, scene);
        sphere.position.x = (i - 2) * 1.5;
        sphere.position.y = 0.5;
        
        const mat = new BABYLON.StandardMaterial(`glowMat${i}`, scene);
        mat.emissiveColor = colors[i];
        sphere.material = mat;
      }
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 6 }, scene);
      const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
      groundMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.15);
      ground.material = groundMat;
    }
  },
  {
    id: 'action-manager',
    name: 'Action Manager',
    category: 'Interaction',
    description: 'Click to change color, hover effects',
    create: (scene) => {
      const boxes: BABYLON.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const box = BABYLON.MeshBuilder.CreateBox(`box${i}${j}`, { size: 0.8 }, scene);
          box.position = new BABYLON.Vector3((i - 1) * 1.2, 0.4, (j - 1) * 1.2);
          
          const mat = new BABYLON.StandardMaterial(`mat${i}${j}`, scene);
          mat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.5);
          box.material = mat;
          
          box.actionManager = new BABYLON.ActionManager(scene);
          
          box.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
              BABYLON.ActionManager.OnPickTrigger,
              () => {
                mat.diffuseColor = BABYLON.Color3.Random();
              }
            )
          );
          
          box.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
              BABYLON.ActionManager.OnPointerOverTrigger,
              () => {
                mat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.3);
              }
            )
          );
          
          box.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
              BABYLON.ActionManager.OnPointerOutTrigger,
              () => {
                mat.emissiveColor = BABYLON.Color3.Black();
              }
            )
          );
          
          boxes.push(box);
        }
      }
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);
    }
  },
  {
    id: 'arc-rotate-camera',
    name: 'Arc Rotate Camera',
    category: 'Cameras',
    description: 'Orbiting camera with zoom and pan controls',
    create: (scene) => {
      const existingCamera = scene.activeCamera;
      if (existingCamera) {
        existingCamera.dispose();
      }
      
      const camera = new BABYLON.ArcRotateCamera(
        "arcCam",
        Math.PI / 4,
        Math.PI / 3,
        10,
        new BABYLON.Vector3(0, 1, 0),
        scene
      );
      camera.lowerRadiusLimit = 2;
      camera.upperRadiusLimit = 20;
      camera.attachControl(scene.getEngine().getRenderingCanvas(), true);
      
      const box = BABYLON.MeshBuilder.CreateBox("target", { size: 2 }, scene);
      box.position.y = 1;
      
      const mat = new BABYLON.StandardMaterial("targetMat", scene);
      mat.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.8);
      box.material = mat;
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
      const gridMat = new GridMaterial("gridMat", scene);
      ground.material = gridMat;
    }
  },
  {
    id: 'physics-bouncing',
    name: 'Physics Bouncing',
    category: 'Physics',
    description: 'Bouncing spheres with physics engine',
    create: (scene) => {
      scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
      ground.physicsImpostor = new BABYLON.PhysicsImpostor(
        ground,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 0, restitution: 0.9 },
        scene
      );
      
      const createBall = (x: number, y: number, z: number) => {
        const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 0.5 }, scene);
        ball.position = new BABYLON.Vector3(x, y, z);
        
        const mat = new BABYLON.StandardMaterial("ballMat", scene);
        mat.diffuseColor = BABYLON.Color3.Random();
        ball.material = mat;
        
        ball.physicsImpostor = new BABYLON.PhysicsImpostor(
          ball,
          BABYLON.PhysicsImpostor.SphereImpostor,
          { mass: 1, restitution: 0.9 },
          scene
        );
      };
      
      for (let i = 0; i < 5; i++) {
        createBall(Math.random() * 4 - 2, 3 + i, Math.random() * 4 - 2);
      }
    }
  },
  {
    id: 'skybox',
    name: 'Skybox Environment',
    category: 'Environment',
    description: 'Cubemap skybox with reflection probe',
    create: (scene) => {
      const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000 }, scene);
      const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMat", scene);
      skyboxMaterial.backFaceCulling = false;
      skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(
        "https://playground.babylonjs.com/textures/skybox",
        scene
      );
      skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
      skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
      skybox.material = skyboxMaterial;
      
      const sphere = BABYLON.MeshBuilder.CreateSphere("reflectSphere", { diameter: 2 }, scene);
      sphere.position.y = 1;
      
      const reflectMat = new BABYLON.PBRMaterial("reflectMat", scene);
      reflectMat.metallic = 1;
      reflectMat.roughness = 0;
      reflectMat.reflectionTexture = new BABYLON.CubeTexture(
        "https://playground.babylonjs.com/textures/skybox",
        scene
      );
      sphere.material = reflectMat;
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
    }
  },
  {
    id: 'fog-effect',
    name: 'Volumetric Fog',
    category: 'Environment',
    description: 'Scene fog with adjustable density',
    create: (scene) => {
      scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
      scene.fogDensity = 0.05;
      scene.fogColor = new BABYLON.Color3(0.8, 0.85, 0.9);
      scene.clearColor = new BABYLON.Color4(0.8, 0.85, 0.9, 1);
      
      for (let i = 0; i < 20; i++) {
        const tree = BABYLON.MeshBuilder.CreateCylinder(`tree${i}`, { height: 2, diameterTop: 0, diameterBottom: 0.8 }, scene);
        tree.position = new BABYLON.Vector3(
          Math.random() * 20 - 10,
          1,
          Math.random() * 20 - 10
        );
        
        const treeMat = new BABYLON.StandardMaterial(`treeMat${i}`, scene);
        treeMat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.2);
        tree.material = treeMat;
      }
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 30, height: 30 }, scene);
      const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
      groundMat.diffuseColor = new BABYLON.Color3(0.4, 0.35, 0.3);
      ground.material = groundMat;
    }
  },
  {
    id: 'mesh-explosion',
    name: 'Mesh Explosion',
    category: 'Effects',
    description: 'Exploding mesh using solid particle system',
    create: (scene) => {
      const box = BABYLON.MeshBuilder.CreateBox("explodeBox", { size: 2 }, scene);
      box.position.y = 1;
      
      const mat = new BABYLON.StandardMaterial("explodeMat", scene);
      mat.diffuseColor = new BABYLON.Color3(0.8, 0.3, 0.1);
      box.material = mat;
      
      const SPS = new BABYLON.SolidParticleSystem("SPS", scene);
      const fragment = BABYLON.MeshBuilder.CreateBox("f", { size: 0.2 }, scene);
      SPS.addShape(fragment, 100);
      fragment.dispose();
      
      const mesh = SPS.buildMesh();
      mesh.material = mat;
      mesh.isVisible = false;
      
      let exploding = false;
      let time = 0;
      
      SPS.initParticles = () => {
        for (let p = 0; p < SPS.nbParticles; p++) {
          const particle = SPS.particles[p];
          particle.position = new BABYLON.Vector3(
            (Math.random() - 0.5) * 2,
            1 + (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          );
          particle.velocity = new BABYLON.Vector3(
            (Math.random() - 0.5) * 0.3,
            Math.random() * 0.2,
            (Math.random() - 0.5) * 0.3
          );
        }
      };
      
      SPS.updateParticle = (particle) => {
        if (exploding) {
          particle.position.addInPlace(particle.velocity);
          particle.velocity.y -= 0.01;
          particle.rotation.x += 0.1;
          particle.rotation.y += 0.05;
        }
        return particle;
      };
      
      SPS.initParticles();
      SPS.setParticles();
      
      box.actionManager = new BABYLON.ActionManager(scene);
      box.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnPickTrigger,
          () => {
            if (!exploding) {
              exploding = true;
              box.isVisible = false;
              mesh.isVisible = true;
              SPS.initParticles();
            }
          }
        )
      );
      
      scene.registerBeforeRender(() => {
        if (exploding) {
          SPS.setParticles();
          time++;
          if (time > 180) {
            exploding = false;
            time = 0;
            box.isVisible = true;
            mesh.isVisible = false;
          }
        }
      });
      
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
    }
  },
  {
    id: 'wasd-controller',
    name: 'WASD Character Controller',
    category: 'Gameplay',
    description: 'Basic first-person movement with WASD keys and mouse look',
    create: (scene) => {
      // Create a first-person camera
      const camera = new BABYLON.UniversalCamera("fpsCam", new BABYLON.Vector3(0, 2, -5), scene);
      camera.attachControl(scene.getEngine().getRenderingCanvas(), true);
      camera.speed = 0.5;
      camera.angularSensibility = 1000;
      
      // Set WASD keys
      camera.keysUp.push(87);    // W
      camera.keysDown.push(83);  // S
      camera.keysLeft.push(65);  // A
      camera.keysRight.push(68); // D
      
      // Create environment
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
      const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
      groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.2);
      ground.material = groundMat;
      ground.checkCollisions = true;
      
      // Add some obstacles
      for (let i = 0; i < 10; i++) {
        const box = BABYLON.MeshBuilder.CreateBox(`obstacle${i}`, { size: 2 }, scene);
        box.position = new BABYLON.Vector3(
          Math.random() * 30 - 15,
          1,
          Math.random() * 30 - 15
        );
        box.checkCollisions = true;
        
        const mat = new BABYLON.StandardMaterial(`obstMat${i}`, scene);
        mat.diffuseColor = BABYLON.Color3.Random();
        box.material = mat;
      }
      
      // Enable collisions
      scene.collisionsEnabled = true;
      camera.checkCollisions = true;
      camera.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
      
      // Gravity
      scene.gravity = new BABYLON.Vector3(0, -0.5, 0);
      camera.applyGravity = true;
    }
  },
  {
    id: 'day-night-cycle',
    name: 'Day/Night Cycle',
    category: 'Environment',
    description: 'Dynamic lighting that transitions between day and night',
    create: (scene) => {
      // Sun light
      const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0, -1, 0.5), scene);
      sun.intensity = 1;
      
      // Ambient light for night time
      const ambient = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
      ambient.intensity = 0.2;
      
      // Create simple skybox
      const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 500 }, scene);
      const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
      skyMat.backFaceCulling = false;
      skyMat.emissiveColor = new BABYLON.Color3(0.5, 0.7, 1);
      skyMat.disableLighting = true;
      skybox.material = skyMat;
      
      // Ground and objects
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 30, height: 30 }, scene);
      const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
      groundMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.2);
      ground.material = groundMat;
      
      // Add some buildings
      for (let i = 0; i < 5; i++) {
        const building = BABYLON.MeshBuilder.CreateBox(`building${i}`, { 
          width: 2, 
          height: 2 + Math.random() * 4, 
          depth: 2 
        }, scene);
        building.position = new BABYLON.Vector3(
          (i - 2) * 4,
          building.scaling.y,
          0
        );
      }
      
      let time = 0;
      scene.registerBeforeRender(() => {
        time += 0.005;
        
        // Sun rotation (day/night cycle)
        const sunAngle = time % (Math.PI * 2);
        sun.direction = new BABYLON.Vector3(
          Math.sin(sunAngle),
          -Math.abs(Math.cos(sunAngle)),
          0.3
        );
        
        // Adjust intensity based on sun position
        const dayFactor = Math.max(0, Math.cos(sunAngle));
        sun.intensity = dayFactor * 1.5;
        ambient.intensity = 0.1 + dayFactor * 0.2;
        
        // Sky color
        const dayColor = new BABYLON.Color3(0.5, 0.7, 1);
        const nightColor = new BABYLON.Color3(0.05, 0.05, 0.15);
        skyMat.emissiveColor = BABYLON.Color3.Lerp(nightColor, dayColor, dayFactor);
        
        // Sun color (warm at sunrise/sunset)
        const midday = Math.abs(Math.sin(sunAngle));
        sun.diffuse = BABYLON.Color3.Lerp(
          new BABYLON.Color3(1, 0.5, 0.3),
          new BABYLON.Color3(1, 1, 0.9),
          midday
        );
      });
    }
  },
  {
    id: 'sprite-billboard',
    name: 'Sprite Billboard System',
    category: 'Effects',
    description: '2D sprites that always face the camera - perfect for UI markers or 2D characters',
    create: (scene) => {
      // Create sprite manager
      const spriteManager = new BABYLON.SpriteManager(
        "playerManager",
        "https://playground.babylonjs.com/textures/player.png",
        10,
        { width: 64, height: 64 },
        scene
      );
      
      // Create sprites in a circle
      const sprites: BABYLON.Sprite[] = [];
      for (let i = 0; i < 8; i++) {
        const sprite = new BABYLON.Sprite(`sprite${i}`, spriteManager);
        const angle = (i / 8) * Math.PI * 2;
        sprite.position = new BABYLON.Vector3(
          Math.cos(angle) * 3,
          1,
          Math.sin(angle) * 3
        );
        sprite.size = 1.5;
        sprites.push(sprite);
      }
      
      // Animate sprites
      scene.registerBeforeRender(() => {
        const time = Date.now() / 1000;
        sprites.forEach((sprite, i) => {
          // Bobbing animation
          sprite.position.y = 1 + Math.sin(time * 2 + i) * 0.2;
        });
      });
      
      // Ground for reference
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
      
      // Info text
      const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
      const text = new GUI.TextBlock();
      text.text = "Sprites always face the camera";
      text.color = "white";
      text.fontSize = 20;
      text.top = "-40%";
      advancedTexture.addControl(text);
    }
  },
  {
    id: 'procedural-terrain',
    name: 'Procedural Terrain',
    category: 'Environment',
    description: 'Generate terrain using noise functions with vertex colors',
    create: (scene) => {
      const terrainSize = 50;
      const subdivisions = 100;
      
      // Create terrain mesh
      const terrain = BABYLON.MeshBuilder.CreateGround("terrain", {
        width: terrainSize,
        height: terrainSize,
        subdivisions: subdivisions,
        updatable: true
      }, scene);
      
      // Get vertex positions
      const positions = terrain.getVerticesData(BABYLON.VertexBuffer.PositionKind) as Float32Array;
      const colors: number[] = [];
      
      // Simple noise function for height
      const noise = (x: number, z: number) => {
        const scale = 0.1;
        return (
          Math.sin(x * scale) * Math.cos(z * scale) * 2 +
          Math.sin(x * scale * 2.5) * Math.cos(z * scale * 2.5) * 0.5 +
          Math.sin(x * scale * 5) * Math.cos(z * scale * 5) * 0.25
        );
      };
      
      // Apply height and colors
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        const height = noise(x, z);
        positions[i + 1] = height;
        
        // Color based on height
        if (height < -0.5) {
          // Water (blue)
          colors.push(0.2, 0.4, 0.8, 1);
        } else if (height < 0.5) {
          // Grass (green)
          colors.push(0.3, 0.6, 0.2, 1);
        } else if (height < 1.5) {
          // Rock (gray)
          colors.push(0.5, 0.5, 0.45, 1);
        } else {
          // Snow (white)
          colors.push(0.95, 0.95, 1, 1);
        }
      }
      
      // Update mesh
      terrain.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
      terrain.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
      terrain.createNormals(true);
      
      // Material with vertex colors
      const mat = new BABYLON.StandardMaterial("terrainMat", scene);
      mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      terrain.material = mat;
      
      // Add trees on grass areas
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * terrainSize - terrainSize / 2;
        const z = Math.random() * terrainSize - terrainSize / 2;
        const height = noise(x, z);
        
        if (height > 0 && height < 0.5) {
          const tree = BABYLON.MeshBuilder.CreateCylinder(`tree${i}`, {
            height: 1.5,
            diameterTop: 0,
            diameterBottom: 0.8
          }, scene);
          tree.position = new BABYLON.Vector3(x, height + 0.75, z);
          
          const treeMat = new BABYLON.StandardMaterial(`treeMat${i}`, scene);
          treeMat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.1);
          tree.material = treeMat;
        }
      }
    }
  },
  {
    id: 'healthbar-ui',
    name: '3D Health Bar UI',
    category: 'Gameplay',
    description: 'Floating health bars above objects that always face camera',
    create: (scene) => {
      // Create enemies with health bars
      const enemies: { mesh: BABYLON.Mesh; health: number; maxHealth: number; bar: BABYLON.Mesh }[] = [];
      
      for (let i = 0; i < 4; i++) {
        // Enemy mesh
        const enemy = BABYLON.MeshBuilder.CreateCapsule(`enemy${i}`, {
          height: 2,
          radius: 0.4
        }, scene);
        enemy.position = new BABYLON.Vector3((i - 1.5) * 3, 1, 0);
        
        const mat = new BABYLON.StandardMaterial(`enemyMat${i}`, scene);
        mat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
        enemy.material = mat;
        
        // Health bar background
        const barBg = BABYLON.MeshBuilder.CreatePlane(`barBg${i}`, { width: 1.2, height: 0.15 }, scene);
        barBg.parent = enemy;
        barBg.position.y = 1.5;
        barBg.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const bgMat = new BABYLON.StandardMaterial(`bgMat${i}`, scene);
        bgMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        bgMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        barBg.material = bgMat;
        
        // Health bar fill
        const barFill = BABYLON.MeshBuilder.CreatePlane(`barFill${i}`, { width: 1.1, height: 0.1 }, scene);
        barFill.parent = enemy;
        barFill.position.y = 1.5;
        barFill.position.z = -0.01;
        barFill.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const fillMat = new BABYLON.StandardMaterial(`fillMat${i}`, scene);
        fillMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
        fillMat.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.1);
        barFill.material = fillMat;
        
        enemies.push({
          mesh: enemy,
          health: 100,
          maxHealth: 100,
          bar: barFill
        });
        
        // Click to damage
        enemy.actionManager = new BABYLON.ActionManager(scene);
        enemy.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            () => {
              const e = enemies[i];
              e.health = Math.max(0, e.health - 20);
              
              // Update bar scale
              const healthPercent = e.health / e.maxHealth;
              e.bar.scaling.x = healthPercent;
              e.bar.position.x = (1 - healthPercent) * -0.55;
              
              // Change color based on health
              const fillMat = e.bar.material as BABYLON.StandardMaterial;
              if (healthPercent > 0.5) {
                fillMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
              } else if (healthPercent > 0.25) {
                fillMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.2);
              } else {
                fillMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
              }
              
              // Reset if dead
              if (e.health <= 0) {
                setTimeout(() => {
                  e.health = e.maxHealth;
                  e.bar.scaling.x = 1;
                  e.bar.position.x = 0;
                  fillMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
                }, 1000);
              }
            }
          )
        );
      }
      
      // Ground
      const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 15, height: 10 }, scene);
      
      // Instructions
      const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
      const text = new GUI.TextBlock();
      text.text = "Click enemies to damage them";
      text.color = "white";
      text.fontSize = 18;
      text.top = "-40%";
      advancedTexture.addControl(text);
    }
  },
  {
    id: 'character-fight-scene',
    name: 'Character Fight Scene',
    category: 'Scenes',
    description: 'Complete fight scene with two armored knights, environment, trees, house, and combat animation',
    create: (scene) => {
      BABYLON.SceneLoader.ImportMeshAsync(
        '',
        '/assets/scenes/character_fight/',
        'scene.gltf',
        scene
      ).then((result) => {
        if (result.meshes.length > 0) {
          const root = result.meshes[0];
          root.name = 'CharacterFightScene';
          
          // Scale the scene appropriately
          root.scaling = new BABYLON.Vector3(1, 1, 1);
          root.position = new BABYLON.Vector3(0, 0, 0);
          
          // Set metadata for all meshes
          result.meshes.forEach(m => {
            m.metadata = {
              gameObjectId: root.id,
              tags: ['scene', 'imported'],
              layer: 0
            };
          });
          
          // Start the fight animation if available
          if (result.animationGroups && result.animationGroups.length > 0) {
            result.animationGroups.forEach(ag => {
              ag.start(true); // Loop all animations
            });
          }
          
          // Adjust camera to see the full scene
          const camera = scene.activeCamera as BABYLON.ArcRotateCamera;
          if (camera) {
            camera.alpha = -Math.PI / 4;
            camera.beta = Math.PI / 3;
            camera.radius = 15;
            camera.setTarget(new BABYLON.Vector3(0, 2, 0));
          }
        }
      }).catch((err) => {
        console.error('Failed to load Character Fight Scene:', err);
        // Create placeholder
        const placeholder = BABYLON.MeshBuilder.CreateBox('placeholder', { size: 2 }, scene);
        placeholder.position.y = 1;
        const mat = new BABYLON.StandardMaterial('errorMat', scene);
        mat.diffuseColor = new BABYLON.Color3(1, 0.3, 0.3);
        placeholder.material = mat;
      });
    }
  }
];

export function getExamplesByCategory(): Record<string, SceneExample[]> {
  const categories: Record<string, SceneExample[]> = {};
  BABYLON_EXAMPLES.forEach(example => {
    if (!categories[example.category]) {
      categories[example.category] = [];
    }
    categories[example.category].push(example);
  });
  return categories;
}

export function getExampleById(id: string): SceneExample | undefined {
  return BABYLON_EXAMPLES.find(e => e.id === id);
}
