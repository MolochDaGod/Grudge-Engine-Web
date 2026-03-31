import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const raceIdSchema = z.enum([
  "barbarian",
  "dwarf",
  "elf",
  "orc",
  "undead",
  "human",
]);

export const equipmentSlotTypeSchema = z.enum([
  "weapon",
  "head",
  "chest",
  "legs",
  "shield",
  "shoulders",
  "hands",
  "feet",
]);

export const armorTierSchema = z.enum(["cloth", "leather", "metal"]);

// ---------------------------------------------------------------------------
// Classes (4) — determines skills, weapon restrictions, abilities
// ---------------------------------------------------------------------------

export const classIdSchema = z.enum([
  "warrior",
  "mage",
  "ranger",
  "worge",
]);

/** Worge transformation forms (class skill, not a race) */
export const worgeFormSchema = z.enum([
  "humanoid",      // default form
  "bear",          // large tank form — powerful melee
  "raptor",        // invisible rogue form
  "large-bird",    // flyable mount form — other players/AI can ride
]);

/** Weapon types each class can equip */
export const classWeaponRestrictionsSchema = z.object({
  classId: classIdSchema,
  allowedWeapons: z.array(weaponTypeSchema),
});

/** Per-class weapon restrictions (from game design) */
export const CLASS_WEAPON_RESTRICTIONS: Record<string, string[]> = {
  warrior: [
    'sword-shield', 'two-hand-sword', 'hammer', 'mace', 'axe',
    'harvesting-pick', 'harvesting-axe',
  ],
  mage: [
    'staff-mage', 'wand', 'mace',
    'harvesting-sickle', 'harvesting-rod',
  ],
  ranger: [
    'bow', 'crossbow', 'gun', 'dagger', 'two-hand-sword', 'spear',
    'harvesting-knife', 'harvesting-axe',
  ],
  worge: [
    'staff-mage', 'spear', 'dagger', 'bow', 'hammer', 'mace',
    'harvesting-pick', 'harvesting-sickle',
  ],
};

export const classAbilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  classId: classIdSchema,
  description: z.string().default(""),
  cooldown: z.number().default(0),
  staminaCost: z.number().default(0),
  manaCost: z.number().default(0),
  /** For Worge: which form this ability requires or triggers */
  requiredWorgeForm: worgeFormSchema.optional(),
  /** For Warriors: stamina-based charge/sprint mechanics */
  isStaminaAbility: z.boolean().default(false),
  /** For Mages: teleport block placement */
  isTeleportBlock: z.boolean().default(false),
  /** AoE radius (0 = single target) */
  aoeRadius: z.number().default(0),
});

export const classDefinitionSchema = z.object({
  classId: classIdSchema,
  name: z.string(),
  description: z.string(),
  allowedWeapons: z.array(weaponTypeSchema),
  allowedArmor: z.array(armorTierSchema),
  abilities: z.array(classAbilitySchema).default([]),
  /** Worge-only: available transformation forms */
  worgeForms: z.array(worgeFormSchema).optional(),
});

export const weaponTypeSchema = z.enum([
  "unarmed",
  "sword-shield",
  "two-hand-sword",
  "staff-mage",
  "spear",
  "bow",
  "dual-wield",
  "hammer",
  "axe",
  "dagger",
  "crossbow",
  "gun",
  "wand",
  "mace",
  "harvesting-pick",
  "harvesting-axe",
  "harvesting-sickle",
  "harvesting-rod",
  "harvesting-knife",
]);

export const animationActionSchema = z.enum([
  "idle",
  "walk",
  "run",
  "jump",
  "strafe-left",
  "strafe-right",
  "turn-180",
  "crouch",
  "crouch-idle",
  "crouch-walk",
  "block",
  "block-idle",
  "slash-1",
  "slash-2",
  "slash-3",
  "slash-4",
  "slash-5",
  "combo",
  "impact",
  "cast-1",
  "cast-2",
  "cast-3",
  "cast-4",
  "area-attack-1",
  "area-attack-2",
  "attack",
  "combat-idle",
  "draw",
  "shoot",
  "power-up",
  "death",
  "working",
  "battlecry",
  "sitting",
  "dance",
  "emote",
]);

// ---------------------------------------------------------------------------
// Equipment state
// ---------------------------------------------------------------------------

export const equipmentSlotStateSchema = z.object({
  slotType: equipmentSlotTypeSchema,
  itemId: z.string().nullable().default(null),
  meshPath: z.string().nullable().default(null),
  armorTier: armorTierSchema.nullable().default(null),
  weaponType: weaponTypeSchema.nullable().default(null),
});

export const characterStateSchema = z.object({
  raceId: raceIdSchema,
  classId: classIdSchema.default("warrior"),
  name: z.string().default(""),
  level: z.number().int().min(1).default(1),
  equipment: z.array(equipmentSlotStateSchema).default([]),
  activeAnimationSet: weaponTypeSchema.default("unarmed"),
  /** Worge-only: current transformation form */
  activeWorgeForm: worgeFormSchema.optional(),
});

// ---------------------------------------------------------------------------
// Animation set definition (maps weapon type → action → clip path)
// ---------------------------------------------------------------------------

export const animationClipSchema = z.object({
  action: animationActionSchema,
  file: z.string(),
  loop: z.boolean().default(true),
  speed: z.number().default(1.0),
  blendWeight: z.number().default(1.0),
});

export const animationSetSchema = z.object({
  weaponType: weaponTypeSchema,
  clips: z.array(animationClipSchema),
});

// ---------------------------------------------------------------------------
// Race manifest (per-race asset layout)
// ---------------------------------------------------------------------------

export const raceEquipmentEntrySchema = z.object({
  name: z.string(),
  file: z.string(),
  source: z.string().optional(),
  slotType: equipmentSlotTypeSchema.optional(),
  weaponType: weaponTypeSchema.optional(),
});

export const raceAnimationEntrySchema = z.object({
  name: z.string(),
  file: z.string(),
  category: z.string().default("general"),
  source: z.string().optional(),
  action: animationActionSchema.optional(),
  weaponType: weaponTypeSchema.optional(),
});

export const raceManifestSchema = z.object({
  raceId: raceIdSchema,
  prefix: z.string(),
  baseMesh: z.string().nullable(),
  texture: z.string().nullable(),
  equipment: z.array(raceEquipmentEntrySchema).default([]),
  animations: z.array(raceAnimationEntrySchema).default([]),
});

export const rootRaceManifestSchema = z.object({
  version: z.string().default("1.0.0"),
  generatedAt: z.string(),
  races: z.record(raceIdSchema, raceManifestSchema),
});

// ---------------------------------------------------------------------------
// Sub-mesh slot mapping (how base model meshes map to equipment slots)
// ---------------------------------------------------------------------------

export const meshSlotMappingSchema = z.object({
  /** Regex or substring to match mesh name in the base GLB */
  meshNamePattern: z.string(),
  /** Which equipment slot this mesh corresponds to */
  slotType: equipmentSlotTypeSchema,
  /** Whether this is the "naked" (default) mesh for that slot */
  isNakedDefault: z.boolean().default(true),
});

export const skeletonAttachPointSchema = z.object({
  slotType: equipmentSlotTypeSchema,
  /** Bone name where hand-held items attach (e.g. "RightHand", "LeftHand") */
  boneName: z.string(),
});

export const raceSkeletonConfigSchema = z.object({
  raceId: raceIdSchema,
  meshSlotMappings: z.array(meshSlotMappingSchema),
  attachPoints: z.array(skeletonAttachPointSchema),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type RaceId = z.infer<typeof raceIdSchema>;
export type ClassId = z.infer<typeof classIdSchema>;
export type EquipmentSlotType = z.infer<typeof equipmentSlotTypeSchema>;
export type ArmorTier = z.infer<typeof armorTierSchema>;
export type WeaponType = z.infer<typeof weaponTypeSchema>;
export type WorgeForm = z.infer<typeof worgeFormSchema>;
export type AnimationAction = z.infer<typeof animationActionSchema>;
export type EquipmentSlotState = z.infer<typeof equipmentSlotStateSchema>;
export type CharacterState = z.infer<typeof characterStateSchema>;
export type ClassAbility = z.infer<typeof classAbilitySchema>;
export type ClassDefinition = z.infer<typeof classDefinitionSchema>;
export type AnimationClip = z.infer<typeof animationClipSchema>;
export type AnimationSet = z.infer<typeof animationSetSchema>;
export type RaceEquipmentEntry = z.infer<typeof raceEquipmentEntrySchema>;
export type RaceAnimationEntry = z.infer<typeof raceAnimationEntrySchema>;
export type RaceManifest = z.infer<typeof raceManifestSchema>;
export type RootRaceManifest = z.infer<typeof rootRaceManifestSchema>;
export type MeshSlotMapping = z.infer<typeof meshSlotMappingSchema>;
export type SkeletonAttachPoint = z.infer<typeof skeletonAttachPointSchema>;
export type RaceSkeletonConfig = z.infer<typeof raceSkeletonConfigSchema>;
