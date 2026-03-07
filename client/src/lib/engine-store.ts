import { create } from 'zustand';
import type { GameObject, Asset, Scene, Project, ConsoleLog, AnimationClip, Transform, Component, Prefab, ComponentBlueprint, ScriptableObject, ScriptableObjectType } from '@shared/schema';
import { isPuterAvailable } from './puter';

// Component registry with blueprints for all component types (Unity-like architecture)
export const componentRegistry: ComponentBlueprint[] = [
  // === RENDERING COMPONENTS ===
  {
    type: 'mesh',
    displayName: 'Mesh Renderer',
    description: 'Renders 3D geometry with mesh data',
    icon: 'Box',
    defaultProperties: { type: 'box', modelPath: '', castShadow: true, receiveShadow: true },
    propertyDescriptors: [
      { key: 'type', label: 'Mesh Type', type: 'select', default: 'box', options: ['box', 'sphere', 'cylinder', 'capsule', 'plane', 'cone', 'torus', 'imported'] },
      { key: 'modelPath', label: 'Model Path', type: 'string', default: '' },
      { key: 'castShadow', label: 'Cast Shadow', type: 'boolean', default: true },
      { key: 'receiveShadow', label: 'Receive Shadow', type: 'boolean', default: true },
    ]
  },
  {
    type: 'material',
    displayName: 'Material',
    description: 'Surface appearance with textures and shading',
    icon: 'Palette',
    defaultProperties: { 
      type: 'pbr', 
      albedoColor: '#6366f1', 
      albedoTexture: '',
      normalTexture: '',
      metallicTexture: '',
      metallic: 0,
      roughness: 0.5,
      emissiveColor: '#000000',
      emissiveIntensity: 0,
      alphaMode: 'opaque',
      twoSided: false
    },
    propertyDescriptors: [
      { key: 'type', label: 'Material Type', type: 'select', default: 'pbr', options: ['pbr', 'standard', 'unlit'] },
      { key: 'albedoColor', label: 'Albedo Color', type: 'color', default: '#6366f1' },
      { key: 'albedoTexture', label: 'Albedo Texture', type: 'string', default: '' },
      { key: 'normalTexture', label: 'Normal Map', type: 'string', default: '' },
      { key: 'metallicTexture', label: 'Metallic Map', type: 'string', default: '' },
      { key: 'metallic', label: 'Metallic', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
      { key: 'roughness', label: 'Roughness', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'emissiveColor', label: 'Emissive Color', type: 'color', default: '#000000' },
      { key: 'emissiveIntensity', label: 'Emissive Intensity', type: 'number', default: 0, min: 0, max: 10, step: 0.1 },
      { key: 'alphaMode', label: 'Alpha Mode', type: 'select', default: 'opaque', options: ['opaque', 'blend', 'mask'] },
      { key: 'twoSided', label: 'Two Sided', type: 'boolean', default: false },
    ]
  },
  // === CHARACTER & ANIMATION COMPONENTS ===
  {
    type: 'controller',
    displayName: 'Character Controller',
    description: 'Third-person or first-person character movement',
    icon: 'Gamepad2',
    defaultProperties: {
      type: 'thirdPerson',
      walkSpeed: 4,
      runSpeed: 8,
      jumpForce: 8,
      gravity: 20,
      groundCheckDistance: 0.2,
      slopeLimit: 45,
      stepOffset: 0.3,
      cameraDistance: 6,
      cameraHeight: 2,
      canJump: true,
      canRun: true,
      canCrouch: false
    },
    propertyDescriptors: [
      { key: 'type', label: 'Controller Type', type: 'select', default: 'thirdPerson', options: ['thirdPerson', 'firstPerson', 'topDown', 'sidescroller'] },
      { key: 'walkSpeed', label: 'Walk Speed', type: 'number', default: 4, min: 0, max: 20, step: 0.5 },
      { key: 'runSpeed', label: 'Run Speed', type: 'number', default: 8, min: 0, max: 40, step: 0.5 },
      { key: 'jumpForce', label: 'Jump Force', type: 'number', default: 8, min: 0, max: 30, step: 0.5 },
      { key: 'gravity', label: 'Gravity', type: 'number', default: 20, min: 0, max: 50, step: 1 },
      { key: 'cameraDistance', label: 'Camera Distance', type: 'number', default: 6, min: 1, max: 20, step: 0.5 },
      { key: 'cameraHeight', label: 'Camera Height', type: 'number', default: 2, min: 0, max: 10, step: 0.5 },
      { key: 'canJump', label: 'Can Jump', type: 'boolean', default: true },
      { key: 'canRun', label: 'Can Run', type: 'boolean', default: true },
    ]
  },
  {
    type: 'animator',
    displayName: 'Animator',
    description: 'Animation state machine and blending',
    icon: 'Play',
    defaultProperties: {
      defaultAnimation: '',
      blendSpeed: 0.25,
      rootMotion: false,
      animationClips: []
    },
    propertyDescriptors: [
      { key: 'defaultAnimation', label: 'Default Animation', type: 'string', default: '' },
      { key: 'blendSpeed', label: 'Blend Speed', type: 'number', default: 0.25, min: 0.01, max: 2, step: 0.01 },
      { key: 'rootMotion', label: 'Root Motion', type: 'boolean', default: false },
    ]
  },
  // === LIGHTING COMPONENTS ===
  {
    type: 'light',
    displayName: 'Light',
    description: 'Illuminates the scene',
    icon: 'Sun',
    defaultProperties: { type: 'point', color: '#ffffff', intensity: 1, range: 10, castShadows: true },
    propertyDescriptors: [
      { key: 'type', label: 'Light Type', type: 'select', default: 'point', options: ['point', 'directional', 'spot', 'hemispheric'] },
      { key: 'color', label: 'Color', type: 'color', default: '#ffffff' },
      { key: 'intensity', label: 'Intensity', type: 'number', default: 1, min: 0, max: 10, step: 0.1 },
      { key: 'range', label: 'Range', type: 'number', default: 10, min: 0, max: 100, step: 1 },
      { key: 'castShadows', label: 'Cast Shadows', type: 'boolean', default: true },
    ]
  },
  {
    type: 'camera',
    displayName: 'Camera',
    description: 'Viewpoint for rendering',
    icon: 'Camera',
    defaultProperties: { fov: 60, near: 0.1, far: 1000 },
    propertyDescriptors: [
      { key: 'fov', label: 'Field of View', type: 'number', default: 60, min: 30, max: 120, step: 1 },
      { key: 'near', label: 'Near Clip', type: 'number', default: 0.1, min: 0.01, max: 10, step: 0.01 },
      { key: 'far', label: 'Far Clip', type: 'number', default: 1000, min: 100, max: 10000, step: 100 },
    ]
  },
  // === PHYSICS COMPONENTS ===
  {
    type: 'physics',
    displayName: 'Rigidbody',
    description: 'Physics simulation with mass and forces',
    icon: 'Atom',
    defaultProperties: { mass: 1, useGravity: true, isKinematic: false, friction: 0.5, restitution: 0.3, drag: 0, angularDrag: 0.05 },
    propertyDescriptors: [
      { key: 'mass', label: 'Mass', type: 'number', default: 1, min: 0, max: 1000, step: 0.1 },
      { key: 'useGravity', label: 'Use Gravity', type: 'boolean', default: true },
      { key: 'isKinematic', label: 'Is Kinematic', type: 'boolean', default: false },
      { key: 'friction', label: 'Friction', type: 'number', default: 0.5, min: 0, max: 1, step: 0.1 },
      { key: 'restitution', label: 'Bounciness', type: 'number', default: 0.3, min: 0, max: 1, step: 0.1 },
      { key: 'drag', label: 'Drag', type: 'number', default: 0, min: 0, max: 10, step: 0.1 },
      { key: 'angularDrag', label: 'Angular Drag', type: 'number', default: 0.05, min: 0, max: 10, step: 0.01 },
    ]
  },
  {
    type: 'collider',
    displayName: 'Collider',
    description: 'Collision detection shape',
    icon: 'Square',
    defaultProperties: { type: 'box', isTrigger: false, center: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 } },
    propertyDescriptors: [
      { key: 'type', label: 'Collider Type', type: 'select', default: 'box', options: ['box', 'sphere', 'capsule', 'mesh'] },
      { key: 'isTrigger', label: 'Is Trigger', type: 'boolean', default: false },
    ]
  },
  // === BEHAVIOR COMPONENTS ===
  {
    type: 'script',
    displayName: 'Script',
    description: 'Custom behavior and game logic',
    icon: 'FileCode',
    defaultProperties: { scriptPath: '', scriptName: '', autoStart: true },
    propertyDescriptors: [
      { key: 'scriptPath', label: 'Script Path', type: 'string', default: '' },
      { key: 'scriptName', label: 'Script Name', type: 'string', default: '' },
      { key: 'autoStart', label: 'Auto Start', type: 'boolean', default: true },
    ]
  },
  {
    type: 'audio',
    displayName: 'Audio Source',
    description: 'Plays 3D spatial audio',
    icon: 'Volume2',
    defaultProperties: { audioPath: '', volume: 1, loop: false, playOnStart: false, spatialBlend: 1, minDistance: 1, maxDistance: 50 },
    propertyDescriptors: [
      { key: 'audioPath', label: 'Audio File', type: 'string', default: '' },
      { key: 'volume', label: 'Volume', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
      { key: 'loop', label: 'Loop', type: 'boolean', default: false },
      { key: 'playOnStart', label: 'Play On Start', type: 'boolean', default: false },
      { key: 'spatialBlend', label: 'Spatial Blend', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
      { key: 'minDistance', label: 'Min Distance', type: 'number', default: 1, min: 0, max: 100, step: 1 },
      { key: 'maxDistance', label: 'Max Distance', type: 'number', default: 50, min: 0, max: 500, step: 5 },
    ]
  },
  {
    type: 'particle',
    displayName: 'Particle System',
    description: 'Particle effects and VFX',
    icon: 'Sparkles',
    defaultProperties: { maxParticles: 1000, emitRate: 100, lifetime: 2, size: 0.1, color: '#ffffff', texture: '' },
    propertyDescriptors: [
      { key: 'maxParticles', label: 'Max Particles', type: 'number', default: 1000, min: 1, max: 10000, step: 100 },
      { key: 'emitRate', label: 'Emit Rate', type: 'number', default: 100, min: 1, max: 1000, step: 10 },
      { key: 'lifetime', label: 'Lifetime', type: 'number', default: 2, min: 0.1, max: 10, step: 0.1 },
      { key: 'size', label: 'Size', type: 'number', default: 0.1, min: 0.01, max: 10, step: 0.01 },
      { key: 'color', label: 'Color', type: 'color', default: '#ffffff' },
      { key: 'texture', label: 'Particle Texture', type: 'string', default: '' },
    ]
  },
];

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

// ─── Undo/Redo History ─────────────────────────────────────────────────
const MAX_UNDO_HISTORY = 50;

interface HistoryEntry {
  label: string;
  projectSnapshot: string; // JSON-serialized project
}

interface EngineState {
  project: Project | null;
  animationRegistry: Map<string, AnimationInfo>;
  currentScene: Scene | null;
  selectedObjectId: string | null;
  selectedAssetId: string | null;
  consoleLogs: ConsoleLog[];
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  activeBottomTab: 'console' | 'timeline' | 'animation' | 'ai' | 'scripts' | 'library';
  activeRightTab: 'transform' | 'material' | 'components' | 'ai';
  viewMode: 'pbr' | 'wireframe' | 'debug';
  showGrid: boolean;
  showStats: boolean;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  isLoading: boolean;
  pendingExample: PendingExample | null;
  pendingFocusObjectId: string | null;
  
  // Undo/Redo
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  
  setProject: (project: Project | null) => void;
  setCurrentScene: (scene: Scene | null) => void;
  selectObject: (id: string | null) => void;
  selectAsset: (id: string | null) => void;
  addConsoleLog: (log: Omit<ConsoleLog, 'id' | 'timestamp'>) => void;
  clearConsoleLogs: () => void;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  setCurrentTime: (time: number) => void;
  setActiveBottomTab: (tab: 'console' | 'timeline' | 'animation' | 'ai' | 'scripts' | 'library') => void;
  setActiveRightTab: (tab: 'transform' | 'material' | 'components' | 'ai') => void;
  setViewMode: (mode: 'pbr' | 'wireframe' | 'debug') => void;
  toggleGrid: () => void;
  toggleStats: () => void;
  setCloudSyncStatus: (status: 'synced' | 'syncing' | 'offline' | 'error') => void;
  setLoading: (loading: boolean) => void;
  
  // Undo/Redo actions
  pushUndo: (label: string) => void;
  undo: () => void;
  redo: () => void;
  
  // Export/Import
  exportProject: () => void;
  importProject: (file: File) => Promise<void>;
  
  addGameObject: (object: GameObject) => void;
  updateGameObject: (id: string, updates: Partial<GameObject>) => void;
  deleteGameObject: (id: string) => void;
  updateTransform: (id: string, transform: Partial<Transform>) => void;
  
  addAsset: (asset: Asset) => void;
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
  
  focusOnObject: (objectId: string) => void;
  clearPendingFocus: () => void;
  
  registerAnimations: (objectId: string, animations: string[]) => void;
  setCurrentAnimation: (objectId: string, animationName: string | null) => void;
  getAnimations: (objectId: string) => AnimationInfo | undefined;
}

const createDefaultProject = (): Project => ({
  id: crypto.randomUUID(),
  name: 'New Project',
  description: 'A new Grudge Engine project',
  scenes: [{
    id: crypto.randomUUID(),
    name: 'Main Scene',
    objects: [
      // Camera with proper component
      {
        id: crypto.randomUUID(),
        name: 'Main Camera',
        visible: true,
        isStatic: false,
        transform: {
          position: { x: 0, y: 5, z: -10 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        components: [{
          id: crypto.randomUUID(),
          type: 'camera',
          enabled: true,
          properties: { fov: 60, near: 0.1, far: 1000 }
        }],
        children: [],
        parentId: null,
        tags: ['MainCamera'],
        layer: 0
      },
      // Directional light with shadows
      {
        id: crypto.randomUUID(),
        name: 'Directional Light',
        visible: true,
        isStatic: true,
        transform: {
          position: { x: 0, y: 10, z: 0 },
          rotation: { x: -45, y: 45, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        components: [{
          id: crypto.randomUUID(),
          type: 'light',
          enabled: true,
          properties: { type: 'directional', color: '#fffef0', intensity: 1, castShadows: true }
        }],
        children: [],
        parentId: null,
        tags: [],
        layer: 0
      },
      // Ground with mesh + material components (proper separation)
      {
        id: crypto.randomUUID(),
        name: 'Ground',
        visible: true,
        isStatic: true,
        transform: {
          position: { x: 0, y: -0.05, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 30, y: 0.1, z: 30 }
        },
        components: [
          {
            id: crypto.randomUUID(),
            type: 'mesh',
            enabled: true,
            properties: { type: 'box', castShadow: false, receiveShadow: true }
          },
          {
            id: crypto.randomUUID(),
            type: 'material',
            enabled: true,
            properties: { 
              type: 'pbr', 
              albedoColor: '#2d5a27', 
              metallic: 0, 
              roughness: 0.95 
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'collider',
            enabled: true,
            properties: { type: 'box', isTrigger: false }
          }
        ],
        children: [],
        parentId: null,
        tags: ['environment', 'ground'],
        layer: 7
      },
      // Lizard Warrior - Main playable character with animations
      {
        id: 'player-character',
        name: 'Lizard Warrior',
        visible: true,
        isStatic: false,
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        components: [
          {
            id: crypto.randomUUID(),
            type: 'mesh',
            enabled: true,
            properties: { 
              type: 'imported', 
              modelPath: '/assets/characters/lizard/scene.gltf',
              castShadow: true,
              receiveShadow: true
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'material',
            enabled: true,
            properties: { 
              type: 'model',
              useModelMaterials: true
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'animator',
            enabled: true,
            properties: {
              defaultAnimation: 'idle',
              blendSpeed: 0.25,
              rootMotion: false
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'controller',
            enabled: true,
            properties: {
              type: 'thirdPerson',
              walkSpeed: 4,
              runSpeed: 8,
              jumpForce: 8,
              gravity: 20,
              cameraDistance: 8,
              cameraHeight: 3,
              canJump: true,
              canRun: true
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'collider',
            enabled: true,
            properties: { type: 'capsule', isTrigger: false }
          }
        ],
        children: [],
        parentId: null,
        tags: ['player', 'character'],
        layer: 5
      },
      // War Bear - Companion/NPC with animations
      {
        id: 'warbear-npc',
        name: 'War Bear',
        visible: true,
        isStatic: false,
        transform: {
          position: { x: 5, y: 0, z: 3 },
          rotation: { x: 0, y: -45, z: 0 },
          scale: { x: 1.5, y: 1.5, z: 1.5 }
        },
        components: [
          {
            id: crypto.randomUUID(),
            type: 'mesh',
            enabled: true,
            properties: { 
              type: 'imported', 
              modelPath: '/assets/characters/warbear/scene.gltf',
              castShadow: true,
              receiveShadow: true
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'material',
            enabled: true,
            properties: { 
              type: 'model',
              useModelMaterials: true
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'animator',
            enabled: true,
            properties: {
              defaultAnimation: 'idle',
              blendSpeed: 0.25,
              rootMotion: false
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'collider',
            enabled: true,
            properties: { type: 'capsule', isTrigger: false }
          }
        ],
        children: [],
        parentId: null,
        tags: ['npc', 'creature'],
        layer: 5
      },
      // Flying Dragon
      {
        id: 'dragon-creature',
        name: 'Dragon',
        visible: true,
        isStatic: false,
        transform: {
          position: { x: -8, y: 4, z: 8 },
          rotation: { x: 0, y: 30, z: 0 },
          scale: { x: 2, y: 2, z: 2 }
        },
        components: [
          {
            id: crypto.randomUUID(),
            type: 'mesh',
            enabled: true,
            properties: { 
              type: 'imported', 
              modelPath: '/assets/characters/dragon/scene.gltf',
              castShadow: true,
              receiveShadow: true
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'material',
            enabled: true,
            properties: { 
              type: 'model',
              useModelMaterials: true
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'animator',
            enabled: true,
            properties: {
              defaultAnimation: 'fly',
              blendSpeed: 0.25,
              rootMotion: false
            }
          }
        ],
        children: [],
        parentId: null,
        tags: ['npc', 'creature', 'flying'],
        layer: 5
      },
      // Realistic Trees environment
      {
        id: 'trees-environment',
        name: 'Trees',
        visible: true,
        isStatic: true,
        transform: {
          position: { x: 0, y: 0, z: 10 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 3, y: 3, z: 3 }
        },
        components: [
          {
            id: crypto.randomUUID(),
            type: 'mesh',
            enabled: true,
            properties: { 
              type: 'imported', 
              modelPath: '/assets/environment/trees/scene.gltf',
              castShadow: true,
              receiveShadow: true
            }
          },
          {
            id: crypto.randomUUID(),
            type: 'material',
            enabled: true,
            properties: { 
              type: 'model',
              useModelMaterials: true
            }
          }
        ],
        children: [],
        parentId: null,
        tags: ['environment', 'vegetation'],
        layer: 7
      }
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
    // === CORE SCRIPTS (Game Management) ===
    { id: crypto.randomUUID(), name: 'GameManager', type: 'script', path: '/scripts/core/GameManager.ts' },
    { id: crypto.randomUUID(), name: 'SceneManager', type: 'script', path: '/scripts/core/SceneManager.ts' },
    { id: crypto.randomUUID(), name: 'InputManager', type: 'script', path: '/scripts/core/InputManager.ts' },
    { id: crypto.randomUUID(), name: 'AudioManager', type: 'script', path: '/scripts/core/AudioManager.ts' },
    { id: crypto.randomUUID(), name: 'UIManager', type: 'script', path: '/scripts/core/UIManager.ts' },
    { id: crypto.randomUUID(), name: 'SaveManager', type: 'script', path: '/scripts/core/SaveManager.ts' },
    { id: crypto.randomUUID(), name: 'EventBus', type: 'script', path: '/scripts/core/EventBus.ts' },
    
    // === PLAYER SCRIPTS ===
    { id: crypto.randomUUID(), name: 'PlayerController', type: 'script', path: '/scripts/player/PlayerController.ts' },
    { id: crypto.randomUUID(), name: 'FirstPersonController', type: 'script', path: '/scripts/player/FirstPersonController.ts' },
    { id: crypto.randomUUID(), name: 'ThirdPersonController', type: 'script', path: '/scripts/player/ThirdPersonController.ts' },
    { id: crypto.randomUUID(), name: 'CharacterMotor', type: 'script', path: '/scripts/player/CharacterMotor.ts' },
    { id: crypto.randomUUID(), name: 'PlayerInventory', type: 'script', path: '/scripts/player/PlayerInventory.ts' },
    { id: crypto.randomUUID(), name: 'PlayerHealth', type: 'script', path: '/scripts/player/PlayerHealth.ts' },
    
    // === CAMERA SCRIPTS ===
    { id: crypto.randomUUID(), name: 'CameraController', type: 'script', path: '/scripts/camera/CameraController.ts' },
    { id: crypto.randomUUID(), name: 'OrbitCamera', type: 'script', path: '/scripts/camera/OrbitCamera.ts' },
    { id: crypto.randomUUID(), name: 'FollowCamera', type: 'script', path: '/scripts/camera/FollowCamera.ts' },
    { id: crypto.randomUUID(), name: 'CameraShake', type: 'script', path: '/scripts/camera/CameraShake.ts' },
    
    // === AI SCRIPTS ===
    { id: crypto.randomUUID(), name: 'AIController', type: 'script', path: '/scripts/ai/AIController.ts' },
    { id: crypto.randomUUID(), name: 'NavMeshAgent', type: 'script', path: '/scripts/ai/NavMeshAgent.ts' },
    { id: crypto.randomUUID(), name: 'StateMachine', type: 'script', path: '/scripts/ai/StateMachine.ts' },
    { id: crypto.randomUUID(), name: 'BehaviorTree', type: 'script', path: '/scripts/ai/BehaviorTree.ts' },
    
    // === PHYSICS SCRIPTS ===
    { id: crypto.randomUUID(), name: 'RigidBody', type: 'script', path: '/scripts/physics/RigidBody.ts' },
    { id: crypto.randomUUID(), name: 'CharacterController', type: 'script', path: '/scripts/physics/CharacterController.ts' },
    { id: crypto.randomUUID(), name: 'Projectile', type: 'script', path: '/scripts/physics/Projectile.ts' },
    { id: crypto.randomUUID(), name: 'TriggerZone', type: 'script', path: '/scripts/physics/TriggerZone.ts' },
    
    // === UTILITY SCRIPTS ===
    { id: crypto.randomUUID(), name: 'ObjectPool', type: 'script', path: '/scripts/utility/ObjectPool.ts' },
    { id: crypto.randomUUID(), name: 'Timer', type: 'script', path: '/scripts/utility/Timer.ts' },
    { id: crypto.randomUUID(), name: 'Spawner', type: 'script', path: '/scripts/utility/Spawner.ts' },
    { id: crypto.randomUUID(), name: 'LookAt', type: 'script', path: '/scripts/utility/LookAt.ts' },
    { id: crypto.randomUUID(), name: 'Rotator', type: 'script', path: '/scripts/utility/Rotator.ts' },
    { id: crypto.randomUUID(), name: 'Destroyable', type: 'script', path: '/scripts/utility/Destroyable.ts' },
    
    // === MATERIALS ===
    { id: crypto.randomUUID(), name: 'Default Material', type: 'material', path: '/materials/default.mat' },
    { id: crypto.randomUUID(), name: 'Standard PBR', type: 'material', path: '/materials/standard-pbr.mat' },
    { id: crypto.randomUUID(), name: 'Unlit Material', type: 'material', path: '/materials/unlit.mat' },
    { id: crypto.randomUUID(), name: 'Transparent Material', type: 'material', path: '/materials/transparent.mat' },
    { id: crypto.randomUUID(), name: 'Emissive Material', type: 'material', path: '/materials/emissive.mat' },
    { id: crypto.randomUUID(), name: 'Water Material', type: 'material', path: '/materials/water.mat' },
    { id: crypto.randomUUID(), name: 'Glass Material', type: 'material', path: '/materials/glass.mat' },
    { id: crypto.randomUUID(), name: 'Metal Material', type: 'material', path: '/materials/metal.mat' },
    { id: crypto.randomUUID(), name: 'Wood Material', type: 'material', path: '/materials/wood.mat' },
    { id: crypto.randomUUID(), name: 'Stone Material', type: 'material', path: '/materials/stone.mat' },
    
    // === TEXTURES ===
    { id: crypto.randomUUID(), name: 'White', type: 'texture', path: '/textures/defaults/white.png' },
    { id: crypto.randomUUID(), name: 'Black', type: 'texture', path: '/textures/defaults/black.png' },
    { id: crypto.randomUUID(), name: 'Normal Default', type: 'texture', path: '/textures/defaults/normal.png' },
    { id: crypto.randomUUID(), name: 'Grid Pattern', type: 'texture', path: '/textures/defaults/grid.png' },
    { id: crypto.randomUUID(), name: 'UV Checker', type: 'texture', path: '/textures/defaults/uv-checker.png' },
    { id: crypto.randomUUID(), name: 'Ground Texture', type: 'texture', path: '/textures/ground.png' },
    { id: crypto.randomUUID(), name: 'Grass Texture', type: 'texture', path: '/textures/environment/grass.png' },
    { id: crypto.randomUUID(), name: 'Sand Texture', type: 'texture', path: '/textures/environment/sand.png' },
    { id: crypto.randomUUID(), name: 'Rock Texture', type: 'texture', path: '/textures/environment/rock.png' },
    { id: crypto.randomUUID(), name: 'Brick Texture', type: 'texture', path: '/textures/environment/brick.png' },
    { id: crypto.randomUUID(), name: 'Concrete Texture', type: 'texture', path: '/textures/environment/concrete.png' },
    { id: crypto.randomUUID(), name: 'Wood Planks', type: 'texture', path: '/textures/environment/wood-planks.png' },
    { id: crypto.randomUUID(), name: 'Metal Plate', type: 'texture', path: '/textures/environment/metal-plate.png' },
    { id: crypto.randomUUID(), name: 'Skybox Day', type: 'texture', path: '/textures/skybox/day.hdr' },
    { id: crypto.randomUUID(), name: 'Skybox Night', type: 'texture', path: '/textures/skybox/night.hdr' },
    { id: crypto.randomUUID(), name: 'Skybox Sunset', type: 'texture', path: '/textures/skybox/sunset.hdr' },
    
    // === PRIMITIVES/MODELS ===
    { id: crypto.randomUUID(), name: 'Cube', type: 'model', path: '/models/primitives/cube.glb' },
    { id: crypto.randomUUID(), name: 'Sphere', type: 'model', path: '/models/primitives/sphere.glb' },
    { id: crypto.randomUUID(), name: 'Cylinder', type: 'model', path: '/models/primitives/cylinder.glb' },
    { id: crypto.randomUUID(), name: 'Capsule', type: 'model', path: '/models/primitives/capsule.glb' },
    { id: crypto.randomUUID(), name: 'Plane', type: 'model', path: '/models/primitives/plane.glb' },
    { id: crypto.randomUUID(), name: 'Cone', type: 'model', path: '/models/primitives/cone.glb' },
    { id: crypto.randomUUID(), name: 'Torus', type: 'model', path: '/models/primitives/torus.glb' },
    { id: crypto.randomUUID(), name: 'Quad', type: 'model', path: '/models/primitives/quad.glb' },
    
    // === AUDIO ===
    { id: crypto.randomUUID(), name: 'UI Click', type: 'audio', path: '/audio/ui/click.wav' },
    { id: crypto.randomUUID(), name: 'UI Hover', type: 'audio', path: '/audio/ui/hover.wav' },
    { id: crypto.randomUUID(), name: 'UI Confirm', type: 'audio', path: '/audio/ui/confirm.wav' },
    { id: crypto.randomUUID(), name: 'UI Cancel', type: 'audio', path: '/audio/ui/cancel.wav' },
    { id: crypto.randomUUID(), name: 'Footstep Grass', type: 'audio', path: '/audio/sfx/footstep-grass.wav' },
    { id: crypto.randomUUID(), name: 'Footstep Stone', type: 'audio', path: '/audio/sfx/footstep-stone.wav' },
    { id: crypto.randomUUID(), name: 'Jump', type: 'audio', path: '/audio/sfx/jump.wav' },
    { id: crypto.randomUUID(), name: 'Land', type: 'audio', path: '/audio/sfx/land.wav' },
    { id: crypto.randomUUID(), name: 'Impact', type: 'audio', path: '/audio/sfx/impact.wav' },
    { id: crypto.randomUUID(), name: 'Pickup', type: 'audio', path: '/audio/sfx/pickup.wav' },
    { id: crypto.randomUUID(), name: 'Ambient Forest', type: 'audio', path: '/audio/ambient/forest.mp3' },
    { id: crypto.randomUUID(), name: 'Ambient Wind', type: 'audio', path: '/audio/ambient/wind.mp3' },
    { id: crypto.randomUUID(), name: 'Music Menu', type: 'audio', path: '/audio/music/menu.mp3' },
    { id: crypto.randomUUID(), name: 'Music Gameplay', type: 'audio', path: '/audio/music/gameplay.mp3' },
    
    // === CHARACTER MODELS ===
    { id: crypto.randomUUID(), name: 'Knight with Sword', type: 'model', path: '/assets/characters/knight/KnightAndSword.FBX', metadata: { 
      category: 'character',
      animations: ['Idle', 'Walk', 'Run', 'Attack', 'Death'],
      textures: {
        diffuse: '/assets/characters/knight/KnightAndSword_Textures/Knight_diffuse.png',
        opacity: '/assets/characters/knight/KnightAndSword_Textures/Knight_opacity.png',
      },
      scale: 0.01,
      collider: { type: 'capsule', height: 1.8, radius: 0.3 }
    }},
    
    // === CHARACTER TEXTURES ===
    { id: crypto.randomUUID(), name: 'Knight Diffuse', type: 'texture', path: '/assets/characters/knight/KnightAndSword_Textures/Knight_diffuse.png' },
    { id: crypto.randomUUID(), name: 'Knight Opacity', type: 'texture', path: '/assets/characters/knight/KnightAndSword_Textures/Knight_opacity.png' },
    { id: crypto.randomUUID(), name: 'Knight DiffOpac', type: 'texture', path: '/assets/characters/knight/KnightAndSword_Textures/Knight_diffOpac.png' },
    { id: crypto.randomUUID(), name: 'Sword Texture', type: 'texture', path: '/assets/characters/knight/KnightAndSword_Textures/Sword_razper.png' },
    
    // === PREFABS ===
    { id: 'prefab-knight', name: 'Knight Character', type: 'prefab', path: '/prefabs/knight-character.prefab', metadata: {
      modelPath: '/assets/characters/knight/KnightAndSword.glb',
      textures: {
        diffuse: '/assets/characters/knight/KnightAndSword_Textures/Knight_diffuse.png',
        opacity: '/assets/characters/knight/KnightAndSword_Textures/Knight_opacity.png',
      },
      animations: ['Idle', 'Walk', 'Run', 'Attack', 'Death'],
      scale: 0.01,
      tags: ['character', 'humanoid', 'knight', 'player'],
    }},
    { id: crypto.randomUUID(), name: 'Player Character', type: 'prefab', path: '/prefabs/player-character.prefab' },
    { id: crypto.randomUUID(), name: 'Enemy Basic', type: 'prefab', path: '/prefabs/enemy-basic.prefab' },
    { id: crypto.randomUUID(), name: 'Collectible Coin', type: 'prefab', path: '/prefabs/collectible-coin.prefab' },
    { id: crypto.randomUUID(), name: 'Health Pickup', type: 'prefab', path: '/prefabs/health-pickup.prefab' },
    { id: crypto.randomUUID(), name: 'Checkpoint', type: 'prefab', path: '/prefabs/checkpoint.prefab' },
    { id: crypto.randomUUID(), name: 'Spawn Point', type: 'prefab', path: '/prefabs/spawn-point.prefab' },
    { id: crypto.randomUUID(), name: 'Projectile Bullet', type: 'prefab', path: '/prefabs/projectile-bullet.prefab' },
    { id: crypto.randomUUID(), name: 'Explosion Effect', type: 'prefab', path: '/prefabs/explosion-effect.prefab' },
    
    // === ANIMATIONS ===
    { id: crypto.randomUUID(), name: 'Idle', type: 'animation', path: '/animations/humanoid/idle.anim' },
    { id: crypto.randomUUID(), name: 'Walk', type: 'animation', path: '/animations/humanoid/walk.anim' },
    { id: crypto.randomUUID(), name: 'Run', type: 'animation', path: '/animations/humanoid/run.anim' },
    { id: crypto.randomUUID(), name: 'Jump', type: 'animation', path: '/animations/humanoid/jump.anim' },
    { id: crypto.randomUUID(), name: 'Fall', type: 'animation', path: '/animations/humanoid/fall.anim' },
    { id: crypto.randomUUID(), name: 'Land', type: 'animation', path: '/animations/humanoid/land.anim' },
    { id: crypto.randomUUID(), name: 'Attack', type: 'animation', path: '/animations/humanoid/attack.anim' },
    { id: crypto.randomUUID(), name: 'Death', type: 'animation', path: '/animations/humanoid/death.anim' },
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
  currentScene: null,
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
  viewMode: 'pbr',
  showGrid: true,
  showStats: true,
  cloudSyncStatus: isPuterAvailable() ? 'synced' : 'offline',
  isLoading: false,
  pendingExample: null,
  pendingFocusObjectId: null,
  
  // Undo/Redo state
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,
  
  setProject: (project) => set({ project }),
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentScene: (scene) => set({ currentScene: scene }),
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
  setActiveRightTab: (tab) => set({ activeRightTab: tab }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleStats: () => set((state) => ({ showStats: !state.showStats })),
  setCloudSyncStatus: (status) => set({ cloudSyncStatus: status }),
  
  addGameObject: (object) => {
    get().pushUndo('Add object');
    return set((state) => {
    if (!state.project?.scenes[0]) return state;
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: [...newScenes[0].objects, object]
    };
    return {
      project: { ...state.project, scenes: newScenes }
    };
  })},
  
  updateGameObject: (id, updates) => set((state) => {
    if (!state.project?.scenes[0]) return state;
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj =>
        obj.id === id ? { ...obj, ...updates } : obj
      )
    };
    return {
      project: { ...state.project, scenes: newScenes }
    };
  }),
  
  deleteGameObject: (id) => { get().pushUndo('Delete object'); return set((state) => {
    if (!state.project?.scenes[0]) return state;
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.filter(obj => obj.id !== id)
    };
    return {
      project: { ...state.project, scenes: newScenes },
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId
    };
  })},
  
  updateTransform:
    if (!state.project?.scenes[0]) return state;
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj =>
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
    if (!state.project?.scenes[0]) return;
    
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
                  scriptType: 'characterController',
                  animations: asset.metadata.animations || [],
                  defaultAnimation: asset.metadata.animations?.[0] || 'Idle',
                  moveSpeed: 5,
                  rotationSpeed: 120,
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
          baseObject.components = [{
            id: crypto.randomUUID(),
            type: 'mesh',
            enabled: true,
            properties: { type: 'box', color: '#888888' }
          }];
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
  
  // ─── Undo/Redo ──────────────────────────────────────────────────────
  pushUndo: (label: string) => {
    const state = get();
    if (!state.project) return;
    const snapshot = JSON.stringify(state.project);
    const newStack = [...state.undoStack, { label, projectSnapshot: snapshot }];
    if (newStack.length > MAX_UNDO_HISTORY) newStack.shift();
    set({ undoStack: newStack, redoStack: [], canUndo: true, canRedo: false });
  },
  
  undo: () => {
    const state = get();
    if (state.undoStack.length === 0 || !state.project) return;
    const currentSnapshot = JSON.stringify(state.project);
    const entry = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, -1);
    const newRedoStack = [...state.redoStack, { label: entry.label, projectSnapshot: currentSnapshot }];
    const restoredProject = JSON.parse(entry.projectSnapshot) as Project;
    set({
      project: restoredProject,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      canUndo: newUndoStack.length > 0,
      canRedo: true,
    });
    state.addConsoleLog({ type: 'info', message: `Undo: ${entry.label}`, source: 'Editor' });
  },
  
  redo: () => {
    const state = get();
    if (state.redoStack.length === 0 || !state.project) return;
    const currentSnapshot = JSON.stringify(state.project);
    const entry = state.redoStack[state.redoStack.length - 1];
    const newRedoStack = state.redoStack.slice(0, -1);
    const newUndoStack = [...state.undoStack, { label: entry.label, projectSnapshot: currentSnapshot }];
    const restoredProject = JSON.parse(entry.projectSnapshot) as Project;
    set({
      project: restoredProject,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      canUndo: true,
      canRedo: newRedoStack.length > 0,
    });
    state.addConsoleLog({ type: 'info', message: `Redo: ${entry.label}`, source: 'Editor' });
  },
  
  // ─── Export/Import ──────────────────────────────────────────────────
  exportProject: () => {
    const state = get();
    if (!state.project) return;
    const json = JSON.stringify(state.project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.project.name.replace(/\s+/g, '-').toLowerCase()}.grudge`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    state.addConsoleLog({ type: 'info', message: `Exported project: ${a.download}`, source: 'Export' });
  },
  
  importProject: async (file: File) => {
    const state = get();
    try {
      const text = await file.text();
      const project = JSON.parse(text) as Project;
      if (!project.id || !project.scenes) {
        throw new Error('Invalid .grudge file: missing project structure');
      }
      state.pushUndo('Import project');
      set({ project });
      state.addConsoleLog({ type: 'info', message: `Imported project: ${project.name}`, source: 'Import' });
    } catch (err: any) {
      state.addConsoleLog({ type: 'error', message: `Import failed: ${err.message}`, source: 'Import' });
    }
  },

  setPendingExample: (example) => set({ pendingExample: example }),
  clearPendingExample: () => set({ pendingExample: null }),
  
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
  
  prefabs: [],
  
  addComponent: (objectId, component) => set((state) => {
    if (!state.project?.scenes[0]) return state;
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj =>
        obj.id === objectId 
          ? { ...obj, components: [...obj.components, component] }
          : obj
      )
    };
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  updateComponent: (objectId, componentId, properties) => set((state) => {
    if (!state.project?.scenes[0]) return state;
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj =>
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
    if (!state.project?.scenes[0]) return state;
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj =>
        obj.id === objectId 
          ? { ...obj, components: obj.components.filter(c => c.id !== componentId) }
          : obj
      )
    };
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  toggleComponent: (objectId, componentId) => set((state) => {
    if (!state.project?.scenes[0]) return state;
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj =>
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
    if (!state.project?.scenes[0]) return state;
    const scene = state.project.scenes[0];
    const child = scene.objects.find(o => o.id === childId);
    if (!child) return state;
    if (child.parentId === parentId) return state;
    if (childId === parentId) return state;
    
    const oldParentId = child.parentId;
    
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj => {
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
    const objects = state.project?.scenes[0]?.objects || [];
    return objects.filter(o => o.parentId === parentId);
  },
  
  getDescendants: (parentId) => {
    const state = get();
    const objects = state.project?.scenes[0]?.objects || [];
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
    if (!state.project?.scenes[0]) return state;
    
    const descendants = get().getDescendants(objectId);
    const allIds = [objectId, ...descendants.map(d => d.id)];
    
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj =>
        allIds.includes(obj.id) ? { ...obj, visible } : obj
      )
    };
    
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  duplicateObject: (objectId) => {
    const state = get();
    const scene = state.project?.scenes[0];
    const original = scene?.objects.find(o => o.id === objectId);
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
    if (!state.project?.scenes[0]) return state;
    
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj =>
        obj.id === objectId && !obj.tags?.includes(tag)
          ? { ...obj, tags: [...(obj.tags || []), tag] }
          : obj
      )
    };
    
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  removeTag: (objectId, tag) => set((state) => {
    if (!state.project?.scenes[0]) return state;
    
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj =>
        obj.id === objectId
          ? { ...obj, tags: (obj.tags || []).filter(t => t !== tag) }
          : obj
      )
    };
    
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  setLayer: (objectId, layer) => set((state) => {
    if (!state.project?.scenes[0]) return state;
    
    const newScenes = [...state.project.scenes];
    newScenes[0] = {
      ...newScenes[0],
      objects: newScenes[0].objects.map(obj =>
        obj.id === objectId ? { ...obj, layer } : obj
      )
    };
    
    return { project: { ...state.project, scenes: newScenes } };
  }),
  
  findByTag: (tag) => {
    const state = get();
    return (state.project?.scenes[0]?.objects || []).filter(o => o.tags?.includes(tag));
  },
  
  findByLayer: (layer) => {
    const state = get();
    return (state.project?.scenes[0]?.objects || []).filter(o => (o.layer ?? 0) === layer);
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
