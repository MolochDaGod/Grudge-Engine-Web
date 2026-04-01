/**
 * grudge-asset-loader.ts — Grudge Studio Asset Loader SDK
 * ─────────────────────────────────────────────────────────────────────────────
 * Loads game assets (textures, models, VFX) from the Grudge ObjectStore
 * master registry into BabylonJS scenes.
 *
 * Features:
 *   - Query by UUID, tag, category, or pack name
 *   - Automatic CDN → GitHub Pages fallback
 *   - In-memory + IndexedDB cache for repeat loads
 *   - Batch loading with progress callbacks
 *   - WebP preference with PNG fallback
 *   - Typed asset metadata from master-registry.json
 *
 * Usage:
 *   const loader = new GrudgeAssetLoader(scene);
 *   await loader.init();
 *   const tex = await loader.loadTexture('fire', { tags: ['projectile'] });
 *   const mesh = await loader.loadModel('dragon-terror');
 *   const batch = await loader.loadCategory('monsters', { type: 'model', limit: 10 });
 */

import { Scene, Texture, SceneLoader, AbstractMesh } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

// ── Types ──────────────────────────────────────────────────────

export interface AssetEntry {
  id: string;
  filename: string;
  original: string;
  type: 'texture' | 'model';
  category: string;
  pack: string;
  tags: string[];
  size: number;
  path: string;
  r2Key: string;
  cdnUrl: string;
  ghUrl: string;
}

export interface AssetRegistry {
  version: string;
  generated: string;
  baseUrl: string;
  cdnUrl: string;
  r2Bucket: string;
  assets: AssetEntry[];
  categories: Record<string, { textures: number; models: number; count: number; totalSize: number }>;
  packs: Array<{ name: string; category: string; textures: number; models: number; tags: string[] }>;
  stats: {
    totalAssets: number;
    totalTextures: number;
    totalModels: number;
    totalSizeBytes: number;
    categoryCount: number;
    packCount: number;
  };
}

export interface LoadOptions {
  tags?: string[];
  type?: 'texture' | 'model';
  limit?: number;
  preferWebP?: boolean;
  onProgress?: (loaded: number, total: number, asset: AssetEntry) => void;
}

export interface LoadedTexture {
  asset: AssetEntry;
  texture: Texture;
}

export interface LoadedModel {
  asset: AssetEntry;
  meshes: AbstractMesh[];
  rootMesh: AbstractMesh;
}

// ── Constants ──────────────────────────────────────────────────

const REGISTRY_URLS = [
  'https://assets.grudge-studio.com/game-assets/api/v1/master-registry.json',
  'https://molochdagod.github.io/ObjectStore/api/v1/master-registry.json',
  '/api/v1/master-registry.json', // local fallback for dev
];

const IDB_NAME = 'grudge-assets';
const IDB_STORE = 'registry';
const IDB_VERSION = 1;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// ── IndexedDB helpers ──────────────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
  } catch { /* silent */ }
}

// ── Loader ─────────────────────────────────────────────────────

export class GrudgeAssetLoader {
  private scene: Scene;
  private registry: AssetRegistry | null = null;
  private indexById: Map<string, AssetEntry> = new Map();
  private indexByPack: Map<string, AssetEntry[]> = new Map();
  private indexByCategory: Map<string, AssetEntry[]> = new Map();
  private indexByTag: Map<string, AssetEntry[]> = new Map();
  private textureCache: Map<string, Texture> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /** Initialize — fetches and caches the master registry */
  async init(): Promise<void> {
    // Try IDB cache first
    const cached = await idbGet<{ data: AssetRegistry; ts: number }>('registry');
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      this.registry = cached.data;
      this.buildIndices();
      console.log(`[GrudgeAssets] Loaded from cache: ${this.registry.stats.totalAssets} assets`);
      return;
    }

    // Fetch from CDN with fallback
    for (const url of REGISTRY_URLS) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        this.registry = await res.json() as AssetRegistry;
        this.buildIndices();
        await idbSet('registry', { data: this.registry, ts: Date.now() });
        console.log(`[GrudgeAssets] Loaded from ${url}: ${this.registry.stats.totalAssets} assets`);
        return;
      } catch {
        console.warn(`[GrudgeAssets] Failed to load from ${url}`);
      }
    }
    console.error('[GrudgeAssets] Could not load asset registry from any source');
  }

  /** Build search indices */
  private buildIndices(): void {
    if (!this.registry) return;

    for (const asset of this.registry.assets) {
      this.indexById.set(asset.id, asset);

      // By pack
      if (!this.indexByPack.has(asset.pack)) this.indexByPack.set(asset.pack, []);
      this.indexByPack.get(asset.pack)!.push(asset);

      // By category
      if (!this.indexByCategory.has(asset.category)) this.indexByCategory.set(asset.category, []);
      this.indexByCategory.get(asset.category)!.push(asset);

      // By tag
      for (const tag of asset.tags) {
        if (!this.indexByTag.has(tag)) this.indexByTag.set(tag, []);
        this.indexByTag.get(tag)!.push(asset);
      }
    }
  }

  // ── Query API ──────────────────────────────────────────────

  /** Get asset by UUID */
  getById(id: string): AssetEntry | undefined {
    return this.indexById.get(id);
  }

  /** Search assets by name substring */
  search(query: string, opts?: LoadOptions): AssetEntry[] {
    if (!this.registry) return [];
    const lower = query.toLowerCase();
    let results = this.registry.assets.filter(a =>
      a.filename.toLowerCase().includes(lower) ||
      a.original.toLowerCase().includes(lower) ||
      a.pack.toLowerCase().includes(lower)
    );
    return this.applyFilters(results, opts);
  }

  /** Get all assets matching tags (AND logic) */
  findByTags(tags: string[], opts?: LoadOptions): AssetEntry[] {
    if (!this.registry || tags.length === 0) return [];
    // Start with first tag's results, then intersect
    let results = this.indexByTag.get(tags[0]) || [];
    for (let i = 1; i < tags.length; i++) {
      const tagSet = new Set((this.indexByTag.get(tags[i]) || []).map(a => a.id));
      results = results.filter(a => tagSet.has(a.id));
    }
    return this.applyFilters(results, opts);
  }

  /** Get all assets in a category */
  getCategory(category: string, opts?: LoadOptions): AssetEntry[] {
    return this.applyFilters(this.indexByCategory.get(category) || [], opts);
  }

  /** Get all assets from a pack */
  getPack(pack: string, opts?: LoadOptions): AssetEntry[] {
    return this.applyFilters(this.indexByPack.get(pack) || [], opts);
  }

  /** Get category summary */
  getCategories(): Record<string, { textures: number; models: number; count: number }> {
    return this.registry?.categories || {};
  }

  /** Get all pack names */
  getPackNames(): string[] {
    return Array.from(this.indexByPack.keys());
  }

  private applyFilters(assets: AssetEntry[], opts?: LoadOptions): AssetEntry[] {
    let result = [...assets];
    if (opts?.type) result = result.filter(a => a.type === opts.type);
    if (opts?.tags?.length) {
      const tagSet = new Set(opts.tags);
      result = result.filter(a => a.tags.some(t => tagSet.has(t)));
    }
    if (opts?.limit) result = result.slice(0, opts.limit);
    return result;
  }

  // ── Loading API ────────────────────────────────────────────

  /** Resolve asset URL with CDN → GitHub fallback */
  resolveUrl(asset: AssetEntry, preferWebP = false): string {
    if (preferWebP && asset.type === 'texture') {
      const webpPath = asset.cdnUrl.replace(/\.png$/i, '.webp').replace(/\.tga$/i, '.webp');
      return webpPath;
    }
    return asset.cdnUrl;
  }

  /** Load a BabylonJS Texture from an asset entry */
  async loadTexture(assetOrQuery: AssetEntry | string, opts?: LoadOptions): Promise<LoadedTexture | null> {
    const asset = typeof assetOrQuery === 'string'
      ? this.search(assetOrQuery, { type: 'texture', limit: 1, ...opts })[0]
      : assetOrQuery;

    if (!asset) return null;

    // Check cache
    if (this.textureCache.has(asset.id)) {
      return { asset, texture: this.textureCache.get(asset.id)! };
    }

    const url = this.resolveUrl(asset, opts?.preferWebP);
    try {
      const texture = new Texture(url, this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE, () => {
        console.log(`[GrudgeAssets] Texture loaded: ${asset.filename}`);
      }, (msg, err) => {
        console.warn(`[GrudgeAssets] CDN failed for ${asset.filename}, trying GitHub...`);
        // Fallback handled below
      });
      this.textureCache.set(asset.id, texture);
      return { asset, texture };
    } catch {
      // Fallback to GitHub Pages
      try {
        const texture = new Texture(asset.ghUrl, this.scene);
        this.textureCache.set(asset.id, texture);
        return { asset, texture };
      } catch {
        console.error(`[GrudgeAssets] Failed to load texture: ${asset.filename}`);
        return null;
      }
    }
  }

  /** Load a GLB/GLTF model from an asset entry */
  async loadModel(assetOrQuery: AssetEntry | string, opts?: LoadOptions): Promise<LoadedModel | null> {
    const asset = typeof assetOrQuery === 'string'
      ? this.search(assetOrQuery, { type: 'model', limit: 1, ...opts })[0]
      : assetOrQuery;

    if (!asset) return null;

    // Prefer GLB URL (converted from FBX)
    let url = asset.cdnUrl.replace(/\.fbx$/i, '.glb');

    try {
      const result = await SceneLoader.ImportMeshAsync('', '', url, this.scene);
      return {
        asset,
        meshes: result.meshes,
        rootMesh: result.meshes[0],
      };
    } catch {
      // Fallback to GitHub
      url = asset.ghUrl.replace(/\.fbx$/i, '.glb');
      try {
        const result = await SceneLoader.ImportMeshAsync('', '', url, this.scene);
        return { asset, meshes: result.meshes, rootMesh: result.meshes[0] };
      } catch {
        console.error(`[GrudgeAssets] Failed to load model: ${asset.filename}`);
        return null;
      }
    }
  }

  /** Batch load assets with progress */
  async loadBatch(
    assets: AssetEntry[],
    opts?: LoadOptions,
  ): Promise<Array<LoadedTexture | LoadedModel | null>> {
    const results: Array<LoadedTexture | LoadedModel | null> = [];
    const total = assets.length;

    for (let i = 0; i < total; i++) {
      const asset = assets[i];
      let result: LoadedTexture | LoadedModel | null = null;

      if (asset.type === 'texture') {
        result = await this.loadTexture(asset, opts);
      } else {
        result = await this.loadModel(asset, opts);
      }

      results.push(result);
      opts?.onProgress?.(i + 1, total, asset);
    }

    return results;
  }

  /** Load all assets in a category */
  async loadCategory(
    category: string,
    opts?: LoadOptions,
  ): Promise<Array<LoadedTexture | LoadedModel | null>> {
    const assets = this.getCategory(category, opts);
    return this.loadBatch(assets, opts);
  }

  /** Load all VFX textures matching tags (e.g. ['fire', 'projectile']) */
  async loadVFX(tags: string[], opts?: LoadOptions): Promise<LoadedTexture[]> {
    const assets = this.findByTags(tags, { type: 'texture', ...opts });
    const results = await this.loadBatch(assets, opts);
    return results.filter((r): r is LoadedTexture => r !== null && 'texture' in r);
  }

  /** Dispose all cached textures */
  dispose(): void {
    for (const [, tex] of this.textureCache) {
      tex.dispose();
    }
    this.textureCache.clear();
  }
}

// ── Singleton factory ──────────────────────────────────────────

let _instance: GrudgeAssetLoader | null = null;

export function getAssetLoader(scene: Scene): GrudgeAssetLoader {
  if (!_instance || _instance['scene'] !== scene) {
    _instance = new GrudgeAssetLoader(scene);
  }
  return _instance;
}
