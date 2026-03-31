/**
 * grudge-characters.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All 6 playable races, 4 classes, and 3 game scenes from:
 *   GRUDGE-NFT-Island-2026 (source)
 *   C:\Users\jonbe\OneDrive\Desktop\GRUDGE-sourse\GRUDGE-NFT-Island-2026\source
 *
 * Race icons copied from:
 *   Assets/uMMORPG/Prefabs/Entities/Players/[Race]Icon.png
 *
 * Player prefabs:
 *   Assets/uMMORPG/Prefabs/Entities/Players/[Race].prefab
 * Bundle player prefabs (class-typed):
 *   Assets/uMMORPG/Bundle Configs/Prefabs/Entities/Players/[Warrior|Archer|Human].prefab
 */

// Types imported from shared schema (single source of truth)
import type { RaceId, ClassId } from '@shared/character-schema';
export type { RaceId, ClassId };
export type SceneId = 'mobile' | 'island' | 'dojo';

// ─── Scenes ───────────────────────────────────────────────────────────────────

export interface GrudgeScene {
  id: SceneId;
  name: string;
  description: string;
  /** Unity source: Assets/uMMORPG/GRUDGE SCENES/ */
  unityScene: string;
  /** File size of the .unity file (gives scale hint) */
  fileSizeMB: number;
  /** Web GLB path once exported */
  glbPath: string;
  /** Fallback GLB from public/assets/rpg already available */
  fallbackGlb: string;
  ambientColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  skyPreset: 'sunset' | 'dawn' | 'night' | 'warehouse';
  cameraStart: [number, number, number];
}

export const GRUDGE_SCENES: Record<SceneId, GrudgeScene> = {
  mobile: {
    id: 'mobile',
    name: 'Grudge World',
    description: 'The main overworld — 6 faction cities, dungeons, harvestables, 5 baked NavMeshes.',
    unityScene: 'MOBILE.unity',
    fileSizeMB: 59,
    glbPath: '/assets/scenes/grudge-mobile/scene.glb',
    fallbackGlb: '/assets/rpg/models/env/town/town_map.glb',
    ambientColor: '#b8d4f0',
    fogColor: '#a8c8e8',
    fogNear: 80,
    fogFar: 500,
    skyPreset: 'sunset',
    cameraStart: [30, 25, 50],
  },
  island: {
    id: 'island',
    name: 'The NFT Island',
    description: 'The Grudge NFT Island — pirate ruins, hidden coves, rare harvesting nodes.',
    unityScene: 'The Island 1.unity',
    fileSizeMB: 79,
    glbPath: '/assets/scenes/grudge-island/scene.glb',
    fallbackGlb: '/assets/rpg/models/env/springruins.glb',
    ambientColor: '#d4e8c8',
    fogColor: '#c8e0b8',
    fogNear: 60,
    fogFar: 400,
    skyPreset: 'dawn',
    cameraStart: [20, 18, 40],
  },
  dojo: {
    id: 'dojo',
    name: 'The Dojo',
    description: 'Combat arena — PvP duels, training dummy, Pvp Vendor.',
    unityScene: 'Dojo.unity',
    fileSizeMB: 0.4,
    glbPath: '/assets/scenes/grudge-dojo/scene.glb',
    fallbackGlb: '/assets/rpg/models/env/interior/room/room_map.glb',
    ambientColor: '#e8d4b8',
    fogColor: '#d8c4a8',
    fogNear: 20,
    fogFar: 150,
    skyPreset: 'warehouse',
    cameraStart: [5, 8, 15],
  },
};

// ─── Classes ──────────────────────────────────────────────────────────────────

export interface GrudgeClass {
  id: ClassId;
  name: string;
  description: string;
  role: string;
  weapons: string[];
  /**
   * Class does NOT determine the character model — race does.
   * The player's race base mesh (e.g. barbarian-base.fbx) is the body.
   * Class determines starting gear which changes the visual appearance.
   */
  startingWeaponType: string;
  startingArmorTier: string;
  primaryColor: string;
  accentColor: string;
  abilities: string[];
}

export const GRUDGE_CLASSES: Record<ClassId, GrudgeClass> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    description: 'Frontline fighter with shields and heavy blades. Double jump, AoE attacks, group invincibility.',
    role: 'Tank / DPS',
    weapons: ['Shield', 'Sword', '2H Weapon'],
    startingWeaponType: 'sword-shield',
    startingArmorTier: 'metal',
    primaryColor: '#8b6914',
    accentColor: '#d4a017',
    abilities: ['Shield Bash', 'Berserker Rush', 'Holy Charge', 'Warcry'],
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    description: 'Master of elemental magic. Staff spells, teleport blocks, particle shields.',
    role: 'Ranged DPS / Support',
    weapons: ['Staff', 'Tome', 'Mace', 'Off-hand Relic', 'Wand'],
    startingWeaponType: 'staff-mage',
    startingArmorTier: 'cloth',
    primaryColor: '#1a3a8b',
    accentColor: '#4a7ad4',
    abilities: ['Arcane Syphon', 'Ice Particles', 'Fire Shield', 'Holy Nova'],
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    description: 'Precision archer. Parry counters, dash attacks, ranged burst fire.',
    role: 'Ranged DPS',
    weapons: ['Bow', 'Crossbow', 'Gun', 'Dagger', '2H Sword', 'Spear'],
    startingWeaponType: 'bow',
    startingArmorTier: 'leather',
    primaryColor: '#2d6b2d',
    accentColor: '#5cb85c',
    abilities: ['Nature Charge', 'Devine Charge', 'Spirit', 'Arcane Syphon'],
  },
  worge: {
    id: 'worge',
    name: 'Worge',
    description: '3 forms: Bear (tank), Raptor (stealth), Large Bird (flyable mount). Staff/spear hybrid.',
    role: 'Shapeshifter / Hybrid',
    weapons: ['Staff', 'Spear', 'Dagger', 'Bow', 'Hammer', 'Mace', 'Off-hand Relic'],
    startingWeaponType: 'staff-mage',
    startingArmorTier: 'leather',
    primaryColor: '#6b2d6b',
    accentColor: '#b85cb8',
    abilities: ['Berserker Rush', 'Nature Charge', 'Spirit', 'Warcry'],
  },
};

// ─── Races ────────────────────────────────────────────────────────────────────

export interface GrudgeRace {
  id: RaceId;
  name: string;
  description: string;
  lore: string;
  /** Copied from Assets/uMMORPG/Prefabs/Entities/Players/[Race]Icon.png */
  iconPath: string;
  /** Unity race prefab */
  unityPrefab: string;
  faction: string;
  factionCity: string;
  /** Base stat bonuses */
  statBonus: {
    strength: number;
    dexterity: number;
    intelligence: number;
    endurance: number;
  };
  /** Available classes for this race */
  availableClasses: ClassId[];
  themeColor: string;
  borderColor: string;
}

export const GRUDGE_RACES: Record<RaceId, GrudgeRace> = {
  human: {
    id: 'human',
    name: 'Human',
    description: 'Balanced and adaptable. Masters of trade, diplomacy, and warfare.',
    lore: 'Settled in the plains of the Grudge World, Humans have built the mightiest fortified cities and hold the most powerful alliances.',
    iconPath: '/assets/races/HumanIcon.png',
    unityPrefab: 'Prefabs/Entities/Players/Human.prefab',
    faction: 'Crusade',
    factionCity: 'Human Village',
    statBonus: { strength: 2, dexterity: 2, intelligence: 2, endurance: 2 },
    availableClasses: ['warrior', 'mage', 'ranger', 'worge'],
    themeColor: '#c8a06e',
    borderColor: '#d4b080',
  },
  elf: {
    id: 'elf',
    name: 'Elf',
    description: 'Swift and magical. Ancient archers and arcane scholars of the forest.',
    lore: 'Born from the ancient forests, Elves wield nature magic and precision archery to defend their hidden cities from all threats.',
    iconPath: '/assets/races/ElfIcon.png',
    unityPrefab: 'Prefabs/Entities/Players/Elf.prefab',
    faction: 'Fabled',
    factionCity: 'Elf City',
    statBonus: { strength: 0, dexterity: 4, intelligence: 3, endurance: 1 },
    availableClasses: ['warrior', 'mage', 'ranger', 'worge'],
    themeColor: '#8ebc9e',
    borderColor: '#a0d0b0',
  },
  orc: {
    id: 'orc',
    name: 'Orc',
    description: 'Ferocious warriors of immense strength. Born for battle.',
    lore: 'Orcs dominate the rugged plains, their society built on conquest and the honor of the strongest warrior leading the clan.',
    iconPath: '/assets/races/OrcIcon.png',
    unityPrefab: 'Prefabs/Entities/Players/Orc.prefab',
    faction: 'Legion',
    factionCity: 'Orc Village',
    statBonus: { strength: 5, dexterity: 1, intelligence: 0, endurance: 3 },
    availableClasses: ['warrior', 'mage', 'ranger', 'worge'],
    themeColor: '#6b8c3d',
    borderColor: '#7da050',
  },
  undead: {
    id: 'undead',
    name: 'Undead',
    description: 'Risen from death. Necromancers and shadow warriors who cheat mortality.',
    lore: 'Torn from the afterlife by dark sorcery, the Undead serve the Shadow Legion — or break free and forge their own dread destiny.',
    iconPath: '/assets/races/UndeadIcon.png',
    unityPrefab: 'Prefabs/Entities/Players/Undead.prefab',
    faction: 'Legion',
    factionCity: 'Undead City',
    statBonus: { strength: 2, dexterity: 1, intelligence: 4, endurance: 2 },
    availableClasses: ['warrior', 'mage', 'ranger', 'worge'],
    themeColor: '#5c4e6e',
    borderColor: '#7060a0',
  },
  barbarian: {
    id: 'barbarian',
    name: 'Barbarian',
    description: 'Primal berserkers. Rage fuels their stamina, turning wounds into power.',
    lore: 'The Barbarian clans roam the frost-bitten northern wastes, their war cries shaking mountains and their axes carving legends into stone.',
    iconPath: '/assets/races/BarbarianIcon.png',
    unityPrefab: 'Prefabs/Entities/Players/Barbarian.prefab',
    faction: 'Crusade',
    factionCity: 'Barbarian City',
    statBonus: { strength: 4, dexterity: 2, intelligence: 0, endurance: 4 },
    availableClasses: ['warrior', 'mage', 'ranger', 'worge'],
    themeColor: '#9c4a2c',
    borderColor: '#c05a38',
  },
  dwarf: {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Master craftsmen and unbreakable defenders. Stone-hard endurance.',
    lore: 'Deep beneath the mountains, Dwarves have forged the most advanced weapons and armors in the Grudge World — and they know how to use them.',
    iconPath: '/assets/races/DwarveIcon.png',
    unityPrefab: 'Prefabs/Entities/Players/Dwarf.prefab',
    faction: 'Fabled',
    factionCity: 'Dwarven City',
    statBonus: { strength: 3, dexterity: 0, intelligence: 2, endurance: 5 },
    availableClasses: ['warrior', 'mage', 'ranger', 'worge'],
    themeColor: '#8c7d6e',
    borderColor: '#a09080',
  },
};

// ─── Selection state ──────────────────────────────────────────────────────────

export interface CharacterSelection {
  race: RaceId;
  characterClass: ClassId;
  scene: SceneId;
  characterName: string;
}

export const DEFAULT_SELECTION: CharacterSelection = {
  race: 'human',
  characterClass: 'warrior',
  scene: 'mobile',
  characterName: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getRace(id: RaceId): GrudgeRace { return GRUDGE_RACES[id]; }
export function getClass(id: ClassId): GrudgeClass { return GRUDGE_CLASSES[id]; }
export function getScene(id: SceneId): GrudgeScene { return GRUDGE_SCENES[id]; }

export function getAvailableClasses(raceId: RaceId): GrudgeClass[] {
  return GRUDGE_RACES[raceId].availableClasses.map(id => GRUDGE_CLASSES[id]);
}

export function getTotalStats(selection: CharacterSelection): Record<string, number> {
  const race = GRUDGE_RACES[selection.race];
  const base = { strength: 10, dexterity: 10, intelligence: 10, endurance: 10 };
  return {
    strength: base.strength + race.statBonus.strength,
    dexterity: base.dexterity + race.statBonus.dexterity,
    intelligence: base.intelligence + race.statBonus.intelligence,
    endurance: base.endurance + race.statBonus.endurance,
  };
}

export const RACE_ORDER: RaceId[] = ['human', 'elf', 'orc', 'undead', 'barbarian', 'dwarf'];
export const CLASS_ORDER: ClassId[] = ['warrior', 'mage', 'ranger', 'worge'];
export const SCENE_ORDER: SceneId[] = ['mobile', 'island', 'dojo'];
