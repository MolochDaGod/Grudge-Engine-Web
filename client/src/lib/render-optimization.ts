/**
 * Render Optimization for Grudge Engine
 * 
 * Apply these optimizations to imported models for better performance:
 * - freezeWorldMatrix for static objects
 * - Frustum culling
 * - LOD (Level of Detail) setup
 * - Mesh merging for draw call reduction
 * - Occlusion queries
 */

import * as BABYLON from '@babylonjs/core';
import { LOD_DISTANCES, POLY_BUDGET, validatePolyCount, getTriangleCount } from './units';

export interface OptimizationOptions {
  isStatic?: boolean;
  enableLOD?: boolean;
  enableOcclusion?: boolean;
  enableFrustumCulling?: boolean;
  lodDistances?: typeof LOD_DISTANCES;
  polyCategory?: keyof typeof POLY_BUDGET;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  isStatic: false,
  enableLOD: true,
  enableOcclusion: false,
  enableFrustumCulling: true,
  lodDistances: LOD_DISTANCES,
  polyCategory: 'FOREGROUND_PROP',
};

export interface OptimizationResult {
  meshCount: number;
  totalTriangles: number;
  optimizationsApplied: string[];
  warnings: string[];
  polyCheck: ReturnType<typeof validatePolyCount>;
}

export function optimizeMesh(
  rootMesh: BABYLON.AbstractMesh,
  options: OptimizationOptions = {}
): OptimizationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: OptimizationResult = {
    meshCount: 0,
    totalTriangles: 0,
    optimizationsApplied: [],
    warnings: [],
    polyCheck: { valid: true, percentage: 0, message: '' },
  };

  const allMeshes = [rootMesh, ...rootMesh.getChildMeshes()];
  result.meshCount = allMeshes.length;

  for (const mesh of allMeshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;

    result.totalTriangles += getTriangleCount(mesh);

    // Frustum culling (enabled by default in Babylon, but ensure it)
    if (opts.enableFrustumCulling) {
      mesh.alwaysSelectAsActiveMesh = false;
    }

    // Freeze world matrix for static objects
    if (opts.isStatic) {
      mesh.freezeWorldMatrix();
      result.optimizationsApplied.push('freezeWorldMatrix');
    }

    // Enable occlusion queries for complex scenes
    if (opts.enableOcclusion && mesh.getTotalVertices() > 1000) {
      mesh.occlusionType = BABYLON.AbstractMesh.OCCLUSION_TYPE_OPTIMISTIC;
      mesh.occlusionQueryAlgorithmType = BABYLON.AbstractMesh.OCCLUSION_ALGORITHM_TYPE_CONSERVATIVE;
      result.optimizationsApplied.push('occlusionQuery');
    }

    // Optimize material
    if (mesh.material) {
      mesh.material.freeze();
      result.optimizationsApplied.push('freezeMaterial');
    }
  }

  // Validate poly count
  result.polyCheck = validatePolyCount(result.totalTriangles, opts.polyCategory || 'FOREGROUND_PROP');
  if (!result.polyCheck.valid) {
    result.warnings.push(result.polyCheck.message);
  }

  // Remove duplicates from applied optimizations
  result.optimizationsApplied = Array.from(new Set(result.optimizationsApplied));

  return result;
}

export function setupLOD(
  rootMesh: BABYLON.Mesh,
  scene: BABYLON.Scene,
  distances: typeof LOD_DISTANCES = LOD_DISTANCES
): void {
  // Create simplified LOD levels
  const meshes = rootMesh.getChildMeshes().filter(m => m instanceof BABYLON.Mesh) as BABYLON.Mesh[];
  
  for (const mesh of meshes) {
    if (mesh.getTotalVertices() < 500) continue; // Skip simple meshes

    // Babylon.js automatic LOD with decimation
    mesh.addLODLevel(distances.MEDIUM_DETAIL, null); // Use null for auto-culling
    mesh.addLODLevel(distances.LOW_DETAIL, null);
    mesh.addLODLevel(distances.BILLBOARD, null);
  }
}

export function setStaticOptimizations(rootMesh: BABYLON.AbstractMesh): string[] {
  const applied: string[] = [];
  const allMeshes = [rootMesh, ...rootMesh.getChildMeshes()];

  for (const mesh of allMeshes) {
    // Freeze world matrix for static objects (huge performance win)
    mesh.freezeWorldMatrix();
    
    // Convert to unindexed if small (reduces GPU state changes)
    if (mesh instanceof BABYLON.Mesh && mesh.getTotalVertices() < 100) {
      mesh.convertToUnIndexedMesh();
      applied.push('convertToUnIndexed');
    }

    // Freeze material
    if (mesh.material) {
      mesh.material.freeze();
    }
  }

  applied.push('freezeWorldMatrix', 'freezeMaterial');
  return Array.from(new Set(applied));
}

export function setDynamicOptimizations(rootMesh: BABYLON.AbstractMesh): string[] {
  const applied: string[] = [];
  const allMeshes = [rootMesh, ...rootMesh.getChildMeshes()];

  for (const mesh of allMeshes) {
    // Ensure world matrix is NOT frozen for animated objects
    mesh.unfreezeWorldMatrix();
    
    // Enable frustum culling
    mesh.alwaysSelectAsActiveMesh = false;
    
    // Use bounding info for culling
    mesh.computeWorldMatrix(true);
  }

  applied.push('frustumCulling', 'boundingInfo');
  return Array.from(new Set(applied));
}

export function applySceneOptimizations(scene: BABYLON.Scene): void {
  // Enable scene-level optimizations
  scene.autoClear = false;
  scene.autoClearDepthAndStencil = true;
  
  // Block dirty mechanism for performance
  scene.blockMaterialDirtyMechanism = true;
  
  // Pointer collisions off for non-interactive meshes
  scene.pointerMovePredicate = (mesh) => mesh.isPickable;
  
  // Use octree for large scenes
  if (scene.meshes.length > 50) {
    scene.createOrUpdateSelectionOctree();
  }
}

export function getMeshStats(rootMesh: BABYLON.AbstractMesh): {
  meshCount: number;
  triangleCount: number;
  vertexCount: number;
  materialCount: number;
  textureCount: number;
} {
  const allMeshes = [rootMesh, ...rootMesh.getChildMeshes()];
  const materials = new Set<BABYLON.Material>();
  const textures = new Set<BABYLON.BaseTexture>();

  let triangleCount = 0;
  let vertexCount = 0;

  for (const mesh of allMeshes) {
    triangleCount += getTriangleCount(mesh);
    if (mesh.getTotalVertices) {
      vertexCount += mesh.getTotalVertices();
    }

    if (mesh.material) {
      materials.add(mesh.material);
      
      // Count textures from PBR materials
      if (mesh.material instanceof BABYLON.PBRMaterial) {
        const pbr = mesh.material;
        if (pbr.albedoTexture) textures.add(pbr.albedoTexture);
        if (pbr.bumpTexture) textures.add(pbr.bumpTexture);
        if (pbr.metallicTexture) textures.add(pbr.metallicTexture);
        if (pbr.emissiveTexture) textures.add(pbr.emissiveTexture);
      }
    }
  }

  return {
    meshCount: allMeshes.length,
    triangleCount,
    vertexCount,
    materialCount: materials.size,
    textureCount: textures.size,
  };
}

export function logMeshOptimizationReport(
  name: string,
  result: OptimizationResult,
  logger: (msg: { type: string; message: string; source: string }) => void
): void {
  logger({
    type: 'info',
    message: `${name}: ${result.meshCount} meshes, ${result.totalTriangles.toLocaleString()} tris`,
    source: 'Optimize'
  });

  if (result.optimizationsApplied.length > 0) {
    logger({
      type: 'info',
      message: `Applied: ${result.optimizationsApplied.join(', ')}`,
      source: 'Optimize'
    });
  }

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      logger({ type: 'warning', message: warning, source: 'Optimize' });
    }
  }
}
