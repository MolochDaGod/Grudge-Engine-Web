import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import * as BABYLON from '@babylonjs/core';
import { ArcRotateCamera, Vector3, SceneLoader, TransformNode } from '@babylonjs/core';
import { useEngineStore } from '@/lib/engine-store';
import { CharacterController } from '@/lib/character-controller';
import { WarriorPlayerController } from '@/lib/warrior-controller';

interface Params {
  sceneRef: MutableRefObject<BABYLON.Scene | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  meshMapRef: MutableRefObject<Map<string, BABYLON.AbstractMesh | BABYLON.TransformNode>>;
  gizmoMeshRef: MutableRefObject<Map<string, BABYLON.AbstractMesh>>;
  animationGroupsRef: MutableRefObject<Map<string, BABYLON.AnimationGroup[]>>;
  gizmoManagerRef: MutableRefObject<BABYLON.GizmoManager | null>;
  shadowGeneratorRef: MutableRefObject<BABYLON.ShadowGenerator | null>;
  controllerRef: MutableRefObject<CharacterController | WarriorPlayerController | null>;
  setSelectedMeshName: React.Dispatch<React.SetStateAction<string | null>>;
  setLoadingModels: React.Dispatch<React.SetStateAction<string[]>>;
  updateGizmoMode: (mode: 'select' | 'move' | 'rotate' | 'scale') => void;
}

export function useViewportEffects({
  sceneRef, canvasRef, meshMapRef, gizmoMeshRef, animationGroupsRef,
  gizmoManagerRef, shadowGeneratorRef, controllerRef, setSelectedMeshName,
  setLoadingModels, updateGizmoMode
}: Params) {
  const {
    selectedObjectId, selectObject, isPlaying, setPlaying, addConsoleLog,
    deleteGameObject, duplicateObject, pendingExample, clearPendingExample,
    pendingPresetSceneId, clearPresetScene, animationRegistry,
    lightingSettings, pendingViewportLoads, consumePendingViewportLoads,
    pendingFocusObjectId, clearPendingFocus, getCurrentScene, project,
    registerAnimations
  } = useEngineStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isPlaying) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          if (selectedObjectId) { duplicateObject(selectedObjectId); addConsoleLog({ type: 'info', message: 'Object duplicated', source: 'Scene' }); }
          return;
        }
      }
      switch (e.key.toLowerCase()) {
        case 'q': updateGizmoMode('select'); break;
        case 'w': updateGizmoMode('move'); break;
        case 'e': updateGizmoMode('rotate'); break;
        case 'r': updateGizmoMode('scale'); break;
        case 'delete': case 'backspace':
          if (selectedObjectId) { deleteGameObject(selectedObjectId); addConsoleLog({ type: 'info', message: 'Object deleted', source: 'Scene' }); selectObject(null); }
          break;
        case 'f':
          if (selectedObjectId && sceneRef.current) {
            const mesh = meshMapRef.current.get(selectedObjectId);
            const camera = sceneRef.current.activeCamera as BABYLON.ArcRotateCamera;
            if (mesh && camera) { camera.setTarget(mesh.position); addConsoleLog({ type: 'info', message: `Focused on ${(mesh as any).name || selectedObjectId}`, source: 'Viewport' }); }
          }
          break;
        case ' ': e.preventDefault(); setPlaying(!isPlaying); break;
        case 'escape': {
          const gm = gizmoManagerRef.current;
          if (gm) gm.attachToMesh(null);
          setSelectedMeshName(null);
          selectObject(null);
          break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [updateGizmoMode, selectObject, selectedObjectId, deleteGameObject, duplicateObject, addConsoleLog, setPlaying, isPlaying]);

  // Sync hierarchy selection to gizmo
  useEffect(() => {
    const gm = gizmoManagerRef.current;
    if (!gm || !sceneRef.current) return;
    if (selectedObjectId) {
      let mesh = gizmoMeshRef.current.get(selectedObjectId);
      if (!mesh) {
        const node = meshMapRef.current.get(selectedObjectId);
        if (node && 'getTotalVertices' in node) mesh = node as BABYLON.AbstractMesh;
      }
      if (mesh) gm.attachToMesh(mesh);
    } else {
      gm.attachToMesh(null);
    }
  }, [selectedObjectId]);

  // Handle pending example scenes
  useEffect(() => {
    if (pendingExample && sceneRef.current) {
      const scene = sceneRef.current;
      scene.meshes.filter(m => m.name !== 'grid' && m.name !== 'skyBox').forEach(mesh => mesh.dispose());
      scene.lights.filter(l => l.name !== 'hemisphericLight' && l.name !== 'directionalLight').forEach(light => light.dispose());
      try {
        pendingExample.create(scene);
        addConsoleLog({ type: 'info', message: `Example "${pendingExample.name}" applied to scene`, source: 'Examples' });
        const skipNames = new Set(['grid', 'skyBox', 'BackgroundHelper', 'BackgroundPlane', 'BackgroundSkybox']);
        const storeState = useEngineStore.getState();
        const storedIds = new Set((storeState.getCurrentScene()?.objects || []).map((o: any) => o.id));
        const exampleObjs: any[] = [];
        scene.meshes.forEach(mesh => {
          if (!mesh.parent && !skipNames.has(mesh.name) && !mesh.name.startsWith('__') && !storedIds.has(mesh.id) && !storedIds.has(mesh.name)) {
            exampleObjs.push({
              id: mesh.id || mesh.name, name: mesh.name || 'Mesh', visible: mesh.isVisible, isStatic: false,
              transform: { position: { x: +(mesh.position.x.toFixed(3)), y: +(mesh.position.y.toFixed(3)), z: +(mesh.position.z.toFixed(3)) }, rotation: { x: +(mesh.rotation.x.toFixed(3)), y: +(mesh.rotation.y.toFixed(3)), z: +(mesh.rotation.z.toFixed(3)) }, scale: { x: +(mesh.scaling.x.toFixed(3)), y: +(mesh.scaling.y.toFixed(3)), z: +(mesh.scaling.z.toFixed(3)) } },
              components: [{ id: crypto.randomUUID(), type: 'mesh', enabled: true, properties: { type: 'box', color: '#888888', castShadows: false, receiveShadows: true } }],
              children: [], parentId: null, tags: ['example'], layer: 0
            });
          }
        });
        if (exampleObjs.length > 0) {
          const scenes = storeState.project?.scenes || [];
          const scId = storeState.currentSceneId || scenes[0]?.id;
          const scIdx = scenes.findIndex((s: any) => s.id === scId);
          if (scIdx >= 0) {
            useEngineStore.setState(s => ({
              project: s.project ? { ...s.project, scenes: s.project.scenes.map((sc: any, i: number) => i === scIdx ? { ...sc, objects: [...(sc.objects || []), ...exampleObjs] } : sc) } : s.project
            }));
          }
        }
      } catch (error) {
        addConsoleLog({ type: 'error', message: `Failed to apply example: ${error}`, source: 'Examples' });
      }
      clearPendingExample();
    }
  }, [pendingExample]);

  // Handle pending preset/demo scenes
  useEffect(() => {
    if (pendingPresetSceneId && sceneRef.current && canvasRef.current) {
      const scene = sceneRef.current;
      const canvas = canvasRef.current;
      addConsoleLog({ type: 'info', message: `Loading demo scene: ${pendingPresetSceneId}...`, source: 'Scene' });
      import('@/lib/scene-builder').then(({ buildPlayableScene, PRESET_SCENES }) => {
        buildPlayableScene(scene, canvas, pendingPresetSceneId, (type: string, message: string) => {
          addConsoleLog({ type: type as any, message, source: 'Demo' });
        }).then(playable => {
          if (playable) {
            playable.start();
            const config = PRESET_SCENES.find((s: any) => s.id === pendingPresetSceneId);
            if (config) {
              const charactersGroupId = `demo-${config.id}-group-characters`;
              const environmentGroupId = `demo-${config.id}-group-environment`;
              const playerObj = { id: `demo-${config.id}-player`, name: config.player.modelPath.split('/').pop()?.replace(/\.(glb|gltf)$/i, '') || 'Player', visible: true, isStatic: false, transform: { position: config.player.position, rotation: config.player.rotation, scale: { x: config.player.scale, y: config.player.scale, z: config.player.scale } }, components: [{ id: `mesh-player-${config.id}`, type: 'mesh' as const, enabled: true, properties: { type: 'imported', modelPath: config.player.modelPath, castShadows: true, receiveShadows: true } }], children: [], parentId: null, tags: ['player', 'character'], layer: 0 };
              const npcObjs = config.npcs.map((npc: any) => ({ id: npc.id, name: npc.name, visible: true, isStatic: false, transform: { position: npc.position, rotation: npc.rotation, scale: { x: npc.scale, y: npc.scale, z: npc.scale } }, components: [{ id: `mesh-${npc.id}`, type: 'mesh' as const, enabled: true, properties: { type: 'imported', modelPath: npc.modelPath, castShadows: true, receiveShadows: true } }], children: [], parentId: config.npcs.length > 0 ? charactersGroupId : null, tags: ['npc', npc.type], layer: 0 }));
              const propObjs = config.props.map((prop: any) => ({ id: prop.id, name: prop.name, visible: true, isStatic: true, transform: { position: prop.position, rotation: prop.rotation, scale: prop.scale }, components: [{ id: `mesh-${prop.id}`, type: 'mesh' as const, enabled: true, properties: prop.modelPath ? { type: 'imported', modelPath: prop.modelPath, castShadows: prop.castShadow ?? true, receiveShadows: prop.receiveShadow ?? true } : { type: prop.primitiveType || 'box', color: prop.material?.color || '#888888', castShadows: prop.castShadow ?? false, receiveShadows: prop.receiveShadow ?? true } }], children: [], parentId: config.props.length > 0 ? environmentGroupId : null, tags: ['prop', 'environment'], layer: 0 }));
              const emptyTransform = { position: { x:0,y:0,z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 } };
              const charactersGroup = config.npcs.length > 0 ? { id: charactersGroupId, name: 'Characters', visible: true, isStatic: false, transform: emptyTransform, components: [], children: npcObjs.map((n: any) => n.id), parentId: null, tags: ['group'], layer: 0 } : null;
              const environmentGroup = config.props.length > 0 ? { id: environmentGroupId, name: 'Environment', visible: true, isStatic: true, transform: emptyTransform, components: [], children: propObjs.map((p: any) => p.id), parentId: null, tags: ['group'], layer: 0 } : null;
              const allObjs = [playerObj, ...(charactersGroup ? [charactersGroup] : []), ...npcObjs, ...(environmentGroup ? [environmentGroup] : []), ...propObjs];
              const storeState = useEngineStore.getState();
              const scenes = storeState.project?.scenes || [];
              const currentSceneId = storeState.currentSceneId || scenes[0]?.id;
              const sceneIdx = scenes.findIndex((s: any) => s.id === currentSceneId);
              if (sceneIdx >= 0 && storeState.project) {
                useEngineStore.setState(s => ({
                  project: s.project ? { ...s.project, scenes: s.project.scenes.map((sc: any, i: number) => i === sceneIdx ? { ...sc, name: config.name, objects: allObjs } : sc) } : s.project
                }));
                const registeredBabylonIds = new Set<string>(['player-mesh', 'grid', ...npcObjs.map((n: any) => n.id), ...propObjs.map((p: any) => p.id)]);
                const skipMeshNames = new Set(['grid', 'skyBox', 'BackgroundHelper', 'BackgroundPlane', 'BackgroundSkybox']);
                const terrainGroupId = `demo-${config.id}-terrain`;
                const terrainChildren: any[] = [];
                scene.meshes.forEach(mesh => {
                  if (!mesh.parent && !skipMeshNames.has(mesh.name) && !mesh.name.startsWith('__') && !registeredBabylonIds.has(mesh.id) && !registeredBabylonIds.has(mesh.name)) {
                    terrainChildren.push({ id: mesh.id || `terrain-${mesh.name}`, name: mesh.name || 'Terrain', visible: mesh.isVisible, isStatic: true, transform: { position: { x: +(mesh.position.x.toFixed(3)), y: +(mesh.position.y.toFixed(3)), z: +(mesh.position.z.toFixed(3)) }, rotation: { x: +(mesh.rotation.x.toFixed(3)), y: +(mesh.rotation.y.toFixed(3)), z: +(mesh.rotation.z.toFixed(3)) }, scale: { x: +(mesh.scaling.x.toFixed(3)), y: +(mesh.scaling.y.toFixed(3)), z: +(mesh.scaling.z.toFixed(3)) } }, components: [{ id: crypto.randomUUID(), type: 'mesh' as const, enabled: true, properties: { type: 'box', color: '#888888', castShadows: false, receiveShadows: true } }], children: [] as string[], parentId: terrainGroupId, tags: ['terrain', 'static'], layer: 7 });
                  }
                });
                scene.transformNodes.forEach(node => {
                  if (!node.parent && !node.name.startsWith('__') && !registeredBabylonIds.has(node.id) && !registeredBabylonIds.has(node.name) && node.getChildMeshes().length > 0) {
                    terrainChildren.push({ id: node.id || `terrain-node-${node.name}`, name: node.name || 'SceneNode', visible: true, isStatic: true, transform: { position: { x: +(node.position.x.toFixed(3)), y: +(node.position.y.toFixed(3)), z: +(node.position.z.toFixed(3)) }, rotation: { x: +(node.rotation.x.toFixed(3)), y: +(node.rotation.y.toFixed(3)), z: +(node.rotation.z.toFixed(3)) }, scale: { x: +(node.scaling.x.toFixed(3)), y: +(node.scaling.y.toFixed(3)), z: +(node.scaling.z.toFixed(3)) } }, components: [{ id: crypto.randomUUID(), type: 'mesh' as const, enabled: true, properties: { type: 'box', color: '#888888', castShadows: false, receiveShadows: true } }], children: [] as string[], parentId: terrainGroupId, tags: ['terrain', 'static'], layer: 7 });
                  }
                });
                if (terrainChildren.length > 0) {
                  const terrainGroup: any = { id: terrainGroupId, name: 'Terrain', visible: true, isStatic: true, transform: { position: { x:0,y:0,z:0 }, rotation: { x:0,y:0,z:0 }, scale: { x:1,y:1,z:1 } }, components: [], children: terrainChildren.map((t: any) => t.id), parentId: null, tags: ['group', 'terrain'], layer: 7 };
                  useEngineStore.setState(s => ({ project: s.project ? { ...s.project, scenes: s.project.scenes.map((sc: any, i: number) => i === sceneIdx ? { ...sc, objects: [...sc.objects, terrainGroup, ...terrainChildren] } : sc) } : s.project }));
                }
              }
            }
            addConsoleLog({ type: 'info', message: 'Demo scene ready. Press Play (Space) to explore.', source: 'Demo' });
          } else {
            addConsoleLog({ type: 'error', message: `Failed to load demo scene: ${pendingPresetSceneId}`, source: 'Demo' });
          }
        }).catch(err => { addConsoleLog({ type: 'error', message: `Demo scene error: ${err}`, source: 'Demo' }); });
      });
      clearPresetScene();
    }
  }, [pendingPresetSceneId]);

  // Animation playback with blending
  useEffect(() => {
    animationRegistry.forEach((info: any, objectId: string) => {
      const animGroups = animationGroupsRef.current.get(objectId);
      if (!animGroups) return;
      if (info.currentAnimation) {
        const selectedAnim = animGroups.find(ag => ag.name === info.currentAnimation);
        if (selectedAnim && !selectedAnim.isPlaying) {
          const blendDuration = 0.25;
          selectedAnim.start(true, 1.0, selectedAnim.from, selectedAnim.to, false);
          selectedAnim.setWeightForAllAnimatables(0);
          let startTime = performance.now();
          const blendIn = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const t = Math.min(elapsed / blendDuration, 1);
            selectedAnim.setWeightForAllAnimatables(t);
            animGroups.forEach(ag => {
              if (ag !== selectedAnim && ag.isPlaying) { ag.setWeightForAllAnimatables(1 - t); if (t >= 1) ag.stop(); }
            });
            if (t < 1) requestAnimationFrame(blendIn);
          };
          requestAnimationFrame(blendIn);
        }
      } else {
        animGroups.forEach(ag => { if (ag.isPlaying) ag.stop(); });
      }
    });
  }, [animationRegistry]);

  // Sync lighting settings to scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const hemi = scene.getLightByName('hemisphericLight') as BABYLON.HemisphericLight | null;
    const dir = scene.getLightByName('directionalLight') as BABYLON.DirectionalLight | null;
    if (hemi) hemi.intensity = lightingSettings.ambientIntensity * 4;
    if (dir) dir.intensity = lightingSettings.sunIntensity * 1.5;
    if (shadowGeneratorRef.current) shadowGeneratorRef.current.darkness = lightingSettings.shadowStrength;
  }, [lightingSettings]);

  // Load models from pendingViewportLoads
  useEffect(() => {
    if (!pendingViewportLoads.length || !sceneRef.current) return;
    const scene = sceneRef.current;
    const loads = consumePendingViewportLoads();
    for (const load of loads) {
      const { gameObjectId, modelPath, name, tags, scale } = load;
      if (meshMapRef.current.has(gameObjectId)) continue;
      const folder = modelPath.substring(0, modelPath.lastIndexOf('/') + 1);
      const filename = modelPath.substring(modelPath.lastIndexOf('/') + 1);
      const rootNode = new TransformNode(gameObjectId, scene);
      rootNode.position = new Vector3(0, 0, 0);
      rootNode.scaling = new Vector3(scale, scale, scale);
      rootNode.metadata = { gameObjectId, tags, modelPath };
      meshMapRef.current.set(gameObjectId, rootNode);
      setLoadingModels(prev => [...prev, name]);
      addConsoleLog({ type: 'info', message: `Loading "${name}"...`, source: 'Viewport' });
      SceneLoader.ImportMeshAsync('', folder, filename, scene)
        .then(result => {
          if (result.meshes.length > 0) {
            const importedRoot = result.meshes[0];
            importedRoot.setParent(rootNode);
            importedRoot.position = Vector3.Zero();
            importedRoot.rotation = Vector3.Zero();
            importedRoot.scaling = Vector3.One();
            result.meshes.forEach(m => {
              m.metadata = rootNode.metadata;
              m.isVisible = true;
              m.receiveShadows = true;
              if (shadowGeneratorRef.current && m.getTotalVertices() > 0) shadowGeneratorRef.current.addShadowCaster(m);
            });
            const firstMesh = result.meshes.find(m => m.getTotalVertices() > 0);
            if (firstMesh) gizmoMeshRef.current.set(gameObjectId, firstMesh);
            if (result.animationGroups?.length) {
              animationGroupsRef.current.set(gameObjectId, result.animationGroups);
              registerAnimations(gameObjectId, result.animationGroups.map(ag => ag.name));
              result.animationGroups.forEach(ag => ag.stop());
            }
            addConsoleLog({ type: 'info', message: `"${name}" loaded — ${result.meshes.length} meshes${result.animationGroups?.length ? `, ${result.animationGroups.length} animations` : ''}`, source: 'Viewport' });
          }
        })
        .catch(err => { addConsoleLog({ type: 'error', message: `Failed to load "${name}": ${err.message}`, source: 'Viewport' }); })
        .finally(() => { setLoadingModels(prev => prev.filter(n => n !== name)); });
    }
  }, [pendingViewportLoads]);

  // Focus on object from hierarchy double-click
  useEffect(() => {
    if (!pendingFocusObjectId || !sceneRef.current) return;
    const scene = sceneRef.current;
    const camera = scene.activeCamera as ArcRotateCamera;
    if (!camera) { clearPendingFocus(); return; }
    let targetPosition: Vector3 | null = null;
    let targetRadius = 5;
    let nodeName = pendingFocusObjectId;
    const extractFromMesh = (mesh: BABYLON.AbstractMesh) => {
      mesh.computeWorldMatrix(true);
      const hi = mesh.getHierarchyBoundingVectors(true);
      const center = hi.min.add(hi.max).scale(0.5);
      const size = hi.max.subtract(hi.min);
      return { position: center, radius: Math.max(Math.max(size.x, size.y, size.z) * 1.8, 2) };
    };
    const mappedNode = meshMapRef.current.get(pendingFocusObjectId);
    if (mappedNode && 'getBoundingInfo' in mappedNode) {
      const r = extractFromMesh(mappedNode as BABYLON.AbstractMesh);
      targetPosition = r.position; targetRadius = r.radius; nodeName = (mappedNode as any).name || nodeName;
    }
    if (!targetPosition) {
      const byId = scene.getMeshById(pendingFocusObjectId);
      if (byId) { const r = extractFromMesh(byId); targetPosition = r.position; targetRadius = r.radius; nodeName = byId.name; }
    }
    if (!targetPosition) {
      const currentScene = getCurrentScene();
      const storeObj = currentScene?.objects.find((o: any) => o.id === pendingFocusObjectId);
      if (storeObj) {
        nodeName = storeObj.name;
        const byName = scene.getMeshByName(storeObj.name);
        if (byName) { const r = extractFromMesh(byName); targetPosition = r.position; targetRadius = r.radius; }
      }
    }
    if (!targetPosition) {
      const tn = scene.getTransformNodeById(pendingFocusObjectId) || scene.getTransformNodeByName(nodeName);
      if (tn) {
        tn.computeWorldMatrix(true);
        targetPosition = tn.getAbsolutePosition().clone();
        const childMeshes = tn.getChildMeshes();
        if (childMeshes.length > 0) {
          let minV = new Vector3(Infinity, Infinity, Infinity);
          let maxV = new Vector3(-Infinity, -Infinity, -Infinity);
          childMeshes.forEach(m => { m.computeWorldMatrix(true); const hi = m.getHierarchyBoundingVectors(true); minV = Vector3.Minimize(minV, hi.min); maxV = Vector3.Maximize(maxV, hi.max); });
          targetPosition = minV.add(maxV).scale(0.5);
          targetRadius = Math.max(Math.max(maxV.x - minV.x, maxV.y - minV.y, maxV.z - minV.z) * 1.8, 3);
        }
        nodeName = tn.name;
      }
    }
    if (!targetPosition) {
      const cam = scene.getCameraById(pendingFocusObjectId);
      if (cam) { targetPosition = cam.position.clone(); nodeName = cam.name; }
    }
    if (!targetPosition) {
      const light = scene.getLightById(pendingFocusObjectId);
      if (light instanceof BABYLON.PointLight || light instanceof BABYLON.SpotLight) {
        targetPosition = (light as any).position.clone(); nodeName = light.name;
      } else if (light) { targetPosition = Vector3.Zero(); nodeName = light.name; }
    }
    if (!targetPosition) {
      const currentScene = getCurrentScene();
      const obj = currentScene?.objects.find((o: any) => o.id === pendingFocusObjectId);
      if (obj) { const p = obj.transform.position; targetPosition = new Vector3(p.x, p.y, p.z); nodeName = obj.name; }
    }
    if (targetPosition) {
      const fps = 60, frames = 40;
      const ease = new BABYLON.QuadraticEase();
      ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
      const targetAnim = new BABYLON.Animation('camTarget', 'target', fps, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
      targetAnim.setEasingFunction(ease);
      targetAnim.setKeys([{ frame: 0, value: camera.target.clone() }, { frame: frames, value: targetPosition }]);
      const radiusAnim = new BABYLON.Animation('camRadius', 'radius', fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
      radiusAnim.setEasingFunction(ease);
      radiusAnim.setKeys([{ frame: 0, value: camera.radius }, { frame: frames, value: targetRadius }]);
      camera.animations = [targetAnim, radiusAnim];
      scene.beginAnimation(camera, 0, frames, false);
      addConsoleLog({ type: 'info', message: `Focused: ${nodeName}`, source: 'Viewport' });
    } else {
      addConsoleLog({ type: 'warning', message: `Could not find object "${nodeName}" in scene`, source: 'Viewport' });
    }
    clearPendingFocus();
  }, [pendingFocusObjectId, clearPendingFocus, addConsoleLog, project]);
}
