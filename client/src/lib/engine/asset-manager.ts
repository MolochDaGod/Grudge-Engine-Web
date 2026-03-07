// ─── Unified Asset Manager ────────────────────────────────────────────────
// Handles FBX, GLB/GLTF, and textures with LRU caching and proper skeleton cloning.

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// ─── Types ────────────────────────────────────────────────────────────────

export interface LoadedModel {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  clips: THREE.AnimationClip[];
  hasSkeleton: boolean;
  format: 'fbx' | 'glb' | 'gltf' | 'procedural';
}

export interface ModelLoadOptions {
  targetHeight?: number;
  tintColor?: number;
  textureUrl?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

interface CacheEntry {
  original: THREE.Group;
  clips: THREE.AnimationClip[];
  hasSkeleton: boolean;
  format: 'fbx' | 'glb' | 'gltf';
  accessCount: number;
  lastAccess: number;
}

// ─── Asset Manager ────────────────────────────────────────────────────────

export class AssetManager {
  private fbxLoader: FBXLoader;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private modelCache: Map<string, CacheEntry> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private pendingLoads: Map<string, Promise<CacheEntry>> = new Map();
  private pendingTextures: Map<string, Promise<THREE.Texture>> = new Map();
  private maxCacheSize: number;

  constructor(maxCacheSize = 200) {
    this.fbxLoader = new FBXLoader();
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.maxCacheSize = maxCacheSize;
  }

  // ─── Detect format from URL ───────────────────────────────────────────
  private detectFormat(url: string): 'fbx' | 'glb' | 'gltf' {
    const lower = url.toLowerCase();
    if (lower.endsWith('.fbx')) return 'fbx';
    if (lower.endsWith('.glb')) return 'glb';
    if (lower.endsWith('.gltf')) return 'gltf';
    // Default to GLB
    return 'glb';
  }

  // ─── Load raw model into cache ────────────────────────────────────────
  private async loadRawModel(url: string): Promise<CacheEntry> {
    // Check cache
    const cached = this.modelCache.get(url);
    if (cached) {
      cached.accessCount++;
      cached.lastAccess = Date.now();
      return cached;
    }

    // Check pending
    const pending = this.pendingLoads.get(url);
    if (pending) return pending;

    const format = this.detectFormat(url);
    const promise = new Promise<CacheEntry>((resolve) => {
      if (format === 'fbx') {
        this.fbxLoader.load(url, (fbx) => {
          const hasSkeleton = this.checkSkeleton(fbx);
          const entry: CacheEntry = {
            original: fbx,
            clips: fbx.animations || [],
            hasSkeleton,
            format,
            accessCount: 1,
            lastAccess: Date.now(),
          };
          this.addToCache(url, entry);
          this.pendingLoads.delete(url);
          resolve(entry);
        }, undefined, () => {
          // Failed to load — return empty group
          const entry: CacheEntry = {
            original: new THREE.Group(),
            clips: [],
            hasSkeleton: false,
            format,
            accessCount: 1,
            lastAccess: Date.now(),
          };
          this.pendingLoads.delete(url);
          resolve(entry);
        });
      } else {
        // GLB / GLTF
        this.gltfLoader.load(url, (gltf) => {
          const hasSkeleton = this.checkSkeleton(gltf.scene);
          const entry: CacheEntry = {
            original: gltf.scene,
            clips: gltf.animations || [],
            hasSkeleton,
            format: format as 'glb' | 'gltf',
            accessCount: 1,
            lastAccess: Date.now(),
          };
          this.addToCache(url, entry);
          this.pendingLoads.delete(url);
          resolve(entry);
        }, undefined, () => {
          const entry: CacheEntry = {
            original: new THREE.Group(),
            clips: [],
            hasSkeleton: false,
            format: format as 'glb' | 'gltf',
            accessCount: 1,
            lastAccess: Date.now(),
          };
          this.pendingLoads.delete(url);
          resolve(entry);
        });
      }
    });

    this.pendingLoads.set(url, promise);
    return promise;
  }

  // ─── Check if model has skinned meshes ────────────────────────────────
  private checkSkeleton(root: THREE.Object3D): boolean {
    let found = false;
    root.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) found = true;
    });
    return found;
  }

  // ─── Clone model properly (preserving skeletons) ──────────────────────
  private cloneModel(entry: CacheEntry): THREE.Group {
    if (entry.hasSkeleton) {
      // SkeletonUtils.clone preserves skeleton bindings
      return SkeletonUtils.clone(entry.original) as THREE.Group;
    }
    return entry.original.clone(true);
  }

  // ─── LRU cache management ────────────────────────────────────────────
  private addToCache(url: string, entry: CacheEntry) {
    if (this.modelCache.size >= this.maxCacheSize) {
      // Evict least recently used
      let lruKey: string | null = null;
      let lruTime = Infinity;
      this.modelCache.forEach((val, key) => {
        if (val.lastAccess < lruTime) {
          lruTime = val.lastAccess;
          lruKey = key;
        }
      });
      if (lruKey) {
        const evicted = this.modelCache.get(lruKey);
        if (evicted) this.disposeGroup(evicted.original);
        this.modelCache.delete(lruKey);
      }
    }
    this.modelCache.set(url, entry);
  }

  // ─── Public: Load a model ─────────────────────────────────────────────
  async loadModel(url: string, options: ModelLoadOptions = {}): Promise<LoadedModel> {
    const entry = await this.loadRawModel(url);
    const root = new THREE.Group();
    const clone = this.cloneModel(entry);

    // Normalize scale
    if (options.targetHeight) {
      this.normalizeScale(clone, options.targetHeight);
    }

    // Apply texture + tint
    if (options.textureUrl) {
      const tex = await this.loadTexture(options.textureUrl);
      this.applyMaterials(clone, tex, options.tintColor);
    } else if (options.tintColor !== undefined) {
      this.applyMaterials(clone, null, options.tintColor);
    }

    // Shadows
    if (options.castShadow || options.receiveShadow) {
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = options.castShadow ?? false;
          child.receiveShadow = options.receiveShadow ?? false;
        }
      });
    }

    root.add(clone);

    // Create mixer for this clone
    let mixer: THREE.AnimationMixer | null = null;
    if (entry.clips.length > 0) {
      mixer = new THREE.AnimationMixer(clone);
    }

    return {
      root,
      mixer,
      clips: entry.clips,
      hasSkeleton: entry.hasSkeleton,
      format: entry.format,
    };
  }

  // ─── Public: Load texture ─────────────────────────────────────────────
  async loadTexture(url: string): Promise<THREE.Texture> {
    const cached = this.textureCache.get(url);
    if (cached) return cached;

    const pending = this.pendingTextures.get(url);
    if (pending) return pending;

    const promise = new Promise<THREE.Texture>((resolve) => {
      this.textureLoader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.flipY = false;
        this.textureCache.set(url, tex);
        this.pendingTextures.delete(url);
        resolve(tex);
      }, undefined, () => {
        const empty = new THREE.Texture();
        this.pendingTextures.delete(url);
        resolve(empty);
      });
    });

    this.pendingTextures.set(url, promise);
    return promise;
  }

  // ─── Normalize model to target height ─────────────────────────────────
  private normalizeScale(model: THREE.Object3D, targetHeight: number) {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const currentHeight = Math.max(size.y, 0.001);
    const scale = targetHeight / currentHeight;
    model.scale.multiplyScalar(scale);
    model.position.y = -box.min.y * scale;
  }

  // ─── Apply materials with optional texture and tint ───────────────────
  private applyMaterials(model: THREE.Object3D, texture: THREE.Texture | null, tintColor?: number) {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const existingMat = mesh.material as THREE.MeshStandardMaterial;
        // If the existing material already has a good map, just tint
        if (existingMat?.map && !texture) {
          if (tintColor !== undefined) {
            const newMat = existingMat.clone();
            newMat.color.setHex(tintColor);
            mesh.material = newMat;
          }
          return;
        }
        // Apply new material
        mesh.material = new THREE.MeshStandardMaterial({
          map: texture?.image ? texture : (existingMat?.map || null),
          color: tintColor ?? 0x888888,
          roughness: 0.65,
          metalness: 0.3,
        });
      }
    });
  }

  // ─── Dispose a group's geometry/materials ─────────────────────────────
  private disposeGroup(group: THREE.Object3D) {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else if (mesh.material) {
          (mesh.material as THREE.Material).dispose();
        }
      }
    });
  }

  // ─── Public: Dispose everything ───────────────────────────────────────
  dispose() {
    this.modelCache.forEach((entry) => {
      this.disposeGroup(entry.original);
    });
    this.modelCache.clear();
    this.textureCache.forEach((tex) => {
      tex.dispose();
    });
    this.textureCache.clear();
    this.pendingLoads.clear();
    this.pendingTextures.clear();
  }

  // ─── Cache stats ──────────────────────────────────────────────────────
  getCacheStats() {
    return {
      models: this.modelCache.size,
      textures: this.textureCache.size,
      pendingModels: this.pendingLoads.size,
      pendingTextures: this.pendingTextures.size,
    };
  }
}

// ─── Singleton instance ─────────────────────────────────────────────────
export const assetManager = new AssetManager();
