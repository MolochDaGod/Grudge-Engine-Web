// ─── Animation Slots ──────────────────────────────────────────────────────
// Abstract slot name → actual GLTF clip name mapping system.
// Ported from annihilate-dev/src/modules/AnimationSet.js.
//
// The combat FSM and controls reference ABSTRACT slot names (e.g. 'attack').
// Each weapon style maps those slots to the ACTUAL clip names in the GLTF.
// This lets one state machine drive any weapon — just swap the AnimClipMap.

// ─── Types ────────────────────────────────────────────────────────────────

export type AnimSlot =
  // Locomotion
  | 'idle' | 'run' | 'jump' | 'fall' | 'climb'
  // Combat reactions
  | 'hit' | 'knockDown' | 'dead' | 'block' | 'impact'
  // Movement abilities
  | 'dash'
  // Combo chain (3-hit)
  | 'attackStart' | 'attack'
  | 'fistStart' | 'fist'
  | 'strikeStart' | 'strike' | 'strikeEnd'
  // Dash attack
  | 'dashAttack'
  // Air combat
  | 'jumpAttackStart' | 'jumpAttack' | 'jumpAttackEnd'
  // Sustained / held attacks
  | 'whirlwind'
  // Weapon-specific skills
  | 'special1' | 'special2' | 'special3';

/** Maps abstract slot names to actual GLTF clip names */
export type AnimClipMap = Record<AnimSlot, string>;

// ─── Slot Registry ────────────────────────────────────────────────────────

export const ANIMATION_SLOTS: AnimSlot[] = [
  // Locomotion
  'idle', 'run', 'jump', 'fall', 'climb',
  // Combat reactions
  'hit', 'knockDown', 'dead', 'block', 'impact',
  // Movement abilities
  'dash',
  // Combo chain
  'attackStart', 'attack',
  'fistStart', 'fist',
  'strikeStart', 'strike', 'strikeEnd',
  // Dash attack
  'dashAttack',
  // Air combat
  'jumpAttackStart', 'jumpAttack', 'jumpAttackEnd',
  // Sustained
  'whirlwind',
  // Skills
  'special1', 'special2', 'special3',
];

/** Slots that play once and clamp (LoopOnce). Everything else loops. */
export const ONE_SHOT_SLOTS = new Set<AnimSlot>([
  'jump', 'hit', 'knockDown', 'dead', 'dash', 'impact',
  'attackStart', 'attack',
  'fistStart', 'fist',
  'strikeStart', 'strike', 'strikeEnd',
  'dashAttack',
  'jumpAttackStart', 'jumpAttack', 'jumpAttackEnd',
  'whirlwind',
  'special1', 'special2', 'special3',
]);

// ─── Greatsword (2H Heavy) — Maria's clip names as reference ──────────────

export const GREATSWORD_ANIMS: AnimClipMap = {
  idle:             'idle',
  run:              'running',
  jump:             'jump',
  fall:             'fall',
  climb:            'climb',
  hit:              'hit',
  knockDown:        'hit',
  dead:             'hit',
  block:            'block',
  impact:           'impact',
  dash:             'dash',
  attackStart:      'punchStart',
  attack:           'punch',
  fistStart:        'fistStart',
  fist:             'fist',
  strikeStart:      'strikeStart',
  strike:           'strike',
  strikeEnd:        'strikeEnd',
  dashAttack:       'dashAttack',
  jumpAttackStart:  'jumpAttackStart',
  jumpAttack:       'jumpAttack',
  jumpAttackEnd:    'jumpAttackEnd',
  whirlwind:        'whirlwind',
  special1:         'punch',
  special2:         'strike',
  special3:         'whirlwind',
};

// ─── Sword & Shield (1H + Shield Tank) ────────────────────────────────────

export const SWORD_SHIELD_ANIMS: AnimClipMap = {
  idle:             'SS_Idle',
  run:              'SS_Run',
  jump:             'SS_Jump',
  fall:             'SS_Fall',
  climb:            'SS_Climb',
  hit:              'SS_Hit',
  knockDown:        'SS_KnockDown',
  dead:             'SS_Death',
  block:            'SS_Shield_Block',
  impact:           'SS_Shield_Impact',
  dash:             'SS_Dash',
  attackStart:      'SS_Slash_Start',
  attack:           'SS_Slash',
  fistStart:        'SS_Shield_Bash_Start',
  fist:             'SS_Shield_Bash',
  strikeStart:      'SS_Thrust_Start',
  strike:           'SS_Thrust',
  strikeEnd:        'SS_Thrust_End',
  dashAttack:       'SS_Dash_Slash',
  jumpAttackStart:  'SS_Jump_Slash_Start',
  jumpAttack:       'SS_Jump_Slash',
  jumpAttackEnd:    'SS_Jump_Slash_End',
  whirlwind:        'SS_Spin_Attack',
  special1:         'SS_Shield_Charge',
  special2:         'SS_Counter_Attack',
  special3:         'SS_Shield_Slam',
};

// ─── Magic Staff (Ranged Caster) ──────────────────────────────────────────

export const MAGIC_ANIMS: AnimClipMap = {
  idle:             'MG_Idle',
  run:              'MG_Run',
  jump:             'MG_Jump',
  fall:             'MG_Fall',
  climb:            'MG_Climb',
  hit:              'MG_Hit',
  knockDown:        'MG_KnockDown',
  dead:             'MG_Death',
  block:            'MG_Ward',
  impact:           'MG_Ward_Impact',
  dash:             'MG_Blink',
  attackStart:      'MG_Cast_Start',
  attack:           'MG_Cast_Projectile',
  fistStart:        'MG_Cast_Start',
  fist:             'MG_Cast_Ice',
  strikeStart:      'MG_Channel_Start',
  strike:           'MG_Cast_Lightning',
  strikeEnd:        'MG_Channel_End',
  dashAttack:       'MG_Blink_Cast',
  jumpAttackStart:  'MG_Air_Cast_Start',
  jumpAttack:       'MG_Air_Cast',
  jumpAttackEnd:    'MG_Air_Cast_End',
  whirlwind:        'MG_Channel_AoE',
  special1:         'MG_Beam',
  special2:         'MG_Nova',
  special3:         'MG_Teleport',
};

// ─── Longbow (Ranged Physical) ────────────────────────────────────────────

export const ARCHER_ANIMS: AnimClipMap = {
  idle:             'AR_Idle',
  run:              'AR_Run',
  jump:             'AR_Jump',
  fall:             'AR_Fall',
  climb:            'AR_Climb',
  hit:              'AR_Hit',
  knockDown:        'AR_KnockDown',
  dead:             'AR_Death',
  block:            'AR_Dodge',
  impact:           'AR_Dodge',
  dash:             'AR_Dodge_Roll',
  attackStart:      'AR_Draw',
  attack:           'AR_Fire',
  fistStart:        'AR_Draw',
  fist:             'AR_Fire_Quick',
  strikeStart:      'AR_Aim',
  strike:           'AR_Fire_Aimed',
  strikeEnd:        'AR_Fire_End',
  dashAttack:       'AR_Jump_Fire',
  jumpAttackStart:  'AR_Air_Draw',
  jumpAttack:       'AR_Air_Fire',
  jumpAttackEnd:    'AR_Air_Fire_End',
  whirlwind:        'AR_Rapid_Fire',
  special1:         'AR_Rain_Of_Arrows',
  special2:         'AR_Explosive_Arrow',
  special3:         'AR_Piercing_Shot',
};

// ─── Mixamo Fallback Mapping ──────────────────────────────────────────────
// Maps slots to common Mixamo animation names for auto-detection

export const MIXAMO_SLOT_ALIASES: Record<AnimSlot, string[]> = {
  idle:             ['idle', 'standing', 'breathe', 'fighting idle', 'bouncing fight idle'],
  run:              ['running', 'sprint', 'run'],
  jump:             ['jump', 'unarmed jump'],
  fall:             ['falling', 'fall', 'falling idle'],
  climb:            ['climbing', 'climb'],
  hit:              ['hit', 'big hit', 'hit to body', 'getting smashed'],
  knockDown:        ['knockdown', 'falling from losing balance', 'stunned'],
  dead:             ['death', 'dying', 'mutant dying', 'sword and shield death'],
  block:            ['block', 'blocking', 'standing block idle', 'rifle block'],
  impact:           ['impact', 'hit on legs'],
  dash:             ['dodge', 'dodging', 'dive roll', 'running slide'],
  attackStart:      ['punch start', 'lead jab'],
  attack:           ['punch', 'punch combo', 'kicking', 'stabbing'],
  fistStart:        ['fist start'],
  fist:             ['fist', 'flying knee punch combo', 'double dagger stab'],
  strikeStart:      ['strike start', 'thrust start'],
  strike:           ['strike', 'thrust slash', 'surprise uppercut'],
  strikeEnd:        ['strike end', 'thrust end'],
  dashAttack:       ['flying kick', 'running forward flip'],
  jumpAttackStart:  ['front flip'],
  jumpAttack:       ['jumping down'],
  jumpAttackEnd:    ['falling to landing', 'falling to roll'],
  whirlwind:        ['hurricane kick', 'flair'],
  special1:         ['fireball', 'magic heal'],
  special2:         ['sword and shield power up', 'taunt'],
  special3:         ['dual weapon combo'],
};

// ─── Utilities ────────────────────────────────────────────────────────────

/** Resolve an abstract slot to its actual clip name */
export function resolveClip(animSet: AnimClipMap, slot: AnimSlot): string {
  const clip = animSet[slot];
  if (!clip) {
    console.warn(`AnimationSlots: No clip mapped for slot "${slot}"`);
    return animSet.idle;
  }
  return clip;
}

/** Check if a slot should be one-shot (play once, clamp) */
export function isOneShot(slot: AnimSlot): boolean {
  return ONE_SHOT_SLOTS.has(slot);
}

/**
 * Auto-detect slot for a clip name by matching against MIXAMO_SLOT_ALIASES.
 * Returns the best-matching slot or null.
 */
export function detectSlotFromClipName(clipName: string): AnimSlot | null {
  const lower = clipName.toLowerCase().trim();
  for (const [slot, aliases] of Object.entries(MIXAMO_SLOT_ALIASES) as [AnimSlot, string[]][]) {
    for (const alias of aliases) {
      if (lower === alias || lower.includes(alias)) return slot;
    }
  }
  return null;
}

/**
 * Build an AnimClipMap from a list of raw clip names by auto-detecting slots.
 * Unmatched slots fall back to the idle clip.
 */
export function buildClipMapFromNames(clipNames: string[]): AnimClipMap {
  const map: Partial<AnimClipMap> = {};
  for (const name of clipNames) {
    const slot = detectSlotFromClipName(name);
    if (slot && !map[slot]) {
      map[slot] = name;
    }
  }
  // Fill missing slots with idle fallback
  const idle = map.idle ?? clipNames[0] ?? 'idle';
  const full = {} as AnimClipMap;
  for (const slot of ANIMATION_SLOTS) {
    full[slot] = map[slot] ?? idle;
  }
  return full;
}
