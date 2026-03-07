// ─── Renderer Interface ───────────────────────────────────────────────────
// Renderer-agnostic abstraction layer for Grudge Engine.
// Implementations: ThreeRenderer (primary), BabylonRenderer (legacy)

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TransformData {
  position: Vec3;
  rotation: Vec3; // Euler degrees
  scale: Vec3;
}

export interface RenderStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  programs: number;
  geometries: number;
  renderTime: number;
  webglVersion: number;
}

export interface MeshOptions {
  color?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
  materialType?: 'standard' | 'pbr' | 'toon' | 'unlit';
  metallic?: number;
  roughness?: number;
  emissiveColor?: string;
  emissiveIntensity?: number;
  twoSided?: boolean;
  alphaMode?: 'opaque' | 'blend' | 'mask';
}

export interface ModelImportOptions {
  targetHeight?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  autoScale?: boolean;
}

export interface ModelImportResult {
  nodeId: string;
  meshCount: number;
  vertexCount: number;
  triangleCount: number;
  animationNames: string[];
  boundingBox: { min: Vec3; max: Vec3 };
  loadTimeMs: number;
}

export interface LightOptions {
  color?: string;
  intensity?: number;
  range?: number;
  castShadows?: boolean;
  shadowMapSize?: number;
}

export interface CameraOptions {
  fov?: number;
  near?: number;
  far?: number;
}

export interface PickResult {
  nodeId: string | null;
  point: Vec3 | null;
  normal: Vec3 | null;
  distance: number;
}

export type GizmoMode = 'select' | 'translate' | 'rotate' | 'scale';
export type ViewMode = 'pbr' | 'wireframe' | 'debug';
export type MeshType = 'box' | 'sphere' | 'cylinder' | 'capsule' | 'plane' | 'cone' | 'torus';
export type LightType = 'point' | 'directional' | 'spot' | 'hemisphere';

export interface RendererEventMap {
  nodeSelected: (nodeId: string | null) => void;
  transformChanged: (nodeId: string, transform: TransformData) => void;
  modelLoaded: (result: ModelImportResult) => void;
  error: (message: string) => void;
  statsUpdate: (stats: RenderStats) => void;
}

export type RendererEventKey = keyof RendererEventMap;

/**
 * Abstract renderer interface.
 * All viewport rendering flows through this — implementations handle
 * the actual WebGL/Three.js/Babylon calls.
 */
export interface IRenderer {
  readonly backend: 'three' | 'babylon';
  readonly isInitialized: boolean;

  // ─── Lifecycle ───────────────────────────────────────────────────────
  init(canvas: HTMLCanvasElement): void;
  dispose(): void;
  render(): void;
  resize(width: number, height: number): void;

  // ─── Scene Graph ────────────────────────────────────────────────────
  createMesh(id: string, type: MeshType, options?: MeshOptions): void;
  removeMesh(id: string): void;
  setMeshVisible(id: string, visible: boolean): void;
  setMeshMaterial(id: string, options: MeshOptions): void;

  importModel(id: string, url: string, options?: ModelImportOptions): Promise<ModelImportResult>;

  createLight(id: string, type: LightType, options?: LightOptions): void;
  removeLight(id: string): void;

  createCamera(id: string, options?: CameraOptions): void;
  removeCamera(id: string): void;

  // ─── Transforms ─────────────────────────────────────────────────────
  setTransform(nodeId: string, transform: TransformData): void;
  getTransform(nodeId: string): TransformData | null;
  setParent(childId: string, parentId: string | null): void;

  // ─── Interaction ────────────────────────────────────────────────────
  pick(screenX: number, screenY: number): PickResult;
  setGizmoMode(mode: GizmoMode): void;
  attachGizmo(nodeId: string | null): void;
  focusOnNode(nodeId: string): void;

  // ─── Viewport Settings ──────────────────────────────────────────────
  setGridVisible(visible: boolean): void;
  setViewMode(mode: ViewMode): void;
  setPostProcessing(enabled: boolean): void;
  setEditorCamera(alpha: number, beta: number, radius: number, target: Vec3): void;

  // ─── Animation ──────────────────────────────────────────────────────
  getAnimations(nodeId: string): string[];
  playAnimation(nodeId: string, name: string, loop?: boolean, blendDuration?: number): void;
  stopAnimation(nodeId: string): void;
  stopAllAnimations(nodeId: string): void;

  // ─── Layer Filtering ────────────────────────────────────────────────
  setLayerVisibility(layerId: number, visible: boolean): void;
  setNodeLayer(nodeId: string, layerId: number): void;

  // ─── Stats ──────────────────────────────────────────────────────────
  getStats(): RenderStats;

  // ─── Events ─────────────────────────────────────────────────────────
  on<K extends RendererEventKey>(event: K, callback: RendererEventMap[K]): void;
  off<K extends RendererEventKey>(event: K, callback: RendererEventMap[K]): void;

  // ─── Raw Access (escape hatch for backend-specific features) ────────
  getRawScene(): unknown;
  getRawRenderer(): unknown;
}

/**
 * Base class with event emitter implementation for renderer backends.
 */
export abstract class BaseRenderer implements IRenderer {
  abstract readonly backend: 'three' | 'babylon';
  abstract readonly isInitialized: boolean;

  protected listeners: Map<string, Set<Function>> = new Map();

  on<K extends RendererEventKey>(event: K, callback: RendererEventMap[K]): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off<K extends RendererEventKey>(event: K, callback: RendererEventMap[K]): void {
    this.listeners.get(event)?.delete(callback);
  }

  protected emit<K extends RendererEventKey>(event: K, ...args: Parameters<RendererEventMap[K]>): void {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach(cb => (cb as Function)(...args));
  }

  // Abstract methods to be implemented by each backend
  abstract init(canvas: HTMLCanvasElement): void;
  abstract dispose(): void;
  abstract render(): void;
  abstract resize(width: number, height: number): void;
  abstract createMesh(id: string, type: MeshType, options?: MeshOptions): void;
  abstract removeMesh(id: string): void;
  abstract setMeshVisible(id: string, visible: boolean): void;
  abstract setMeshMaterial(id: string, options: MeshOptions): void;
  abstract importModel(id: string, url: string, options?: ModelImportOptions): Promise<ModelImportResult>;
  abstract createLight(id: string, type: LightType, options?: LightOptions): void;
  abstract removeLight(id: string): void;
  abstract createCamera(id: string, options?: CameraOptions): void;
  abstract removeCamera(id: string): void;
  abstract setTransform(nodeId: string, transform: TransformData): void;
  abstract getTransform(nodeId: string): TransformData | null;
  abstract setParent(childId: string, parentId: string | null): void;
  abstract pick(screenX: number, screenY: number): PickResult;
  abstract setGizmoMode(mode: GizmoMode): void;
  abstract attachGizmo(nodeId: string | null): void;
  abstract focusOnNode(nodeId: string): void;
  abstract setGridVisible(visible: boolean): void;
  abstract setViewMode(mode: ViewMode): void;
  abstract setPostProcessing(enabled: boolean): void;
  abstract setEditorCamera(alpha: number, beta: number, radius: number, target: Vec3): void;
  abstract getAnimations(nodeId: string): string[];
  abstract playAnimation(nodeId: string, name: string, loop?: boolean, blendDuration?: number): void;
  abstract stopAnimation(nodeId: string): void;
  abstract stopAllAnimations(nodeId: string): void;
  abstract setLayerVisibility(layerId: number, visible: boolean): void;
  abstract setNodeLayer(nodeId: string, layerId: number): void;
  abstract getStats(): RenderStats;
  abstract getRawScene(): unknown;
  abstract getRawRenderer(): unknown;
}
