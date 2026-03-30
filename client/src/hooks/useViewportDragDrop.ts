import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import * as BABYLON from '@babylonjs/core';
import { SceneLoader, Vector3 } from '@babylonjs/core';
import { useEngineStore } from '@/lib/engine-store';
import { optimizeMesh, setDynamicOptimizations, setupLOD } from '@/lib/render-optimization';
import {
  CHARACTER_HEIGHTS, calculateScaleForUnits, formatHeight,
  getMeshDimensions, validatePolyCount, getTriangleCount
} from '@/lib/units';

interface Params {
  sceneRef: MutableRefObject<BABYLON.Scene | null>;
  meshMapRef: MutableRefObject<Map<string, BABYLON.AbstractMesh | BABYLON.TransformNode>>;
  gizmoMeshRef: MutableRefObject<Map<string, BABYLON.AbstractMesh>>;
  animationGroupsRef: MutableRefObject<Map<string, BABYLON.AnimationGroup[]>>;
  shadowGeneratorRef: MutableRefObject<BABYLON.ShadowGenerator | null>;
  setLoadingModels: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useViewportDragDrop({
  sceneRef, meshMapRef, gizmoMeshRef, animationGroupsRef, shadowGeneratorRef, setLoadingModels
}: Params) {
  const { addConsoleLog, addGameObject, registerAnimations } = useEngineStore();
  const [isDragOver, setIsDragOver] = useState<false | 'file' | 'asset'>(false);

  const handleImportedMesh = useCallback((result: BABYLON.ISceneLoaderAsyncResult, filename: string) => {
    if (result.meshes.length > 0) {
      const rootMesh = result.meshes[0];
      const id = crypto.randomUUID();
      const name = filename.split('.')[0];
      rootMesh.name = id;
      rootMesh.id = id;
      rootMesh.position = new Vector3(0, 0, 0);

      rootMesh.computeWorldMatrix(true);
      const boundingInfo = rootMesh.getHierarchyBoundingVectors();
      const currentHeight = boundingInfo.max.y - boundingInfo.min.y;
      const currentWidth = boundingInfo.max.x - boundingInfo.min.x;
      const currentDepth = boundingInfo.max.z - boundingInfo.min.z;

      const isLikelyCharacter = currentHeight > currentWidth && currentHeight > currentDepth;
      let scale = 1;

      if (isLikelyCharacter && currentHeight > 0) {
        const targetHeight = CHARACTER_HEIGHTS.DEFAULT;
        scale = calculateScaleForUnits(currentHeight, targetHeight);
        rootMesh.scaling = new Vector3(scale, scale, scale);
        const heightDisplay = formatHeight(targetHeight);
        addConsoleLog({ type: 'info', message: `Character scaled to ${heightDisplay} (scale: ${scale.toFixed(4)})`, source: 'Units' });
      } else if (currentHeight > 0) {
        const dims = getMeshDimensions({ minimum: boundingInfo.min, maximum: boundingInfo.max });
        addConsoleLog({
          type: 'info',
          message: `Dimensions: ${dims.widthFeet.toFixed(1)}'W x ${dims.heightFeet.toFixed(1)}'H x ${dims.depthFeet.toFixed(1)}'D`,
          source: 'Units'
        });
      }

      let totalTris = 0;
      result.meshes.forEach(m => { totalTris += getTriangleCount(m); });
      const polyCheck = validatePolyCount(totalTris, isLikelyCharacter ? 'CHARACTER_MED' : 'FOREGROUND_PROP');
      addConsoleLog({ type: polyCheck.valid ? 'info' : 'warning', message: polyCheck.message, source: 'Poly' });

      const hasAnimations = result.animationGroups && result.animationGroups.length > 0;
      const scene = sceneRef.current;
      if (hasAnimations || isLikelyCharacter) {
        const optimizations = setDynamicOptimizations(rootMesh);
        addConsoleLog({ type: 'info', message: `Applied: ${optimizations.join(', ')}`, source: 'Optimize' });
      } else if (scene) {
        const isHighPoly = totalTris > 5000;
        const optResult = optimizeMesh(rootMesh, { isStatic: true, polyCategory: 'FOREGROUND_PROP', enableFrustumCulling: true, enableOcclusion: isHighPoly });
        if (isHighPoly && rootMesh instanceof BABYLON.Mesh) {
          setupLOD(rootMesh, scene);
          optResult.optimizationsApplied.push('LOD');
        }
        if (optResult.optimizationsApplied.length > 0) {
          addConsoleLog({ type: 'info', message: `Applied: ${optResult.optimizationsApplied.join(', ')}`, source: 'Optimize' });
        }
      }

      meshMapRef.current.set(id, rootMesh);
      const firstMesh = result.meshes.find(m => m.getTotalVertices() > 0);
      if (firstMesh) gizmoMeshRef.current.set(id, firstMesh);

      if (result.animationGroups && result.animationGroups.length > 0) {
        const animationNames = result.animationGroups.map(ag => ag.name);
        registerAnimations(id, animationNames);
        animationGroupsRef.current.set(id, result.animationGroups);
        result.animationGroups.forEach(ag => ag.stop());
        addConsoleLog({ type: 'info', message: `Found ${animationNames.length} animations`, source: 'Animation' });
      }

      addGameObject({
        id, name, visible: true, parentId: null, isStatic: false,
        tags: isLikelyCharacter ? ['character'] as string[] : [] as string[],
        layer: 0, prefabId: undefined as string | undefined, children: [] as string[],
        transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: scale, y: scale, z: scale } },
        components: [{ id: crypto.randomUUID(), type: 'mesh', enabled: true, properties: { type: 'imported', modelPath: filename } }]
      });

      addConsoleLog({ type: 'info', message: `Imported: ${name} (${result.meshes.length} meshes)`, source: 'Import' });
    }
  }, [addGameObject, registerAnimations, addConsoleLog, sceneRef, meshMapRef, gizmoMeshRef, animationGroupsRef]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hasAsset = e.dataTransfer.types.includes('application/grudge-asset');
    setIsDragOver(hasAsset ? 'asset' : 'file');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const assetData = e.dataTransfer.getData('application/grudge-asset');
    if (assetData) {
      try {
        const asset = JSON.parse(assetData);
        const store = useEngineStore.getState();
        const assetObj = store.project?.assets.find((a: any) => a.id === asset.id);
        if (assetObj) {
          store.addAssetToScene(assetObj);
          store.addConsoleLog({ type: 'info', message: `Dropped "${asset.name}" into scene`, source: 'Viewport' });
        }
      } catch {
        addConsoleLog({ type: 'error', message: 'Failed to drop asset into scene', source: 'Viewport' });
      }
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const supportedExtensions = ['.glb', '.gltf', '.obj', '.stl', '.fbx'];
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!supportedExtensions.includes(ext)) {
        addConsoleLog({ type: 'warning', message: `Unsupported file: ${file.name}`, source: 'Import' });
        continue;
      }
      const scene = sceneRef.current;
      if (!scene) continue;
      setLoadingModels(prev => [...prev, file.name]);
      addConsoleLog({ type: 'info', message: `Importing ${file.name}...`, source: 'Import' });
      try {
        if (ext === '.fbx') {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/convert/fbx-upload', { method: 'POST', body: formData });
          if (!response.ok) throw new Error('FBX conversion failed');
          const result = await response.json();
          const loadResult = await SceneLoader.ImportMeshAsync('', '', result.outputPath, scene);
          handleImportedMesh(loadResult, file.name);
        } else {
          const url = URL.createObjectURL(file);
          const loadResult = await SceneLoader.ImportMeshAsync('', '', url, scene, undefined, ext);
          URL.revokeObjectURL(url);
          handleImportedMesh(loadResult, file.name);
        }
      } catch (err: any) {
        addConsoleLog({ type: 'error', message: `Failed to import ${file.name}: ${err.message}`, source: 'Import' });
      }
      setLoadingModels(prev => prev.filter(n => n !== file.name));
    }
  }, [addConsoleLog, handleImportedMesh, sceneRef, setLoadingModels]);

  return { isDragOver, handleDragOver, handleDragLeave, handleDrop };
}
