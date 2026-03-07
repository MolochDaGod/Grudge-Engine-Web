/**
 * ObjectStore Client SDK
 * Fetches game data from the Grudge Studio ObjectStore via the server proxy.
 * All requests go through /api/objectstore/* and /api/gamedata/* to avoid CORS.
 */

// ============ Types ============

export interface TerrainPreset {
  width: number;
  height: number;
  resolution: number;
  heightScale: number;
  noiseScale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  waterLevel: number;
  sandLevel: number;
  grassLevel: number;
  rockLevel: number;
  snowLevel: number;
}

export interface TerrainData {
  terrainTypes: string[];
  terrainColors: Record<string, { r: number; g: number; b: number }>;
  presets: Record<string, TerrainPreset>;
}

export interface SkyboxPreset {
  topColor: string;
  bottomColor: string;
  sunColor: string;
  cloudDensity: number;
  timeOfDay: number;
}

export interface ParticlePreset {
  count: number;
  size: number;
  color: string;
  colorEnd: string;
  lifetime: number;
  speed: number;
  spread: number;
  gravity: number;
  opacity?: number;
}

export interface RenderingData {
  materials: Record<string, { description: string; useCase: string; performance: string }>;
  skyboxPresets: Record<string, SkyboxPreset>;
  particlePresets: Record<string, ParticlePreset>;
  spellEffects: string[];
  damageTypes: Record<string, string>;
}

export interface ObjectStoreAsset {
  uuid: string;
  filename: string;
  name: string;
  path: string;
  category: string;
  size: number;
  type: string;
  cdn: string;
}

export interface AssetSearchResult {
  query: string;
  category: string | null;
  total: number;
  results: ObjectStoreAsset[];
}

export interface AssetCategory {
  name: string;
  count: number;
}

// ============ Cache ============

const cache = new Map<string, { data: any; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}

// ============ Fetch helpers ============

async function fetchJSON<T>(url: string, cacheKey?: string): Promise<T> {
  const key = cacheKey || url;
  const cached = getCached<T>(key);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ObjectStore fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  setCache(key, data);
  return data as T;
}

// ============ Game Data API ============

export async function fetchGameData<T = any>(type: string): Promise<T> {
  return fetchJSON<T>(`/api/gamedata/${type}`, `gamedata:${type}`);
}

export async function fetchTerrain(): Promise<TerrainData> {
  return fetchGameData<TerrainData>('terrain');
}

export async function fetchRendering(): Promise<RenderingData> {
  return fetchGameData<RenderingData>('rendering');
}

export async function fetchWeapons(): Promise<any> {
  return fetchGameData('weapons');
}

export async function fetchArmor(): Promise<any> {
  return fetchGameData('armor');
}

export async function fetchClasses(): Promise<any> {
  return fetchGameData('classes');
}

export async function fetchRaces(): Promise<any> {
  return fetchGameData('races');
}

export async function fetchSkills(): Promise<any> {
  return fetchGameData('skills');
}

export async function fetchMaterials(): Promise<any> {
  return fetchGameData('materials');
}

export async function fetchConsumables(): Promise<any> {
  return fetchGameData('consumables');
}

export async function fetchSprites(): Promise<any> {
  return fetchGameData('sprites');
}

export async function fetchEnemies(): Promise<any> {
  return fetchGameData('enemies');
}

export async function fetchBosses(): Promise<any> {
  return fetchGameData('bosses');
}

export async function fetchProfessions(): Promise<any> {
  return fetchGameData('professions');
}

export async function fetchFactions(): Promise<any> {
  return fetchGameData('factions');
}

// ============ Asset Registry API ============

export async function searchAssets(query: string, category?: string, limit?: number): Promise<AssetSearchResult> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category) params.set('category', category);
  if (limit) params.set('limit', String(limit));
  return fetchJSON<AssetSearchResult>(`/api/objectstore/search?${params}`);
}

export async function getAssetByUUID(uuid: string): Promise<ObjectStoreAsset> {
  return fetchJSON<ObjectStoreAsset>(`/api/objectstore/assets/${uuid}`);
}

export async function getAssetCategories(): Promise<{ totalAssets: number; categories: AssetCategory[] }> {
  return fetchJSON(`/api/objectstore/categories`, 'objectstore:categories');
}

/**
 * Get the proxied CDN URL for an asset path.
 * Use this instead of direct GitHub Pages URLs to avoid CORS.
 */
export function getAssetCDNUrl(assetPath: string): string {
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `/api/objectstore/cdn/${cleanPath}`;
}

/**
 * Get direct ObjectStore CDN URL (for use in img tags, etc. where CORS isn't an issue).
 */
export function getDirectCDNUrl(assetPath: string): string {
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `https://molochdagod.github.io/ObjectStore/${cleanPath}`;
}

// ============ Scene helpers ============

/**
 * Get a terrain preset by name, with fallback to 'plains'.
 */
export async function getTerrainPreset(name: string): Promise<TerrainPreset> {
  const terrain = await fetchTerrain();
  return terrain.presets[name] || terrain.presets['plains'];
}

/**
 * Get a skybox preset by name, with fallback to 'daytime'.
 */
export async function getSkyboxPreset(name: string): Promise<SkyboxPreset> {
  const rendering = await fetchRendering();
  return rendering.skyboxPresets[name] || rendering.skyboxPresets['daytime'];
}

/**
 * Get a particle preset by name.
 */
export async function getParticlePreset(name: string): Promise<ParticlePreset | undefined> {
  const rendering = await fetchRendering();
  return rendering.particlePresets[name];
}

/**
 * Get terrain color as hex string.
 */
export async function getTerrainColor(type: string): Promise<string> {
  const terrain = await fetchTerrain();
  const color = terrain.terrainColors[type];
  if (!color) return '#888888';
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// ============ Preload ============

/**
 * Preload commonly used ObjectStore data.
 * Call this early in app initialization.
 */
export async function preloadObjectStore(): Promise<void> {
  try {
    await Promise.allSettled([
      fetchTerrain(),
      fetchRendering(),
      getAssetCategories(),
    ]);
  } catch {
    console.warn('ObjectStore preload partially failed — data will be fetched on demand');
  }
}
