/**
 * animation-manifest.ts — Grudge Studio canonical animation reference (THE BRIDGE)
 *
 * This is THE central organizational bridge between raw asset files and runtime GrudgeController.
 * All 3D games and experiences in Grudge Studio MUST go through GrudgeController + this manifest.
 *
 * See CANONICAL_MAP.md — "Assets Organization & Bridges" section for full architecture.
 *
 * Organization:
 * - Races point to grudge6 Meshy base models (25-bone, no fingers).
 * - Animations are Mixamo-based + custom; shared via normalize + retarget.
 * - Per-weapon clip mapping allows deterministic state -> anim lookup.
 * - Gun support: aim/shoot clips + special grips + IK.
 *
 * How clip names work
 * ───────────────────
 * Exact names (case-insensitive) of animation groups inside the character GLBs.
 * 25-bone Meshy rigs (grudge6 characters).
 *
 * Weapon skills T0 mapping (1-5 hotkeys) lives in:
 *   grudgedot-launcher/shared/wcs/definitions/weaponSkills.ts
 * Use getClipForWeaponSkill() below or GrudgeController.performSkill(slot).
 *
 * Bridges to other systems:
 * - Loaders call normalizeMixamoBoneNames + retargetMixamoAnimation after useGLTF.
 * - GrudgeController uses grips + this for equip/aim/performSkill.
 * - Feet root normalization happens alongside (see GrudgeController).
 */

import * as THREE from 'three';

// ── Race → model path ─────────────────────────────────────────────────────────

export type Race = 'human' | 'barbarian' | 'undead' | 'orc' | 'elf' | 'dwarf';
export type CharClass = 'warrior' | 'mage' | 'ranger' | 'worg';

/**
 * Public GLB paths for each race character.
 * Override per-project via CharacterManifest.raceModelPath[race].
 */
export const RACE_MODEL_PATHS: Record<Race, string> = {
  // Grudge 6 ONLY - the race characters with mesh armours and weapons.
  // All models now use consistent 25-bone Meshy skeletons (no fingers) for low-cost high-quality.
  // Prefer https://grudge6.grudge-studio.com/models/characters/ for real exports.
  // See character-animation-controller.ts for hand bone grips + deterministic AI controllers.
  human:     '/assets/characters/races/human/human-base.glb',
  barbarian: '/assets/characters/races/barbarian/barbarian-base.glb',
  undead:    '/assets/characters/races/undead/undead-base.glb',
  orc:       '/assets/characters/races/orc/orc-base.glb',
  elf:       '/assets/characters/races/elf/elf-base.glb',
  dwarf:     '/assets/characters/races/dwarf/dwarf-base.glb',
};

/**
 * Fallback (prefer the Grudge 6 race models above).
 */
export const XBOT_FALLBACK = '/assets/characters/races/barbarian/barbarian-base.glb';

/**
 * Additional one-shot animation clips that can be loaded and merged at
 * runtime for attacks, harvesting, dodge, etc.
 */
export const EXTRA_ANIM_PATHS = {
  attack_axe:   '/models/animations/attack_axe.glb',
  harvest:      '/models/animations/harvest.glb',
  land:         '/models/animations/land.glb',
  hit:          '/models/animations/hit.glb',
  jump:         '/models/animations/jump.glb',
  injured_walk: '/models/animations/injured_walk.glb',
  cast:         '/models/animations/cast.glb',
  dodge:        '/models/animations/dodge.glb',
  run:          '/models/animations/run.glb',
} as const;

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

/**
 * Normalize bone names for Mixamo imports and sharing.
 * Strips 'mixamorig:' prefix and normalizes separators.
 * Call this on skeleton bones after loading Mixamo models/animations.
 */
export function normalizeMixamoBoneNames( skeletonOrScene: any ) {
  const bones = skeletonOrScene.isObject3D 
    ? [] as any[] 
    : (skeletonOrScene.bones || []);
  
  if (skeletonOrScene.isObject3D) {
    skeletonOrScene.traverse((obj: any) => {
      if (obj.isBone) {
        obj.name = obj.name.replace(/mixamorig:|mixamorig/g, '').replace(/[_ ]/g, '');
      }
    });
  } else {
    bones.forEach((bone: any) => {
      bone.name = bone.name.replace(/mixamorig:|mixamorig/g, '').replace(/[_ ]/g, '');
    });
  }
}

/**
 * Retarget a Mixamo animation clip to a target skeleton for sharing animations.
 * Matches bones by normalized name.
 * Returns a new clip with tracks renamed to target bone names.
 * Use this for animation sharing across different but structurally compatible rigs.
 */
export function retargetMixamoAnimation(
  clip: THREE.AnimationClip,
  targetSkeleton: THREE.Skeleton,
  sourceSkeleton?: THREE.Skeleton
): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = [];

  const boneNameMap = new Map<string, string>();
  
  // Build map from normalized names
  targetSkeleton.bones.forEach(bone => {
    const norm = normalizeClipName(bone.name);
    boneNameMap.set(norm, bone.name);
  });

  clip.tracks.forEach(track => {
    // Track name format: "boneName.property"
    let [bonePart, ...propParts] = track.name.split('.');
    const normBone = normalizeClipName(bonePart);
    const targetBoneName = boneNameMap.get(normBone);

    if (targetBoneName) {
      const newTrackName = [targetBoneName, ...propParts].join('.');
      // Clone track with new name
      const newTrack = track.clone();
      (newTrack as any).name = newTrackName;
      tracks.push(newTrack);
    } else {
      // Keep original if no match (e.g. root motion)
      tracks.push(track);
    }
  });

  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

/**
 * Canonical resolver: turn a weapon + hotkey slot (1-5) into the best clip name.
 *
 * This is the single place that knows T0 skill mapping for the GrudgeController.
 *
 * Slot semantics (exact match to user spec + weaponSkills.ts):
 *   1 = main attack
 *   2 = first skill
 *   3 = maneuver / trap / teleport / dodge
 *   4 = heavy / combo connector
 *   5 = unique (button 5 spells for T1 starters too)
 *
 * Source of truth for skill names/data: grudgedot-launcher/shared/wcs/definitions/weaponSkills.ts
 * All Grudge 3D games MUST use GrudgeController + this manifest.
 */
export function getClipForWeaponSkill(weapon: WeaponSlot, slot: 1 | 2 | 3 | 4 | 5): string {
  // Map slot → primary locomotion/combat state key in the manifest
  let state: LocomotionState = 'attack_1';

  switch (slot) {
    case 1: state = 'attack_1'; break;
    case 2: state = 'attack_2'; break;
    case 3: state = 'dodge'; break;           // maneuver
    case 4: state = 'attack_3'; break;        // heavy
    case 5: state = 'cast_1'; break;          // unique
  }

  // Weapon specific overrides for better feel
  if (slot === 1 && (weapon === 'bow' || weapon === 'gun' || weapon === 'crossbow')) {
    state = 'shoot';
  }
  if (slot === 2 && weapon === 'bow') state = 'aim';
  if (slot === 3 && (weapon === 'staff' || weapon === 'wand')) state = 'cast_1'; // blink style
  if (slot === 5) state = 'cast_2'; // unique often casty

  const clip = resolveClipName(weapon, state);
  return clip || resolveClipName(weapon, 'attack_1') || 'Idle';
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
  normalizeMixamoBoneNames,
  retargetMixamoAnimation,
  getClipForWeaponSkill,
};

export default AnimationManifest;

/**
 * Asset Bridge Helper: Post-process a loaded grudge6 race model for full skeleton/animation sharing + bridges.
 * Call immediately after useGLTF + scale in loaders.
 * Handles:
 * - Mixamo bone normalization for skeleton sharing
 * - Feet root normalization (for Rapier physics - middle center of feet)
 * - Hand grip creation
 * - Retarget Mixamo anim clips for sharing across rigs
 * - Returns enriched data ready for GrudgeController
 *
 * Usage in R3F loader (e.g. GrudgeCharacterModel):
 * const processed = postProcessGrudgeRaceModel(scene, animations, scale);
 * const mixer = new THREE.AnimationMixer(scene);
 * // retarget and map actions using processed
 * const controller = new GrudgeController(scene, mixer, actionsMap);
 */
export function postProcessGrudgeRaceModel(
  scene: THREE.Group,
  animations: THREE.AnimationClip[] = [],
  scale = 1
): {
  scene: THREE.Group;
  grips: Record<'left' | 'right', THREE.Object3D | null>;
  normalizedAnimations: THREE.AnimationClip[];
  footCenterOffset: THREE.Vector3;
} {
  scene.scale.setScalar(scale);
  scene.updateMatrixWorld(true);

  // 1. Mixamo skeleton sharing - normalize bones
  normalizeMixamoBoneNames(scene);

  // 2. Feet root for physics (middle center of feet)
  let footCenter = new THREE.Vector3();
  let leftFoot: THREE.Object3D | null = null;
  let rightFoot: THREE.Object3D | null = null;
  const footPats = ['leftfoot', 'lfoot', 'left_foot', 'rightfoot', 'rfoot', 'right_foot'];

  scene.traverse((child: any) => {
    if (child.isBone) {
      const nm = child.name.toLowerCase().replace(/mixamorig:|_| /g, '');
      if (!leftFoot && footPats.some(p => nm.includes('left') && (nm.includes('foot') || nm.includes('toe')))) leftFoot = child;
      if (!rightFoot && footPats.some(p => nm.includes('right') && (nm.includes('foot') || nm.includes('toe')))) rightFoot = child;
    }
  });

  if (leftFoot && rightFoot) {
    const lp = new THREE.Vector3(); leftFoot.getWorldPosition(lp);
    const rp = new THREE.Vector3(); rightFoot.getWorldPosition(rp);
    footCenter = lp.clone().add(rp).multiplyScalar(0.5);
    scene.position.sub(footCenter);
    scene.position.y = 0; // root at feet center
  }

  // 3. Hand grips for weapons/guns (from previous work)
  const grips: Record<'left' | 'right', THREE.Object3D | null> = { left: null, right: null };
  const handPatterns = {
    left: ['lefthand', 'left_hand', 'l_hand', 'leftwrist', 'l_wrist'],
    right: ['righthand', 'right_hand', 'r_hand', 'rightwrist', 'r_wrist'],
  };

  scene.traverse((obj: any) => {
    if (obj.isBone) {
      const name = obj.name.toLowerCase().replace(/mixamorig:|_| /g, '');
      (['left', 'right'] as const).forEach(side => {
        if (!grips[side] && handPatterns[side].some(p => name.includes(p))) {
          const grip = new THREE.Object3D();
          grip.name = `${side}HandGrip`;
          // Default offsets; overridden by GRIP_OFFSETS per weapon (incl. gun)
          grip.position.set(0, 0.015 * scale, 0.07 * scale);
          grip.rotation.set(-0.25, side === 'right' ? -0.05 : 0.05, 0);
          obj.add(grip);
          grips[side] = grip;
        }
      });
    }
  });
  (scene as any).userData.handGrips = grips;

  // 4. Retarget animations for sharing (Mixamo imports)
  const normalizedAnimations = animations.map(clip => 
    retargetMixamoAnimation(clip, (scene as any).skeleton || { bones: [] } as any)
  );

  return {
    scene,
    grips,
    normalizedAnimations,
    footCenterOffset: footCenter,
  };
}
