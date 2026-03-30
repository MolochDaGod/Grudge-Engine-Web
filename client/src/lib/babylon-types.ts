export const BABYLON_TYPE_DEFINITIONS = `
declare namespace BABYLON {
  class Vector2 {
    x: number; y: number;
    constructor(x?: number, y?: number);
    static Zero(): Vector2;
    static One(): Vector2;
    add(other: Vector2): Vector2;
    subtract(other: Vector2): Vector2;
    scale(scale: number): Vector2;
    length(): number;
    normalize(): Vector2;
    clone(): Vector2;
  }
  class Vector3 {
    x: number; y: number; z: number;
    constructor(x?: number, y?: number, z?: number);
    static Zero(): Vector3;
    static One(): Vector3;
    static Up(): Vector3;
    static Forward(): Vector3;
    static Right(): Vector3;
    add(other: Vector3): Vector3;
    subtract(other: Vector3): Vector3;
    scale(scale: number): Vector3;
    length(): number;
    normalize(): Vector3;
    clone(): Vector3;
    dot(other: Vector3): number;
    cross(other: Vector3): Vector3;
    static Distance(a: Vector3, b: Vector3): number;
    static Lerp(a: Vector3, b: Vector3, t: number): Vector3;
  }
  class Vector4 {
    x: number; y: number; z: number; w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
  }
  class Quaternion {
    x: number; y: number; z: number; w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
    static Identity(): Quaternion;
    static RotationYawPitchRoll(yaw: number, pitch: number, roll: number): Quaternion;
    static FromEulerAngles(x: number, y: number, z: number): Quaternion;
    toEulerAngles(): Vector3;
    multiply(other: Quaternion): Quaternion;
    normalize(): Quaternion;
    clone(): Quaternion;
    static Slerp(a: Quaternion, b: Quaternion, t: number): Quaternion;
  }
  class Color3 {
    r: number; g: number; b: number;
    constructor(r?: number, g?: number, b?: number);
    static Red(): Color3; static Green(): Color3; static Blue(): Color3;
    static White(): Color3; static Black(): Color3;
    static FromHexString(hex: string): Color3;
    toHexString(): string;
    clone(): Color3;
    scale(scale: number): Color3;
    add(other: Color3): Color3;
  }
  class Color4 {
    r: number; g: number; b: number; a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
    static FromHexString(hex: string): Color4;
  }
  class Matrix {
    static Identity(): Matrix;
    static Translation(x: number, y: number, z: number): Matrix;
    static Rotation(x: number, y: number, z: number): Matrix;
    static Scaling(x: number, y: number, z: number): Matrix;
    getTranslation(): Vector3;
    decompose(scaling?: Vector3, rotation?: Quaternion, translation?: Vector3): boolean;
    multiply(other: Matrix): Matrix;
    invert(): Matrix;
    clone(): Matrix;
  }
  class Engine {
    constructor(canvas: HTMLCanvasElement, antialias?: boolean);
    runRenderLoop(fn: () => void): void;
    stopRenderLoop(fn?: () => void): void;
    resize(): void;
    dispose(): void;
    getFps(): number;
    getDeltaTime(): number;
    readonly scenes: Scene[];
  }
  class Scene {
    constructor(engine: Engine);
    render(): void;
    dispose(): void;
    activeCamera: Camera | null;
    gravity: Vector3;
    meshes: AbstractMesh[];
    lights: Light[];
    cameras: Camera[];
    materials: Material[];
    animationGroups: AnimationGroup[];
    onBeforeRenderObservable: Observable<Scene>;
    onAfterRenderObservable: Observable<Scene>;
    onPointerObservable: Observable<PointerInfo>;
    getMeshByName(name: string): Nullable<AbstractMesh>;
    getMeshById(id: string): Nullable<AbstractMesh>;
    getCameraByName(name: string): Nullable<Camera>;
    getLightByName(name: string): Nullable<Light>;
    getAnimationGroupByName(name: string): Nullable<AnimationGroup>;
    createDefaultLight(replace?: boolean): void;
    createDefaultCamera(createArcRotateCamera?: boolean, replace?: boolean, attachCameraControls?: boolean): void;
    enablePhysics(gravity?: Vector3, plugin?: any): boolean;
    clearColor: Color4;
    fogEnabled: boolean;
    fogMode: number;
    fogColor: Color3;
    fogDensity: number;
    fogStart: number;
    fogEnd: number;
  }
  abstract class Node {
    name: string;
    id: string;
    metadata: any;
    parent: Nullable<Node>;
    getChildren(): Node[];
    dispose(): void;
    isEnabled(): boolean;
    setEnabled(value: boolean): void;
  }
  abstract class TransformNode extends Node {
    position: Vector3;
    rotation: Vector3;
    rotationQuaternion: Nullable<Quaternion>;
    scaling: Vector3;
    computeWorldMatrix(force?: boolean): Matrix;
    getWorldMatrix(): Matrix;
    getAbsolutePosition(): Vector3;
    setAbsolutePosition(position: Vector3): TransformNode;
    locallyTranslate(vector: Vector3): TransformNode;
    rotate(axis: Vector3, amount: number, space?: Space): TransformNode;
    translate(axis: Vector3, distance: number, space?: Space): TransformNode;
    lookAt(targetPoint: Vector3, yawCor?: number, pitchCor?: number, rollCor?: number): TransformNode;
    getChildMeshes(directDescendantsOnly?: boolean): AbstractMesh[];
  }
  abstract class AbstractMesh extends TransformNode {
    isVisible: boolean;
    isPickable: boolean;
    visibility: number;
    skeleton: Nullable<Skeleton>;
    material: Nullable<Material>;
    getBoundingInfo(): BoundingInfo;
    getHierarchyBoundingVectors(): { min: Vector3; max: Vector3 };
    getTotalVertices(): number;
    getVerticesData(kind: string): Nullable<number[]>;
    intersectsMesh(mesh: AbstractMesh, precise?: boolean): boolean;
    intersectsPoint(point: Vector3): boolean;
    isInFrustum(frustumPlanes: any[]): boolean;
    checkCollisions: boolean;
    onBeforeRenderObservable: Observable<AbstractMesh>;
    onAfterRenderObservable: Observable<AbstractMesh>;
    onBeforeDrawObservable: Observable<AbstractMesh>;
    showBoundingBox: boolean;
    receiveShadows: boolean;
    castShadows: boolean;
  }
  class Mesh extends AbstractMesh {
    constructor(name: string, scene?: Nullable<Scene>);
    static CreateBox(name: string, size: number, scene?: Nullable<Scene>): Mesh;
    static CreateSphere(name: string, segments: number, diameter: number, scene?: Nullable<Scene>): Mesh;
    static CreateCylinder(name: string, height: number, diameterTop: number, diameterBottom: number, tessellation?: number, scene?: Nullable<Scene>): Mesh;
    static CreatePlane(name: string, size: number, scene?: Nullable<Scene>): Mesh;
    static CreateGround(name: string, width: number, height: number, subdivisions?: number, scene?: Nullable<Scene>): Mesh;
    createInstance(name: string): InstancedMesh;
    flipFaces(flipNormals?: boolean): Mesh;
    mergeMeshes(meshes: AbstractMesh[], disposeSource?: boolean, allow32BitsIndices?: boolean, meshSubclass?: Mesh, subdivideWithSubMeshes?: boolean, multiMultiMaterials?: boolean): Nullable<Mesh>;
  }
  class InstancedMesh extends AbstractMesh {}
  class MeshBuilder {
    static CreateBox(name: string, options: { size?: number; width?: number; height?: number; depth?: number; sideOrientation?: number; updatable?: boolean }, scene?: Nullable<Scene>): Mesh;
    static CreateSphere(name: string, options: { diameter?: number; segments?: number; sideOrientation?: number; updatable?: boolean }, scene?: Nullable<Scene>): Mesh;
    static CreateCylinder(name: string, options: { height?: number; diameterTop?: number; diameterBottom?: number; diameter?: number; tessellation?: number; sideOrientation?: number; updatable?: boolean }, scene?: Nullable<Scene>): Mesh;
    static CreatePlane(name: string, options: { size?: number; width?: number; height?: number; sideOrientation?: number; updatable?: boolean }, scene?: Nullable<Scene>): Mesh;
    static CreateGround(name: string, options: { width?: number; height?: number; subdivisions?: number; updatable?: boolean }, scene?: Nullable<Scene>): Mesh;
    static CreateTorus(name: string, options: { diameter?: number; thickness?: number; tessellation?: number }, scene?: Nullable<Scene>): Mesh;
    static CreateLines(name: string, options: { points: Vector3[]; updatable?: boolean; instance?: LinesMesh }, scene?: Nullable<Scene>): LinesMesh;
  }
  class LinesMesh extends AbstractMesh {}
  abstract class Camera extends Node {
    position: Vector3;
    target: Vector3;
    fov: number;
    minZ: number;
    maxZ: number;
    getViewMatrix(): Matrix;
    getProjectionMatrix(): Matrix;
    attachControl(element: HTMLElement, noPreventDefault?: boolean): void;
    detachControl(): void;
  }
  class ArcRotateCamera extends Camera {
    constructor(name: string, alpha: number, beta: number, radius: number, target: Vector3, scene: Scene);
    alpha: number; beta: number; radius: number;
    lowerRadiusLimit: Nullable<number>; upperRadiusLimit: Nullable<number>;
    lowerAlphaLimit: Nullable<number>; upperAlphaLimit: Nullable<number>;
    lowerBetaLimit: number; upperBetaLimit: number;
    angularSensibilityX: number; angularSensibilityY: number;
    panningSensibility: number;
    wheelDeltaPercentage: number;
  }
  class FreeCamera extends Camera {
    constructor(name: string, position: Vector3, scene: Scene);
    speed: number;
    keysUp: number[]; keysDown: number[]; keysLeft: number[]; keysRight: number[];
  }
  class UniversalCamera extends FreeCamera {
    constructor(name: string, position: Vector3, scene: Scene);
  }
  abstract class Light extends Node {
    intensity: number;
    diffuse: Color3;
    specular: Color3;
    range: number;
    getShadowGenerator(): Nullable<ShadowGenerator>;
  }
  class HemisphericLight extends Light {
    constructor(name: string, direction: Vector3, scene: Scene);
    groundColor: Color3;
    direction: Vector3;
  }
  class DirectionalLight extends Light {
    constructor(name: string, direction: Vector3, scene: Scene);
    direction: Vector3;
    position: Vector3;
  }
  class PointLight extends Light {
    constructor(name: string, position: Vector3, scene: Scene);
    position: Vector3;
  }
  class SpotLight extends Light {
    constructor(name: string, position: Vector3, direction: Vector3, angle: number, exponent: number, scene: Scene);
    position: Vector3; direction: Vector3; angle: number; exponent: number;
  }
  class ShadowGenerator {
    constructor(mapSize: number, light: DirectionalLight | SpotLight);
    addShadowCaster(mesh: AbstractMesh, includeDescendants?: boolean): ShadowGenerator;
    removeShadowCaster(mesh: AbstractMesh, includeDescendants?: boolean): ShadowGenerator;
    useBlurExponentialShadowMap: boolean;
    useExponentialShadowMap: boolean;
    usePoissonSampling: boolean;
    bias: number;
    dispose(): void;
  }
  abstract class Material extends Node {
    alpha: number;
    alphaMode: number;
    backFaceCulling: boolean;
    wireframe: boolean;
    dispose(): void;
  }
  class StandardMaterial extends Material {
    constructor(name: string, scene: Scene);
    diffuseColor: Color3;
    specularColor: Color3;
    emissiveColor: Color3;
    ambientColor: Color3;
    diffuseTexture: Nullable<BaseTexture>;
    specularTexture: Nullable<BaseTexture>;
    emissiveTexture: Nullable<BaseTexture>;
    normalTexture: Nullable<BaseTexture>;
    specularPower: number;
  }
  class PBRMaterial extends Material {
    constructor(name: string, scene: Scene);
    albedoColor: Color3;
    albedoTexture: Nullable<BaseTexture>;
    metallic: number;
    roughness: number;
    metallicTexture: Nullable<BaseTexture>;
    normalTexture: Nullable<BaseTexture>;
    emissiveColor: Color3;
    emissiveIntensity: number;
    environmentIntensity: number;
    usePhysicalLightFalloff: boolean;
  }
  abstract class BaseTexture extends Node {
    name: string;
    wrapU: number; wrapV: number;
    uScale: number; vScale: number;
    uOffset: number; vOffset: number;
    hasAlpha: boolean;
  }
  class Texture extends BaseTexture {
    constructor(url: string, scene: Nullable<Scene>, noMipmap?: boolean, invertY?: boolean);
    static LoadFromDataString(name: string, buffer: any, scene: Scene): Texture;
    url: string;
  }
  class CubeTexture extends BaseTexture {
    constructor(rootUrl: string, scene: Scene);
    static CreateFromPrefilteredData(url: string, scene: Scene): CubeTexture;
  }
  class Animation {
    constructor(name: string, targetProperty: string, framePerSecond: number, dataType: number, loopMode?: number);
    static readonly ANIMATIONTYPE_FLOAT: number;
    static readonly ANIMATIONTYPE_VECTOR2: number;
    static readonly ANIMATIONTYPE_VECTOR3: number;
    static readonly ANIMATIONTYPE_QUATERNION: number;
    static readonly ANIMATIONTYPE_COLOR3: number;
    static readonly ANIMATIONLOOPMODE_CYCLE: number;
    static readonly ANIMATIONLOOPMODE_CONSTANT: number;
    static readonly ANIMATIONLOOPMODE_RELATIVE: number;
    setKeys(values: Array<{ frame: number; value: any }>): void;
    getKeys(): Array<{ frame: number; value: any }>;
    name: string;
    targetProperty: string;
    framePerSecond: number;
    dataType: number;
    loopMode?: number;
    static CreateAndStartAnimation(name: string, node: Node, targetProperty: string, framePerSecond: number, totalFrame: number, from: any, to: any, loopMode?: number): Nullable<Animatable>;
  }
  class Animatable {
    pause(): void; restart(): void; stop(): void; reset(): void;
    speedRatio: number;
    onAnimationEnd: Nullable<() => void>;
  }
  class AnimationGroup {
    constructor(name: string, scene?: Nullable<Scene>);
    name: string;
    start(loop?: boolean, speedRatio?: number, from?: number, to?: number, isAdditive?: boolean): AnimationGroup;
    stop(): AnimationGroup;
    pause(): AnimationGroup;
    play(loop?: boolean): AnimationGroup;
    reset(): AnimationGroup;
    restart(): AnimationGroup;
    goToFrame(frame: number): AnimationGroup;
    isStarted: boolean; isPlaying: boolean;
    speedRatio: number;
    targetedAnimations: TargetedAnimation[];
    animatables: Animatable[];
    from: number; to: number;
    setWeightForAllAnimatables(weight: number): AnimationGroup;
    syncAllAnimationsWith(root: Animatable): AnimationGroup;
    dispose(): void;
    onAnimationGroupLoopObservable: Observable<AnimationGroup>;
    onAnimationGroupEndObservable: Observable<AnimationGroup>;
  }
  interface TargetedAnimation {
    animation: Animation;
    target: any;
  }
  class Skeleton {
    constructor(name: string, id: string, scene: Scene);
    bones: Bone[];
    name: string; id: string;
    prepare(): void;
    dispose(): void;
    getAnimationRange(name: string): Nullable<AnimationRange>;
    clone(name: string, id: string): Skeleton;
  }
  class Bone extends Node {
    constructor(name: string, skeleton: Skeleton, parentBone?: Nullable<Bone>);
    length: number;
    getParent(): Nullable<Bone>;
    getChildren(): Bone[];
    getPosition(space?: Space): Vector3;
    setPosition(position: Vector3, space?: Space): void;
    getRotation(space?: Space): Vector3;
    setRotation(rotation: Vector3, space?: Space): void;
    getRotationQuaternion(space?: Space): Quaternion;
    setRotationQuaternion(quat: Quaternion, space?: Space): void;
    getScale(): Vector3;
    setScale(scale: Vector3): void;
    getLocalMatrix(): Matrix;
    getWorldMatrix(): Matrix;
    linkTransformNode(transformNode: Nullable<TransformNode>): void;
  }
  interface AnimationRange {
    name: string; from: number; to: number;
  }
  class Observable<T> {
    add(callback: (data: T, state: EventState) => void): Nullable<Observer<T>>;
    remove(observer: Nullable<Observer<T>>): boolean;
    notifyObservers(data: T): boolean;
    clear(): void;
    hasObservers(): boolean;
  }
  interface Observer<T> { callback: (data: T, state: EventState) => void; }
  interface EventState { skipNextObservers: boolean; }
  class Ray {
    constructor(origin: Vector3, direction: Vector3, length?: number);
    origin: Vector3; direction: Vector3; length: number;
    intersectsMesh(mesh: AbstractMesh, fastCheck?: boolean): PickingInfo;
    intersectsMeshes(meshes: AbstractMesh[], fastCheck?: boolean, results?: PickingInfo[]): PickingInfo[];
  }
  class PickingInfo {
    hit: boolean;
    distance: number;
    pickedPoint: Nullable<Vector3>;
    pickedMesh: Nullable<AbstractMesh>;
    bu: number; bv: number; faceId: number; subMeshId: number;
  }
  class PointerInfo {
    type: number; event: PointerEvent;
    pickInfo: Nullable<PickingInfo>;
  }
  class BoundingInfo {
    minimum: Vector3; maximum: Vector3;
    boundingBox: BoundingBox;
    boundingSphere: BoundingSphere;
    isInFrustum(frustumPlanes: any[]): boolean;
    intersects(boundingInfo: BoundingInfo, precise: boolean): boolean;
  }
  interface BoundingBox { minimum: Vector3; maximum: Vector3; center: Vector3; extendSize: Vector3; directions: Vector3[]; }
  interface BoundingSphere { minimum: Vector3; maximum: Vector3; center: Vector3; radius: number; }
  class ParticleSystem {
    constructor(name: string, capacity: number, scene: Scene);
    start(): void; stop(): void; dispose(): void;
    emitter: AbstractMesh | Vector3;
    minEmitBox: Vector3; maxEmitBox: Vector3;
    color1: Color4; color2: Color4; colorDead: Color4;
    minSize: number; maxSize: number;
    minLifeTime: number; maxLifeTime: number;
    emitRate: number; maxParticles: number;
    direction1: Vector3; direction2: Vector3;
    gravity: Vector3;
    minEmitPower: number; maxEmitPower: number;
    updateSpeed: number;
    particleTexture: Nullable<Texture>;
    blendMode: number;
    isAnimationSheetEnabled: boolean;
    static readonly BLENDMODE_STANDARD: number;
    static readonly BLENDMODE_ADD: number;
    static readonly BLENDMODE_MULTIPLY: number;
  }
  class SceneLoader {
    static ImportMeshAsync(meshNames: any, rootUrl: string, sceneFilename?: string | File, scene?: Nullable<Scene>, onProgress?: (e: ISceneLoaderProgressEvent) => void, pluginExtension?: string): Promise<ISceneLoaderAsyncResult>;
    static LoadAssetContainerAsync(rootUrl: string, sceneFilename?: string | File, scene?: Nullable<Scene>, onProgress?: (e: ISceneLoaderProgressEvent) => void, pluginExtension?: string): Promise<AssetContainer>;
    static AppendAsync(rootUrl: string, sceneFilename?: string | File, scene?: Nullable<Scene>): Promise<Scene>;
    static ImportAnimationsAsync(rootUrl: string, sceneFilename?: string | File, scene?: Nullable<Scene>, overwriteAnimations?: boolean, animationGroupLoadingMode?: SceneLoaderAnimationGroupLoadingMode): Promise<void>;
  }
  interface ISceneLoaderAsyncResult {
    meshes: AbstractMesh[];
    particleSystems: ParticleSystem[];
    skeletons: Skeleton[];
    animationGroups: AnimationGroup[];
    lights: Light[];
    cameras: Camera[];
    transformNodes: TransformNode[];
  }
  interface ISceneLoaderProgressEvent { loaded: number; total: number; }
  class AssetContainer {
    meshes: AbstractMesh[];
    lights: Light[];
    cameras: Camera[];
    materials: Material[];
    textures: BaseTexture[];
    skeletons: Skeleton[];
    animationGroups: AnimationGroup[];
    particleSystems: ParticleSystem[];
    addAllToScene(): void;
    removeAllFromScene(): void;
    dispose(): void;
    instantiateModelsToScene(nameFunction?: (name: string) => string, cloneMaterials?: boolean): InstantiatedEntries;
  }
  interface InstantiatedEntries { rootNodes: TransformNode[]; skeletons: Skeleton[]; animationGroups: AnimationGroup[]; }
  class GizmoManager {
    constructor(scene: Scene);
    positionGizmoEnabled: boolean;
    rotationGizmoEnabled: boolean;
    scaleGizmoEnabled: boolean;
    boundingBoxGizmoEnabled: boolean;
    usePointerToAttachGizmos: boolean;
    attachableMeshes: Nullable<AbstractMesh[]>;
    attachToMesh(mesh: Nullable<AbstractMesh>): void;
    dispose(): void;
  }
  enum Space { LOCAL = 0, WORLD = 1, BONE = 2 }
  enum SceneLoaderAnimationGroupLoadingMode { Clean = 0, Stop = 1, Sync = 2, NoSync = 3 }
  type Nullable<T> = T | null;
  class Tools {
    static ToRadians(degrees: number): number;
    static ToDegrees(radians: number): number;
    static RandomId(): string;
    static IsExponentOfTwo(value: number): boolean;
    static FloatRound(value: number): number;
    static CreateScreenshot(engine: Engine, camera: Camera, size: number | { width: number; height: number }): void;
  }
  namespace MathTools {
    function Lerp(a: number, b: number, t: number): number;
    function Clamp(value: number, min: number, max: number): number;
  }
  class KeyboardEventTypes {
    static readonly KEYDOWN: number;
    static readonly KEYUP: number;
  }
  class ActionManager {
    constructor(scene: Scene);
    registerAction(action: IAction): Nullable<IAction>;
    hasPickTriggers: boolean;
    dispose(): void;
  }
  interface IAction { trigger: number; }
  class ExecuteCodeAction implements IAction {
    constructor(trigger: number, func: (evt: ActionEvent) => void);
    trigger: number;
  }
  interface ActionEvent { source: any; pointerX: number; pointerY: number; meshUnderPointer: Nullable<AbstractMesh>; }
}
`;
