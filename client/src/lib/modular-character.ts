import * as BABYLON from '@babylonjs/core';
import type {
  RaceId,
  EquipmentSlotType,
  WeaponType,
  ArmorTier,
  RaceManifest,
  EquipmentSlotState,
  CharacterState,
} from '@shared/character-schema';
import { CharacterAnimationState } from './character-animation-state';
import { bakeModularCharacterState, type BakedCharacterData } from './character-vat';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_SLOTS: EquipmentSlotType[] = [
  'weapon', 'head', 'chest', 'legs', 'shield', 'shoulders', 'hands', 'feet',
];

/** Common bone names across the Toon_RTS skeletons */
const DEFAULT_ATTACH_BONES: Record<string, string> = {
  weapon: 'RightHand',
  shield: 'LeftHand',
  head: 'Head',
  chest: 'Spine1',
  shoulders: 'Spine2',
  hands: 'RightHand',
  legs: 'Hips',
  feet: 'LeftFoot',
};

/** Sub-mesh name patterns used by the Toon_RTS customizable FBX models */
const MESH_SLOT_PATTERNS: Array<{ pattern: RegExp; slot: EquipmentSlotType }> = [
  { pattern: /head|helmet|hair|face/i, slot: 'head' },
  { pattern: /chest|torso|body_upper|cuirass|shirt/i, slot: 'chest' },
  { pattern: /leg|pants|body_lower|skirt|greave/i, slot: 'legs' },
  { pattern: /shoulder|pauldron|cape/i, slot: 'shoulders' },
  { pattern: /hand|glove|gauntlet|bracer/i, slot: 'hands' },
  { pattern: /foot|boot|shoe/i, slot: 'feet' },
  { pattern: /shield|buckler/i, slot: 'shield' },
  { pattern: /weapon|sword|axe|staff|bow|spear|hammer|mace|dagger|wand/i, slot: 'weapon' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EquipmentSlotData {
  slotType: EquipmentSlotType;
  nakedMeshes: BABYLON.AbstractMesh[];
  equippedRoot: BABYLON.TransformNode | null;
  equippedMeshes: BABYLON.AbstractMesh[];
  attachBoneName: string;
  attachBone: BABYLON.Bone | null;
  state: EquipmentSlotState;
}

export interface ModularCharacterOptions {
  scene: BABYLON.Scene;
  raceId: RaceId;
  manifest: RaceManifest;
  position?: BABYLON.Vector3;
  rotation?: number;
  scale?: number;
  /** Base path prefix for asset loading (e.g. "/assets/characters/races/barbarian") */
  basePath: string;
}

// ---------------------------------------------------------------------------
// ModularCharacter
// ---------------------------------------------------------------------------

export class ModularCharacter {
  public readonly raceId: RaceId;
  public readonly scene: BABYLON.Scene;
  public root: BABYLON.TransformNode;
  public skeleton: BABYLON.Skeleton | null = null;
  public animationGroups: BABYLON.AnimationGroup[] = [];
  public animationState: CharacterAnimationState;

  private manifest: RaceManifest;
  private basePath: string;
  private slots: Map<EquipmentSlotType, EquipmentSlotData> = new Map();
  private allMeshes: BABYLON.AbstractMesh[] = [];
  private skinBones: Map<string, BABYLON.Bone> = new Map();
  private loadedEquipmentCache: Map<string, BABYLON.AssetContainer> = new Map();
  private disposed = false;

  constructor(options: ModularCharacterOptions) {
    this.raceId = options.raceId;
    this.scene = options.scene;
    this.manifest = options.manifest;
    this.basePath = options.basePath.replace(/\/$/, '');

    this.root = new BABYLON.TransformNode(`character_${options.raceId}`, this.scene);
    if (options.position) this.root.position = options.position;
    if (options.rotation != null) this.root.rotation.y = options.rotation;
    if (options.scale != null) this.root.scaling.setAll(options.scale);

    // Initialise empty slots
    for (const slot of ALL_SLOTS) {
      this.slots.set(slot, {
        slotType: slot,
        nakedMeshes: [],
        equippedRoot: null,
        equippedMeshes: [],
        attachBoneName: DEFAULT_ATTACH_BONES[slot] || '',
        attachBone: null,
        state: { slotType: slot, itemId: null, meshPath: null, armorTier: null, weaponType: null },
      });
    }

    this.animationState = new CharacterAnimationState(this.scene);
  }

  // ---- Loading -------------------------------------------------------------

  /** Load the base character GLB and classify sub-meshes into slots */
  async load(): Promise<void> {
    if (!this.manifest.baseMesh) {
      throw new Error(`Race ${this.raceId} has no base mesh defined`);
    }

    const url = `${this.basePath}/${this.manifest.baseMesh}`;
    console.log(`[ModularCharacter] Loading base mesh: ${url}`);

    const result = await BABYLON.SceneLoader.ImportMeshAsync('', url, '', this.scene);

    // Parent everything under our root
    for (const mesh of result.meshes) {
      if (!mesh.parent) mesh.parent = this.root;
      this.allMeshes.push(mesh);
    }

    // Grab skeleton
    if (result.skeletons.length > 0) {
      this.skeleton = result.skeletons[0];
      this.cacheBones();
    }

    // Store animation groups
    this.animationGroups = result.animationGroups || [];

    // Classify sub-meshes into equipment slots
    this.classifyMeshes();

    // Wire attach bones for hand-held slots
    this.wireAttachBones();

    // Bind skeleton to animation state for legacy beginAnimation fallback
    // (some FBX/.babylon models use skeleton frame ranges instead of AnimationGroups)
    if (this.skeleton) {
      this.animationState.bindSkeleton(this.skeleton);
      // If no AnimationGroups but skeleton has named ranges, auto-register them
      if (this.animationGroups.length === 0) {
        this.animationState.autoRegisterSkeletonRanges(this.skeleton);
      }
    }

    console.log(`[ModularCharacter] ${this.raceId} loaded: ${this.allMeshes.length} meshes, ${this.skeleton?.bones.length || 0} bones, ${this.animationGroups.length} anims`);
  }

  /** Cache skeleton bone lookup by name */
  private cacheBones(): void {
    if (!this.skeleton) return;
    for (const bone of this.skeleton.bones) {
      this.skinBones.set(bone.name, bone);
      // Also store without common prefixes/suffixes
      const clean = bone.name.replace(/^mixamo:|^Bip01\s*/i, '');
      if (clean !== bone.name) this.skinBones.set(clean, bone);
    }
  }

  /** Classify each mesh into an equipment slot based on naming patterns */
  private classifyMeshes(): void {
    for (const mesh of this.allMeshes) {
      const name = mesh.name.toLowerCase();
      // Skip root __root__ mesh
      if (name === '__root__' || name.startsWith('__root')) continue;

      let matched = false;
      for (const { pattern, slot } of MESH_SLOT_PATTERNS) {
        if (pattern.test(name)) {
          const slotData = this.slots.get(slot);
          if (slotData) {
            slotData.nakedMeshes.push(mesh);
            matched = true;
          }
          break;
        }
      }

      // Anything unmatched goes to chest (body) as default
      if (!matched && mesh instanceof BABYLON.Mesh) {
        const bodySlot = this.slots.get('chest');
        if (bodySlot) bodySlot.nakedMeshes.push(mesh);
      }
    }
  }

  /** Wire skeleton bones for equipment attachment */
  private wireAttachBones(): void {
    for (const [, slotData] of this.slots) {
      if (slotData.attachBoneName && this.skeleton) {
        slotData.attachBone = this.findBone(slotData.attachBoneName);
      }
    }
  }

  /** Find a bone by name, trying common variants */
  private findBone(name: string): BABYLON.Bone | null {
    // Direct match
    if (this.skinBones.has(name)) return this.skinBones.get(name)!;

    // Case-insensitive search
    const lower = name.toLowerCase();
    for (const [boneName, bone] of this.skinBones) {
      if (boneName.toLowerCase() === lower) return bone;
      if (boneName.toLowerCase().endsWith(lower)) return bone;
    }

    return null;
  }

  // ---- Equipment -----------------------------------------------------------

  /**
   * Equip an item in a slot.
   * Loads the equipment GLB, remaps its bones to the character skeleton,
   * hides the naked mesh for that slot, and shows the equipment mesh.
   */
  async equip(
    slotType: EquipmentSlotType,
    meshPath: string,
    options: {
      itemId?: string;
      armorTier?: ArmorTier;
      weaponType?: WeaponType;
    } = {},
  ): Promise<void> {
    const slotData = this.slots.get(slotType);
    if (!slotData) return;

    // Unequip current first
    this.unequip(slotType);

    // Resolve full URL
    const url = meshPath.startsWith('/') || meshPath.startsWith('http')
      ? meshPath
      : `${this.basePath}/${meshPath}`;

    console.log(`[ModularCharacter] Equipping ${slotType}: ${url}`);

    try {
      // Load equipment mesh
      let container = this.loadedEquipmentCache.get(url);
      if (!container) {
        container = await BABYLON.SceneLoader.LoadAssetContainerAsync('', url, this.scene);
        this.loadedEquipmentCache.set(url, container);
      }

      // Instantiate into scene
      const instances = container.instantiateModelsToScene(
        (name) => `${this.raceId}_${slotType}_${name}`,
        false,
      );

      const equipRoot = new BABYLON.TransformNode(
        `equip_${slotType}`,
        this.scene,
      );

      // Parent to attach bone or root
      if (this.isHandHeldSlot(slotType) && slotData.attachBone) {
        equipRoot.attachToBone(slotData.attachBone, this.root as BABYLON.AbstractMesh);
      } else {
        equipRoot.parent = this.root;
      }

      const equipMeshes: BABYLON.AbstractMesh[] = [];

      for (const rootNode of instances.rootNodes) {
        rootNode.parent = equipRoot;
        // Collect all meshes
        const meshes = rootNode.getChildMeshes(false);
        meshes.forEach((m) => {
          equipMeshes.push(m);
          // Bone remapping for skinned meshes
          if (m instanceof BABYLON.Mesh && m.skeleton && this.skeleton) {
            this.remapBones(m);
          }
        });
        // The root itself might be a mesh
        if (rootNode instanceof BABYLON.AbstractMesh) {
          equipMeshes.push(rootNode);
          if (rootNode instanceof BABYLON.Mesh && rootNode.skeleton && this.skeleton) {
            this.remapBones(rootNode);
          }
        }
      }

      // Bind animations from the equipment
      for (const group of instances.animationGroups) {
        this.animationGroups.push(group);
      }

      // Hide naked meshes for this slot
      for (const nakedMesh of slotData.nakedMeshes) {
        nakedMesh.isVisible = false;
      }

      // Update slot state
      slotData.equippedRoot = equipRoot;
      slotData.equippedMeshes = equipMeshes;
      slotData.state = {
        slotType,
        itemId: options.itemId || null,
        meshPath,
        armorTier: options.armorTier || null,
        weaponType: options.weaponType || null,
      };

      // If weapon, update animation set
      if (slotType === 'weapon' && options.weaponType) {
        await this.animationState.setWeaponType(options.weaponType);
      }

    } catch (err) {
      console.error(`[ModularCharacter] Failed to equip ${slotType}: ${err}`);
    }
  }

  /** Unequip an item from a slot, restoring the naked mesh */
  unequip(slotType: EquipmentSlotType): void {
    const slotData = this.slots.get(slotType);
    if (!slotData) return;

    // Dispose equipped meshes
    if (slotData.equippedRoot) {
      slotData.equippedRoot.dispose(false, true);
      slotData.equippedRoot = null;
    }
    for (const mesh of slotData.equippedMeshes) {
      mesh.dispose(false, true);
    }
    slotData.equippedMeshes = [];

    // Show naked meshes
    for (const nakedMesh of slotData.nakedMeshes) {
      nakedMesh.isVisible = true;
    }

    // Reset state
    const wasWeapon = slotData.state.weaponType;
    slotData.state = {
      slotType,
      itemId: null,
      meshPath: null,
      armorTier: null,
      weaponType: null,
    };

    // If unequipping weapon, revert to unarmed
    if (slotType === 'weapon' && wasWeapon) {
      this.animationState.setWeaponType('unarmed');
    }
  }

  /** Unequip all slots */
  unequipAll(): void {
    for (const slot of ALL_SLOTS) {
      this.unequip(slot);
    }
  }

  // ---- Bone remapping (replicates Unity's ReplaceAllBones) -----------------

  /**
   * Remap bones of an equipment SkinnedMesh to point at the character
   * skeleton's bones by matching bone names. This is the Babylon.js
   * equivalent of Unity's SkinnedMeshRenderer bone replacement.
   */
  private remapBones(equipmentMesh: BABYLON.Mesh): void {
    if (!this.skeleton || !equipmentMesh.skeleton) return;

    const equipSkeleton = equipmentMesh.skeleton;
    const newBones: BABYLON.Bone[] = [];
    let canRemap = true;

    for (const equipBone of equipSkeleton.bones) {
      const matchingBone = this.findBone(equipBone.name);
      if (matchingBone) {
        newBones.push(matchingBone);
      } else {
        canRemap = false;
        break;
      }
    }

    if (canRemap && newBones.length === equipSkeleton.bones.length) {
      // Point the equipment mesh at the character's skeleton
      equipmentMesh.skeleton = this.skeleton;
      console.log(`[ModularCharacter] Remapped ${newBones.length} bones for ${equipmentMesh.name}`);
    } else {
      // Partial remap: keep the equipment skeleton but sync transforms
      console.warn(
        `[ModularCharacter] Could not fully remap bones for ${equipmentMesh.name}. ` +
        `Equipment has ${equipSkeleton.bones.length} bones, matched ${newBones.length}.`,
      );
    }
  }

  // ---- Armor tier material swap --------------------------------------------

  /**
   * Swap the material/texture on armor slots to reflect a different tier.
   * Cloth → leather → metal by swapping textures.
   */
  async setArmorTier(slotType: EquipmentSlotType, tier: ArmorTier): Promise<void> {
    const slotData = this.slots.get(slotType);
    if (!slotData) return;

    // Find texture path from manifest
    const textureName = this.manifest.texture;
    if (!textureName) return;

    // Convention: <race>-<tier>-texture.png
    const tierTexture = `${this.basePath}/${this.raceId}-${tier}-texture.png`;

    const meshes = slotData.equippedMeshes.length > 0
      ? slotData.equippedMeshes
      : slotData.nakedMeshes;

    for (const mesh of meshes) {
      if (mesh.material && mesh.material instanceof BABYLON.StandardMaterial) {
        const texture = new BABYLON.Texture(tierTexture, this.scene);
        mesh.material.diffuseTexture = texture;
      } else if (mesh.material && mesh.material instanceof BABYLON.PBRMaterial) {
        const texture = new BABYLON.Texture(tierTexture, this.scene);
        mesh.material.albedoTexture = texture;
      }
    }

    slotData.state.armorTier = tier;
  }

  // ---- State ---------------------------------------------------------------

  /** Get the current equipment state of all slots */
  getCharacterState(): CharacterState {
    const equipment: EquipmentSlotState[] = [];
    for (const [, slotData] of this.slots) {
      equipment.push({ ...slotData.state });
    }
    return {
      raceId: this.raceId,
      name: this.root.name,
      equipment,
      activeAnimationSet: this.animationState.currentWeaponType,
    };
  }

  /** Apply a full character state (e.g. loaded from server) */
  async applyCharacterState(state: CharacterState): Promise<void> {
    for (const slotState of state.equipment) {
      if (slotState.meshPath) {
        await this.equip(slotState.slotType, slotState.meshPath, {
          itemId: slotState.itemId || undefined,
          armorTier: slotState.armorTier || undefined,
          weaponType: slotState.weaponType || undefined,
        });
      }
    }
  }

  /** Get slot data for inspection */
  getSlot(slotType: EquipmentSlotType): EquipmentSlotData | undefined {
    return this.slots.get(slotType);
  }

  /** Get all slot states */
  getAllSlots(): EquipmentSlotData[] {
    return Array.from(this.slots.values());
  }

  // ---- Helpers -------------------------------------------------------------

  private isHandHeldSlot(slotType: EquipmentSlotType): boolean {
    return slotType === 'weapon' || slotType === 'shield';
  }

  /** Get the primary mesh (first visible mesh) */
  getPrimaryMesh(): BABYLON.AbstractMesh | null {
    return this.allMeshes.find((m) => m.isVisible && m.name !== '__root__') || null;
  }

  /** Get all visible meshes */
  getVisibleMeshes(): BABYLON.AbstractMesh[] {
    return this.allMeshes.filter((m) => m.isVisible);
  }

  /** Get bounding info for the whole character */
  getBoundingInfo(): BABYLON.BoundingInfo | null {
    const primary = this.getPrimaryMesh();
    return primary ? primary.getBoundingInfo() : null;
  }

  // ---- VAT crowd baking ----------------------------------------------------

  /**
   * Bake the character's current equipped appearance into a VAT for mass
   * instancing. Each instance plays GPU-driven animation with zero CPU cost.
   *
   * Perfect for: Gouldstone clones, faction AI crews, NPC crowds.
   *
   * @example
   * ```ts
   * const baked = await character.bakeForCrowd();
   * for (let i = 0; i < 50; i++) {
   *   const inst = baked.createInstance(`clone_${i}`);
   *   inst.position.x = Math.random() * 40 - 20;
   *   inst.position.z = Math.random() * 40 - 20;
   * }
   * ```
   */
  async bakeForCrowd(options: { excludeMeshNames?: string[]; fps?: number } = {}): Promise<BakedCharacterData> {
    if (!this.skeleton) {
      throw new Error('Cannot bake character without skeleton');
    }
    return bakeModularCharacterState(
      this.scene,
      this.root,
      this.skeleton,
      this.animationGroups,
      options,
    );
  }

  // ---- Dispose -------------------------------------------------------------

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.unequipAll();

    // Dispose cached containers
    for (const [, container] of this.loadedEquipmentCache) {
      container.dispose();
    }
    this.loadedEquipmentCache.clear();

    // Dispose animation state
    this.animationState.dispose();

    // Dispose all meshes
    for (const mesh of this.allMeshes) {
      mesh.dispose(false, true);
    }

    // Dispose root
    this.root.dispose(false, true);

    console.log(`[ModularCharacter] ${this.raceId} disposed`);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create and load a ModularCharacter from a race manifest.
 * This is the primary entry point for spawning a character.
 */
export async function createModularCharacter(
  scene: BABYLON.Scene,
  raceId: RaceId,
  options: {
    position?: BABYLON.Vector3;
    rotation?: number;
    scale?: number;
    manifestUrl?: string;
  } = {},
): Promise<ModularCharacter> {
  const basePath = `/assets/characters/races/${raceId}`;
  const manifestUrl = options.manifestUrl || `${basePath}/manifest.json`;

  // Fetch the race manifest
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`Failed to load race manifest for ${raceId}: ${response.status}`);
  }
  const manifest: RaceManifest = await response.json();

  const character = new ModularCharacter({
    scene,
    raceId,
    manifest,
    position: options.position,
    rotation: options.rotation,
    scale: options.scale,
    basePath,
  });

  await character.load();
  return character;
}

// ===========================================================================
// Showcase Helper API
// ===========================================================================
// Self-contained functional API consumed by CharacterShowcase.tsx.
// Works directly with GLB assets — no race manifests required.
// ===========================================================================

export type ArmorType = 'cloth' | 'leather' | 'metal';
export type EquipmentSlot = 'weapon' | 'head' | 'chest' | 'legs' | 'shield' | 'shoulders' | 'hands' | 'feet';

export interface MeshLayers {
  cloth: BABYLON.AbstractMesh[];
  leather: BABYLON.AbstractMesh[];
  metal: BABYLON.AbstractMesh[];
  base: BABYLON.AbstractMesh[];
  all: BABYLON.AbstractMesh[];
}

export interface LoadedCharacter {
  rootMesh: BABYLON.AbstractMesh;
  skeleton: BABYLON.Skeleton | null;
  animationGroups: BABYLON.AnimationGroup[];
  meshLayers: MeshLayers;
  equipment: Map<EquipmentSlot, BABYLON.AbstractMesh[]>;
  dispose: () => void;
}

/** Race → GLB path mapping - Grudge 6 race characters ONLY (mesh armours + weapons support).
 * Uses the canonical races/ bases. Swap base GLB for full grudge6 modular export as needed.
 */
export const RACE_MODELS: Record<string, { glb: string; scale: number }> = {
  human:     { glb: '/assets/characters/races/human/human-base.glb', scale: 1.0 },
  orc:       { glb: '/assets/characters/races/orc/orc-base.glb',     scale: 1.0 },
  elf:       { glb: '/assets/characters/races/elf/elf-base.glb',     scale: 1.0 },
  undead:    { glb: '/assets/characters/races/undead/undead-base.glb', scale: 1.0 },
  barbarian: { glb: '/assets/characters/races/barbarian/barbarian-base.glb', scale: 1.0 },
  dwarf:     { glb: '/assets/characters/races/dwarf/dwarf-base.glb', scale: 1.0 },
};

/** Weapon → GLB path */
export const WEAPON_MODELS: Record<string, string> = {
  sword:  '/assets/models/weapons/Sword.glb',
  axe:    '/assets/models/weapons/Axe.glb',
  bow:    '/assets/models/weapons/Bow.glb',
  staff:  '/assets/models/weapons/Staff.glb',
  shield: '/assets/models/weapons/Shield.glb',
  dagger: '/assets/models/weapons/Dagger.glb',
  mace:   '/assets/models/weapons/Mace.glb',
};

/** Equipment slot → bone name (Mixamo skeleton) */
const SHOWCASE_SLOT_BONES: Record<EquipmentSlot, string> = {
  weapon:    'mixamorig:RightHand',
  shield:    'mixamorig:LeftHand',
  head:      'mixamorig:Head',
  chest:     'mixamorig:Spine2',
  legs:      'mixamorig:Hips',
  shoulders: 'mixamorig:Spine2',
  hands:     'mixamorig:RightHand',
  feet:      'mixamorig:RightFoot',
};

/** Tier color system (T1-T8) — matches GRUDGE-STUDIO-CONTEXT.md */
export const TIER_COLORS: Record<number, { name: string; hex: string }> = {
  1: { name: 'Bronze',  hex: '#8b7355' },
  2: { name: 'Silver',  hex: '#a8a8a8' },
  3: { name: 'Blue',    hex: '#4a9eff' },
  4: { name: 'Purple',  hex: '#9d4dff' },
  5: { name: 'Red',     hex: '#ff4d4d' },
  6: { name: 'Orange',  hex: '#ffaa00' },
  7: { name: 'Gold',    hex: '#d4a84b' },
  8: { name: 'Shimmer', hex: '#f0d890' },
};

const ARMOR_BASE_COLORS: Record<ArmorType, BABYLON.Color3> = {
  cloth:   new BABYLON.Color3(0.2, 0.25, 0.5),
  leather: new BABYLON.Color3(0.45, 0.3, 0.15),
  metal:   new BABYLON.Color3(0.55, 0.55, 0.6),
};

// ── Mesh layer detection ───────────────────────────────────────

function classifyMeshLayers(meshes: BABYLON.AbstractMesh[]): MeshLayers {
  const layers: MeshLayers = { cloth: [], leather: [], metal: [], base: [], all: [...meshes] };

  for (const mesh of meshes) {
    if (!mesh.name || mesh.name === '__root__') continue;
    const lower = mesh.name.toLowerCase();

    if (lower.includes('cloth') || lower.includes('robe') || lower.includes('set_0') || lower.includes('fabric')) {
      layers.cloth.push(mesh);
    } else if (lower.includes('leather') || lower.includes('hide') || lower.includes('set_1') || lower.includes('light_armor')) {
      layers.leather.push(mesh);
    } else if (lower.includes('metal') || lower.includes('plate') || lower.includes('set_2') || lower.includes('heavy') || lower.includes('chain')) {
      layers.metal.push(mesh);
    } else {
      layers.base.push(mesh);
    }
  }

  if (layers.cloth.length === 0 && layers.leather.length === 0 && layers.metal.length === 0) {
    layers.base = meshes.filter(m => m.name !== '__root__');
  }

  return layers;
}

// ── Showcase Core API ──────────────────────────────────────────

export async function loadRaceCharacter(race: string, scene: BABYLON.Scene): Promise<LoadedCharacter> {
  const model = RACE_MODELS[race];
  if (!model) throw new Error(`Unknown race: ${race}`);

  const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', model.glb, scene);
  const root = result.meshes[0];
  root.scaling.setAll(model.scale);

  const meshLayers = classifyMeshLayers(result.meshes);
  [...meshLayers.cloth, ...meshLayers.leather, ...meshLayers.metal].forEach(m => m.setEnabled(false));
  meshLayers.base.forEach(m => m.setEnabled(true));

  if (result.animationGroups.length > 0) {
    scene.animationPropertiesOverride = scene.animationPropertiesOverride || {
      enableBlending: true,
      blendingSpeed: 0.08,
      loopMode: 1,
    } as any;
  }

  return {
    rootMesh: root,
    skeleton: result.skeletons[0] || null,
    animationGroups: result.animationGroups,
    meshLayers,
    equipment: new Map(),
    dispose: () => {
      result.meshes.forEach(m => m.dispose());
      result.animationGroups.forEach(ag => ag.dispose());
      result.skeletons.forEach(s => s.dispose());
    },
  };
}

export function setArmorVisibility(character: LoadedCharacter, armorType: ArmorType | 'none'): void {
  const { meshLayers } = character;
  meshLayers.cloth.forEach(m => m.setEnabled(false));
  meshLayers.leather.forEach(m => m.setEnabled(false));
  meshLayers.metal.forEach(m => m.setEnabled(false));
  if (armorType !== 'none') meshLayers[armorType].forEach(m => m.setEnabled(true));
  meshLayers.base.forEach(m => m.setEnabled(true));
}

export function setArmorTierShowcase(character: LoadedCharacter, armorType: ArmorType, tier: number): void {
  const tierColor = TIER_COLORS[tier];
  if (!tierColor) return;
  const baseColor = ARMOR_BASE_COLORS[armorType];
  const tint = BABYLON.Color3.FromHexString(tierColor.hex);
  const blended = BABYLON.Color3.Lerp(baseColor, tint, 0.4);

  const meshes = character.meshLayers[armorType];
  const targets = meshes.length > 0 ? meshes : character.meshLayers.base;

  for (const mesh of targets) {
    if (!mesh.material) continue;
    if (mesh.material instanceof BABYLON.PBRMaterial) {
      mesh.material.albedoColor = blended;
      mesh.material.metallic = armorType === 'metal' ? 0.4 + tier * 0.06 : 0.1 + tier * 0.03;
      mesh.material.roughness = Math.max(0.2, 0.8 - tier * 0.07);
    } else if (mesh.material instanceof BABYLON.StandardMaterial) {
      mesh.material.diffuseColor = blended;
      mesh.material.specularPower = 16 + tier * 8;
    }
  }
}

/** Re-export under the name CharacterShowcase expects */
export { setArmorTierShowcase as setArmorTier };

export async function attachEquipment(
  character: LoadedCharacter,
  slot: EquipmentSlot,
  modelPath: string,
  scene: BABYLON.Scene,
): Promise<void> {
  removeEquipment(character, slot);
  if (!character.skeleton) return;

  const boneName = SHOWCASE_SLOT_BONES[slot];
  const bone = character.skeleton.bones.find(b => b.name === boneName);
  if (!bone) {
    console.warn(`Bone ${boneName} not found for slot ${slot}`);
    return;
  }

  const result = await BABYLON.SceneLoader.ImportMeshAsync('', '', modelPath, scene);
  const equipScale = slot === 'weapon' || slot === 'shield' ? 0.8 : 0.5;
  result.meshes.forEach(m => m.scaling.setAll(equipScale));

  const root = result.meshes[0];
  root.attachToBone(bone, character.rootMesh);

  if (slot === 'weapon') {
    root.position = new BABYLON.Vector3(0, 0.1, 0);
    root.rotation = new BABYLON.Vector3(0, 0, Math.PI / 4);
  } else if (slot === 'shield') {
    root.position = new BABYLON.Vector3(0, 0.1, 0);
    root.rotation = new BABYLON.Vector3(0, Math.PI, 0);
  }

  character.equipment.set(slot, result.meshes);
}

export function removeEquipment(character: LoadedCharacter, slot: EquipmentSlot): void {
  const meshes = character.equipment.get(slot);
  if (meshes) {
    meshes.forEach(m => m.dispose());
    character.equipment.delete(slot);
  }
}

export function playAnimation(
  character: LoadedCharacter,
  name: string,
  loop: boolean = true,
  speed: number = 1.0,
): void {
  const { animationGroups } = character;
  if (animationGroups.length === 0) return;
  const lower = name.toLowerCase();
  const target = animationGroups.find(ag => ag.name.toLowerCase().includes(lower));
  for (const ag of animationGroups) {
    if (ag !== target) ag.stop();
  }
  if (target) target.start(loop, speed);
  else animationGroups[0]?.start(loop, speed);
}

export function getAnimationNames(character: LoadedCharacter): string[] {
  return character.animationGroups.map(ag => ag.name);
}

export async function loadEquippedCharacter(
  race: string,
  armorType: ArmorType,
  tier: number,
  weaponKey: string | null,
  scene: BABYLON.Scene,
): Promise<LoadedCharacter> {
  const character = await loadRaceCharacter(race, scene);
  setArmorVisibility(character, armorType);
  setArmorTierShowcase(character, armorType, tier);
  if (weaponKey && WEAPON_MODELS[weaponKey]) {
    await attachEquipment(character, 'weapon', WEAPON_MODELS[weaponKey], scene);
  }
  playAnimation(character, 'idle');
  return character;
}
