import * as BABYLON from '@babylonjs/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VATAnimationRange {
  name: string;
  from: number;
  to: number;
}

export interface BakedCharacterData {
  /** The merged mesh with VAT applied — use this for instancing */
  mesh: BABYLON.Mesh;
  /** Per-animation frame ranges (index into the VAT texture) */
  ranges: VATAnimationRange[];
  /** The BakedVertexAnimationManager driving the texture */
  manager: BABYLON.BakedVertexAnimationManager;
  /** Create a new instance with a random or specific animation */
  createInstance: (id: string, animIndex?: number) => BABYLON.InstancedMesh;
  /** Update animation parameters on an existing instance */
  setAnimation: (instance: BABYLON.InstancedMesh, animIndex: number) => void;
  /** Dispose all VAT resources */
  dispose: () => void;
}

export interface BakeOptions {
  /** Which animation groups to bake (default: all) */
  animationGroups?: BABYLON.AnimationGroup[];
  /** Meshes to exclude from merge by name substring */
  excludeMeshNames?: string[];
  /** Target FPS for the VAT playback (default: 60) */
  fps?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate sequential frame ranges from animation groups.
 * Each range.from/to is a global frame index in the baked texture.
 */
function calculateRanges(animationGroups: BABYLON.AnimationGroup[]): VATAnimationRange[] {
  return animationGroups.reduce<VATAnimationRange[]>((acc, ag, index) => {
    if (index === 0) {
      acc.push({ name: ag.name, from: Math.round(ag.from), to: Math.round(ag.to) });
    } else {
      const prev = acc[index - 1];
      const length = Math.round(ag.to) - Math.round(ag.from);
      acc.push({ name: ag.name, from: prev.to + 1, to: prev.to + 1 + length });
    }
    return acc;
  }, []);
}

// ---------------------------------------------------------------------------
// Baking pipeline (runs in a temporary scene to avoid disturbing the main one)
// ---------------------------------------------------------------------------

function createBakingScene(engine: BABYLON.AbstractEngine): BABYLON.Scene {
  const tempScene = new BABYLON.Scene(engine);
  tempScene.useConstantAnimationDeltaTime = true;
  tempScene.performancePriority = BABYLON.ScenePerformancePriority.Aggressive;
  tempScene.autoClear = false;
  tempScene.autoClearDepthAndStencil = false;
  tempScene.skipFrustumClipping = true;
  (tempScene as any)._activeMeshesFrozen = true;
  tempScene.physicsEnabled = false;
  tempScene.renderTargetsEnabled = false;
  (tempScene as any)._skipEvaluateActiveMeshesCompletely = true;
  (tempScene as any)._activeMeshesFrozenButKeepClipping = false;
  tempScene.renderingManager.maintainStateBetweenFrames = true;
  tempScene.activeCamera = new BABYLON.ArcRotateCamera(
    '_bakeCam', 0, 0, 100, BABYLON.Vector3.Zero(), tempScene, true,
  );
  return tempScene;
}

/**
 * Bake vertex animation data from a mesh + skeleton + animation groups
 * into a Float32Array suitable for a VAT texture.
 */
async function bakeVertexData(
  mesh: BABYLON.Mesh,
  animationGroups: BABYLON.AnimationGroup[],
): Promise<Float32Array> {
  const skeleton = mesh.skeleton;
  if (!skeleton) throw new Error('Mesh requires a skeleton for VAT baking');

  mesh.computeBonesUsingShaders = false;
  mesh.isVisible = false;

  const boneCount = skeleton.bones.length;
  const frameCount = animationGroups.reduce(
    (acc, ag) => acc + (Math.round(ag.to) - Math.round(ag.from)) + 1, 0,
  );

  console.log(`[VAT] Baking ${frameCount} frames for ${boneCount} bones`);

  let textureIndex = 0;
  const textureSize = (boneCount + 1) * 4 * 4 * frameCount;
  const vertexData = new Float32Array(textureSize);

  const scene = mesh.getScene()!;

  function* captureFrame(): Generator<void> {
    const skeletonMatrices = skeleton!.getTransformMatrices(mesh);
    vertexData.set(skeletonMatrices, textureIndex * skeletonMatrices.length);
  }

  for (const ag of animationGroups) {
    const from = Math.round(ag.from);
    const to = Math.round(ag.to);
    ag.reset();

    for (let frameIndex = from; frameIndex <= to; frameIndex++) {
      const clampedFrame = Math.min(frameIndex, ag.to);
      ag.start(false, 1, clampedFrame, clampedFrame, false);

      const promise = ag.onAnimationEndObservable.runCoroutineAsync(captureFrame());
      scene.render(false);
      await promise;

      textureIndex++;
      ag.stop();
    }
  }

  return vertexData;
}

/**
 * Bake a mesh's animations into a VAT buffer using a separate baking scene.
 * This avoids visual glitches in the main scene.
 */
export async function bakeVATBuffer(
  engine: BABYLON.AbstractEngine,
  meshUrl: string,
): Promise<Float32Array> {
  const tempScene = createBakingScene(engine);

  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync('', meshUrl, tempScene);

  const anims = container.animationGroups;
  anims.forEach((ag) => {
    ag.stop();
    ag.reset();
    tempScene.addAnimationGroup(ag);
  });

  const mesh = container.meshes.find((m) => m.skeleton != null) as BABYLON.Mesh;
  const skeleton = mesh.skeleton!;
  tempScene.addMesh(mesh);
  tempScene.addSkeleton(skeleton);

  tempScene.meshes.forEach((m) => {
    m.computeBonesUsingShaders = false;
    m.isVisible = false;
    m.alwaysSelectAsActiveMesh = true;
  });

  skeleton.useTextureToStoreBoneMatrices = false;
  const skelSub = tempScene.onBeforeRenderObservable.add(() => skeleton.prepare(true));

  while (!tempScene.isReady()) await wait(0);

  const result = await bakeVertexData(mesh, anims);

  skelSub.remove();
  container.dispose();
  tempScene.dispose();

  return result;
}

// ---------------------------------------------------------------------------
// Merge helper (combine modular character sub-meshes into one for instancing)
// ---------------------------------------------------------------------------

/**
 * Merge all child meshes of a root node into a single mesh with multi-material
 * support, preserving the skeleton reference.
 */
export function mergeCharacterMeshes(
  root: BABYLON.AbstractMesh,
  skeleton: BABYLON.Skeleton,
  excludeNames: string[] = [],
): BABYLON.Mesh {
  const allChildren = root.getChildTransformNodes(true);
  let childMeshes: BABYLON.Mesh[] = [];

  for (const node of allChildren) {
    const meshes = node.getChildMeshes(false) as BABYLON.Mesh[];
    childMeshes.push(...meshes);
  }

  // Also include direct child meshes of the root
  const directChildren = root.getChildMeshes(true) as BABYLON.Mesh[];
  for (const m of directChildren) {
    if (!childMeshes.includes(m)) childMeshes.push(m);
  }

  // Filter out excluded meshes and non-mesh nodes
  childMeshes = childMeshes.filter((m) => {
    if (!(m instanceof BABYLON.Mesh)) return false;
    if (m.name === '__root__' || m.name.startsWith('__root')) return false;
    for (const excl of excludeNames) {
      if (m.name.includes(excl)) return false;
    }
    return true;
  });

  if (childMeshes.length === 0) {
    throw new Error('No meshes to merge');
  }

  // Merge with multiMaterial = true
  const merged = BABYLON.Mesh.MergeMeshes(
    childMeshes,
    false,  // disposeSource
    true,   // allow32BitsIndices
    undefined,
    undefined,
    true,   // multiMultiMaterial
  );

  if (!merged) throw new Error('MergeMeshes returned null');

  merged.name = '_MergedCharacter';
  merged.skeleton = skeleton;

  return merged;
}

// ---------------------------------------------------------------------------
// Full VAT setup on a mesh (applies manager + texture + instanced buffer)
// ---------------------------------------------------------------------------

/**
 * Apply a VAT buffer to a merged mesh, enabling GPU-driven animation.
 */
export function applyVAT(
  scene: BABYLON.Scene,
  mesh: BABYLON.Mesh,
  vatBuffer: Float32Array,
): { manager: BABYLON.BakedVertexAnimationManager; dispose: () => void } {
  const manager = new BABYLON.BakedVertexAnimationManager(scene);
  mesh.bakedVertexAnimationManager = manager;

  // Register the instanced buffer for per-instance animation control
  mesh.registerInstancedBuffer('bakedVertexAnimationSettingsInstanced', 4);

  // Create texture from baked data
  const baker = new BABYLON.VertexAnimationBaker(scene, mesh);
  const texture = baker.textureFromBakedVertexData(vatBuffer);
  manager.texture = texture;

  // Drive the time uniform each frame
  const sub = scene.onBeforeRenderObservable.add(() => {
    if (scene.deltaTime != null) {
      manager.time += scene.deltaTime / 1000.0;
    }
  });

  return {
    manager,
    dispose: (disposeTexture?: boolean) => {
      sub.remove();
      manager.dispose(disposeTexture);
    },
  };
}

// ---------------------------------------------------------------------------
// High-level: bake & setup a character for mass instancing
// ---------------------------------------------------------------------------

/**
 * Bake a character model into a VAT-ready instanced mesh.
 *
 * This is the primary entry point for crowd rendering. Usage:
 *
 * ```ts
 * const baked = await bakeCharacterForInstancing(scene, '/assets/characters/races/barbarian/barbarian-base.glb');
 * // Spawn 100 instances with random animations
 * for (let i = 0; i < 100; i++) {
 *   const inst = baked.createInstance(`npc_${i}`);
 *   inst.position.x = Math.random() * 40 - 20;
 *   inst.position.z = Math.random() * 40 - 20;
 * }
 * ```
 */
export async function bakeCharacterForInstancing(
  scene: BABYLON.Scene,
  modelUrl: string,
  options: BakeOptions = {},
): Promise<BakedCharacterData> {
  const fps = options.fps ?? 60;

  // 1. Bake the VAT buffer in a separate scene
  console.time('[VAT] baking');
  const vatBuffer = await bakeVATBuffer(scene.getEngine(), modelUrl);
  console.timeEnd('[VAT] baking');

  // 2. Load the model into the main scene
  const { meshes, animationGroups, skeletons } = await BABYLON.SceneLoader.ImportMeshAsync(
    '', modelUrl, '', scene,
  );

  // Stop all animations (VAT drives them now)
  animationGroups.forEach((ag) => ag.stop());

  const selectedAnims = options.animationGroups || animationGroups;
  const skeleton = skeletons[0];
  const root = meshes[0];

  root.position.setAll(0);
  root.scaling.setAll(1);
  root.rotationQuaternion = null;
  root.rotation.setAll(0);

  // 3. Merge character sub-meshes
  const merged = mergeCharacterMeshes(root, skeleton, options.excludeMeshNames);

  // Hide original meshes
  root.setEnabled(false);

  // 4. Apply VAT
  const { manager, dispose: disposeVAT } = applyVAT(scene, merged, vatBuffer);

  // Set default animation on the source mesh
  merged.instancedBuffers.bakedVertexAnimationSettingsInstanced = new BABYLON.Vector4(0, 0, 0, 0);

  // 5. Calculate animation ranges
  const ranges = calculateRanges(selectedAnims);

  // Helper to set animation params on a Vector4
  const setAnimParams = (vec: BABYLON.Vector4, animIndex?: number) => {
    const idx = animIndex ?? Math.floor(Math.random() * ranges.length);
    const anim = ranges[Math.min(idx, ranges.length - 1)];
    const from = Math.floor(anim.from);
    const to = Math.floor(anim.to);
    const offset = Math.floor(Math.random() * Math.max(to - from - 1, 1));
    vec.set(from, to - 1, offset, fps);
  };

  // Set default anim on source
  setAnimParams(merged.instancedBuffers.bakedVertexAnimationSettingsInstanced, 0);

  // 6. Build the result
  const createInstance = (id: string, animIndex?: number): BABYLON.InstancedMesh => {
    const instance = merged.createInstance('inst_' + id);
    instance.instancedBuffers.bakedVertexAnimationSettingsInstanced = new BABYLON.Vector4(0, 0, 0, 0);
    setAnimParams(instance.instancedBuffers.bakedVertexAnimationSettingsInstanced, animIndex);
    return instance;
  };

  const setAnimation = (instance: BABYLON.InstancedMesh, animIndex: number) => {
    setAnimParams(instance.instancedBuffers.bakedVertexAnimationSettingsInstanced, animIndex);
  };

  const dispose = () => {
    disposeVAT();
    merged.dispose(false, true);
    meshes.forEach((m) => m.dispose(false, true));
    animationGroups.forEach((ag) => ag.dispose());
    skeletons.forEach((s) => s.dispose());
  };

  console.log(
    `[VAT] Baked character ready: ${ranges.length} animations, ` +
    `${merged.getTotalVertices()} verts`,
  );

  return { mesh: merged, ranges, manager, createInstance, setAnimation, dispose };
}

// ---------------------------------------------------------------------------
// Utility: bake a ModularCharacter's current equipped state into VAT
// ---------------------------------------------------------------------------

/**
 * Bake the current visual state of a ModularCharacter (with equipment)
 * into a VAT for crowd rendering. This freezes the current equipment look.
 *
 * Useful for: NPC crowds, Gouldstone clones, faction AI units.
 */
export async function bakeModularCharacterState(
  scene: BABYLON.Scene,
  characterRoot: BABYLON.TransformNode,
  skeleton: BABYLON.Skeleton,
  animationGroups: BABYLON.AnimationGroup[],
  options: { excludeMeshNames?: string[]; fps?: number } = {},
): Promise<BakedCharacterData> {
  const fps = options.fps ?? 60;

  // Collect all visible meshes under the character root
  const allMeshes = characterRoot.getChildMeshes(false) as BABYLON.Mesh[];
  const visibleMeshes = allMeshes.filter((m) => {
    if (!(m instanceof BABYLON.Mesh)) return false;
    if (!m.isVisible) return false;
    if (m.name === '__root__') return false;
    for (const excl of options.excludeMeshNames || []) {
      if (m.name.includes(excl)) return false;
    }
    return true;
  });

  if (visibleMeshes.length === 0) {
    throw new Error('No visible meshes to bake');
  }

  // Merge visible meshes
  const merged = BABYLON.Mesh.MergeMeshes(
    visibleMeshes,
    false, true, undefined, undefined, true,
  );
  if (!merged) throw new Error('MergeMeshes returned null');

  merged.name = '_MergedEquippedCharacter';
  merged.skeleton = skeleton;

  // Bake animations
  animationGroups.forEach((ag) => ag.stop());

  const baker = new BABYLON.VertexAnimationBaker(scene, merged);

  // Build frames manually
  const boneCount = skeleton.bones.length;
  const frameCount = animationGroups.reduce(
    (acc, ag) => acc + (Math.round(ag.to) - Math.round(ag.from)) + 1, 0,
  );
  const textureSize = (boneCount + 1) * 4 * 4 * frameCount;
  const vertexData = new Float32Array(textureSize);
  let textureIndex = 0;

  merged.computeBonesUsingShaders = false;

  for (const ag of animationGroups) {
    const from = Math.round(ag.from);
    const to = Math.round(ag.to);
    ag.reset();

    for (let fi = from; fi <= to; fi++) {
      ag.start(false, 1, Math.min(fi, ag.to), Math.min(fi, ag.to), false);

      function* capture(): Generator<void> {
        const matrices = skeleton.getTransformMatrices(merged!);
        vertexData.set(matrices, textureIndex * matrices.length);
      }

      const promise = ag.onAnimationEndObservable.runCoroutineAsync(capture());
      scene.render(false);
      await promise;

      textureIndex++;
      ag.stop();
    }
  }

  merged.computeBonesUsingShaders = true;
  merged.isVisible = true;

  // Apply VAT
  const { manager, dispose: disposeVAT } = applyVAT(scene, merged, vertexData);
  merged.instancedBuffers.bakedVertexAnimationSettingsInstanced = new BABYLON.Vector4(0, 0, 0, 0);

  const ranges = calculateRanges(animationGroups);

  const setAnimParams = (vec: BABYLON.Vector4, animIndex?: number) => {
    const idx = animIndex ?? Math.floor(Math.random() * ranges.length);
    const anim = ranges[Math.min(idx, ranges.length - 1)];
    vec.set(Math.floor(anim.from), Math.floor(anim.to) - 1, Math.floor(Math.random() * Math.max(anim.to - anim.from - 1, 1)), fps);
  };

  setAnimParams(merged.instancedBuffers.bakedVertexAnimationSettingsInstanced, 0);

  return {
    mesh: merged,
    ranges,
    manager,
    createInstance: (id, animIndex) => {
      const inst = merged.createInstance('inst_' + id);
      inst.instancedBuffers.bakedVertexAnimationSettingsInstanced = new BABYLON.Vector4(0, 0, 0, 0);
      setAnimParams(inst.instancedBuffers.bakedVertexAnimationSettingsInstanced, animIndex);
      return inst;
    },
    setAnimation: (inst, animIndex) => {
      setAnimParams(inst.instancedBuffers.bakedVertexAnimationSettingsInstanced, animIndex);
    },
    dispose: () => {
      disposeVAT();
      merged.dispose(false, true);
    },
  };
}
