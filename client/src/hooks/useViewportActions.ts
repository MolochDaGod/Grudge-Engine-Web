import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import * as BABYLON from '@babylonjs/core';
import { SceneLoader, Vector3 } from '@babylonjs/core';
import { useEngineStore } from '@/lib/engine-store';
import { autoRigModel } from '@/lib/ai-auto-rig';
import { CHARACTER_HEIGHTS, calculateScaleForUnits, formatHeight } from '@/lib/units';

type GizmoMode = 'select' | 'move' | 'rotate' | 'scale';

interface Params {
  sceneRef: MutableRefObject<BABYLON.Scene | null>;
  meshMapRef: MutableRefObject<Map<string, BABYLON.AbstractMesh | BABYLON.TransformNode>>;
  gizmoMeshRef: MutableRefObject<Map<string, BABYLON.AbstractMesh>>;
  animationGroupsRef: MutableRefObject<Map<string, BABYLON.AnimationGroup[]>>;
  gizmoManagerRef: MutableRefObject<BABYLON.GizmoManager | null>;
  renderPipelineRef: MutableRefObject<BABYLON.DefaultRenderingPipeline | null>;
  setLoadingModels: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useViewportActions({
  sceneRef, meshMapRef, gizmoMeshRef, animationGroupsRef,
  gizmoManagerRef, renderPipelineRef, setLoadingModels
}: Params) {
  const { addConsoleLog, addGameObject, registerAnimations, selectedObjectId } = useEngineStore();
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('move');
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [postProcessEnabled, setPostProcessEnabled] = useState(true);

  const quickAddObject = useCallback((type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'pointLight' | 'directionalLight' | 'camera') => {
    const id = crypto.randomUUID();
    const name = type.charAt(0).toUpperCase() + type.slice(1);
    const baseObject = {
      id, name, visible: true, parentId: null, isStatic: false,
      tags: [] as string[], layer: 0,
      prefabId: undefined as string | undefined, children: [] as string[],
      transform: {
        position: { x: 0, y: type === 'plane' ? 0 : 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }
      },
      components: [] as any[]
    };
    if (type === 'pointLight') {
      baseObject.components = [{ id: crypto.randomUUID(), type: 'light', enabled: true, properties: { type: 'point', intensity: 1, color: '#ffffff', range: 10 } }];
    } else if (type === 'directionalLight') {
      baseObject.components = [{ id: crypto.randomUUID(), type: 'light', enabled: true, properties: { type: 'directional', intensity: 1, color: '#ffffff' } }];
    } else if (type === 'camera') {
      baseObject.components = [{ id: crypto.randomUUID(), type: 'camera', enabled: true, properties: { fov: 60, near: 0.1, far: 1000 } }];
    } else {
      baseObject.components = [{ id: crypto.randomUUID(), type: 'mesh', enabled: true, properties: { type } }];
    }
    addGameObject(baseObject);
    addConsoleLog({ type: 'info', message: `Created ${name}`, source: 'Scene' });
  }, [addGameObject, addConsoleLog]);

  const spawnPlayerCharacter = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene) return;
    const id = crypto.randomUUID();
    setLoadingModels(prev => [...prev, 'Knight']);
    addConsoleLog({ type: 'info', message: 'Spawning player character...', source: 'Player' });
    try {
      const result = await SceneLoader.ImportMeshAsync('', '/assets/characters/knight/', 'KnightAndSword.glb', scene);
      if (result.meshes.length > 0) {
        const rootMesh = result.meshes[0];
        rootMesh.name = 'Player';
        rootMesh.position = new Vector3(0, 0, 0);
        rootMesh.computeWorldMatrix(true);
        const boundingInfo = rootMesh.getHierarchyBoundingVectors();
        const currentHeight = boundingInfo.max.y - boundingInfo.min.y;
        const targetHeight = CHARACTER_HEIGHTS.DEFAULT;
        const scale = calculateScaleForUnits(currentHeight, targetHeight);
        rootMesh.scaling = new Vector3(scale, scale, scale);
        rootMesh.metadata = { tags: ['player'], isPlayer: true, layer: 5, gameObjectId: id };
        meshMapRef.current.set(id, rootMesh);
        const firstMesh = result.meshes.find(m => m.getTotalVertices() > 0);
        if (firstMesh) gizmoMeshRef.current.set(id, firstMesh);
        const heightDisplay = formatHeight(targetHeight);
        addConsoleLog({ type: 'info', message: `Player scaled to ${heightDisplay} (scale: ${scale.toFixed(4)})`, source: 'Units' });
        if (result.animationGroups && result.animationGroups.length > 0) {
          const animationNames = result.animationGroups.map(ag => ag.name);
          registerAnimations(id, animationNames);
          animationGroupsRef.current.set(id, result.animationGroups);
          result.animationGroups.forEach(ag => ag.stop());
          addConsoleLog({ type: 'info', message: `Player has ${animationNames.length} animations: ${animationNames.join(', ')}`, source: 'Animation' });
        }
        addGameObject({
          id, name: 'Player', visible: true, parentId: null, isStatic: false,
          tags: ['player'] as string[], layer: 5, prefabId: undefined as string | undefined, children: [] as string[],
          transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: scale, y: scale, z: scale } },
          components: [{ id: crypto.randomUUID(), type: 'mesh', enabled: true, properties: { type: 'model', path: '/assets/characters/knight/KnightAndSword.glb' } }] as any[]
        });
        addConsoleLog({ type: 'info', message: 'Player character spawned! Press Play to control.', source: 'Player' });
      }
    } catch (err: any) {
      addConsoleLog({ type: 'error', message: `Failed to spawn player: ${err.message}`, source: 'Player' });
    }
    setLoadingModels(prev => prev.filter(n => n !== 'Knight'));
  }, [sceneRef, meshMapRef, gizmoMeshRef, animationGroupsRef, setLoadingModels, addConsoleLog, addGameObject, registerAnimations]);

  const autoRigSelectedModel = useCallback(async () => {
    const scene = sceneRef.current;
    if (!scene || !selectedObjectId) {
      addConsoleLog({ type: 'warning', message: 'Select a model to auto-rig', source: 'AutoRig' });
      return;
    }
    const node = meshMapRef.current.get(selectedObjectId);
    if (!node || !('getTotalVertices' in node)) {
      addConsoleLog({ type: 'warning', message: 'Selected object has no mesh', source: 'AutoRig' });
      return;
    }
    const mesh = node as BABYLON.AbstractMesh;
    addConsoleLog({ type: 'info', message: 'Starting AI auto-rig analysis...', source: 'AutoRig' });
    try {
      const result = await autoRigModel(scene, mesh, (progress) => {
        addConsoleLog({ type: 'info', message: progress, source: 'AutoRig' });
      });
      if (result.success && result.suggestion) {
        addConsoleLog({ type: 'info', message: `Auto-rig complete! Created ${result.suggestion.rigType} skeleton with ${result.suggestion.bones.length} bones (${Math.round(result.suggestion.confidence * 100)}% confidence)`, source: 'AutoRig' });
        addConsoleLog({ type: 'info', message: 'Skeleton visualization created. Note: Full skinning requires manual weight painting.', source: 'AutoRig' });
      } else {
        addConsoleLog({ type: 'error', message: result.error || 'Auto-rig failed', source: 'AutoRig' });
      }
    } catch (err: any) {
      addConsoleLog({ type: 'error', message: `Auto-rig error: ${err.message}`, source: 'AutoRig' });
    }
  }, [sceneRef, meshMapRef, selectedObjectId, addConsoleLog]);

  const toggleInspector = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (inspectorVisible) {
      scene.debugLayer.hide();
      setInspectorVisible(false);
      addConsoleLog({ type: 'info', message: 'Inspector hidden', source: 'Viewport' });
    } else {
      scene.debugLayer.show({ embedMode: true, overlay: true });
      setInspectorVisible(true);
      addConsoleLog({ type: 'info', message: 'Inspector opened', source: 'Viewport' });
    }
  }, [inspectorVisible, sceneRef, addConsoleLog]);

  const togglePostProcess = useCallback(() => {
    const pipeline = renderPipelineRef.current;
    if (!pipeline) return;
    const newState = !postProcessEnabled;
    pipeline.bloomEnabled = newState;
    pipeline.fxaaEnabled = newState;
    pipeline.imageProcessingEnabled = newState;
    if (pipeline.imageProcessing) pipeline.imageProcessing.toneMappingEnabled = newState;
    setPostProcessEnabled(newState);
    addConsoleLog({ type: 'info', message: `Post-processing ${newState ? 'enabled' : 'disabled'}`, source: 'Viewport' });
  }, [postProcessEnabled, renderPipelineRef, addConsoleLog]);

  const updateGizmoMode = useCallback((mode: GizmoMode) => {
    setGizmoMode(mode);
    const gm = gizmoManagerRef.current;
    if (!gm) return;
    gm.positionGizmoEnabled = mode === 'move';
    gm.rotationGizmoEnabled = mode === 'rotate';
    gm.scaleGizmoEnabled = mode === 'scale';
    gm.boundingBoxGizmoEnabled = false;
    if (mode === 'select') {
      gm.positionGizmoEnabled = false;
      gm.rotationGizmoEnabled = false;
      gm.scaleGizmoEnabled = false;
    }
  }, [gizmoManagerRef]);

  return {
    gizmoMode, inspectorVisible, postProcessEnabled,
    quickAddObject, spawnPlayerCharacter, autoRigSelectedModel,
    toggleInspector, togglePostProcess, updateGizmoMode
  };
}
