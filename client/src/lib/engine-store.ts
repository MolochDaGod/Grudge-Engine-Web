import { create } from 'zustand';
import type { GameObject, Asset, Scene, Project, ConsoleLog, AnimationClip, Transform, Component, Prefab, ScriptableObject, ScriptableObjectType } from '@shared/schema';
import { isPuterAvailable } from './puter';
export { componentRegistry } from './componentRegistry';

// Bottom panel tab types
export type BottomTabType = 'console' | 'timeline' | 'animation' | 'ai' | 'scripts' | 'library' | 'profiler' | 'settings' | 'build' | 'audio' | 'lighting' | 'sdk' | 'pipeline';

export interface BottomTabInfo {
  id: BottomTabType;
  label: string;
  icon: string;
  visible: boolean;
  order: number;
}

export interface BottomTabConfig {
  tabs: BottomTabInfo[];
  pinnedTabs: BottomTabType[];
}

export const DEFAULT_BOTTOM_TABS: BottomTabInfo[] = [
  { id: 'console', label: 'Console', icon: 'Terminal', visible: true, order: 0 },
  { id: 'profiler', label: 'Profiler', icon: 'Activity', visible: true, order: 1 },
  { id: 'timeline', label: 'Timeline', icon: 'Clock', visible: true, order: 2 },
  { id: 'animation', label: 'Animation', icon: 'Film', visible: true, order: 3 },
  { id: 'ai', label: 'AI Studio', icon: 'Sparkles', visible: true, order: 4 },
  { id: 'scripts', label: 'Scripts', icon: 'FileCode', visible: true, order: 5 },
  { id: 'library', label: 'Assets', icon: 'Library', visible: true, order: 6 },
  { id: 'audio', label: 'Audio', icon: 'Volume2', visible: true, order: 7 },
  { id: 'lighting', label: 'Lighting', icon: 'Sun', visible: true, order: 8 },
  { id: 'settings', label: 'Project', icon: 'Settings', visible: true, order: 9 },
  { id: 'build', label: 'Build', icon: 'Package', visible: true, order: 10 },
  { id: 'sdk',      label: 'SDK & AI',  icon: 'Plug',     visible: true,  order: 11 },
  { id: 'pipeline', label: 'Pipeline',   icon: 'Workflow',  visible: true,  order: 12 },
];

export const DEFAULT_BOTTOM_TAB_CONFIG: BottomTabConfig = {
  tabs: DEFAULT_BOTTOM_TABS,
  pinnedTabs: ['console'],
};

// Load tab config from localStorage
function loadBottomTabConfig(): BottomTabConfig {
  try {
    const saved = localStorage.getItem('grudge-engine-bottom-tabs');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new tabs added in updates
      const savedIds = new Set(parsed.tabs.map((t: BottomTabInfo) => t.id));
      const mergedTabs = [
        ...parsed.tabs,
        ...DEFAULT_BOTTOM_TABS.filter(t => !savedIds.has(t.id))
      ];
      return { ...parsed, tabs: mergedTabs };
    }
  } catch {}
  return DEFAULT_BOTTOM_TAB_CONFIG;
}

// Save tab config to localStorage
function saveBottomTabConfig(config: BottomTabConfig) {
  try {
    localStorage.setItem('grudge-engine-bottom-tabs', JSON.stringify(config));
  } catch {}
}


export interface PendingExample {
  id: string;
  name: string;
  create: (scene: any) => void;
}

export interface AnimationInfo {
  objectId: string;
  animations: string[];
  currentAnimation: string | null;
}

export interface EngineMetrics {
  fps: number;
  drawCalls: number;
  vertices: number;
  triangles: number;
  renderMs: number;
  memoryMB: number;
}

export interface LightingSettings {
  ambientIntensity: number;
  sunIntensity: number;
  shadowStrength: number;
}

export interface ProjectSettings {
  projectName: string;
  companyName: string;
  version: string;
  defaultFullscreen: boolean;
}

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  ambient: number;
}

export interface SnapSettings {
  enabled: boolean;
  translate: number;
  rotate: number;
  scale: number;
}

function loadSnapSettings(): SnapSettings {
  try {
    const saved = localStorage.getItem('grudge-engine-snap-settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { enabled: false, translate: 0.25, rotate: 15, scale: 0.25 };
}

function saveSnapSettingsToStorage(s: SnapSettings) {
  try { localStorage.setItem('grudge-engine-snap-settings', JSON.stringify(s)); } catch {}
}

function loadProjectSettings(): ProjectSettings {
  try {
    const saved = localStorage.getItem('grudge-engine-project-settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { projectName: 'My Game Project', companyName: 'My Company', version: '1.0.0', defaultFullscreen: false };
}

function saveProjectSettingsToStorage(s: ProjectSettings) {
  try { localStorage.setItem('grudge-engine-project-settings', JSON.stringify(s)); } catch {}
}

function loadLightingSettings(): LightingSettings {
  try {
    const saved = localStorage.getItem('grudge-engine-lighting-settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { ambientIntensity: 0.3, sunIntensity: 1.0, shadowStrength: 0.7 };
}

function saveLightingSettingsToStorage(s: LightingSettings) {
  try { localStorage.setItem('grudge-engine-lighting-settings', JSON.stringify(s)); } catch {}
}

function loadAudioSettings(): AudioSettings {
  try {
    const saved = localStorage.getItem('grudge-engine-audio-settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { master: 80, music: 70, sfx: 90, ambient: 60 };
}

function saveAudioSettingsToStorage(s: AudioSettings) {
  try { localStorage.setItem('grudge-engine-audio-settings', JSON.stringify(s)); } catch {}
}

interface EngineState {
  project: Project | null;
  animationRegistry: Map<string, AnimationInfo>;
  meshCountRegistry: Map<string, number>;
  currentScene: Scene | null;
  currentSceneId: string | null;
  selectedObjectId: string | null;
  selectedAssetId: string | null;
  consoleLogs: ConsoleLog[];
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  activeBottomTab: BottomTabType;
  activeRightTab: 'transform' | 'asset' | 'material' | 'components';
  bottomTabConfig: BottomTabConfig;
  viewMode: 'pbr' | 'wireframe' | 'debug';
  showGrid: boolean;
  showStats: boolean;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  isLoading: boolean;
  pendingExample: PendingExample | null;
  pendingFocusObjectId: string | null;
  pendingPresetSceneId: string | null;
  engineMetrics: EngineMetrics;
  lightingSettings: LightingSettings;
  projectSettings: ProjectSettings;
  audioSettings: AudioSettings;
  snapSettings: SnapSettings;
  
  _getCurrentSceneIndex: () => number;
  setProject: (project: Project | null) => void;
  setCurrentScene: (scene: Scene | null) => void;
  setCurrentSceneId: (sceneId: string | null) => void;
  getCurrentScene: () => Scene | null;
  addScene: (name?: string) => Scene;
  deleteScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => void;
  duplicateScene: (sceneId: string) => Scene | null;
  selectObject: (id: string | null) => void;
  selectAsset: (id: string | null) => void;
  addConsoleLog: (log: Omit<ConsoleLog, 'id' | 'timestamp'>) => void;
  clearConsoleLogs: () => void;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  setCurrentTime: (time: number) => void;
  setActiveBottomTab: (tab: BottomTabType) => void;
  setBottomTabConfig: (config: BottomTabConfig) => void;
  toggleBottomTabVisibility: (tab: BottomTabType) => void;
  reorderBottomTabs: (tabs: BottomTabType[]) => void;
  setActiveRightTab: (tab: 'transform' | 'asset' | 'material' | 'components') => void;
  setViewMode: (mode: 'pbr' | 'wireframe' | 'debug') => void;
  toggleGrid: () => void;
  toggleStats: () => void;
  setCloudSyncStatus: (status: 'synced' | 'syncing' | 'offline' | 'error') => void;
  setLoading: (loading: boolean) => void;
  
  addGameObject: (object: GameObject) => void;
  updateGameObject: (id: string, updates: Partial<GameObject>) => void;
  deleteGameObject: (id: string) => void;
  updateTransform: (id: string, transform: Partial<Transform>) => void;
  
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addAssetToScene: (asset: Asset) => void;
  
  addComponent: (objectId: string, component: Component) => void;
  updateComponent: (objectId: string, componentId: string, properties: Record<string, any>) => void;
  removeComponent: (objectId: string, componentId: string) => void;
  toggleComponent: (objectId: string, componentId: string) => void;
  
  prefabs: Prefab[];
  scriptableObjects: ScriptableObject[];
  createPrefab: (name: string, object: GameObject) => Prefab;
  instantiatePrefab: (prefabId: string) => void;
  deletePrefab: (prefabId: string) => void;
  
  setParent: (childId: string, parentId: string | null) => void;
  getChildren: (parentId: string) => GameObject[];
  getDescendants: (parentId: string) => GameObject[];
  setVisibilityRecursive: (objectId: string, visible: boolean) => void;
  duplicateObject: (objectId: string) => void;
  addTag: (objectId: string, tag: string) => void;
  removeTag: (objectId: string, tag: string) => void;
  setLayer: (objectId: string, layer: number) => void;
  findByTag: (tag: string) => GameObject[];
  findByLayer: (layer: number) => GameObject[];
  
  createScriptableObject: (type: ScriptableObjectType, name: string, data?: Record<string, any>) => ScriptableObject;
  updateScriptableObject: (id: string, data: Record<string, any>) => void;
  deleteScriptableObject: (id: string) => void;
  
  saveToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  
  setPendingExample: (example: PendingExample | null) => void;
  clearPendingExample: () => void;
  
  setPresetScene: (sceneId: string | null) => void;
  clearPresetScene: () => void;
  
  groupObjects: (objectIds: string[], groupName?: string) => void;

  focusOnObject: (objectId: string) => void;
  clearPendingFocus: () => void;
  
  registerAnimations: (objectId: string, animations: string[]) => void;
  setCurrentAnimation: (objectId: string, animationName: string | null) => void;
  getAnimations: (objectId: string) => AnimationInfo | undefined;
  
  registerMeshCount: (objectId: string, meshCount: number) => void;
  getMeshCount: (objectId: string) => number | undefined;

  setEngineMetrics: (metrics: Partial<EngineMetrics>) => void;
  setLightingSettings: (settings: Partial<LightingSettings>) => void;
  setProjectSettings: (settings: Partial<ProjectSettings>) => void;
  setAudioSettings: (settings: Partial<AudioSettings>) => void;
  setSnapSettings: (settings: Partial<SnapSettings>) => void;

  // Reactive queue for live GLB loading after assets are dropped into the scene
  pendingViewportLoads: PendingViewportLoad[];
  consumePendingViewportLoads: () => PendingViewportLoad[];
}

export interface PendingViewportLoad {
  gameObjectId: string;
  modelPath: string;
  name: string;
  tags: string[];
  scale: number;
}

const createDefaultProject = (): Project => ({
  id: crypto.randomUUID(),
  name: 'New Project',
  description: 'A new Grudge Engine project',
  scenes: [{
    id: crypto.randomUUID(),
    name: 'Main Scene',
    objects: [
    // empty — add objects via the Hierarchy or by loading a Demo Scene
    ],
    settings: {
      ambientColor: '#1a1a2e',
      fogEnabled: false,
      fogColor: '#888888',
      fogDensity: 0.01,
      gravity: { x: 0, y: -9.81, z: 0 }
    }
  }],
  assets: [
    // === PREFABS ===
    { id: 'prefab-warrior', name: 'Warrior Player', type: 'prefab', path: '/prefabs/warrior-player.prefab', metadata: {
      modelPath: '/assets/animations/racalvin-warrior/character-model.glb',
      animationCount: 52,
      controllerType: 'warrior',
      animations: ['idle','walk','run','sprint','jump','slash-combo','heavy-attack','block','crouch','dodge','kick','cast','power-up','draw-sword','sheath-sword','death'],
      tags: ['character', 'humanoid', 'warrior', 'player', 'orc'],
      description: 'Orc Warrior with 52 Mixamo animations, full combat system, hotkeys 1-0',
    }},
    { id: 'prefab-knight', name: 'Knight Character', type: 'prefab', path: '/prefabs/knight-character.prefab', metadata: {
      modelPath: '/assets/characters/knight/KnightAndSword.glb',
      animations: ['Idle', 'Walk', 'Run', 'Attack', 'Death'],
      scale: 0.01,
      tags: ['character', 'humanoid', 'knight', 'player'],
    }},
    { id: crypto.randomUUID(), name: 'Enemy Basic', type: 'prefab', path: '/prefabs/enemy-basic.prefab' },
    { id: crypto.randomUUID(), name: 'Spawn Point', type: 'prefab', path: '/prefabs/spawn-point.prefab' },
    { id: crypto.randomUUID(), name: 'Checkpoint', type: 'prefab', path: '/prefabs/checkpoint.prefab' },
    { id: crypto.randomUUID(), name: 'Collectible Coin', type: 'prefab', path: '/prefabs/collectible-coin.prefab' },
    { id: crypto.randomUUID(), name: 'Health Pickup', type: 'prefab', path: '/prefabs/health-pickup.prefab' },

    // === CORE SCRIPTS ===
    { id: crypto.randomUUID(), name: 'GameManager', type: 'script', path: '/scripts/core/GameManager.ts' },
    { id: crypto.randomUUID(), name: 'InputManager', type: 'script', path: '/scripts/core/InputManager.ts' },
    { id: crypto.randomUUID(), name: 'AudioManager', type: 'script', path: '/scripts/core/AudioManager.ts' },
    { id: crypto.randomUUID(), name: 'SceneManager', type: 'script', path: '/scripts/core/SceneManager.ts' },
    { id: crypto.randomUUID(), name: 'EventBus', type: 'script', path: '/scripts/core/EventBus.ts' },
    { id: crypto.randomUUID(), name: 'SaveManager', type: 'script', path: '/scripts/core/SaveManager.ts' },
    { id: crypto.randomUUID(), name: 'PlayerController', type: 'script', path: '/scripts/player/PlayerController.ts' },
    { id: crypto.randomUUID(), name: 'ThirdPersonController', type: 'script', path: '/scripts/player/ThirdPersonController.ts' },
    { id: crypto.randomUUID(), name: 'FirstPersonController', type: 'script', path: '/scripts/player/FirstPersonController.ts' },
    { id: crypto.randomUUID(), name: 'CharacterMotor', type: 'script', path: '/scripts/player/CharacterMotor.ts' },
    { id: crypto.randomUUID(), name: 'FollowCamera', type: 'script', path: '/scripts/camera/FollowCamera.ts' },
    { id: crypto.randomUUID(), name: 'OrbitCamera', type: 'script', path: '/scripts/camera/OrbitCamera.ts' },
    { id: crypto.randomUUID(), name: 'CameraShake', type: 'script', path: '/scripts/camera/CameraShake.ts' },
    { id: crypto.randomUUID(), name: 'AIController', type: 'script', path: '/scripts/ai/AIController.ts' },
    { id: crypto.randomUUID(), name: 'StateMachine', type: 'script', path: '/scripts/ai/StateMachine.ts' },
    { id: crypto.randomUUID(), name: 'NavMeshAgent', type: 'script', path: '/scripts/ai/NavMeshAgent.ts' },
    { id: crypto.randomUUID(), name: 'BehaviorTree', type: 'script', path: '/scripts/ai/BehaviorTree.ts' },
    { id: crypto.randomUUID(), name: 'CombatSystem', type: 'script', path: '/scripts/combat/CombatSystem.ts' },
    { id: crypto.randomUUID(), name: 'DamageHandler', type: 'script', path: '/scripts/combat/DamageHandler.ts' },
    { id: crypto.randomUUID(), name: 'WeaponSystem', type: 'script', path: '/scripts/combat/WeaponSystem.ts' },
    { id: crypto.randomUUID(), name: 'RigidBody', type: 'script', path: '/scripts/physics/RigidBody.ts' },
    { id: crypto.randomUUID(), name: 'TriggerZone', type: 'script', path: '/scripts/physics/TriggerZone.ts' },
    { id: crypto.randomUUID(), name: 'ObjectPool', type: 'script', path: '/scripts/utility/ObjectPool.ts' },
    { id: crypto.randomUUID(), name: 'Spawner', type: 'script', path: '/scripts/utility/Spawner.ts' },
    { id: crypto.randomUUID(), name: 'Timer', type: 'script', path: '/scripts/utility/Timer.ts' },

    // === MATERIALS ===
    { id: crypto.randomUUID(), name: 'Default Material', type: 'material', path: '/materials/default.mat' },
    { id: crypto.randomUUID(), name: 'Standard PBR', type: 'material', path: '/materials/standard-pbr.mat' },
    { id: crypto.randomUUID(), name: 'Transparent', type: 'material', path: '/materials/transparent.mat' },
    { id: crypto.randomUUID(), name: 'Emissive', type: 'material', path: '/materials/emissive.mat' },
    { id: crypto.randomUUID(), name: 'Water', type: 'material', path: '/materials/water.mat' },
    { id: crypto.randomUUID(), name: 'Metal', type: 'material', path: '/materials/metal.mat' },
  ],
  settings: {
    renderMode: 'pbr',
    antiAliasing: true,
    shadows: true,
    postProcessing: true
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export const useEngineStore = create<EngineState>((set, get) => ({
  project: createDefaultProject(),
  animationRegistry: new Map<string, AnimationInfo>(),
  meshCountRegistry: new Map<string, number>(),
  currentScene: null,
  currentSceneId: null,
  selectedObjectId: null,
  selectedAssetId: null,
  consoleLogs: [
    { id: '1', type: 'info', message: 'Grudge Engine initialized', timestamp: new Date().toISOString(), source: 'Engine' },
    { id: '2', type: 'info', message: 'Babylon.js renderer ready', timestamp: new Date().toISOString(), source: 'Renderer' },
    { id: '3', type: 'info', message: 'Puter.js cloud services available', timestamp: new Date().toISOString(), source: 'Cloud' },
  ],
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  activeBottomTab: 'console',
  activeRightTab: 'transform',
  bottomTabConfig: loadBottomTabConfig(),
  viewMode: 'pbr',
  showGrid: true,
  showStats: false,
  cloudSyncStatus: isPuterAvailable() ? 'synced' : 'offline',
  isLoading: false,
  pendingExample: null,
  pendingFocusObjectId: null,
  pendingPresetSceneId: null,
  engineMetrics: { fps: 0, drawCalls: 0, vertices: 0, triangles: 0, renderMs: 0, memoryMB: 0 },
  lightingSettings: loadLightingSettings(),
  projectSettings: loadProjectSettings(),
  audioSettings: loadAudioSettings(),
  snapSettings: loadSnapSettings(),
  pendingViewportLoads: [],
  
  setProject: (project) => set({ project }),
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentScene: (scene) => set({ currentScene: scene }),
  setCurrentSceneId: (sceneId) => set({ currentSceneId: sceneId, selectedObjectId: null }),
  
  getCurrentScene: () => {
    const state = get();
    if (!state.project) return null;
    const sceneId = state.currentSceneId || state.project.scenes[0]?.id;
    return state.project.scenes.find(s => s.id === sceneId) || state.project.scenes[0] || null;
  },
  
  // Helper to get current scene index for mutations
  _getCurrentSceneIndex: (): number => {
    const state = get();
    if (!state.project) return -1;
    const sceneId = state.currentSceneId || state.project.scenes[0]?.id;
    const idx = state.project.scenes.findIndex(s => s.id === sceneId);
    return idx >= 0 ? idx : 0;
  },
  
  addScene: (name?: string) => {
    const state = get();
    if (!state.project) {
      return { id: '', name: '', objects: [], settings: { ambientColor: '#1a1a2e', fogEnabled: false, fogColor: '#888888', fogDensity: 0.01, gravity: { x: 0, y: -9.81, z: 0 } } };
    }
    const sceneName = name || `Scene ${state.project.scenes.length + 1}`;
    const newScene: Scene = {
      id: crypto.randomUUID(),
      name: sceneName,
      objects: [],
      settings: {
        ambientColor: '#1a1a2e',
        fogEnabled: false,
        fogColor: '#888888',
        fogDensity: 0.01,
        gravity: { x: 0, y: -9.81, z: 0 }
      }
    };
    set({
      project: { ...state.project, scenes: [...state.project.scenes, newScene] },
      currentSceneId: newScene.id,
      selectedObjectId: null
    });
    return newScene;
  },
  
  deleteScene: (sceneId) => set((state) => {
    if (!state.project || state.project.scenes.length <= 1) return state;
    const newScenes = state.project.scenes.filter(s => s.id !== sceneId);
    const newCurrentSceneId = state.currentSceneId === sceneId ? newScenes[0]?.id || null : state.currentSceneId;
    return {
      project: { ...state.project, scenes: newScenes },
      currentSceneId: newCurrentSceneId,
      selectedObjectId: null
    };
  }),
  
  renameScene: (sceneId, name) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        scenes: state.project.scenes.map(s => s.id === sceneId ? { ...s, name } : s)
      }
    };
  }),
  
  duplicateScene: (sceneId) => {
    const state = get();
    if (!state.project) return null;
    const original = state.project.scenes.find(s => s.id === sceneId);
    if (!original) return null;
    
    const duplicateObjects = (objects: GameObject[]): GameObject[] => {
      const idMap = new Map<string, string>();
      objects.forEach(obj => idMap.set(obj.id, crypto.randomUUID()));
      
      return objects.map(obj => ({
        ...obj,
        id: idMap.get(obj.id) || crypto.randomUUID(),
        parentId: obj.parentId ? idMap.get(obj.parentId) || null : null,
        children: obj.children.map(cid => idMap.get(cid) || cid),
        components: obj.components.map(c => ({ ...c, id: crypto.randomUUID() }))
      }));
    };
    
    const newScene: Scene = {
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      objects: duplicateObjects(original.objects),
      settings: { ...original.settings }
    };
    
    set({
      project: { ...state.project, scenes: [...state.project.scenes, newScene] },
      currentSceneId: newScene.id,
      selectedObjectId: null
    });
    return newScene;
  },
  
  selectObject: (id) => set({ selectedObjectId: id }),
  selectAsset: (id) => set({ selectedAssetId: id }),
  
  addConsoleLog: (log) => set((state) => ({
    consoleLogs: [...state.consoleLogs, {
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }]
  })),
  
  clearConsoleLogs: () => set({ consoleLogs: [] }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPaused: (paused) => set({ isPaused: paused }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
  setBottomTabConfig: (config) => {
    saveBottomTabConfig(config);
    set({ bottomTabConfig: config });
  },
  toggleBottomTabVisibility: (tabId) => set((state) => {
    const newConfig = {
      ...state.bottomTabConfig,
      tabs: state.bottomTabConfig.tabs.map(t => 
        t.id === tabId ? { ...t, visible: !t.visible } : t
      )
    };
    saveBottomTabConfig(newConfig);
    return { bottomTabConfig: newConfig };
  }),
  reorderBottomTabs: (tabOrder) => set((state) => {
    const newConfig = {
      ...state.bottomTabConfig,
      tabs: state.bottomTabConfig.tabs.map(t => ({
        ...t,
        order: tabOrder.indexOf(t.id)
      })).sort((a, b) => a.order - b.order)
    };
    saveBottomTabConfig(newConfig);
    return { bottomTabConfig: newConfig };
  }),
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleStats: () => set((state) => ({ showStats: !state.showStats })),
  setCloudSyncStatus: (status) => set({ cloudSyncStatus: status }),

  addGameObject: (object) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: [...newScenes[sceneIdx].objects, object]
    };
    return {
      project: { ...state.project, scenes: newScenes }
    };
  }),
  
  updateGameObject: (id, updates) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj =>
        obj.id === id ? { ...obj, ...updates } : obj
      )
    };
    return {
      project: { ...state.project, scenes: newScenes }
    };
  }),
  
  deleteGameObject: (id) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.filter(obj => obj.id !== id)
    };
    return {
      project: { ...state.project, scenes: newScenes },
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId
    };
  }),
  
  updateTransform: (id, transform) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj =>
        obj.id === id ? { ...obj, transform: { ...obj.transform, ...transform } } : obj
      )
    };
    return {
      project: { ...state.project, scenes: newScenes }
    };
  }),
  
  addAsset: (asset) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        assets: [...state.project.assets, asset]
      }
    };
  }),
  
  updateAsset: (id, updates) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        assets: state.project.assets.map(a => 
          a.id === id ? { ...a, ...updates } : a
        )
      }
    };
  }),
  
  deleteAsset: (id) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        assets: state.project.assets.filter(a => a.id !== id)
      },
      selectedAssetId: state.selectedAssetId === id ? null : state.selectedAssetId
    };
  }),
  
  addAssetToScene: (asset) => {
    const state = get();
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return;
    
    const createGameObject = (): GameObject => {
      const baseObject: GameObject = {
        id: crypto.randomUUID(),
        name: asset.name,
        visible: true,
        isStatic: false,
        transform: {
          position: { x: 0, y: 1, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        components: [],
        children: [],
        parentId: null,
        tags: [],
        layer: 0
      };
      
      switch (asset.type) {
        case 'model':
          if (asset.metadata?.category === 'character') {
            baseObject.transform.scale = { 
              x: asset.metadata.scale || 1, 
              y: asset.metadata.scale || 1, 
              z: asset.metadata.scale || 1 
            };
            baseObject.tags = ['character', 'model'];
            baseObject.components = [
              {
                id: crypto.randomUUID(),
                type: 'mesh',
                enabled: true,
                properties: { 
                  type: 'imported',
                  modelPath: asset.path,
                  textures: asset.metadata.textures || {},
                  castShadows: true,
                  receiveShadows: true,
                }
              },
              {
                id: crypto.randomUUID(),
                type: 'script',
                enabled: true,
                properties: {
                  scriptType: 'animator',
                  animations: asset.metadata.animations || [],
                  defaultAnimation: asset.metadata.animations?.[0] || 'Idle',
                  autoPlay: true,
                }
              }
            ];
          } else {
            baseObject.components = [{
              id: crypto.randomUUID(),
              type: 'mesh',
              enabled: true,
              properties: { 
                type: 'imported',
                modelPath: asset.path,
                color: '#ffffff'
              }
            }];
          }
          break;
          
        case 'prefab':
          baseObject.prefabId = asset.id;
          baseObject.tags = asset.metadata?.tags || ['prefab-instance'];
          
          if (asset.metadata?.modelPath) {
            baseObject.transform.scale = { 
              x: asset.metadata.scale || 1, 
              y: asset.metadata.scale || 1, 
              z: asset.metadata.scale || 1 
            };
            
            const isWarriorPrefab = asset.metadata.controllerType === 'warrior';
            baseObject.components = [
              {
                id: crypto.randomUUID(),
                type: 'mesh',
                enabled: true,
                properties: { 
                  type: 'imported',
                  modelPath: asset.metadata.modelPath,
                  textures: asset.metadata.textures || {},
                  castShadows: true,
                  receiveShadows: true,
                }
              },
              {
                id: crypto.randomUUID(),
                type: 'script',
                enabled: true,
                properties: {
                  scriptType: isWarriorPrefab ? 'warriorController' : 'characterController',
                  animations: asset.metadata.animations || [],
                  defaultAnimation: isWarriorPrefab ? 'idle' : (asset.metadata.animations?.[0] || 'Idle'),
                  moveSpeed: 5,
                  rotationSpeed: 120,
                  ...(isWarriorPrefab ? { animationCount: 52, controllerType: 'warrior' } : {}),
                }
              }
            ];
          } else {
            baseObject.components = [{
              id: crypto.randomUUID(),
              type: 'mesh',
              enabled: true,
              properties: { 
                type: 'capsule', 
                color: '#00ff88',
                prefabAssetPath: asset.path,
                prefabName: asset.name
              }
            }];
          }
          baseObject.name = `${asset.name} (Instance)`;
          break;
          
        case 'material':
          baseObject.components = [{
            id: crypto.randomUUID(),
            type: 'mesh',
            enabled: true,
            properties: { 
              type: 'box', 
              materialPath: asset.path,
              color: '#ffffff'
            }
          }];
          break;
          
        case 'texture':
          baseObject.components = [{
            id: crypto.randomUUID(),
            type: 'mesh',
            enabled: true,
            properties: { 
              type: 'plane', 
              texturePath: asset.path,
              color: '#ffffff'
            }
          }];
          baseObject.transform.rotation = { x: -90, y: 0, z: 0 };
          break;
          
        case 'audio':
          baseObject.components = [{
            id: crypto.randomUUID(),
            type: 'audio',
            enabled: true,
            properties: { 
              audioPath: asset.path,
              volume: 1,
              loop: false,
              playOnStart: false
            }
          }];
          break;
          
        case 'script':
          baseObject.components = [{
            id: crypto.randomUUID(),
            type: 'script',
            enabled: true,
            properties: { 
              scriptPath: asset.path,
              scriptName: asset.name
            }
          }];
          break;
          
        case 'animation':
          baseObject.components = [{
            id: crypto.randomUUID(),
            type: 'script',
            enabled: true,
            properties: { 
              scriptType: 'animation',
              animationPath: asset.path,
              animationName: asset.name,
              autoPlay: true
            }
          }];
          break;
          
        default:
          // No mesh component for unknown asset types - must be explicitly added
          baseObject.components = [];
      }
      
      return baseObject;
    };
    
    const newObject = createGameObject();
    state.addGameObject(newObject);
    state.selectObject(newObject.id);
    state.addConsoleLog({ 
      type: 'info', 
      message: `Added "${asset.name}" to scene`, 
      source: 'Scene' 
    });

    // Queue model load so the Viewport reactively loads the GLB into Babylon
    const meshComp = newObject.components.find(c => c.type === 'mesh');
    const modelPath = meshComp?.properties?.modelPath || asset.metadata?.modelPath || '';
    if (modelPath && (asset.type === 'model' || asset.type === 'prefab')) {
      const scaleVal = newObject.transform.scale.x;
      set(s => ({
        pendingViewportLoads: [
          ...s.pendingViewportLoads,
          {
            gameObjectId: newObject.id,
            modelPath,
            name: newObject.name,
            tags: newObject.tags || [],
            scale: scaleVal,
          }
        ]
      }));
    }
  },
  
  saveToCloud: async () => {
    const state = get();
    if (!state.project || !isPuterAvailable()) return;
    
    set({ cloudSyncStatus: 'syncing' });
    state.addConsoleLog({ type: 'info', message: 'Saving project to cloud...', source: 'Cloud' });
    
    try {
      const projectJson = JSON.stringify(state.project, null, 2);
      await window.puter!.fs.write(
        `grudge-engine/projects/${state.project.id}.json`,
        projectJson,
        { createMissingParents: true }
      );
      
      set({ cloudSyncStatus: 'synced' });
      state.addConsoleLog({ type: 'info', message: 'Project saved to cloud successfully', source: 'Cloud' });
    } catch (error) {
      set({ cloudSyncStatus: 'error' });
      state.addConsoleLog({ type: 'error', message: `Failed to save project: ${error}`, source: 'Cloud' });
    }
  },
  
  loadFromCloud: async () => {
    if (!isPuterAvailable()) return;
    
    const state = get();
    set({ isLoading: true, cloudSyncStatus: 'syncing' });
    state.addConsoleLog({ type: 'info', message: 'Loading project from cloud...', source: 'Cloud' });
    
    try {
      const file = await window.puter!.ui.showOpenFilePicker();
      const blob = await file.read();
      const content = await blob.text();
      const project = JSON.parse(content);
      
      set({ project, isLoading: false, cloudSyncStatus: 'synced' });
      state.addConsoleLog({ type: 'info', message: `Loaded project: ${project.name}`, source: 'Cloud' });
    } catch (error) {
      set({ isLoading: false, cloudSyncStatus: 'error' });
      state.addConsoleLog({ type: 'error', message: `Failed to load project: ${error}`, source: 'Cloud' });
    }
  },
  
  fetchProjects: async () => {
    set({ isLoading: true });
    
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const projects = await response.json();
        if (projects.length > 0) {
          set({ project: projects[0], isLoading: false });
        } else {
          set({ isLoading: false });
        }
      }
    } catch (error) {
      set({ isLoading: false });
      get().addConsoleLog({ type: 'error', message: `Failed to fetch projects: ${error}`, source: 'API' });
    }
  },
  
  setPendingExample: (example) => set({ pendingExample: example }),
  clearPendingExample: () => set({ pendingExample: null }),
  
  setPresetScene: (sceneId) => set({ pendingPresetSceneId: sceneId }),
  clearPresetScene: () => set({ pendingPresetSceneId: null }),
  
  groupObjects: (objectIds: string[], groupName = 'Group') => set((state) => {
    if (!state.project || objectIds.length === 0) return state;
    const currentSceneId = state.currentSceneId || state.project.scenes[0]?.id;
    if (!currentSceneId) return state;
    const groupObj: import('@shared/schema').GameObject = {
      id: crypto.randomUUID(),
      name: groupName,
      visible: true,
      isStatic: false,
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      components: [],
      children: [...objectIds],
      parentId: null,
      tags: ['group'],
      layer: 0,
    };
    const updatedProject = {
      ...state.project,
      scenes: state.project.scenes.map(s => {
        if (s.id !== currentSceneId) return s;
        const updatedObjects = s.objects.map(o =>
          objectIds.includes(o.id) ? { ...o, parentId: groupObj.id } : o
        );
        return { ...s, objects: [...updatedObjects, groupObj] };
      }),
    };
    return { project: updatedProject };
  }),
  
  focusOnObject: (objectId: string) => set({ pendingFocusObjectId: objectId }),
  clearPendingFocus: () => set({ pendingFocusObjectId: null }),
  
  registerAnimations: (objectId: string, animations: string[]) => set((state) => {
    const newRegistry = new Map(state.animationRegistry);
    newRegistry.set(objectId, {
      objectId,
      animations,
      currentAnimation: null // Start with no animation (T-pose)
    });
    return { animationRegistry: newRegistry };
  }),
  
  setCurrentAnimation: (objectId: string, animationName: string | null) => set((state) => {
    const newRegistry = new Map(state.animationRegistry);
    const info = newRegistry.get(objectId);
    if (info) {
      newRegistry.set(objectId, { ...info, currentAnimation: animationName });
    }
    return { animationRegistry: newRegistry };
  }),
  
  getAnimations: (objectId: string) => {
    return get().animationRegistry.get(objectId);
  },
  
  registerMeshCount: (objectId: string, meshCount: number) => set((state) => {
    const newRegistry = new Map(state.meshCountRegistry);
    newRegistry.set(objectId, meshCount);
    return { meshCountRegistry: newRegistry };
  }),
  
  getMeshCount: (objectId: string) => {
    return get().meshCountRegistry.get(objectId);
  },

  setEngineMetrics: (metrics) => set((state) => ({
    engineMetrics: { ...state.engineMetrics, ...metrics }
  })),

  setLightingSettings: (settings) => {
    const merged = { ...get().lightingSettings, ...settings };
    saveLightingSettingsToStorage(merged);
    set({ lightingSettings: merged });
  },

  setProjectSettings: (settings) => {
    const merged = { ...get().projectSettings, ...settings };
    saveProjectSettingsToStorage(merged);
    set({ projectSettings: merged });
  },

  setAudioSettings: (settings) => {
    const merged = { ...get().audioSettings, ...settings };
    saveAudioSettingsToStorage(merged);
    set({ audioSettings: merged });
  },

  setSnapSettings: (settings) => {
    const merged = { ...get().snapSettings, ...settings };
    saveSnapSettingsToStorage(merged);
    set({ snapSettings: merged });
  },

  consumePendingViewportLoads: () => {
    const loads = get().pendingViewportLoads;
    if (loads.length === 0) return [];
    set({ pendingViewportLoads: [] });
    return loads;
  },
  
  prefabs: [],
  
  addComponent: (objectId, component) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj =>
        obj.id === objectId 
          ? { ...obj, components: [...obj.components, component] }
          : obj
      )
    };
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  updateComponent: (objectId, componentId, properties) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj =>
        obj.id === objectId 
          ? {
              ...obj,
              components: obj.components.map(comp =>
                comp.id === componentId
                  ? { ...comp, properties: { ...comp.properties, ...properties } }
                  : comp
              )
            }
          : obj
      )
    };
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  removeComponent: (objectId, componentId) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj =>
        obj.id === objectId 
          ? { ...obj, components: obj.components.filter(c => c.id !== componentId) }
          : obj
      )
    };
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  toggleComponent: (objectId, componentId) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj =>
        obj.id === objectId 
          ? {
              ...obj,
              components: obj.components.map(comp =>
                comp.id === componentId ? { ...comp, enabled: !comp.enabled } : comp
              )
            }
          : obj
      )
    };
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  createPrefab: (name, object) => {
    const prefab: Prefab = {
      id: crypto.randomUUID(),
      name,
      components: [...object.components],
      transform: { ...object.transform },
      tags: object.tags || [],
      layer: object.layer ?? 0,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ prefabs: [...state.prefabs, prefab] }));
    get().addConsoleLog({ type: 'info', message: `Created prefab: ${name}`, source: 'Prefab' });
    return prefab;
  },
  
  instantiatePrefab: (prefabId) => {
    const state = get();
    const prefab = state.prefabs.find(p => p.id === prefabId);
    if (!prefab) return;
    
    const newObject: GameObject = {
      id: crypto.randomUUID(),
      name: `${prefab.name} (Instance)`,
      visible: true,
      isStatic: false,
      transform: { 
        position: { ...prefab.transform.position },
        rotation: { ...prefab.transform.rotation },
        scale: { ...prefab.transform.scale }
      },
      components: prefab.components.map(c => ({ ...c, id: crypto.randomUUID() })),
      children: [],
      parentId: null,
      tags: [...prefab.tags],
      layer: prefab.layer ?? 0,
      prefabId: prefab.id,
    };
    
    state.addGameObject(newObject);
    state.selectObject(newObject.id);
    state.addConsoleLog({ type: 'info', message: `Instantiated prefab: ${prefab.name}`, source: 'Prefab' });
  },
  
  deletePrefab: (prefabId) => set((state) => ({
    prefabs: state.prefabs.filter(p => p.id !== prefabId)
  })),
  
  scriptableObjects: [],
  
  setParent: (childId, parentId) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    const scene = state.project.scenes[sceneIdx];
    const child = scene.objects.find(o => o.id === childId);
    if (!child) return state;
    if (child.parentId === parentId) return state;
    if (childId === parentId) return state;
    
    const oldParentId = child.parentId;
    
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj => {
        if (obj.id === childId) {
          return { ...obj, parentId };
        }
        if (oldParentId && obj.id === oldParentId) {
          return { ...obj, children: obj.children.filter(id => id !== childId) };
        }
        if (parentId && obj.id === parentId && !obj.children.includes(childId)) {
          return { ...obj, children: [...obj.children, childId] };
        }
        return obj;
      })
    };
    
    const action = parentId === null ? 'Unparented' : 'Reparented';
    get().addConsoleLog({ type: 'info', message: `${action} ${child.name}`, source: 'Hierarchy' });
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  getChildren: (parentId) => {
    const state = get();
    const currentScene = get().getCurrentScene();
    const objects = currentScene?.objects || [];
    return objects.filter(o => o.parentId === parentId);
  },
  
  getDescendants: (parentId) => {
    const state = get();
    const currentScene = get().getCurrentScene();
    const objects = currentScene?.objects || [];
    const descendants: GameObject[] = [];
    
    const collectDescendants = (id: string) => {
      const children = objects.filter(o => o.parentId === id);
      children.forEach(child => {
        descendants.push(child);
        collectDescendants(child.id);
      });
    };
    
    collectDescendants(parentId);
    return descendants;
  },
  
  setVisibilityRecursive: (objectId, visible) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    
    const descendants = get().getDescendants(objectId);
    const allIds = [objectId, ...descendants.map(d => d.id)];
    
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj =>
        allIds.includes(obj.id) ? { ...obj, visible } : obj
      )
    };
    
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  duplicateObject: (objectId) => {
    const state = get();
    const currentScene = get().getCurrentScene();
    const original = currentScene?.objects.find(o => o.id === objectId);
    if (!original) return;
    
    const duplicate: GameObject = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      components: original.components.map(c => ({ ...c, id: crypto.randomUUID() })),
      children: [],
      transform: {
        ...original.transform,
        position: { 
          x: original.transform.position.x + 1, 
          y: original.transform.position.y, 
          z: original.transform.position.z 
        }
      }
    };
    
    state.addGameObject(duplicate);
    state.selectObject(duplicate.id);
    state.addConsoleLog({ type: 'info', message: `Duplicated: ${original.name}`, source: 'Hierarchy' });
  },
  
  addTag: (objectId, tag) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj =>
        obj.id === objectId && !obj.tags?.includes(tag)
          ? { ...obj, tags: [...(obj.tags || []), tag] }
          : obj
      )
    };
    
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  removeTag: (objectId, tag) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj =>
        obj.id === objectId
          ? { ...obj, tags: (obj.tags || []).filter(t => t !== tag) }
          : obj
      )
    };
    
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  setLayer: (objectId, layer) => set((state) => {
    const sceneIdx = get()._getCurrentSceneIndex();
    if (!state.project || sceneIdx < 0) return state;
    
    const newScenes = [...state.project.scenes];
    newScenes[sceneIdx] = {
      ...newScenes[sceneIdx],
      objects: newScenes[sceneIdx].objects.map(obj =>
        obj.id === objectId ? { ...obj, layer } : obj
      )
    };
    
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  findByTag: (tag) => {
    const currentScene = get().getCurrentScene();
    return (currentScene?.objects || []).filter(o => o.tags?.includes(tag));
  },
  
  findByLayer: (layer) => {
    const currentScene = get().getCurrentScene();
    return (currentScene?.objects || []).filter(o => (o.layer ?? 0) === layer);
  },
  
  createScriptableObject: (type, name, data = {}) => {
    const now = new Date().toISOString();
    const so: ScriptableObject = {
      id: crypto.randomUUID(),
      name,
      type,
      data,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ scriptableObjects: [...state.scriptableObjects, so] }));
    get().addConsoleLog({ type: 'info', message: `Created ScriptableObject: ${name}`, source: 'Assets' });
    return so;
  },
  
  updateScriptableObject: (id, data) => set((state) => ({
    scriptableObjects: state.scriptableObjects.map(so =>
      so.id === id ? { ...so, data: { ...so.data, ...data }, updatedAt: new Date().toISOString() } : so
    )
  })),
  
  deleteScriptableObject: (id) => set((state) => ({
    scriptableObjects: state.scriptableObjects.filter(so => so.id !== id)
  })),
}));
