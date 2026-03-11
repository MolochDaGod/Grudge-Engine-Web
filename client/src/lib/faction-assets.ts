// ─── Faction Asset Definitions ─────────────────────────────────────────────
// Typed catalog of all faction-specific buildings, units, siege vehicles,
// weapons, and terrain used by the GGE RTS scene.

export type FactionId = 'orc' | 'elf' | 'human' | 'barbarian' | 'dwarf' | 'undead';

export interface FactionMeta {
  id: FactionId;
  name: string;
  color: string;       // hex color for UI/tint
  accent: string;      // secondary color
  icon: string;        // emoji icon
  description: string;
}

export const FACTIONS: Record<FactionId, FactionMeta> = {
  orc: {
    id: 'orc',
    name: 'Orc Horde',
    color: '#4a7c3f',
    accent: '#8b4513',
    icon: '🪓',
    description: 'Savage warriors and shamans from the wastelands'
  },
  elf: {
    id: 'elf',
    name: 'Elven Alliance',
    color: '#2d8b6f',
    accent: '#c9a84c',
    icon: '🏹',
    description: 'Ancient guardians of the forest realm'
  },
  human: {
    id: 'human',
    name: 'Human Kingdom',
    color: '#3b5998',
    accent: '#c0c0c0',
    icon: '⚔️',
    description: 'Noble knights and scholars of the realm'
  },
  barbarian: {
    id: 'barbarian',
    name: 'Barbarian Tribes',
    color: '#b55a30',
    accent: '#d4a574',
    icon: '🔥',
    description: 'Fierce tribal warriors from the badlands — pure aggression'
  },
  dwarf: {
    id: 'dwarf',
    name: 'Dwarven Stronghold',
    color: '#8a6d3b',
    accent: '#c4a35a',
    icon: '⛏️',
    description: 'Master builders and siege engineers of the mountain halls'
  },
  undead: {
    id: 'undead',
    name: 'Undead Scourge',
    color: '#5a3a6a',
    accent: '#2aaa4a',
    icon: '💀',
    description: 'Necromancers and their risen armies from the shadow realm'
  }
};

// ─── Buildings ──────────────────────────────────────────────────────────────

export interface FactionBuildingDef {
  id: string;
  name: string;
  faction: FactionId;
  modelPath: string;
  fallbackMesh: 'box' | 'cylinder';  // primitive when GLB missing
  fallbackColor: string;
  description: string;
  cost: { gold: number; wood: number; stone: number };
  buildTime: number;    // seconds
  hp: number;
  scale: number;
  placementSize: { width: number; depth: number }; // grid cells
  category: 'production' | 'military' | 'resource' | 'defense' | 'special';
}

export const FACTION_BUILDINGS: FactionBuildingDef[] = [
  // ── ORC BUILDINGS ──
  {
    id: 'orc-war-camp',
    name: 'War Camp',
    faction: 'orc',
    modelPath: '/assets/factions/orc/buildings/orc-war-camp.glb',  // place CraftPix building GLB here
    fallbackMesh: 'box',
    fallbackColor: '#5a3a1a',
    description: 'Main Orc base of operations. Trains grunts and researches war upgrades.',
    cost: { gold: 400, wood: 200, stone: 0 },
    buildTime: 60,
    hp: 2000,
    scale: 1.0,
    placementSize: { width: 4, depth: 4 },
    category: 'production'
  },
  {
    id: 'orc-barracks',
    name: 'Orc Barracks',
    faction: 'orc',
    modelPath: '/assets/factions/orc/buildings/orc-barracks.glb',
    fallbackMesh: 'box',
    fallbackColor: '#6b3e2e',
    description: 'Trains Orc warriors, brutes, and berserkers.',
    cost: { gold: 200, wood: 150, stone: 50 },
    buildTime: 40,
    hp: 1200,
    scale: 1.0,
    placementSize: { width: 3, depth: 3 },
    category: 'military'
  },
  {
    id: 'orc-forge',
    name: 'Orc Forge',
    faction: 'orc',
    modelPath: '/assets/factions/orc/buildings/orc-forge.glb',
    fallbackMesh: 'box',
    fallbackColor: '#8b0000',
    description: 'Forges weapons and armor upgrades for Orc units.',
    cost: { gold: 300, wood: 100, stone: 100 },
    buildTime: 45,
    hp: 1000,
    scale: 1.0,
    placementSize: { width: 2, depth: 2 },
    category: 'production'
  },
  {
    id: 'orc-watch-tower',
    name: 'Orc Watch Tower',
    faction: 'orc',
    modelPath: '/assets/factions/orc/buildings/orc-watch-tower.glb',
    fallbackMesh: 'cylinder',
    fallbackColor: '#5a3a1a',
    description: 'Defensive tower with archers. Provides vision.',
    cost: { gold: 150, wood: 100, stone: 75 },
    buildTime: 30,
    hp: 800,
    scale: 1.0,
    placementSize: { width: 2, depth: 2 },
    category: 'defense'
  },
  {
    id: 'orc-shaman-hut',
    name: 'Shaman Hut',
    faction: 'orc',
    modelPath: '/assets/factions/orc/buildings/orc-shaman-hut.glb',
    fallbackMesh: 'box',
    fallbackColor: '#4a2a5a',
    description: 'Trains shamans and researches elemental magic.',
    cost: { gold: 350, wood: 100, stone: 50 },
    buildTime: 50,
    hp: 900,
    scale: 1.0,
    placementSize: { width: 2, depth: 2 },
    category: 'special'
  },
  {
    id: 'orc-lumber-camp',
    name: 'Orc Lumber Camp',
    faction: 'orc',
    modelPath: '/assets/factions/orc/buildings/orc-lumber-camp.glb',
    fallbackMesh: 'box',
    fallbackColor: '#654321',
    description: 'Resource gathering for wood. Drop-off point for peons.',
    cost: { gold: 100, wood: 50, stone: 0 },
    buildTime: 20,
    hp: 600,
    scale: 1.0,
    placementSize: { width: 2, depth: 2 },
    category: 'resource'
  },

  // ── ELF BUILDINGS ──
  {
    id: 'elf-tree-hall',
    name: 'Tree of Life',
    faction: 'elf',
    modelPath: '/assets/factions/elf/buildings/elf-tree-hall.glb',
    fallbackMesh: 'cylinder',
    fallbackColor: '#1a6b3a',
    description: 'Ancient tree that serves as the Elven seat of power. Produces wisps.',
    cost: { gold: 500, wood: 300, stone: 0 },
    buildTime: 70,
    hp: 2500,
    scale: 1.2,
    placementSize: { width: 4, depth: 4 },
    category: 'production'
  },
  {
    id: 'elf-barracks',
    name: 'Elven Barracks',
    faction: 'elf',
    modelPath: '/assets/factions/elf/buildings/elf-barracks.glb',
    fallbackMesh: 'box',
    fallbackColor: '#2a7a4a',
    description: 'Trains rangers, sentinels, and druids of the claw.',
    cost: { gold: 200, wood: 200, stone: 0 },
    buildTime: 40,
    hp: 1100,
    scale: 1.0,
    placementSize: { width: 3, depth: 3 },
    category: 'military'
  },
  {
    id: 'elf-sanctuary',
    name: 'Elven Sanctuary',
    faction: 'elf',
    modelPath: '/assets/factions/elf/buildings/elf-sanctuary.glb',
    fallbackMesh: 'cylinder',
    fallbackColor: '#c9a84c',
    description: 'Magical sanctuary for training mages and druids of the talon.',
    cost: { gold: 350, wood: 150, stone: 100 },
    buildTime: 50,
    hp: 1000,
    scale: 1.0,
    placementSize: { width: 3, depth: 3 },
    category: 'special'
  },
  {
    id: 'elf-ancient-tower',
    name: 'Ancient Protector',
    faction: 'elf',
    modelPath: '/assets/factions/elf/buildings/elf-ancient-tower.glb',
    fallbackMesh: 'cylinder',
    fallbackColor: '#3a8a4a',
    description: 'Living tree tower that attacks enemies in range.',
    cost: { gold: 200, wood: 150, stone: 0 },
    buildTime: 35,
    hp: 900,
    scale: 1.0,
    placementSize: { width: 2, depth: 2 },
    category: 'defense'
  },
  {
    id: 'elf-moonwell',
    name: 'Moonwell',
    faction: 'elf',
    modelPath: '/assets/factions/elf/buildings/elf-moonwell.glb',
    fallbackMesh: 'cylinder',
    fallbackColor: '#4a6aaa',
    description: 'Provides mana regeneration and heals nearby units.',
    cost: { gold: 150, wood: 100, stone: 50 },
    buildTime: 25,
    hp: 500,
    scale: 0.8,
    placementSize: { width: 2, depth: 2 },
    category: 'resource'
  },
  {
    id: 'elf-hunters-lodge',
    name: 'Hunters Lodge',
    faction: 'elf',
    modelPath: '/assets/factions/elf/buildings/elf-hunters-lodge.glb',
    fallbackMesh: 'box',
    fallbackColor: '#5a7a3a',
    description: 'Researches ranged attack upgrades and trains hippogriffs.',
    cost: { gold: 250, wood: 200, stone: 0 },
    buildTime: 40,
    hp: 800,
    scale: 1.0,
    placementSize: { width: 2, depth: 2 },
    category: 'production'
  },

  // ── BARBARIAN BUILDINGS ──
  {
    id: 'barb-war-tent',
    name: 'War Tent',
    faction: 'barbarian',
    modelPath: '/assets/factions/barbarian/buildings/barb-war-tent.glb',
    fallbackMesh: 'box',
    fallbackColor: '#8a4a1a',
    description: 'Tribal headquarters. Trains berserkers and raiders.',
    cost: { gold: 300, wood: 200, stone: 0 },
    buildTime: 45,
    hp: 1600,
    scale: 1.0,
    placementSize: { width: 4, depth: 4 },
    category: 'production'
  },
  {
    id: 'barb-arena',
    name: 'Blood Arena',
    faction: 'barbarian',
    modelPath: '/assets/factions/barbarian/buildings/barb-arena.glb',
    fallbackMesh: 'cylinder',
    fallbackColor: '#aa2a1a',
    description: 'Training grounds for elite warriors. Unlocks rage abilities.',
    cost: { gold: 250, wood: 150, stone: 50 },
    buildTime: 40,
    hp: 1200,
    scale: 1.0,
    placementSize: { width: 3, depth: 3 },
    category: 'military'
  },
  {
    id: 'barb-totem',
    name: 'Ancestor Totem',
    faction: 'barbarian',
    modelPath: '/assets/factions/barbarian/buildings/barb-totem.glb',
    fallbackMesh: 'cylinder',
    fallbackColor: '#6a3a5a',
    description: 'Spiritual focus. Provides attack speed aura to nearby units.',
    cost: { gold: 200, wood: 100, stone: 0 },
    buildTime: 30,
    hp: 700,
    scale: 0.8,
    placementSize: { width: 2, depth: 2 },
    category: 'special'
  },

  // ── DWARF BUILDINGS ──
  {
    id: 'dwarf-mountain-hall',
    name: 'Mountain Hall',
    faction: 'dwarf',
    modelPath: '/assets/factions/dwarf/buildings/dwarf-mountain-hall.glb',
    fallbackMesh: 'box',
    fallbackColor: '#6a5a3a',
    description: 'Dwarven seat of power carved into stone. Trains miners.',
    cost: { gold: 450, wood: 100, stone: 250 },
    buildTime: 65,
    hp: 2800,
    scale: 1.1,
    placementSize: { width: 4, depth: 4 },
    category: 'production'
  },
  {
    id: 'dwarf-foundry',
    name: 'Foundry',
    faction: 'dwarf',
    modelPath: '/assets/factions/dwarf/buildings/dwarf-foundry.glb',
    fallbackMesh: 'box',
    fallbackColor: '#8a3a1a',
    description: 'Forges siege equipment and heavy armor upgrades.',
    cost: { gold: 350, wood: 50, stone: 200 },
    buildTime: 50,
    hp: 1400,
    scale: 1.0,
    placementSize: { width: 3, depth: 3 },
    category: 'military'
  },
  {
    id: 'dwarf-turret',
    name: 'Cannon Turret',
    faction: 'dwarf',
    modelPath: '/assets/factions/dwarf/buildings/dwarf-turret.glb',
    fallbackMesh: 'cylinder',
    fallbackColor: '#5a5a5a',
    description: 'Automated defense turret. Long range, splash damage.',
    cost: { gold: 250, wood: 50, stone: 175 },
    buildTime: 35,
    hp: 1000,
    scale: 1.0,
    placementSize: { width: 2, depth: 2 },
    category: 'defense'
  },

  // ── UNDEAD BUILDINGS ──
  {
    id: 'undead-necropolis',
    name: 'Necropolis',
    faction: 'undead',
    modelPath: '/assets/factions/undead/buildings/undead-necropolis.glb',
    fallbackMesh: 'box',
    fallbackColor: '#3a2a5a',
    description: 'Center of the undead empire. Raises acolytes and generates blight.',
    cost: { gold: 400, wood: 150, stone: 100 },
    buildTime: 60,
    hp: 2000,
    scale: 1.2,
    placementSize: { width: 4, depth: 4 },
    category: 'production'
  },
  {
    id: 'undead-crypt',
    name: 'Crypt',
    faction: 'undead',
    modelPath: '/assets/factions/undead/buildings/undead-crypt.glb',
    fallbackMesh: 'box',
    fallbackColor: '#2a2a3a',
    description: 'Trains ghouls, abominations, and gargoyles.',
    cost: { gold: 200, wood: 100, stone: 100 },
    buildTime: 40,
    hp: 1100,
    scale: 1.0,
    placementSize: { width: 3, depth: 3 },
    category: 'military'
  },
  {
    id: 'undead-graveyard',
    name: 'Graveyard',
    faction: 'undead',
    modelPath: '/assets/factions/undead/buildings/undead-graveyard.glb',
    fallbackMesh: 'box',
    fallbackColor: '#4a4a5a',
    description: 'Passive corpse generation. Dead units return here for reanimation.',
    cost: { gold: 150, wood: 50, stone: 50 },
    buildTime: 25,
    hp: 600,
    scale: 1.0,
    placementSize: { width: 2, depth: 2 },
    category: 'special'
  },

  // ── HUMAN BUILDINGS ──
  {
    id: 'human-town-hall',
    name: 'Town Hall',
    faction: 'human',
    modelPath: '/assets/factions/human/buildings/human-town-hall.glb',
    fallbackMesh: 'box',
    fallbackColor: '#4a5a8a',
    description: 'Center of Human civilization. Trains peasants and researches upgrades.',
    cost: { gold: 400, wood: 200, stone: 100 },
    buildTime: 60,
    hp: 2200,
    scale: 1.0,
    placementSize: { width: 4, depth: 4 },
    category: 'production'
  },
  {
    id: 'human-barracks',
    name: 'Human Barracks',
    faction: 'human',
    modelPath: '/assets/factions/human/buildings/human-barracks.glb',
    fallbackMesh: 'box',
    fallbackColor: '#5a5a6a',
    description: 'Trains footmen, knights, and archers.',
    cost: { gold: 200, wood: 150, stone: 100 },
    buildTime: 40,
    hp: 1500,
    scale: 1.0,
    placementSize: { width: 3, depth: 3 },
    category: 'military'
  },
  {
    id: 'human-blacksmith',
    name: 'Blacksmith',
    faction: 'human',
    modelPath: '/assets/factions/human/buildings/human-blacksmith.glb',
    fallbackMesh: 'box',
    fallbackColor: '#3a3a4a',
    description: 'Researches weapon and armor upgrades for all Human units.',
    cost: { gold: 300, wood: 100, stone: 150 },
    buildTime: 45,
    hp: 1000,
    scale: 1.0,
    placementSize: { width: 2, depth: 2 },
    category: 'production'
  },
  {
    id: 'human-guard-tower',
    name: 'Guard Tower',
    faction: 'human',
    modelPath: '/assets/factions/human/buildings/human-guard-tower.glb',
    fallbackMesh: 'cylinder',
    fallbackColor: '#6a6a7a',
    description: 'Stone tower with archers. Strong defense against ground and air.',
    cost: { gold: 200, wood: 75, stone: 150 },
    buildTime: 35,
    hp: 1200,
    scale: 1.0,
    placementSize: { width: 2, depth: 2 },
    category: 'defense'
  },
  {
    id: 'human-church',
    name: 'Church',
    faction: 'human',
    modelPath: '/assets/factions/human/buildings/human-church.glb',
    fallbackMesh: 'box',
    fallbackColor: '#efefef',
    description: 'Holy sanctuary that trains paladins and priests. Heals nearby allies.',
    cost: { gold: 400, wood: 100, stone: 200 },
    buildTime: 55,
    hp: 1100,
    scale: 1.0,
    placementSize: { width: 3, depth: 3 },
    category: 'special'
  },
  {
    id: 'human-farm',
    name: 'Farm',
    faction: 'human',
    modelPath: '/assets/factions/human/buildings/human-farm.glb',
    fallbackMesh: 'box',
    fallbackColor: '#8a7a5a',
    description: 'Provides food supply to support additional units.',
    cost: { gold: 80, wood: 60, stone: 0 },
    buildTime: 15,
    hp: 400,
    scale: 0.8,
    placementSize: { width: 2, depth: 2 },
    category: 'resource'
  },
];

// ─── Units ──────────────────────────────────────────────────────────────────

export interface FactionUnitDef {
  id: string;
  name: string;
  faction: FactionId;
  modelPath: string;
  fallbackMesh: 'capsule' | 'sphere';
  fallbackColor: string;
  description: string;
  animations: string[];      // expected animation clip names
  stats: {
    hp: number;
    damage: number;
    armor: number;
    speed: number;            // units per second
    attackSpeed: number;      // attacks per second
    range: number;            // 0 = melee
  };
  cost: { gold: number; food: number };
  trainTime: number;          // seconds
  scale: number;
  category: 'melee' | 'ranged' | 'magic' | 'hero' | 'worker';
}

export const FACTION_UNITS: FactionUnitDef[] = [
  // ── ORC UNITS ──
  {
    id: 'orc-grunt',
    name: 'Orc Grunt',
    faction: 'orc',
    modelPath: '/assets/factions/orc/units/orc-characters-customizable.glb',  // Toon_RTS ORC_Characters_Customizable
    fallbackMesh: 'capsule',
    fallbackColor: '#4a7c3f',
    description: 'Heavy melee infantry. Tough and hard-hitting.',
    animations: ['idle', 'walk', 'run', 'attack', 'death'],
    stats: { hp: 150, damage: 18, armor: 3, speed: 3.5, attackSpeed: 1.0, range: 0 },
    cost: { gold: 100, food: 2 },
    trainTime: 20,
    scale: 1.0,
    category: 'melee'
  },
  {
    id: 'orc-brute',
    name: 'Orc Brute',
    faction: 'orc',
    modelPath: '/assets/factions/orc/units/orc-characters-customizable.glb',  // Toon_RTS heavy variant
    fallbackMesh: 'capsule',
    fallbackColor: '#3a5c2f',
    description: 'Massive orc with a two-handed weapon. Slow but devastating.',
    animations: ['idle', 'walk', 'attack', 'death'],
    stats: { hp: 280, damage: 35, armor: 5, speed: 2.5, attackSpeed: 0.7, range: 0 },
    cost: { gold: 200, food: 3 },
    trainTime: 35,
    scale: 1.3,
    category: 'melee'
  },
  {
    id: 'orc-archer',
    name: 'Orc Archer',
    faction: 'orc',
    modelPath: '/assets/factions/orc/units/orc-characters-customizable.glb',  // Toon_RTS ranged variant
    fallbackMesh: 'capsule',
    fallbackColor: '#5a8c4f',
    description: 'Ranged attacker with poison-tipped arrows.',
    animations: ['idle', 'walk', 'attack', 'death'],
    stats: { hp: 90, damage: 14, armor: 1, speed: 4.0, attackSpeed: 1.2, range: 12 },
    cost: { gold: 120, food: 2 },
    trainTime: 22,
    scale: 1.0,
    category: 'ranged'
  },
  {
    id: 'orc-shaman',
    name: 'Orc Shaman',
    faction: 'orc',
    modelPath: '/assets/factions/orc/units/orc-characters-customizable.glb',  // Toon_RTS mage variant
    fallbackMesh: 'capsule',
    fallbackColor: '#6a4a8a',
    description: 'Casts elemental spells. Lightning bolt and bloodlust.',
    animations: ['idle', 'walk', 'cast', 'death'],
    stats: { hp: 80, damage: 22, armor: 0, speed: 3.0, attackSpeed: 0.8, range: 10 },
    cost: { gold: 180, food: 2 },
    trainTime: 30,
    scale: 1.0,
    category: 'magic'
  },
  {
    id: 'orc-peon',
    name: 'Orc Peon',
    faction: 'orc',
    modelPath: '/assets/factions/orc/units/orc-characters-customizable.glb',  // Toon_RTS worker
    fallbackMesh: 'capsule',
    fallbackColor: '#7a9c6f',
    description: 'Worker unit. Gathers resources and constructs buildings.',
    animations: ['idle', 'walk', 'work', 'death'],
    stats: { hp: 60, damage: 5, armor: 0, speed: 3.5, attackSpeed: 1.0, range: 0 },
    cost: { gold: 50, food: 1 },
    trainTime: 12,
    scale: 0.9,
    category: 'worker'
  },

  // ── ELF UNITS ──
  {
    id: 'elf-ranger',
    name: 'Elf Ranger',
    faction: 'elf',
    modelPath: '/assets/factions/elf/units/elf-characters-customizable.glb',  // Toon_RTS ELF_Characters_customizable
    fallbackMesh: 'capsule',
    fallbackColor: '#2d8b6f',
    description: 'Elite ranged fighter. Fast and accurate with longbow.',
    animations: ['idle', 'walk', 'run', 'attack', 'death'],
    stats: { hp: 100, damage: 16, armor: 1, speed: 5.0, attackSpeed: 1.5, range: 15 },
    cost: { gold: 130, food: 2 },
    trainTime: 22,
    scale: 1.0,
    category: 'ranged'
  },
  {
    id: 'elf-sentinel',
    name: 'Elf Sentinel',
    faction: 'elf',
    modelPath: '/assets/factions/elf/units/elf-characters-customizable.glb',  // Toon_RTS melee variant
    fallbackMesh: 'capsule',
    fallbackColor: '#1a6b4f',
    description: 'Melee guardian with a glaive. Can go invisible at night.',
    animations: ['idle', 'walk', 'attack', 'death'],
    stats: { hp: 130, damage: 20, armor: 3, speed: 4.5, attackSpeed: 1.1, range: 0 },
    cost: { gold: 140, food: 2 },
    trainTime: 25,
    scale: 1.0,
    category: 'melee'
  },
  {
    id: 'elf-mage',
    name: 'Elf Mage',
    faction: 'elf',
    modelPath: '/assets/factions/elf/units/elf-characters-customizable.glb',  // Toon_RTS mage variant
    fallbackMesh: 'capsule',
    fallbackColor: '#4a8aaa',
    description: 'Arcane spellcaster. Frost bolt and entangle abilities.',
    animations: ['idle', 'walk', 'cast', 'death'],
    stats: { hp: 70, damage: 25, armor: 0, speed: 3.5, attackSpeed: 0.7, range: 12 },
    cost: { gold: 200, food: 2 },
    trainTime: 30,
    scale: 1.0,
    category: 'magic'
  },
  {
    id: 'elf-druid',
    name: 'Elf Druid',
    faction: 'elf',
    modelPath: '/assets/factions/elf/units/elf-characters-customizable.glb',  // Toon_RTS druid variant
    fallbackMesh: 'capsule',
    fallbackColor: '#3a7a3a',
    description: 'Nature healer and shapeshifter. Can transform into a bear.',
    animations: ['idle', 'walk', 'cast', 'transform', 'death'],
    stats: { hp: 120, damage: 12, armor: 2, speed: 4.0, attackSpeed: 1.0, range: 8 },
    cost: { gold: 220, food: 3 },
    trainTime: 35,
    scale: 1.0,
    category: 'magic'
  },
  {
    id: 'elf-wisp',
    name: 'Wisp',
    faction: 'elf',
    modelPath: '/assets/factions/elf/units/elf-wisp.glb',
    fallbackMesh: 'sphere',
    fallbackColor: '#aaffee',
    description: 'Ethereal worker. Gathers lumber without destroying trees.',
    animations: ['idle', 'float', 'work', 'death'],
    stats: { hp: 30, damage: 0, armor: 0, speed: 4.0, attackSpeed: 0, range: 0 },
    cost: { gold: 40, food: 0 },
    trainTime: 10,
    scale: 0.5,
    category: 'worker'
  },

  // ── BARBARIAN UNITS ──
  {
    id: 'barb-berserker',
    name: 'Berserker',
    faction: 'barbarian',
    modelPath: '/assets/factions/barbarian/units/barbarian-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#b55a30',
    description: 'Frenzied melee fighter. Gains attack speed as HP drops.',
    animations: ['idle', 'walk', 'run', 'attack', 'rage', 'death'],
    stats: { hp: 180, damage: 24, armor: 1, speed: 5.0, attackSpeed: 1.4, range: 0 },
    cost: { gold: 120, food: 2 },
    trainTime: 18,
    scale: 1.1,
    category: 'melee'
  },
  {
    id: 'barb-raider',
    name: 'Raider',
    faction: 'barbarian',
    modelPath: '/assets/factions/barbarian/units/barbarian-cavalry.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#9a4a20',
    description: 'Fast mounted warrior. Hit-and-run tactics.',
    animations: ['idle', 'walk', 'run', 'attack', 'death'],
    stats: { hp: 140, damage: 18, armor: 2, speed: 7.0, attackSpeed: 1.2, range: 0 },
    cost: { gold: 180, food: 2 },
    trainTime: 25,
    scale: 1.2,
    category: 'melee'
  },
  {
    id: 'barb-firethrower',
    name: 'Firethrower',
    faction: 'barbarian',
    modelPath: '/assets/factions/barbarian/units/barbarian-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#ff6a20',
    description: 'Ranged area damage with flaming projectiles.',
    animations: ['idle', 'walk', 'attack', 'death'],
    stats: { hp: 70, damage: 20, armor: 0, speed: 3.5, attackSpeed: 0.8, range: 10 },
    cost: { gold: 160, food: 2 },
    trainTime: 28,
    scale: 1.0,
    category: 'ranged'
  },
  {
    id: 'barb-thrall',
    name: 'Thrall',
    faction: 'barbarian',
    modelPath: '/assets/factions/barbarian/units/barbarian-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#8a7a5a',
    description: 'Worker unit. Gathers resources and builds structures.',
    animations: ['idle', 'walk', 'work', 'death'],
    stats: { hp: 55, damage: 6, armor: 0, speed: 3.5, attackSpeed: 1.0, range: 0 },
    cost: { gold: 50, food: 1 },
    trainTime: 12,
    scale: 0.9,
    category: 'worker'
  },

  // ── DWARF UNITS ──
  {
    id: 'dwarf-warrior',
    name: 'Dwarven Warrior',
    faction: 'dwarf',
    modelPath: '/assets/factions/dwarf/units/dwarf-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#8a6d3b',
    description: 'Heavy infantry with high armor. Slow but nearly unkillable.',
    animations: ['idle', 'walk', 'attack', 'block', 'death'],
    stats: { hp: 200, damage: 14, armor: 8, speed: 2.5, attackSpeed: 0.9, range: 0 },
    cost: { gold: 130, food: 2 },
    trainTime: 22,
    scale: 0.8,
    category: 'melee'
  },
  {
    id: 'dwarf-rifleman',
    name: 'Rifleman',
    faction: 'dwarf',
    modelPath: '/assets/factions/dwarf/units/dwarf-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#6a5d2b',
    description: 'Long-range gunpowder unit. High damage, slow fire rate.',
    animations: ['idle', 'walk', 'shoot', 'reload', 'death'],
    stats: { hp: 85, damage: 28, armor: 2, speed: 3.0, attackSpeed: 0.5, range: 18 },
    cost: { gold: 200, food: 2 },
    trainTime: 30,
    scale: 0.8,
    category: 'ranged'
  },
  {
    id: 'dwarf-engineer',
    name: 'Engineer',
    faction: 'dwarf',
    modelPath: '/assets/factions/dwarf/units/dwarf-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#5a4d1b',
    description: 'Places turrets and repairs buildings. Can lay explosive traps.',
    animations: ['idle', 'walk', 'work', 'place', 'death'],
    stats: { hp: 90, damage: 8, armor: 3, speed: 3.0, attackSpeed: 0.6, range: 0 },
    cost: { gold: 150, food: 2 },
    trainTime: 25,
    scale: 0.8,
    category: 'worker'
  },
  {
    id: 'dwarf-miner',
    name: 'Miner',
    faction: 'dwarf',
    modelPath: '/assets/factions/dwarf/units/dwarf-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#7a6d4b',
    description: 'Resource gatherer. Mines gold and stone faster than other workers.',
    animations: ['idle', 'walk', 'mine', 'death'],
    stats: { hp: 70, damage: 5, armor: 1, speed: 3.0, attackSpeed: 1.0, range: 0 },
    cost: { gold: 60, food: 1 },
    trainTime: 14,
    scale: 0.75,
    category: 'worker'
  },

  // ── UNDEAD UNITS ──
  {
    id: 'undead-ghoul',
    name: 'Ghoul',
    faction: 'undead',
    modelPath: '/assets/factions/undead/units/undead-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#4a5a3a',
    description: 'Fast melee attacker. Heals by consuming corpses.',
    animations: ['idle', 'walk', 'run', 'attack', 'feed', 'death'],
    stats: { hp: 100, damage: 16, armor: 0, speed: 5.5, attackSpeed: 1.5, range: 0 },
    cost: { gold: 80, food: 1 },
    trainTime: 15,
    scale: 1.0,
    category: 'melee'
  },
  {
    id: 'undead-necromancer',
    name: 'Necromancer',
    faction: 'undead',
    modelPath: '/assets/factions/undead/units/undead-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#5a3a6a',
    description: 'Raises skeletons from corpses. Dark bolt ranged attack.',
    animations: ['idle', 'walk', 'cast', 'raise', 'death'],
    stats: { hp: 60, damage: 18, armor: 0, speed: 3.0, attackSpeed: 0.7, range: 11 },
    cost: { gold: 200, food: 2 },
    trainTime: 30,
    scale: 1.0,
    category: 'magic'
  },
  {
    id: 'undead-abomination',
    name: 'Abomination',
    faction: 'undead',
    modelPath: '/assets/factions/undead/units/undead-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#3a4a2a',
    description: 'Massive undead tank. AoE disease cloud on death.',
    animations: ['idle', 'walk', 'attack', 'death'],
    stats: { hp: 400, damage: 30, armor: 4, speed: 2.0, attackSpeed: 0.6, range: 0 },
    cost: { gold: 280, food: 4 },
    trainTime: 40,
    scale: 1.5,
    category: 'melee'
  },
  {
    id: 'undead-acolyte',
    name: 'Acolyte',
    faction: 'undead',
    modelPath: '/assets/factions/undead/units/undead-characters.glb',
    fallbackMesh: 'capsule',
    fallbackColor: '#6a5a7a',
    description: 'Undead worker. Channels energy to construct buildings.',
    animations: ['idle', 'walk', 'channel', 'death'],
    stats: { hp: 40, damage: 3, armor: 0, speed: 3.5, attackSpeed: 1.0, range: 0 },
    cost: { gold: 50, food: 1 },
    trainTime: 12,
    scale: 0.9,
    category: 'worker'
  },

  // ── HUMAN UNITS ──
  {
    id: 'human-footman',
    name: 'Footman',
    faction: 'human',
    modelPath: '/assets/factions/human/units/wk-characters-customizable.glb',  // Toon_RTS WK_Characters_customizable
    fallbackMesh: 'capsule',
    fallbackColor: '#3b5998',
    description: 'Standard melee infantry with sword and shield.',
    animations: ['idle', 'walk', 'run', 'attack', 'block', 'death'],
    stats: { hp: 120, damage: 14, armor: 4, speed: 4.0, attackSpeed: 1.2, range: 0 },
    cost: { gold: 90, food: 2 },
    trainTime: 18,
    scale: 1.0,
    category: 'melee'
  },
  {
    id: 'human-knight',
    name: 'Knight',
    faction: 'human',
    modelPath: '/assets/factions/human/units/wk-cavalry-customizable.glb',  // Toon_RTS WK_Cavalry_customizable
    fallbackMesh: 'capsule',
    fallbackColor: '#2a4988',
    description: 'Mounted heavy cavalry. Charges deal bonus damage.',
    animations: ['idle', 'walk', 'run', 'attack', 'death'],
    stats: { hp: 200, damage: 22, armor: 5, speed: 6.0, attackSpeed: 1.0, range: 0 },
    cost: { gold: 250, food: 3 },
    trainTime: 35,
    scale: 1.2,
    category: 'melee'
  },
  {
    id: 'human-archer',
    name: 'Human Archer',
    faction: 'human',
    modelPath: '/assets/factions/human/units/wk-characters-customizable.glb',  // Toon_RTS ranged variant
    fallbackMesh: 'capsule',
    fallbackColor: '#5a7a5a',
    description: 'Ranged unit with crossbow. Good against light armor.',
    animations: ['idle', 'walk', 'attack', 'death'],
    stats: { hp: 80, damage: 12, armor: 1, speed: 4.0, attackSpeed: 1.3, range: 13 },
    cost: { gold: 100, food: 2 },
    trainTime: 20,
    scale: 1.0,
    category: 'ranged'
  },
  {
    id: 'human-mage',
    name: 'Human Mage',
    faction: 'human',
    modelPath: '/assets/factions/human/units/wk-characters-customizable.glb',  // Toon_RTS mage variant
    fallbackMesh: 'capsule',
    fallbackColor: '#6a4a9a',
    description: 'Arcane spellcaster. Fireball and polymorph abilities.',
    animations: ['idle', 'walk', 'cast', 'death'],
    stats: { hp: 65, damage: 28, armor: 0, speed: 3.0, attackSpeed: 0.6, range: 11 },
    cost: { gold: 220, food: 2 },
    trainTime: 32,
    scale: 1.0,
    category: 'magic'
  },
  {
    id: 'human-paladin',
    name: 'Paladin',
    faction: 'human',
    modelPath: '/assets/factions/human/units/wk-characters-customizable.glb',  // Toon_RTS hero variant
    fallbackMesh: 'capsule',
    fallbackColor: '#daa520',
    description: 'Holy knight hero. Divine shield and holy light abilities.',
    animations: ['idle', 'walk', 'attack', 'cast', 'death'],
    stats: { hp: 300, damage: 20, armor: 6, speed: 3.5, attackSpeed: 1.0, range: 0 },
    cost: { gold: 400, food: 4 },
    trainTime: 50,
    scale: 1.1,
    category: 'hero'
  },
  {
    id: 'human-peasant',
    name: 'Peasant',
    faction: 'human',
    modelPath: '/assets/factions/human/units/wk-characters-customizable.glb',  // Toon_RTS worker variant
    fallbackMesh: 'capsule',
    fallbackColor: '#8a7a5a',
    description: 'Worker unit. Gathers resources and constructs buildings.',
    animations: ['idle', 'walk', 'work', 'death'],
    stats: { hp: 50, damage: 4, armor: 0, speed: 3.5, attackSpeed: 1.0, range: 0 },
    cost: { gold: 50, food: 1 },
    trainTime: 12,
    scale: 0.9,
    category: 'worker'
  },
];

// ─── Siege Vehicles ─────────────────────────────────────────────────────────

export interface SiegeVehicleDef {
  id: string;
  name: string;
  modelPath: string;
  fallbackMesh: 'box';
  fallbackColor: string;
  description: string;
  stats: {
    hp: number;
    damage: number;
    armor: number;
    speed: number;
    attackSpeed: number;
    range: number;
    siegeDamage: number;    // bonus vs buildings
  };
  cost: { gold: number; wood: number };
  buildTime: number;
  scale: number;
}

export const SIEGE_VEHICLES: SiegeVehicleDef[] = [
  {
    id: 'siege-catapult',
    name: 'Catapult',
    modelPath: '/assets/siege/orc-catapult.glb',  // Toon_RTS ORC_Catapult
    fallbackMesh: 'box',
    fallbackColor: '#8a7a5a',
    description: 'Long-range siege weapon. Hurls boulders at buildings.',
    stats: { hp: 200, damage: 40, armor: 2, speed: 1.5, attackSpeed: 0.3, range: 25, siegeDamage: 80 },
    cost: { gold: 300, wood: 200 },
    buildTime: 45,
    scale: 1.2
  },
  {
    id: 'siege-ballista',
    name: 'Ballista',
    modelPath: '/assets/siege/elf-boltthrower.glb',  // Toon_RTS ELF_BoltThrower
    fallbackMesh: 'box',
    fallbackColor: '#7a6a4a',
    description: 'Giant crossbow. Accurate against single targets and air units.',
    stats: { hp: 150, damage: 55, armor: 1, speed: 2.0, attackSpeed: 0.5, range: 20, siegeDamage: 30 },
    cost: { gold: 250, wood: 150 },
    buildTime: 35,
    scale: 1.0
  },
  {
    id: 'siege-ram',
    name: 'Battering Ram',
    modelPath: '/assets/siege/battering-ram.glb',
    fallbackMesh: 'box',
    fallbackColor: '#5a4a3a',
    description: 'Melee siege weapon. Devastating against gates and walls.',
    stats: { hp: 350, damage: 10, armor: 8, speed: 1.0, attackSpeed: 0.4, range: 0, siegeDamage: 120 },
    cost: { gold: 200, wood: 250 },
    buildTime: 40,
    scale: 1.3
  },
  {
    id: 'siege-tower',
    name: 'Siege Tower',
    modelPath: '/assets/siege/wk-catapult.glb',  // Toon_RTS WK_Catapult repurposed
    fallbackMesh: 'box',
    fallbackColor: '#6a5a4a',
    description: 'Mobile tower. Units inside are protected and can scale walls.',
    stats: { hp: 500, damage: 0, armor: 10, speed: 0.8, attackSpeed: 0, range: 0, siegeDamage: 0 },
    cost: { gold: 350, wood: 300 },
    buildTime: 55,
    scale: 1.5
  },
];

// ─── Weapons (Equippable) ───────────────────────────────────────────────────

export interface WeaponDef {
  id: string;
  name: string;
  modelPath: string;
  type: 'sword' | 'axe' | 'bow' | 'staff' | 'shield' | 'spear' | 'mace' | 'dagger' | 'hammer' | 'crossbow';
  damage: number;
  speed: number;
  range: number;
  scale: number;
}

export const WEAPONS: WeaponDef[] = [
  { id: 'weapon-iron-sword', name: 'Iron Sword', modelPath: '/assets/weapons/iron-sword.glb', type: 'sword', damage: 10, speed: 1.2, range: 0, scale: 1.0 },
  { id: 'weapon-battle-axe', name: 'Battle Axe', modelPath: '/assets/weapons/battle-axe.glb', type: 'axe', damage: 16, speed: 0.9, range: 0, scale: 1.0 },
  { id: 'weapon-longbow', name: 'Longbow', modelPath: '/assets/weapons/longbow.glb', type: 'bow', damage: 12, speed: 1.3, range: 15, scale: 1.0 },
  { id: 'weapon-magic-staff', name: 'Magic Staff', modelPath: '/assets/weapons/magic-staff.glb', type: 'staff', damage: 20, speed: 0.7, range: 12, scale: 1.0 },
  { id: 'weapon-tower-shield', name: 'Tower Shield', modelPath: '/assets/weapons/tower-shield.glb', type: 'shield', damage: 2, speed: 0, range: 0, scale: 1.0 },
  { id: 'weapon-war-spear', name: 'War Spear', modelPath: '/assets/weapons/war-spear.glb', type: 'spear', damage: 14, speed: 1.0, range: 0, scale: 1.0 },
  { id: 'weapon-war-hammer', name: 'War Hammer', modelPath: '/assets/weapons/war-hammer.glb', type: 'hammer', damage: 18, speed: 0.8, range: 0, scale: 1.0 },
  { id: 'weapon-crossbow', name: 'Crossbow', modelPath: '/assets/weapons/crossbow.glb', type: 'crossbow', damage: 14, speed: 1.0, range: 13, scale: 1.0 },
];

// ─── Terrain Props ──────────────────────────────────────────────────────────

export interface TerrainPropDef {
  id: string;
  name: string;
  modelPath: string;
  fallbackMesh: 'box' | 'cylinder' | 'sphere';
  fallbackColor: string;
  category: 'tree' | 'rock' | 'bush' | 'flower' | 'path' | 'water' | 'cliff' | 'fence' | 'prop';
  scale: number;
  isObstacle: boolean;
  resourceYield?: { type: 'wood' | 'gold' | 'stone'; amount: number };
}

export const TERRAIN_PROPS: TerrainPropDef[] = [
  { id: 'terrain-oak-tree', name: 'Oak Tree', modelPath: '/assets/terrain/oak-tree.glb', fallbackMesh: 'cylinder', fallbackColor: '#2a5a1a', category: 'tree', scale: 1.0, isObstacle: true, resourceYield: { type: 'wood', amount: 100 } },
  { id: 'terrain-pine-tree', name: 'Pine Tree', modelPath: '/assets/terrain/pine-tree.glb', fallbackMesh: 'cylinder', fallbackColor: '#1a4a2a', category: 'tree', scale: 1.0, isObstacle: true, resourceYield: { type: 'wood', amount: 80 } },
  { id: 'terrain-dead-tree', name: 'Dead Tree', modelPath: '/assets/terrain/dead-tree.glb', fallbackMesh: 'cylinder', fallbackColor: '#5a4a3a', category: 'tree', scale: 0.8, isObstacle: true },
  { id: 'terrain-boulder', name: 'Boulder', modelPath: '/assets/terrain/boulder.glb', fallbackMesh: 'sphere', fallbackColor: '#6a6a6a', category: 'rock', scale: 1.0, isObstacle: true },
  { id: 'terrain-gold-mine', name: 'Gold Mine', modelPath: '/assets/terrain/gold-mine.glb', fallbackMesh: 'box', fallbackColor: '#daa520', category: 'rock', scale: 1.2, isObstacle: true, resourceYield: { type: 'gold', amount: 2500 } },
  { id: 'terrain-stone-quarry', name: 'Stone Quarry', modelPath: '/assets/terrain/stone-quarry.glb', fallbackMesh: 'box', fallbackColor: '#8a8a8a', category: 'rock', scale: 1.2, isObstacle: true, resourceYield: { type: 'stone', amount: 1500 } },
  { id: 'terrain-bush', name: 'Bush', modelPath: '/assets/terrain/bush.glb', fallbackMesh: 'sphere', fallbackColor: '#3a6a2a', category: 'bush', scale: 0.6, isObstacle: false },
  { id: 'terrain-stone-fence', name: 'Stone Fence', modelPath: '/assets/terrain/stone-fence.glb', fallbackMesh: 'box', fallbackColor: '#7a7a7a', category: 'fence', scale: 1.0, isObstacle: true },
  { id: 'terrain-wooden-fence', name: 'Wooden Fence', modelPath: '/assets/terrain/wooden-fence.glb', fallbackMesh: 'box', fallbackColor: '#8a6a4a', category: 'fence', scale: 1.0, isObstacle: true },
  { id: 'terrain-torch', name: 'Torch Post', modelPath: '/assets/terrain/torch.glb', fallbackMesh: 'cylinder', fallbackColor: '#ff6600', category: 'prop', scale: 0.8, isObstacle: true },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getBuildingsForFaction(faction: FactionId): FactionBuildingDef[] {
  return FACTION_BUILDINGS.filter(b => b.faction === faction);
}

export function getUnitsForFaction(faction: FactionId): FactionUnitDef[] {
  return FACTION_UNITS.filter(u => u.faction === faction);
}

export function getFactionColor(faction: FactionId): string {
  return FACTIONS[faction].color;
}

export function getAllFactionIds(): FactionId[] {
  return ['orc', 'elf', 'human', 'barbarian', 'dwarf', 'undead'];
}
