import type { Scene, Engine } from '@babylonjs/core';
import { commonScenes } from './common-scenes';
import { grudgeWarlordsScenes } from './grudge-warlords-scenes';
import { grudaWarsScenes } from './gruda-wars-scenes';
import { oceanAnglerScenes } from './ocean-angler-scenes';
import { grudgeBuilderScenes } from './grudge-builder-scenes';

export interface RPGSceneConfig {
  id: string;
  name: string;
  description: string;
  game: string;
  terrain?: string;
  skybox?: string;
  createScene: (engine: Engine, canvas: HTMLCanvasElement) => Promise<Scene>;
  mapSize?: number;
  debugMode?: boolean;
}

export interface RPGSceneState {
  currentSceneId: string | null;
  scenes: Map<string, RPGSceneConfig>;
  activeScene: Scene | null;
  isLoading: boolean;
  debugMode: boolean;
}

// All game scene groups
export const GAME_GROUPS = [
  { id: 'grudge-warlords', name: 'Grudge Warlords', icon: '⚔️' },
  { id: 'gruda-wars', name: 'GRUDA Wars', icon: '🏰' },
  { id: 'ocean-angler', name: 'Ocean Angler', icon: '🎣' },
  { id: 'grudge-builder', name: 'Grudge Builder', icon: '🔨' },
  { id: 'common', name: 'Common Environments', icon: '🌍' },
] as const;

// Collect all scenes
const ALL_SCENES: RPGSceneConfig[] = [
  ...grudgeWarlordsScenes,
  ...grudaWarsScenes,
  ...oceanAnglerScenes,
  ...grudgeBuilderScenes,
  ...commonScenes,
];

/** Get scenes grouped by game project */
export function getScenesByGame(): Record<string, RPGSceneConfig[]> {
  const groups: Record<string, RPGSceneConfig[]> = {};
  for (const scene of ALL_SCENES) {
    const game = scene.game || 'Common';
    if (!groups[game]) groups[game] = [];
    groups[game].push(scene);
  }
  return groups;
}

/** Get all scenes as flat array */
export function getAllScenes(): RPGSceneConfig[] {
  return ALL_SCENES;
}

class SceneRegistry {
  private scenes: Map<string, RPGSceneConfig> = new Map();
  private activeScene: Scene | null = null;
  private engine: Engine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  constructor() {
    ALL_SCENES.forEach(config => {
      this.scenes.set(config.id, config);
    });
  }
  
  initialize(engine: Engine, canvas: HTMLCanvasElement) {
    this.engine = engine;
    this.canvas = canvas;
  }
  
  getSceneList(): RPGSceneConfig[] {
    return Array.from(this.scenes.values());
  }
  
  getScene(id: string): RPGSceneConfig | undefined {
    return this.scenes.get(id);
  }
  
  async loadScene(id: string): Promise<Scene | null> {
    const config = this.scenes.get(id);
    if (!config || !this.engine || !this.canvas) return null;
    
    if (this.activeScene) {
      this.activeScene.dispose();
    }
    
    this.activeScene = await config.createScene(this.engine, this.canvas);
    return this.activeScene;
  }
  
  getActiveScene(): Scene | null {
    return this.activeScene;
  }
  
  dispose() {
    if (this.activeScene) {
      this.activeScene.dispose();
      this.activeScene = null;
    }
  }
}

export const sceneRegistry = new SceneRegistry();
export default sceneRegistry;
