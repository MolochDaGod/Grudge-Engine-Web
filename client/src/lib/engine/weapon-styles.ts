// ─── Weapon Styles ────────────────────────────────────────────────────────
// Data-driven weapon configuration system.
// Ported from annihilate-dev/src/modules/WeaponStyle.js.
//
// Each weapon style defines animation mappings, hitboxes, combo chains,
// special moves, block behaviour, and base stats. The combat state machine
// reads these configs at runtime — no per-weapon code needed.

import {
  type AnimClipMap, type AnimSlot,
  GREATSWORD_ANIMS, SWORD_SHIELD_ANIMS, MAGIC_ANIMS, ARCHER_ANIMS,
} from './animation-slots';

// ─── Types ────────────────────────────────────────────────────────────────

export interface Vec3 { x: number; y: number; z: number }

export interface AttachOffset {
  position: Vec3;
  rotation: Vec3;
}

export interface BoxHitbox {
  shape: 'box';
  halfExtents: Vec3;
}

export interface SphereHitbox {
  shape: 'sphere';
  radius: number;
}

export type HitboxConfig = BoxHitbox | SphereHitbox;

export type CombatTag = 'canDamage' | 'knockDown' | 'canLaunch' | 'canBlock' | 'canParry';

export interface ComboStep {
  start: AnimSlot | null;
  swing: AnimSlot;
  tags: CombatTag[];
  recovery?: AnimSlot;
  projectile?: string;
}

export interface AirComboStep {
  swing: AnimSlot;
  tags: CombatTag[];
  projectile?: string;
}

export interface AirBash {
  start: AnimSlot;
  slam: AnimSlot;
  end: AnimSlot;
  slamTags: CombatTag[];
  projectile?: string;
}

export interface SpecialMove {
  name: string;
  description: string;
  projectile: string | null;
  tags: CombatTag[];
  // Optional modifiers
  projectileCount?: number;
  lift?: boolean;
  duration?: number;
  moveForward?: boolean;
  dash?: boolean;
  requiresBlock?: boolean;
  aoe?: boolean;
  teleport?: boolean;
  distance?: number;
  pierce?: boolean;
}

export type BlockType = 'block' | 'parry' | 'ward' | 'dodge';

export interface WhirlwindConfig {
  slot: AnimSlot;
  oneTurnDuration: number;
  tags: CombatTag[];
}

export interface LaunchConfig {
  slot: AnimSlot;
  liftDistance: number;
  tags: CombatTag[];
}

export interface WeaponStats {
  attackSpeed: number;
  chargeAttackMultiplier: number;
  airBashSpeedMultiplier: number;
  dashSpeed: number;
  airDashSpeed: number;
  jumpVelocity: number;
  airLiftVelocity: number;
}

export interface WeaponStyle {
  id: string;
  animSet: AnimClipMap;

  // Attachment
  attachBone: string;
  attachOffset: AttachOffset;
  offhandBone?: string;
  offhandOffset?: AttachOffset;

  // Hitbox
  hitbox: HitboxConfig;
  hitboxIsProjectile?: boolean;
  shieldHitbox?: HitboxConfig;

  // Combo system
  comboChain: ComboStep[];
  chargeEnabled: boolean;
  chargeComboChain: ComboStep[] | null;
  airComboChain: AirComboStep[];
  airBash: AirBash;

  // Skills
  specialMoves: {
    special1: SpecialMove;
    special2: SpecialMove;
    special3: SpecialMove;
  };

  // Defense
  blockType: BlockType;

  // Sustained attacks
  whirlwind: WhirlwindConfig;
  launch: LaunchConfig;

  // Stats
  stats: WeaponStats;
}

export type WeaponStyleId = 'greatsword' | 'sword_shield' | 'magic_staff' | 'longbow';

// ─── Greatsword — 2H Heavy Melee ──────────────────────────────────────────

export const GREATSWORD: WeaponStyle = {
  id: 'greatsword',
  animSet: GREATSWORD_ANIMS,

  attachBone: 'sword_joint',
  attachOffset: {
    position: { x: -26.3457, y: 7.0964, z: 46.9682 },
    rotation: { x: -0.1415, y: -0.5388, z: -0.6 },
  },

  hitbox: { shape: 'box', halfExtents: { x: 0.19, y: 0.19, z: 0.74 } },

  comboChain: [
    { start: 'attackStart', swing: 'attack', tags: ['canDamage'] },
    { start: 'fistStart',   swing: 'fist',   tags: ['canDamage'] },
    { start: 'strikeStart', swing: 'strike', tags: ['canDamage', 'knockDown'], recovery: 'strikeEnd' },
  ],

  chargeEnabled: true,
  chargeComboChain: [
    { start: null,          swing: 'attack', tags: ['canDamage'] },
    { start: 'fistStart',   swing: 'fist',   tags: ['canDamage'] },
    { start: 'strikeStart', swing: 'strike', tags: ['canDamage', 'knockDown'], recovery: 'strikeEnd' },
  ],

  airComboChain: [
    { swing: 'attack', tags: ['canDamage'] },
    { swing: 'fist',   tags: ['canDamage'] },
    { swing: 'strike', tags: ['canDamage'] },
  ],

  airBash: {
    start: 'jumpAttackStart',
    slam:  'jumpAttack',
    end:   'jumpAttackEnd',
    slamTags: ['canDamage', 'knockDown'],
  },

  specialMoves: {
    special1: {
      name: 'Hadouken',
      description: 'Fire a sword blaster projectile forward',
      projectile: 'SwordBlaster',
      projectileCount: 3,
      tags: ['canDamage'],
    },
    special2: {
      name: 'Shoryuken',
      description: 'Rising uppercut slash that lifts self and enemies',
      projectile: null,
      lift: true,
      tags: ['canDamage', 'canLaunch'],
    },
    special3: {
      name: 'Tatsumaki',
      description: 'Spinning forward whirlwind attack',
      projectile: null,
      duration: 2000,
      moveForward: true,
      tags: ['canDamage'],
    },
  },

  blockType: 'block',

  whirlwind: { slot: 'whirlwind', oneTurnDuration: 0.3, tags: ['canDamage'] },
  launch:    { slot: 'strike', liftDistance: 3.7, tags: ['canDamage', 'canLaunch'] },

  stats: {
    attackSpeed: 1.4,
    chargeAttackMultiplier: 2.0,
    airBashSpeedMultiplier: 5.0,
    dashSpeed: 15,
    airDashSpeed: 11,
    jumpVelocity: 5.2,
    airLiftVelocity: 1.5,
  },
};

// ─── Sword & Shield — 1H + Shield Tank ────────────────────────────────────

export const SWORD_SHIELD: WeaponStyle = {
  id: 'sword_shield',
  animSet: SWORD_SHIELD_ANIMS,

  attachBone: 'hand_r',
  attachOffset: {
    position: { x: 0, y: 0, z: 30 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  offhandBone: 'hand_l',
  offhandOffset: {
    position: { x: 0, y: 0, z: 15 },
    rotation: { x: 0, y: 0, z: 0 },
  },

  hitbox: { shape: 'box', halfExtents: { x: 0.15, y: 0.15, z: 0.5 } },
  shieldHitbox: { shape: 'box', halfExtents: { x: 0.3, y: 0.4, z: 0.1 } },

  comboChain: [
    { start: 'attackStart', swing: 'attack', tags: ['canDamage'] },
    { start: 'fistStart',   swing: 'fist',   tags: ['canDamage'] },
    { start: 'strikeStart', swing: 'strike', tags: ['canDamage', 'knockDown'], recovery: 'strikeEnd' },
  ],

  chargeEnabled: false,
  chargeComboChain: null,

  airComboChain: [
    { swing: 'attack', tags: ['canDamage'] },
    { swing: 'fist',   tags: ['canDamage'] },
  ],

  airBash: {
    start: 'jumpAttackStart',
    slam:  'jumpAttack',
    end:   'jumpAttackEnd',
    slamTags: ['canDamage', 'knockDown'],
  },

  specialMoves: {
    special1: {
      name: 'Shield Charge',
      description: 'Rush forward with shield, knocking enemies back',
      projectile: null,
      dash: true,
      tags: ['canDamage', 'knockDown'],
    },
    special2: {
      name: 'Counter Attack',
      description: 'Perfect block riposte — stuns and deals heavy damage',
      projectile: null,
      requiresBlock: true,
      tags: ['canDamage'],
    },
    special3: {
      name: 'Shield Slam',
      description: 'AoE ground slam with shield, stuns nearby enemies',
      projectile: null,
      aoe: true,
      tags: ['canDamage', 'knockDown'],
    },
  },

  blockType: 'parry',

  whirlwind: { slot: 'whirlwind', oneTurnDuration: 0.35, tags: ['canDamage'] },
  launch:    { slot: 'strike', liftDistance: 2.5, tags: ['canDamage', 'canLaunch'] },

  stats: {
    attackSpeed: 1.7,
    chargeAttackMultiplier: 1.0,
    airBashSpeedMultiplier: 4.0,
    dashSpeed: 14,
    airDashSpeed: 10,
    jumpVelocity: 5.0,
    airLiftVelocity: 1.2,
  },
};

// ─── Magic Staff — Ranged Caster ──────────────────────────────────────────

export const MAGIC_STAFF: WeaponStyle = {
  id: 'magic_staff',
  animSet: MAGIC_ANIMS,

  attachBone: 'hand_r',
  attachOffset: {
    position: { x: 0, y: 0, z: 50 },
    rotation: { x: 0, y: 0, z: 0 },
  },

  hitbox: { shape: 'sphere', radius: 0.3 },

  comboChain: [
    { start: 'attackStart', swing: 'attack', tags: ['canDamage'], projectile: 'Fireball' },
    { start: 'fistStart',   swing: 'fist',   tags: ['canDamage'], projectile: 'IceShard' },
    { start: 'strikeStart', swing: 'strike', tags: ['canDamage', 'knockDown'], projectile: 'Lightning', recovery: 'strikeEnd' },
  ],

  chargeEnabled: true,
  chargeComboChain: [
    { start: null,          swing: 'attack', tags: ['canDamage'], projectile: 'ChargedFireball' },
    { start: 'fistStart',   swing: 'fist',   tags: ['canDamage'], projectile: 'ChargedIce' },
    { start: 'strikeStart', swing: 'strike', tags: ['canDamage', 'knockDown'], projectile: 'ChargedLightning', recovery: 'strikeEnd' },
  ],

  airComboChain: [
    { swing: 'attack', tags: ['canDamage'], projectile: 'Fireball' },
    { swing: 'fist',   tags: ['canDamage'], projectile: 'IceShard' },
    { swing: 'strike', tags: ['canDamage'], projectile: 'Lightning' },
  ],

  airBash: {
    start: 'jumpAttackStart',
    slam:  'jumpAttack',
    end:   'jumpAttackEnd',
    slamTags: ['canDamage'],
    projectile: 'MeteorStrike',
  },

  specialMoves: {
    special1: {
      name: 'Arcane Beam',
      description: 'Channel a continuous beam forward',
      projectile: 'ArcaneBeam',
      tags: ['canDamage'],
    },
    special2: {
      name: 'Nova',
      description: 'AoE explosion centered on caster',
      projectile: null,
      aoe: true,
      tags: ['canDamage', 'knockDown'],
    },
    special3: {
      name: 'Blink',
      description: 'Long-range teleport in facing direction',
      projectile: null,
      teleport: true,
      distance: 15,
      tags: [],
    },
  },

  blockType: 'ward',

  whirlwind: { slot: 'whirlwind', oneTurnDuration: 0.5, tags: ['canDamage'] },
  launch:    { slot: 'strike', liftDistance: 4.0, tags: ['canDamage', 'canLaunch'] },

  stats: {
    attackSpeed: 1.6,
    chargeAttackMultiplier: 1.8,
    airBashSpeedMultiplier: 3.5,
    dashSpeed: 16,
    airDashSpeed: 13,
    jumpVelocity: 5.0,
    airLiftVelocity: 2.0,
  },
};

// ─── Longbow — Ranged Physical DPS ────────────────────────────────────────

export const LONGBOW: WeaponStyle = {
  id: 'longbow',
  animSet: ARCHER_ANIMS,

  attachBone: 'hand_l',
  attachOffset: {
    position: { x: 0, y: 0, z: 40 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
  },

  hitbox: { shape: 'box', halfExtents: { x: 0.05, y: 0.05, z: 0.4 } },
  hitboxIsProjectile: true,

  comboChain: [
    { start: 'attackStart', swing: 'attack', tags: ['canDamage'], projectile: 'Arrow' },
    { start: 'fistStart',   swing: 'fist',   tags: ['canDamage'], projectile: 'Arrow' },
    { start: 'strikeStart', swing: 'strike', tags: ['canDamage'], projectile: 'PowerArrow', recovery: 'strikeEnd' },
  ],

  chargeEnabled: true,
  chargeComboChain: [
    { start: null,          swing: 'attack', tags: ['canDamage'], projectile: 'ChargedArrow' },
    { start: 'fistStart',   swing: 'fist',   tags: ['canDamage'], projectile: 'ChargedArrow' },
    { start: 'strikeStart', swing: 'strike', tags: ['canDamage'], projectile: 'PiercingArrow', recovery: 'strikeEnd' },
  ],

  airComboChain: [
    { swing: 'attack', tags: ['canDamage'], projectile: 'Arrow' },
    { swing: 'fist',   tags: ['canDamage'], projectile: 'Arrow' },
  ],

  airBash: {
    start: 'jumpAttackStart',
    slam:  'jumpAttack',
    end:   'jumpAttackEnd',
    slamTags: ['canDamage'],
    projectile: 'ArrowRain',
  },

  specialMoves: {
    special1: {
      name: 'Rain of Arrows',
      description: 'Fire a volley of arrows in an AoE zone',
      projectile: 'ArrowRain',
      aoe: true,
      tags: ['canDamage'],
    },
    special2: {
      name: 'Explosive Arrow',
      description: 'Single arrow that explodes on impact',
      projectile: 'ExplosiveArrow',
      tags: ['canDamage', 'knockDown'],
    },
    special3: {
      name: 'Piercing Shot',
      description: 'Arrow that passes through all enemies in a line',
      projectile: 'PiercingShot',
      pierce: true,
      tags: ['canDamage'],
    },
  },

  blockType: 'dodge',

  whirlwind: { slot: 'whirlwind', oneTurnDuration: 0.2, tags: ['canDamage'] },
  launch:    { slot: 'strike', liftDistance: 2.0, tags: ['canDamage', 'canLaunch'] },

  stats: {
    attackSpeed: 2.0,
    chargeAttackMultiplier: 1.5,
    airBashSpeedMultiplier: 3.0,
    dashSpeed: 16,
    airDashSpeed: 12,
    jumpVelocity: 5.5,
    airLiftVelocity: 1.0,
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────

export const WEAPON_STYLES: Record<WeaponStyleId, WeaponStyle> = {
  greatsword:   GREATSWORD,
  sword_shield: SWORD_SHIELD,
  magic_staff:  MAGIC_STAFF,
  longbow:      LONGBOW,
};

export function getWeaponStyle(id: string): WeaponStyle {
  const style = WEAPON_STYLES[id as WeaponStyleId];
  if (!style) {
    console.error(`WeaponStyle: Unknown weapon style "${id}"`);
    return GREATSWORD;
  }
  return style;
}

/** Get all registered weapon style IDs */
export function getWeaponStyleIds(): WeaponStyleId[] {
  return Object.keys(WEAPON_STYLES) as WeaponStyleId[];
}
