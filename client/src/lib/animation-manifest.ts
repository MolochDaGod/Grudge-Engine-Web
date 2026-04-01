/**
 * animation-manifest.ts — Grudge Warlords animation reference
 *
 * Maps every race × class × weapon combo to the Mixamo clip names that live
 * inside the corresponding GLB file.  Keep this as the single source of truth;
 * the HavokCharacterController reads from it at runtime.
 *
 * How Mixamo clip names work
 * ──────────────────────────
 * When you export from Mixamo the animation group name inside the GLB is the
 * clip name you typed (or left as-is) on the Mixamo website.  We normalise
 * them to lower-case snake_case here so matching is case-insensitive.
 *
 * Source animation packs used
 * ───────────────────────────
 *   Rifle 8-Way Locomotion Pack  → combat strafing for Rangers / gun users
 *   Longbow Locomotion Pack      → bow drawn locomotion for Rangers / Elves
 *   Male Injured Pack            → low-health / debuff animations (< 5% HP)
 *   Standard Mixamo              → base locomotion (idle, walk, run, jump)
 *   character_fight (scene.gltf) → melee combo sequences
 */

// ── Race → model path ─────────────────────────────────────────────────────────

export type Race = 'human' | 'barbarian' | 'undead' | 'orc' | 'elf' | 'dwarf';
export type CharClass = 'warrior' | 'mage' | 'ranger' | 'worg';

/**
 * Public GLB paths for each race character.
 * Override per-project via CharacterManifest.raceModelPath[race].
 */
export const RACE_MODEL_PATHS: Record<Race, string> = {
  human:     '/models/characters/human.glb',
  barbarian: '/models/characters/barbarian.glb',
  undead:    '/models/characters/undead.glb',
  orc:       '/models/characters/orc.glb',
  elf:       '/models/characters/elf.glb',
  dwarf:     '/models/characters/dwarf.glb',
};

/**
 * Fallback: use the standard Mixamo X-Bot rig if the race model isn't found.
 * The X-Bot is included in ergoudan and shares the same skeleton as all
 * Mixamo downloads.
 */
export const XBOT_FALLBACK = '/models/characters/x-bot.glb';

// ── Weapon categories ─────────────────────────────────────────────────────────

export type WeaponSlot =
  | 'unarmed'
  | 'sword'            // 1h sword (Warrior / Worg)
  | 'sword_shield'     // sword + shield (Warrior)
  | 'two_handed'       // 2H sword / axe / hammer (Warrior / Orc)
  | 'staff'            // Staff (Mage / Worg)
  | 'wand'             // Wand + off-hand relic (Mage)
  | 'mace'             // Mace (Mage / Worg)
  | 'bow'              // Longbow (Ranger / Elf / Worg)
  | 'crossbow'         // Crossbow (Ranger)
  | 'gun'              // Rifle / pistol (Ranger)
  | 'dagger'           // Dagger (Ranger / Worg)
  | 'spear'            // Spear (Ranger / Worg)
  | 'hammer'           // Hammer (Worg / Dwarf)
  | 'tome';            // Off-hand tome (Mage)

/** Which weapon slots each class is allowed to equip */
export const CLASS_WEAPON_SLOTS: Record<CharClass, WeaponSlot[]> = {
  warrior: ['unarmed', 'sword', 'sword_shield', 'two_handed'],
  mage:    ['unarmed', 'staff', 'wand', 'mace', 'tome'],
  ranger:  ['unarmed', 'bow', 'crossbow', 'gun', 'dagger', 'two_handed', 'spear'],
  worg:    ['unarmed', 'staff', 'spear', 'dagger', 'bow', 'hammer', 'mace'],
};

// ── Locomotion states ──────────────────────────────────────────────────────────

export type LocomotionState =
  | 'idle'
  | 'walk_fwd'
  | 'walk_bwd'
  | 'walk_left'
  | 'walk_right'
  | 'walk_fwd_left'
  | 'walk_fwd_right'
  | 'walk_bwd_left'
  | 'walk_bwd_right'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  | 'combat_idle'
  | 'combat_strafe_fwd'
  | 'combat_strafe_bwd'
  | 'combat_strafe_left'
  | 'combat_strafe_right'
  | 'combat_run'
  | 'attack_1'
  | 'attack_2'
  | 'attack_3'
  | 'parry'
  | 'dodge'
  | 'cast_1'
  | 'cast_2'
  | 'shoot'          // Ranged fire
  | 'aim'            // Ranged aim loop
  | 'injured_idle'   // < 5% HP idle
  | 'injured_walk';  // < 5% HP walk (Male Injured Pack)

// ── Animation clip name map ────────────────────────────────────────────────────
//
// Maps WeaponSlot × LocomotionState → Mixamo clip name (or null to inherit
// from the 'unarmed' set).
//
// IMPORTANT: these strings must match the animation group names in the GLB
// exactly (case-insensitive comparison is done in the controller).

export type AnimClipMap = Partial<Record<LocomotionState, string | null>>;
export type WeaponAnimMap = Record<WeaponSlot, AnimClipMap>;

/**
 * Base locomotion clips — shared by every weapon slot unless overridden.
 * Source: standard Mixamo download, X-Bot or matching race rig.
 */
const BASE_LOCOMOTION: AnimClipMap = {
  idle:         'Idle',
  walk_fwd:     'Walking',
  walk_bwd:     'Walking Backward',
  walk_left:    'Strafe Walk Left',
  walk_right:   'Strafe Walk Right',
  walk_fwd_left:   'Strafe Walk Forward Left',
  walk_fwd_right:  'Strafe Walk Forward Right',
  walk_bwd_left:   'Strafe Walk Backward Left',
  walk_bwd_right:  'Strafe Walk Backward Right',
  run:          'Running',
  jump:         'Jump',
  fall:         'Falling Idle',
  land:         'Landing',
  injured_idle: 'Injured Idle',
  injured_walk: 'Injured Walk',
};

/**
 * Full weapon animation manifest.
 * Only entries that DIFFER from BASE_LOCOMOTION need to be specified.
 * null means "fall back to the unarmed/base clip".
 */
export const WEAPON_ANIM_MAP: WeaponAnimMap = {

  unarmed: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Standing Idle',
    combat_strafe_fwd:  'Walking',
    combat_strafe_bwd:  'Walk Backward',
    combat_strafe_left: 'Strafe Walk Left',
    combat_strafe_right:'Strafe Walk Right',
    combat_run:         'Running',
    attack_1:           'Punch',
    attack_2:           'Hook Punch',
    attack_3:           'Jab',
    dodge:              'Roll',
    parry:              'Standing Block Idle',
  },

  sword: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Great Sword Idle',
    combat_strafe_fwd:  'Great Sword Walk',
    combat_strafe_bwd:  'Great Sword Walk Back',
    combat_strafe_left: 'Great Sword Walk Left',
    combat_strafe_right:'Great Sword Walk Right',
    combat_run:         'Great Sword Run',
    attack_1:           'Great Sword Slash',
    attack_2:           'Great Sword Slash 2',
    attack_3:           'Sword And Shield Slash',
    parry:              'Sword And Shield Block',
    dodge:              'Roll',
  },

  sword_shield: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Sword And Shield Idle',
    combat_strafe_fwd:  'Sword And Shield Walk',
    combat_strafe_bwd:  'Sword And Shield Walk Back',
    combat_strafe_left: 'Sword And Shield Walk Left',
    combat_strafe_right:'Sword And Shield Walk Right',
    combat_run:         'Sword And Shield Run',
    attack_1:           'Sword And Shield Slash',
    attack_2:           'Sword And Shield Stab',
    attack_3:           'Sword And Shield Slash 2',
    parry:              'Sword And Shield Block',
    dodge:              'Sword And Shield Roll',
  },

  two_handed: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Great Sword Idle',
    combat_strafe_fwd:  'Great Sword Walk',
    combat_strafe_bwd:  'Walk Backward',
    combat_strafe_left: 'Great Sword Walk Left',
    combat_strafe_right:'Great Sword Walk Right',
    combat_run:         'Great Sword Run',
    attack_1:           'Great Sword Slash',
    attack_2:           'Great Sword Spinning Attack',
    attack_3:           'Great Sword Overhead Slam',
    parry:              'Standing Block Idle',
    dodge:              'Roll',
  },

  staff: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Magic Spell Cast',
    combat_strafe_fwd:  'Walking',
    combat_strafe_bwd:  'Walk Backward',
    combat_strafe_left: 'Strafe Walk Left',
    combat_strafe_right:'Strafe Walk Right',
    combat_run:         'Running',
    cast_1:             'Spellcast Levitate',
    cast_2:             'Magic Spell Cast',
    attack_1:           'Slow Run',
    attack_2:           'Standing Melee Punch Combo',
    dodge:              'Roll',
  },

  wand: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Magic Spell Cast',
    combat_strafe_fwd:  'Walking',
    combat_strafe_bwd:  'Walk Backward',
    combat_strafe_left: 'Strafe Walk Left',
    combat_strafe_right:'Strafe Walk Right',
    combat_run:         'Running',
    cast_1:             'Magic Spell Cast',
    cast_2:             'Spellcast Levitate',
    attack_1:           'Magic Spell Cast',
    dodge:              'Roll',
  },

  mace: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Sword And Shield Idle',
    combat_strafe_fwd:  'Sword And Shield Walk',
    combat_strafe_bwd:  'Walk Backward',
    combat_strafe_left: 'Sword And Shield Walk Left',
    combat_strafe_right:'Sword And Shield Walk Right',
    combat_run:         'Sword And Shield Run',
    attack_1:           'Standing Melee Punch Combo',
    attack_2:           'Great Sword Slash',
    parry:              'Standing Block Idle',
    dodge:              'Roll',
  },

  // ── Ranged: Longbow Locomotion Pack ──────────────────────────────────────
  bow: {
    ...BASE_LOCOMOTION,
    // Source: Longbow Locomotion Pack (Mixamo)
    combat_idle:        'Longbow Idle',
    combat_strafe_fwd:  'Longbow Walk',
    combat_strafe_bwd:  'Longbow Walk Backward',
    combat_strafe_left: 'Longbow Walk Left',
    combat_strafe_right:'Longbow Walk Right',
    walk_fwd_left:      'Longbow Walk Forward Left',
    walk_fwd_right:     'Longbow Walk Forward Right',
    combat_run:         'Longbow Run',
    aim:                'Longbow Aim',
    shoot:              'Longbow Shoot',
    dodge:              'Dodge Roll',
  },

  crossbow: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Rifle Idle',
    combat_strafe_fwd:  'Rifle Walk Forward',
    combat_strafe_bwd:  'Rifle Walk Backward',
    combat_strafe_left: 'Rifle Walk Left',
    combat_strafe_right:'Rifle Walk Right',
    walk_fwd_left:      'Rifle Walk Forward Left',
    walk_fwd_right:     'Rifle Walk Forward Right',
    walk_bwd_left:      'Rifle Walk Backward Left',
    walk_bwd_right:     'Rifle Walk Backward Right',
    combat_run:         'Rifle Run',
    aim:                'Rifle Aiming Idle',
    shoot:              'Rifle Shoot',
    dodge:              'Roll',
  },

  // ── Ranged: Rifle 8-Way Locomotion Pack ──────────────────────────────────
  gun: {
    ...BASE_LOCOMOTION,
    // Source: Rifle 8-Way Locomotion Pack (Mixamo)
    combat_idle:        'Rifle Idle',
    combat_strafe_fwd:  'Rifle Walk Forward',
    combat_strafe_bwd:  'Rifle Walk Backward',
    combat_strafe_left: 'Rifle Walk Left',
    combat_strafe_right:'Rifle Walk Right',
    walk_fwd_left:      'Rifle Walk Forward Left',
    walk_fwd_right:     'Rifle Walk Forward Right',
    walk_bwd_left:      'Rifle Walk Backward Left',
    walk_bwd_right:     'Rifle Walk Backward Right',
    combat_run:         'Rifle Run',
    aim:                'Rifle Aiming Idle',
    shoot:              'Rifle Shoot',
    dodge:              'Roll',
  },

  dagger: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Standing Idle',
    combat_strafe_fwd:  'Sneaking Walk',
    combat_strafe_bwd:  'Walk Backward',
    combat_strafe_left: 'Strafe Walk Left',
    combat_strafe_right:'Strafe Walk Right',
    combat_run:         'Sprint',
    attack_1:           'Sword And Shield Slash',
    attack_2:           'Sword And Shield Stab',
    attack_3:           'Punch',
    parry:              'Standing Block Idle',
    dodge:              'Roll',
  },

  spear: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Sword And Shield Idle',
    combat_strafe_fwd:  'Sword And Shield Walk',
    combat_strafe_bwd:  'Walk Backward',
    combat_strafe_left: 'Sword And Shield Walk Left',
    combat_strafe_right:'Sword And Shield Walk Right',
    combat_run:         'Running',
    attack_1:           'Sword And Shield Stab',
    attack_2:           'Great Sword Slash',
    parry:              'Standing Block Idle',
    dodge:              'Dodge Roll',
  },

  hammer: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Great Sword Idle',
    combat_strafe_fwd:  'Great Sword Walk',
    combat_strafe_bwd:  'Walk Backward',
    combat_strafe_left: 'Great Sword Walk Left',
    combat_strafe_right:'Great Sword Walk Right',
    combat_run:         'Great Sword Run',
    attack_1:           'Great Sword Overhead Slam',
    attack_2:           'Standing Melee Punch Combo',
    attack_3:           'Great Sword Spinning Attack',
    parry:              'Standing Block Idle',
    dodge:              'Roll',
  },

  tome: {
    ...BASE_LOCOMOTION,
    combat_idle:        'Magic Spell Cast',
    cast_1:             'Spellcast Levitate',
    cast_2:             'Magic Spell Cast',
    attack_1:           'Magic Spell Cast',
    dodge:              'Roll',
  },
};

// ── Lookup helpers ────────────────────────────────────────────────────────────

/**
 * Resolve the Mixamo clip name for a given weapon + locomotion state.
 * Falls back to unarmed → BASE_LOCOMOTION if nothing is found.
 */
export function resolveClipName(
  weapon: WeaponSlot,
  state: LocomotionState,
): string | null {
  const weaponMap = WEAPON_ANIM_MAP[weapon];
  if (weaponMap && state in weaponMap) {
    return weaponMap[state] ?? null;
  }
  // Fallback to unarmed
  return WEAPON_ANIM_MAP.unarmed[state] ?? null;
}

/**
 * Normalize a clip name for case-insensitive matching against
 * BABYLON.AnimationGroup names as they come out of the GLB.
 */
export function normalizeClipName(name: string): string {
  return name.toLowerCase().replace(/[_\s-]+/g, ' ').trim();
}

/**
 * Find the best-matching AnimationGroup from a scene for a desired clip name.
 * Tries exact → prefix → substring match in that order.
 */
export function findAnimationGroup(
  groups: { name: string }[],
  desired: string,
): { name: string } | null {
  const needle = normalizeClipName(desired);
  const norm   = groups.map(g => ({ g, n: normalizeClipName(g.name) }));

  // 1. Exact
  const exact = norm.find(x => x.n === needle);
  if (exact) return exact.g;

  // 2. Starts with
  const prefix = norm.find(x => x.n.startsWith(needle) || needle.startsWith(x.n));
  if (prefix) return prefix.g;

  // 3. Contains
  const sub = norm.find(x => x.n.includes(needle) || needle.includes(x.n));
  if (sub) return sub.g;

  return null;
}

// ── Race-specific model scale overrides ──────────────────────────────────────
// Some races need different model scaling so they all stand at the same height.

export const RACE_SCALE: Record<Race, number> = {
  human:     1.0,
  barbarian: 1.05,
  undead:    1.0,
  orc:       1.1,
  elf:       0.95,
  dwarf:     0.82,
};

// ── Race-specific speed multipliers ──────────────────────────────────────────
// Applied on top of the controller base walk/run speeds.

export const RACE_SPEED: Record<Race, { walk: number; run: number }> = {
  human:     { walk: 1.0,  run: 1.0  },
  barbarian: { walk: 0.95, run: 1.1  },
  undead:    { walk: 0.9,  run: 0.95 },
  orc:       { walk: 0.9,  run: 1.05 },
  elf:       { walk: 1.05, run: 1.15 },
  dwarf:     { walk: 0.85, run: 0.9  },
};

// ── Export everything ─────────────────────────────────────────────────────────

export const AnimationManifest = {
  RACE_MODEL_PATHS,
  XBOT_FALLBACK,
  CLASS_WEAPON_SLOTS,
  WEAPON_ANIM_MAP,
  RACE_SCALE,
  RACE_SPEED,
  resolveClipName,
  normalizeClipName,
  findAnimationGroup,
};

export default AnimationManifest;
