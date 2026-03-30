/**
 * GrudgeSceneLoader
 * ─────────────────────────────────────────────────────────────────────────────
 * Loads Unity scene exports (GLTF/GLB) using Babylon.js SceneLoader.
 * Engine: Babylon.js (unified - Three.js removed)
 *
 * Export pipeline (Unity side):
 *   1. Install UnityGLTF via UPM: https://github.com/KhronosGroup/UnityGLTF.git
 *   2. Open the MOBILE.unity scene
 *   3. File ▶ Export ▶ glTF  (or right-click GameObjects ▶ Export glTF)
 *   4. Save to: Grudge-Engine-Web/public/assets/scenes/grudge-mobile/
 *
 * Legacy reference (broken, Unity 5.4 only):
 *   https://github.com/nickjanssen/UnityToThreeExporter  ← kept in tools/
 */

import type { Scene, AbstractMesh, AnimationGroup } from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

// ─── Types ───────────────────────────────────────────────────────────────────────────────

export interface GrudgeSceneNode {
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'empty' | 'terrain';
  mesh: AbstractMesh;
  animations: AnimationGroup[];
  extras?: Record<string, unknown>;
}

export interface GrudgeSceneData {
  meshes: AbstractMesh[];
  animationGroups: AnimationGroup[];
  nodes: GrudgeSceneNode[];
}

export interface LoadOptions {
  url: string;
  scale?: number;
  onProgress?: (progress: number) => void;
}

// ─── Main loader ────────────────────────────────────────────────────────────────────────────────────

export async function loadGrudgeScene(
  options: LoadOptions,
  scene: Scene
): Promise<GrudgeSceneData> {
  const urlObj = new URL(options.url, location.href);
  const folder = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
  const file = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1);

  const result = await SceneLoader.ImportMeshAsync('', folder, file, scene);

  const scale = options.scale ?? 1;
  result.meshes.forEach(m => {
    m.scaling.scaleInPlace(scale);
    m.receiveShadows = true;
  });

  const nodes: GrudgeSceneNode[] = result.meshes.map(m => ({
    name: m.name,
    type: m.name.toLowerCase().includes('terrain') ? 'terrain' : 'mesh',
    mesh: m,
    animations: result.animationGroups.filter(ag => ag.name.startsWith(m.name)),
    extras: m.metadata ?? undefined,
  }));

  return { meshes: result.meshes, animationGroups: result.animationGroups, nodes };
}

// ─── Scene descriptor: what the MOBILE.unity scene contains ──────────────────────────────────
// Use this as the target manifest when exporting from Unity.

export const GRUDGE_MOBILE_SCENE_MANIFEST = {
  name: 'MOBILE',
  description: 'Main Grudge Warlords gameplay world (uMMORPG)',
  expectedNodes: [
    'Terrain',
    'Directional Light',
    'NetworkManager',
    // Faction cities
    'Barbarian City', 'Dwarve City', 'Elf City',
    'Human Village', 'Orc Village', 'Undead City',
    // Environment
    'Cemetary', 'Crypt', 'SHRUBS', 'STONES',
    // NavMesh (baked, not exported — reconstructed via navmesh.js)
  ],
  exportPath: 'public/assets/scenes/grudge-mobile/',
  exportFormat: 'glb', // prefer GLB (binary) for smaller size
  exportTool: 'https://github.com/KhronosGroup/UnityGLTF.git',
} as const;
