import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import * as BABYLON from '@babylonjs/core';
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight,
  MeshBuilder, Vector3, Color3, Color4, StandardMaterial, PointLight,
  TransformNode, GizmoManager, DefaultRenderingPipeline, SceneLoader,
  PBRMaterial, CubeTexture, ShadowGenerator
} from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials';
import '@babylonjs/loaders/glTF';
import '@babylonjs/loaders/OBJ';
import '@babylonjs/loaders/STL';
import '@babylonjs/inspector';
import { useEngineStore } from '@/lib/engine-store';
import { CharacterController } from '@/lib/character-controller';
import { WarriorPlayerController } from '@/lib/warrior-controller';
import { createParticleManager } from '@/lib/particle-system';
import { createAudioManager } from '@/lib/audio-manager';
import { configureSkeletonAnimations } from '@/lib/skeleton-animation-setup';

interface Params {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  engineRef: MutableRefObject<Engine | null>;
  sceneRef: MutableRefObject<Scene | null>;
  gizmoManagerRef: MutableRefObject<GizmoManager | null>;
  meshMapRef: MutableRefObject<Map<string, BABYLON.AbstractMesh | BABYLON.TransformNode>>;
  gizmoMeshRef: MutableRefObject<Map<string, BABYLON.AbstractMesh>>;
  animationGroupsRef: MutableRefObject<Map<string, BABYLON.AnimationGroup[]>>;
  shadowGeneratorRef: MutableRefObject<ShadowGenerator | null>;
  controllerRef: MutableRefObject<CharacterController | WarriorPlayerController | null>;
  renderPipelineRef: MutableRefObject<DefaultRenderingPipeline | null>;
  setFps: React.Dispatch<React.SetStateAction<number>>;
  setDrawCalls: React.Dispatch<React.SetStateAction<number>>;
  setVertices: React.Dispatch<React.SetStateAction<number>>;
  setWebGLError: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedMeshName: React.Dispatch<React.SetStateAction<string | null>>;
  setLoadingModels: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useViewportScene({
  canvasRef, engineRef, sceneRef, gizmoManagerRef, meshMapRef, gizmoMeshRef,
  animationGroupsRef, shadowGeneratorRef, controllerRef, renderPipelineRef,
  setFps, setDrawCalls, setVertices, setWebGLError, setSelectedMeshName, setLoadingModels
}: Params) {
  const {
    project, currentSceneId, showGrid, getCurrentScene,
    selectObject, addConsoleLog, registerAnimations, registerMeshCount, setEngineMetrics
  } = useEngineStore();

  useEffect(() => {
    if (!canvasRef.current) return;

    let engine: Engine;
    try {
      // Disable dynamic shader loading to avoid module resolution issues
      (BABYLON as any).ShaderStore.ShadersRepositoryEnabled = false;
      
      engine = new Engine(canvasRef.current, true, {
        preserveDrawingBuffer: false, stencil: false, antialias: true,
        adaptToDeviceRatio: false, doNotHandleContextLost: false,
      });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      engine.setHardwareScalingLevel(1 / dpr);
      engine.enableOfflineSupport = false;
      engineRef.current = engine;
    } catch {
      setWebGLError('Failed to initialize Babylon.js engine. WebGL may not be supported.');
      return;
    }

    if (!engine) {
      setWebGLError('WebGL is not supported in this environment.');
      return;
    }

    const scene = new Scene(engine, { useFloatingOrigin: true });
    scene.clearColor = new Color4(0.12, 0.12, 0.16, 1);
    scene.autoClear = true;
    scene.autoClearDepthAndStencil = true;
    scene.useRightHandedSystem = false;
    scene.skipFrustumClipping = false;
    scene.blockMaterialDirtyMechanism = false;
    scene.ambientColor = new Color3(0.3, 0.3, 0.35);
    sceneRef.current = scene;

    const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 15, Vector3.Zero(), scene);
    camera.attachControl(canvasRef.current, true);
    camera.wheelPrecision = 50;
    camera.minZ = 0.1;
    camera.maxZ = 2000;
    camera.panningSensibility = 100;
    camera.lowerRadiusLimit = 0.5;
    camera.upperRadiusLimit = 500;

    const light = new HemisphericLight('hemisphericLight', new Vector3(0, 1, 0), scene);
    light.intensity = 1.2;
    light.diffuse = new Color3(1, 1, 1);
    light.specular = new Color3(0.5, 0.5, 0.5);
    light.groundColor = new Color3(0.4, 0.4, 0.45);

    const dirLight = new DirectionalLight('directionalLight', new Vector3(-1, -2, -1), scene);
    dirLight.intensity = 1.5;
    dirLight.diffuse = new Color3(1, 0.98, 0.95);
    dirLight.specular = new Color3(1, 1, 1);
    dirLight.position = new Vector3(10, 20, 10);

    scene.environmentIntensity = 0.9;
    try {
      const envTexture = CubeTexture.CreateFromPrefilteredData(
        "https://assets.babylonjs.com/environments/environmentSpecular.env", scene
      );
      scene.environmentTexture = envTexture;
    } catch { }

    const shadowGenerator = new ShadowGenerator(512, dirLight);
    shadowGenerator.usePoissonSampling = true;
    shadowGenerator.darkness = 0.35;
    shadowGenerator.transparencyShadow = true;
    shadowGeneratorRef.current = shadowGenerator;

    createParticleManager(scene);
    createAudioManager(scene);

    const gizmoManager = new GizmoManager(scene);
    gizmoManager.positionGizmoEnabled = true;
    gizmoManager.rotationGizmoEnabled = false;
    gizmoManager.scaleGizmoEnabled = false;
    gizmoManager.boundingBoxGizmoEnabled = false;
    gizmoManager.usePointerToAttachGizmos = false;
    if (gizmoManager.gizmos.positionGizmo) gizmoManager.gizmos.positionGizmo.scaleRatio = 1.2;
    if (gizmoManager.gizmos.rotationGizmo) gizmoManager.gizmos.rotationGizmo.scaleRatio = 1.2;
    if (gizmoManager.gizmos.scaleGizmo) gizmoManager.gizmos.scaleGizmo.scaleRatio = 1.2;
    gizmoManagerRef.current = gizmoManager;

    gizmoManager.onAttachedToMeshObservable.add((mesh) => {
      if (mesh) {
        const metadata = mesh.metadata as { gameObjectId?: string } | null;
        const objectId = metadata?.gameObjectId || mesh.name;
        setSelectedMeshName(mesh.name);
        selectObject(objectId);
        addConsoleLog({ type: 'info', message: `Selected: ${mesh.name}`, source: 'Viewport' });
      } else {
        setSelectedMeshName(null);
        selectObject(null);
      }
    });

    scene.onPointerDown = (evt, pickInfo) => {
      if (evt.button !== 0) return;
      if (pickInfo.hit && pickInfo.pickedMesh) {
        const pickedMesh = pickInfo.pickedMesh;
        if (pickedMesh.name === 'grid' || !pickedMesh.isPickable) return;
        let objectId: string | null = null;
        let currentNode: BABYLON.Node | null = pickedMesh;
        while (currentNode && !objectId) {
          const metadata = currentNode.metadata as { gameObjectId?: string } | null;
          if (metadata?.gameObjectId) objectId = metadata.gameObjectId;
          currentNode = currentNode.parent;
        }
        if (objectId) {
          selectObject(objectId);
          setSelectedMeshName(pickedMesh.name);
        }
      }
    };

    if (showGrid) {
      const ground = MeshBuilder.CreateGround('grid', { width: 20, height: 20, subdivisions: 20 }, scene);
      const gridMaterial = new GridMaterial('gridMaterial', scene);
      gridMaterial.majorUnitFrequency = 5;
      gridMaterial.minorUnitVisibility = 0.4;
      gridMaterial.gridRatio = 1;
      gridMaterial.backFaceCulling = false;
      gridMaterial.mainColor = new Color3(0.3, 0.3, 0.35);
      gridMaterial.lineColor = new Color3(0.5, 0.5, 0.55);
      gridMaterial.opacity = 0.8;
      ground.material = gridMaterial;
      ground.receiveShadows = true;
      ground.isPickable = false;
    }

    const sceneData = getCurrentScene();
    const transformNodes = new Map<string, TransformNode>();

    if (sceneData) {
      sceneData.objects.forEach((obj: any) => {
        const meshComp = obj.components.find((c: any) => c.type === 'mesh');
        const materialComp = obj.components.find((c: any) => c.type === 'material');
        const lightComp = obj.components.find((c: any) => c.type === 'light');
        const controllerComp = obj.components.find((c: any) => c.type === 'controller');
        const animatorComp = obj.components.find((c: any) => c.type === 'animator');

        const existingNode = scene.getNodeByName(obj.id) || scene.getMeshByName(obj.id);
        if (existingNode) existingNode.dispose();

        const rootNode = new TransformNode(obj.id, scene);
        rootNode.position = new Vector3(obj.transform.position.x, obj.transform.position.y, obj.transform.position.z);
        rootNode.rotation = new Vector3(
          obj.transform.rotation.x * Math.PI / 180,
          obj.transform.rotation.y * Math.PI / 180,
          obj.transform.rotation.z * Math.PI / 180
        );
        rootNode.scaling = new Vector3(obj.transform.scale.x, obj.transform.scale.y, obj.transform.scale.z);
        const meshModelPath = meshComp?.properties?.modelPath || '';
        rootNode.metadata = {
          gameObjectId: obj.id, tags: obj.tags || [], layer: obj.layer || 0,
          hasController: !!controllerComp, hasAnimator: !!animatorComp, modelPath: meshModelPath,
        };
        transformNodes.set(obj.id, rootNode);

        if (meshComp && meshComp.properties.type) {
          const meshType = meshComp.properties.type;
          if (meshType === 'imported' && meshComp.properties.modelPath) {
            const modelPath = meshComp.properties.modelPath;
            const folder = modelPath.substring(0, modelPath.lastIndexOf('/') + 1);
            const filename = modelPath.substring(modelPath.lastIndexOf('/') + 1);
            const loadStartTime = performance.now();
            setLoadingModels(prev => [...prev, obj.name]);
            addConsoleLog({ type: 'info', message: `Loading model: ${obj.name}...`, source: 'Viewport' });

            SceneLoader.ImportMeshAsync('', folder, filename, scene).then((result) => {
              const loadDuration = (performance.now() - loadStartTime).toFixed(2);
              if (result.meshes.length > 0) {
                const importedRoot = result.meshes[0];
                importedRoot.setParent(rootNode);
                importedRoot.position = Vector3.Zero();
                importedRoot.rotation = Vector3.Zero();
                importedRoot.scaling = Vector3.One();
                result.meshes.forEach(m => {
                  m.metadata = rootNode.metadata;
                  m.isVisible = obj.visible;
                  m.receiveShadows = true;
                  if (shadowGeneratorRef.current && m.getTotalVertices() > 0) {
                    shadowGeneratorRef.current.addShadowCaster(m);
                  }
                });
                meshMapRef.current.set(obj.id, rootNode as any);
                const firstMesh = result.meshes.find(m => m.getTotalVertices() > 0);
                if (firstMesh) gizmoMeshRef.current.set(obj.id, firstMesh);
                const meshCount = result.meshes.length;
                const vertexCount = result.meshes.reduce((acc, m) => acc + (m.getTotalVertices?.() || 0), 0);
                if (result.skeletons && result.skeletons.length > 0) {
                  result.skeletons.forEach(skeleton => {
                    configureSkeletonAnimations(skeleton, {
                      enableBlending: true,
                      blendingSpeed: 0.07,
                      loopMode: BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
                    });
                  });
                }
                if (result.animationGroups && result.animationGroups.length > 0) {
                  const animationNames = result.animationGroups.map(ag => ag.name);
                  registerAnimations(obj.id, animationNames);
                  animationGroupsRef.current.set(obj.id, result.animationGroups);
                  if (!scene.animationPropertiesOverride) {
                    scene.animationPropertiesOverride = new BABYLON.AnimationPropertiesOverride();
                    scene.animationPropertiesOverride.enableBlending = true;
                    scene.animationPropertiesOverride.blendingSpeed = 0.05;
                  }
                  result.animationGroups.forEach(ag => { ag.loopAnimation = true; ag.stop(); });
                  addConsoleLog({ type: 'info', message: `Found ${animationNames.length} animations: ${animationNames.join(', ')}`, source: 'Animation' });
                }
                if (meshCount > 1) registerMeshCount(obj.id, meshCount);
                addConsoleLog({ type: 'info', message: `Loaded model: ${obj.name} (${loadDuration}ms, ${meshCount} meshes, ${vertexCount.toLocaleString()} vertices)`, source: 'Viewport' });
              }
              setLoadingModels(prev => prev.filter(n => n !== obj.name));
            }).catch((err) => {
              const loadDuration = (performance.now() - loadStartTime).toFixed(2);
              addConsoleLog({ type: 'error', message: `Failed to load model ${modelPath} after ${loadDuration}ms: ${err.message}`, source: 'Viewport' });
              setLoadingModels(prev => prev.filter(n => n !== obj.name));
            });
          } else {
            let mesh: BABYLON.Mesh | undefined;
            const meshName = `${obj.id}_mesh`;
            switch (meshType) {
              case 'box': case 'cube': mesh = MeshBuilder.CreateBox(meshName, { size: 1 }, scene); break;
              case 'sphere': mesh = MeshBuilder.CreateSphere(meshName, { diameter: 1, segments: 32 }, scene); break;
              case 'cylinder': mesh = MeshBuilder.CreateCylinder(meshName, { height: 1, diameter: 1 }, scene); break;
              case 'capsule': mesh = MeshBuilder.CreateCapsule(meshName, { radius: 0.5, height: 2 }, scene); break;
              case 'plane': mesh = MeshBuilder.CreateGround(meshName, { width: 1, height: 1 }, scene); break;
              case 'cone': mesh = MeshBuilder.CreateCylinder(meshName, { height: 1, diameterTop: 0, diameterBottom: 1 }, scene); break;
              case 'torus': mesh = MeshBuilder.CreateTorus(meshName, { diameter: 1, thickness: 0.3 }, scene); break;
              default: return;
            }
            if (!mesh) return;
            mesh.setParent(rootNode);
            mesh.position = Vector3.Zero();
            mesh.rotation = Vector3.Zero();
            mesh.scaling = Vector3.One();

            if (materialComp && materialComp.properties) {
              const matProps = materialComp.properties;
              if ((matProps.type || 'pbr') === 'pbr') {
                const pbrMat = new PBRMaterial(`${obj.id}_mat`, scene);
                const c = matProps.albedoColor || '#6366f1';
                pbrMat.albedoColor = new Color3(parseInt(c.slice(1,3),16)/255, parseInt(c.slice(3,5),16)/255, parseInt(c.slice(5,7),16)/255);
                pbrMat.metallic = matProps.metallic !== undefined ? matProps.metallic : 0;
                pbrMat.roughness = matProps.roughness !== undefined ? matProps.roughness : 0.5;
                if (matProps.emissiveColor && matProps.emissiveColor !== '#000000') {
                  const ec = matProps.emissiveColor;
                  pbrMat.emissiveColor = new Color3(parseInt(ec.slice(1,3),16)/255, parseInt(ec.slice(3,5),16)/255, parseInt(ec.slice(5,7),16)/255);
                  pbrMat.emissiveIntensity = matProps.emissiveIntensity || 1;
                }
                if (matProps.twoSided) pbrMat.backFaceCulling = false;
                mesh.material = pbrMat;
              } else {
                const stdMat = new StandardMaterial(`${obj.id}_mat`, scene);
                const c = matProps.albedoColor || '#6366f1';
                stdMat.diffuseColor = new Color3(parseInt(c.slice(1,3),16)/255, parseInt(c.slice(3,5),16)/255, parseInt(c.slice(5,7),16)/255);
                stdMat.specularColor = new Color3(0.2, 0.2, 0.2);
                mesh.material = stdMat;
              }
            } else {
              const material = new StandardMaterial(`${obj.id}_mat`, scene);
              const color = meshComp.properties.color || '#6366f1';
              material.diffuseColor = new Color3(parseInt(color.slice(1,3),16)/255, parseInt(color.slice(3,5),16)/255, parseInt(color.slice(5,7),16)/255);
              material.specularColor = new Color3(0.2, 0.2, 0.2);
              mesh.material = material;
            }
            mesh.receiveShadows = meshComp.properties.receiveShadow !== false;
            if (meshComp.properties.castShadow !== false && shadowGeneratorRef.current) {
              shadowGeneratorRef.current.addShadowCaster(mesh);
            }
            mesh.isVisible = obj.visible;
            mesh.metadata = rootNode.metadata;
            meshMapRef.current.set(obj.id, rootNode as any);
            gizmoMeshRef.current.set(obj.id, mesh);
          }
        }

        if (lightComp) {
          const lightType = lightComp.properties.type || 'point';
          let sceneLight;
          if (lightType === 'point') {
            sceneLight = new PointLight(`${obj.id}_light`, new Vector3(0, 0, 0), scene);
            sceneLight.parent = rootNode;
          } else {
            sceneLight = new DirectionalLight(`${obj.id}_light`, new Vector3(obj.transform.rotation.x, obj.transform.rotation.y, obj.transform.rotation.z).normalize(), scene);
          }
          sceneLight.intensity = lightComp.properties.intensity || 1;
          const color = lightComp.properties.color || '#ffffff';
          sceneLight.diffuse = new Color3(parseInt(color.slice(1,3),16)/255, parseInt(color.slice(3,5),16)/255, parseInt(color.slice(5,7),16)/255);
        }
      });

      sceneData.objects.forEach((obj: any) => {
        if (obj.parentId) {
          const childNode = transformNodes.get(obj.id);
          const parentNode = transformNodes.get(obj.parentId);
          if (childNode && parentNode) childNode.setParent(parentNode);
        }
      });
    }

    const pipeline = new DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
    pipeline.samples = 4;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.95;
    pipeline.bloomWeight = 0.08;
    pipeline.bloomKernel = 32;
    pipeline.bloomScale = 0.4;
    pipeline.fxaaEnabled = true;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    pipeline.imageProcessing.contrast = 1.05;
    pipeline.imageProcessing.exposure = 1.0;
    renderPipelineRef.current = pipeline;

    const resizeObserver = new ResizeObserver(() => { engine.resize(); });
    if (canvasRef.current) resizeObserver.observe(canvasRef.current);

    engine.runRenderLoop(() => {
      if (scene.activeCamera) scene.render();
    });

    const metricsInterval = setInterval(() => {
      const eng = engineRef.current;
      const sc = sceneRef.current;
      if (!eng || !sc) return;
      const activeMeshes = sc.getActiveMeshes();
      let totalVerts = 0, totalTris = 0;
      activeMeshes.forEach((m: BABYLON.AbstractMesh) => {
        totalVerts += m.getTotalVertices?.() || 0;
        totalTris += (m.getTotalIndices?.() || 0) / 3;
      });
      const memMB = ((window.performance as any).memory?.usedJSHeapSize || 0) / 1048576;
      setEngineMetrics({
        fps: Math.round(eng.getFps()), drawCalls: activeMeshes.length,
        vertices: totalVerts, triangles: Math.round(totalTris),
        renderMs: Math.round(eng.getDeltaTime()), memoryMB: Math.round(memMB),
      });
      setFps(Math.round(eng.getFps()));
      setDrawCalls(activeMeshes.length);
      setVertices(totalVerts);
    }, 1000);

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);
    addConsoleLog({ type: 'info', message: 'Viewport initialized', source: 'Renderer' });

    return () => {
      clearInterval(metricsInterval);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (shadowGeneratorRef.current) { shadowGeneratorRef.current.dispose(); shadowGeneratorRef.current = null; }
      if (controllerRef.current) { controllerRef.current.dispose(); controllerRef.current = null; }
      scene.dispose();
      engine.dispose();
    };
  }, [project?.id, currentSceneId, showGrid]);
}
