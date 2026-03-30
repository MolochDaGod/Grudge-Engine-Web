export const TOTAL_ATTRIBUTE_POINTS = 160;

export interface AttributeGain {
  label: string;
  value: number;
}

export interface AttributeDefinition {
  description: string;
  fullDescription: string;
  gains: Record<string, AttributeGain>;
}

export const ATTRIBUTE_DEFINITIONS: Record<string, AttributeDefinition> = {
  Strength: {
    description: "Physical might and raw power.",
    fullDescription: "Increases raw damage output, physical defense, and health. Warriors and melee builds scale heavily with Strength. Each point grants diminishing returns on damage beyond 50 points.",
    gains: {
      health: { label: "Health", value: 5 },
      damage: { label: "Physical Damage", value: 1.25 },
      defense: { label: "Physical Defense", value: 4 },
      block: { label: "Block Chance", value: 0.2 },
      drainHealth: { label: "Lifesteal", value: 0.075 },
      stagger: { label: "Stagger on Hit", value: 0.04 },
      mana: { label: "Mana Pool", value: 1 },
      stamina: { label: "Stamina", value: 0.8 },
      accuracy: { label: "Attack Accuracy", value: 0.08 },
      healthRegen: { label: "Health Regen/s", value: 0.02 },
      damageReduction: { label: "Damage Reduction", value: 0.02 }
    }
  },
  Intellect: {
    description: "Mental acuity and spellcasting power.",
    fullDescription: "Powers magical damage, mana regeneration, and ability cooldown reduction. Casters scale directly with Intellect. High Intellect reduces spell cast times by 0.2% per point. Countered heavily by Resistance.",
    gains: {
      mana: { label: "Mana Pool", value: 9 },
      damage: { label: "Magical Damage", value: 1.5 },
      defense: { label: "Magical Defense", value: 2 },
      manaRegen: { label: "Mana Regen/s", value: 0.04 },
      cooldownReduction: { label: "Cooldown Reduction", value: 0.075 },
      spellAccuracy: { label: "Spell Accuracy", value: 0.15 },
      health: { label: "Health", value: 3 },
      stamina: { label: "Stamina", value: 0.4 },
      accuracy: { label: "Attack Accuracy", value: 0.1 },
      abilityCost: { label: "Ability Cost Reduction", value: 0.05 }
    }
  },
  Vitality: {
    description: "Physical endurance and life force.",
    fullDescription: "Maximizes health pool and provides passive health regeneration. Vital for tanks and sustained damage builds. Very effective against burst damage, but weak to percentage-based damage abilities.",
    gains: {
      health: { label: "Health", value: 25 },
      defense: { label: "Physical Defense", value: 1.5 },
      healthRegen: { label: "Health Regen/s", value: 0.06 },
      damageReduction: { label: "Damage Reduction", value: 0.04 },
      bleedResist: { label: "Bleed Resistance", value: 0.15 },
      mana: { label: "Mana Pool", value: 1.5 },
      stamina: { label: "Stamina", value: 1 },
      resistance: { label: "Magic Resistance", value: 0.08 },
      armor: { label: "Armor Rating", value: 0.2 }
    }
  },
  Dexterity: {
    description: "Hand-eye coordination and finesse.",
    fullDescription: "Dominates critical chance, attack speed, and accuracy. Rogues and archers scale with Dexterity. Provides attack speed bonus (0.4% per point). Critical hits bypass 40% of block chance.",
    gains: {
      damage: { label: "Damage", value: 0.9 },
      criticalChance: { label: "Critical Chance", value: 0.3 },
      accuracy: { label: "Attack Accuracy", value: 0.25 },
      attackSpeed: { label: "Attack Speed", value: 0.2 },
      evasion: { label: "Evasion Chance", value: 0.125 },
      criticalDamage: { label: "Critical Damage Multiplier", value: 0.2 },
      defense: { label: "Physical Defense", value: 1.2 },
      stamina: { label: "Stamina", value: 0.6 },
      movementSpeed: { label: "Movement Speed", value: 0.08 },
      reflexTime: { label: "Reaction Time Bonus", value: 0.03 },
      health: { label: "Health", value: 3 }
    }
  },
  Endurance: {
    description: "Stamina reserves and physical resistance.",
    fullDescription: "Builds stamina for abilities and provides armor scaling. High Endurance enables higher block effectiveness and reduces crowd control duration. Synergizes with blocking playstyles.",
    gains: {
      stamina: { label: "Stamina", value: 6 },
      defense: { label: "Physical Defense", value: 5 },
      blockEffect: { label: "Block Effectiveness", value: 0.175 },
      ccResistance: { label: "CC Duration Reduction", value: 0.1 },
      armor: { label: "Armor Rating", value: 0.6 },
      defenseBreakResist: { label: "Armor Break Resistance", value: 0.125 },
      health: { label: "Health", value: 8 },
      mana: { label: "Mana Pool", value: 1 },
      healthRegen: { label: "Health Regen/s", value: 0.02 },
      block: { label: "Block Chance", value: 0.12 }
    }
  },
  Wisdom: {
    description: "Mental fortitude and magical resilience.",
    fullDescription: "Primary counter to magical damage. Scales resistance and provides magic immunity scaling. Each point provides 0.4% Cooldown Reduction Resistance. Essential for magic-heavy environments.",
    gains: {
      mana: { label: "Mana Pool", value: 6 },
      defense: { label: "Magical Defense", value: 5.5 },
      resistance: { label: "Magic Resistance", value: 0.25 },
      cdrResist: { label: "CDR Resistance", value: 0.2 },
      statusEffect: { label: "Status Effect Duration Reduction", value: 0.075 },
      spellblock: { label: "Spell Block Chance", value: 0.125 },
      health: { label: "Health", value: 4 },
      stamina: { label: "Stamina", value: 0.5 },
      damageReduction: { label: "Damage Reduction", value: 0.03 },
      spellAccuracy: { label: "Spell Accuracy", value: 0.1 }
    }
  },
  Agility: {
    description: "Speed, reflexes, and positioning.",
    fullDescription: "Increases movement speed, dodge chance, and evasion. Synergizes with high-risk playstyles. Each point grants 0.3% movement speed. Dodge provides invincibility frames (0.5s per dodge).",
    gains: {
      movementSpeed: { label: "Movement Speed", value: 0.15 },
      evasion: { label: "Evasion Chance", value: 0.225 },
      dodge: { label: "Dodge Cooldown Reduction", value: 0.15 },
      reflexTime: { label: "Reaction Time Bonus", value: 0.04 },
      criticalEvasion: { label: "Crit Evasion", value: 0.25 },
      fallDamage: { label: "Fall Damage Reduction", value: 0.2 },
      stamina: { label: "Stamina", value: 1 },
      accuracy: { label: "Attack Accuracy", value: 0.1 },
      attackSpeed: { label: "Attack Speed", value: 0.05 },
      damage: { label: "Damage", value: 0.3 },
      health: { label: "Health", value: 3 }
    }
  },
  Tactics: {
    description: "Strategic thinking and ability control.",
    fullDescription: "Expertise in ability execution and resource management. Tactics grants a scaling bonus to all other stats based on total invested points (0.5% per point). High Tactics reduces ability costs, cooldowns, and provides armor penetration.",
    gains: {
      stamina: { label: "Stamina", value: 3 },
      abilityCost: { label: "Ability Cost Reduction", value: 0.075 },
      armorPenetration: { label: "Armor Penetration", value: 0.2 },
      blockPenetration: { label: "Block Penetration", value: 0.175 },
      defenseBreak: { label: "Defense Break Power", value: 0.1 },
      comboCooldownRed: { label: "Combo Cooldown Reduction", value: 0.125 },
      damage: { label: "Damage", value: 0.4 },
      defense: { label: "Physical Defense", value: 1 },
      mana: { label: "Mana Pool", value: 1.5 },
      cooldownReduction: { label: "Cooldown Reduction", value: 0.05 },
      health: { label: "Health", value: 3 }
    }
  }
};

export const BASE_STATS: Record<string, number> = {
  health: 250,
  mana: 100,
  stamina: 100,
  damage: 0,
  defense: 0,
  block: 0,
  blockEffect: 0,
  evasion: 0,
  accuracy: 0,
  criticalChance: 0,
  criticalDamage: 0,
  attackSpeed: 0,
  movementSpeed: 0,
  resistance: 0,
  cdrResist: 0,
  defenseBreakResist: 0,
  armorPenetration: 0,
  blockPenetration: 0,
  defenseBreak: 0,
  drainHealth: 0,
  manaRegen: 0,
  healthRegen: 0,
  cooldownReduction: 0,
  abilityCost: 0,
  spellAccuracy: 0,
  stagger: 0,
  ccResistance: 0,
  armor: 0,
  damageReduction: 0,
  bleedResist: 0,
  statusEffect: 0,
  spellblock: 0,
  dodge: 0,
  reflexTime: 0,
  criticalEvasion: 0,
  fallDamage: 0,
  comboCooldownRed: 0
};

export const STAT_DESCRIPTIONS: Record<string, string> = {
  health: "Total hit points.",
  mana: "Energy for abilities.",
  stamina: "Fuel for physical actions.",
  damage: "Base damage dealt.",
  defense: "Reduces physical damage.",
  block: "Chance to block attacks.",
  blockEffect: "Damage reduction on block.",
  evasion: "Chance to avoid damage.",
  accuracy: "Chance to hit.",
  criticalChance: "Chance of critical hit.",
  criticalDamage: "Extra damage on crit.",
  attackSpeed: "How fast you attack.",
  movementSpeed: "How fast you move.",
  resistance: "Reduces magical damage.",
  cdrResist: "Reduces enemy Cooldown Reduction.",
  defenseBreakResist: "Resistance to Armor Break.",
  armorPenetration: "Bypasses enemy Defense.",
  blockPenetration: "Attacks ignore Block Chance.",
  defenseBreak: "Reduces enemy Defense.",
  drainHealth: "Heals for % of damage dealt.",
  manaRegen: "Mana regen per second.",
  healthRegen: "Health regen per second.",
  cooldownReduction: "Reduces ability cooldowns.",
  abilityCost: "Reduces ability costs.",
  spellAccuracy: "Hit chance for spells.",
  stagger: "Chance to interrupt enemies.",
  ccResistance: "Reduces duration of stuns.",
  armor: "Flat physical defense.",
  damageReduction: "Reduces all incoming damage.",
  bleedResist: "Resistance to bleeding.",
  statusEffect: "Reduces duration of debuffs.",
  spellblock: "Chance to negate spells.",
  dodge: "Reduces cooldown of dodge ability.",
  reflexTime: "Bonus to reaction time.",
  criticalEvasion: "Chance to avoid crits.",
  fallDamage: "Reduces fall damage.",
  comboCooldownRed: "Cooldown reduction for combos."
};

export const PERCENTAGE_STATS = new Set([
  "attackSpeed", "accuracy", "criticalChance", "criticalDamage", "block",
  "blockEffect", "evasion", "resistance", "drainHealth", "damageReduction",
  "movementSpeed", "cooldownReduction", "armorPenetration", "blockPenetration",
  "ccResistance", "spellblock", "defenseBreak", "spellAccuracy", "cdrResist",
  "defenseBreakResist", "bleedResist", "statusEffect", "dodge", "reflexTime",
  "criticalEvasion", "fallDamage", "comboCooldownRed", "stagger", "abilityCost"
]);

export interface ClassTier {
  minRank: number;
  maxRank: number;
  name: string;
  color: string;
  description: string;
}

export const CLASS_TIERS: ClassTier[] = [
  { minRank: 1, maxRank: 10, name: "Legendary", color: "#89f7fe", description: "Mythical power achieved through perfect synergy." },
  { minRank: 11, maxRank: 50, name: "Warlord", color: "#f97316", description: "A dominant force on the battlefield." },
  { minRank: 51, maxRank: 100, name: "Epic", color: "#a855f7", description: "A hero of renown and great skill." },
  { minRank: 101, maxRank: 200, name: "Hero", color: "#3b82f6", description: "A capable adventurer with potential." },
  { minRank: 201, maxRank: 300, name: "Normal", color: "#9ca3af", description: "A standard combatant." }
];

export interface CharacterStats {
  attributes: Record<string, number>;
  derivedStats: Record<string, number>;
  combatPower: number;
  buildScore: number;
  rank: number;
  tier: ClassTier;
  className: string;
}

export function calculateDerivedStats(attributes: Record<string, number>): Record<string, number> {
  const stats = { ...BASE_STATS };
  const tacticsPoints = attributes.Tactics || 0;

  Object.entries(attributes).forEach(([attr, points]) => {
    const def = ATTRIBUTE_DEFINITIONS[attr];
    if (def && points > 0) {
      Object.entries(def.gains).forEach(([key, gain]) => {
        if (stats[key] !== undefined) {
          stats[key] += gain.value * points;
        }
      });
    }
  });

  if (tacticsPoints > 0) {
    const tacticsBonus = tacticsPoints * 0.5;
    Object.entries(stats).forEach(([key, value]) => {
      if (key !== "health" && key !== "mana" && key !== "stamina" && typeof value === "number") {
        stats[key] *= 1 + tacticsBonus / 100;
      }
    });
  }

  return stats;
}

export function calculateCombatPower(stats: Record<string, number>): number {
  const ehp = stats.health * (1 + stats.defense / 100) * (1 + stats.resistance / 100);
  const dps = (stats.damage + 10) * (1 + (stats.criticalChance / 100) * (stats.criticalDamage / 100)) * (1 + stats.attackSpeed / 100);
  const utility = stats.cooldownReduction * 2 + stats.manaRegen * 10 + stats.movementSpeed * 2;
  return Math.floor(ehp * 0.4 + dps * 2.5 + utility * 5);
}

export function calculateBuildScore(attributes: Record<string, number>, stats: Record<string, number>): number {
  const totalPoints = Object.values(attributes).reduce((a, b) => a + b, 0);
  if (totalPoints < TOTAL_ATTRIBUTE_POINTS) return 0;

  const combatPower = calculateCombatPower(stats);
  let score = (combatPower / 6000) * 100;

  const norm = Object.keys(attributes).reduce(
    (acc, k) => ({ ...acc, [k]: attributes[k] / TOTAL_ATTRIBUTE_POINTS }),
    {} as Record<string, number>
  );

  const synergy = Math.max(
    (norm.Strength || 0) + (norm.Vitality || 0) + (norm.Endurance || 0),
    (norm.Intellect || 0) + (norm.Wisdom || 0) + (norm.Tactics || 0),
    (norm.Dexterity || 0) + (norm.Agility || 0) + (norm.Strength || 0),
    (norm.Tactics || 0) + (norm.Endurance || 0) + (norm.Wisdom || 0)
  ) * 20;

  return Math.min(100, score + synergy);
}

export function getRankFromScore(score: number): number {
  const maxRank = 300;
  return Math.max(1, Math.floor(maxRank - score * 2.8));
}

export function getTierFromRank(rank: number): ClassTier {
  return CLASS_TIERS.find(t => rank >= t.minRank && rank <= t.maxRank) || CLASS_TIERS[CLASS_TIERS.length - 1];
}

const CLASS_PREFIXES = ["Void", "Solar", "Lunar", "Star", "Chaos", "Holy", "Dark", "Blood", "Iron", "Storm", "Frost", "Fire", "Wind", "Earth", "Spirit", "Mind", "Soul", "Time", "Space", "Life"];
const CLASS_SUFFIXES = ["Walker", "Weaver", "Lord", "King", "Queen", "God", "Titan", "Slayer", "Breaker", "Maker", "Seer", "Sage", "Guard", "Blade", "Fist", "Shield", "Heart", "Eye", "Hand", "Wing"];

const LEGENDARY_NAMES = [
  "Primordial God-King", "Eternal Void Walker", "Celestial Archon", "Omniscient Sage",
  "Timeless Sentinel", "Reality Weaver", "Abyssal Sovereign", "Divine Arbiter",
  "Cosmic Guardian", "Transcendent Being"
];

export function getClassName(rank: number): string {
  if (rank <= 10) return LEGENDARY_NAMES[rank - 1] || LEGENDARY_NAMES[0];
  if (rank <= 50) return `${CLASS_PREFIXES[(rank - 11) % 20]} ${CLASS_SUFFIXES[(rank - 11) % 20]} Warlord`;
  if (rank <= 100) return `Epic ${CLASS_PREFIXES[(rank - 51) % 20]} ${CLASS_SUFFIXES[(rank - 51) % 20]}`;
  if (rank <= 200) return `${CLASS_PREFIXES[(rank - 101) % 20]} ${CLASS_SUFFIXES[(rank - 101) % 20]}`;
  return `Novice ${CLASS_SUFFIXES[(rank - 201) % 20]}`;
}

export function calculateFullStats(attributes: Record<string, number>): CharacterStats {
  const derivedStats = calculateDerivedStats(attributes);
  const combatPower = calculateCombatPower(derivedStats);
  const buildScore = calculateBuildScore(attributes, derivedStats);
  const rank = getRankFromScore(buildScore);
  const tier = getTierFromRank(rank);
  const className = getClassName(rank);

  return {
    attributes,
    derivedStats,
    combatPower,
    buildScore,
    rank,
    tier,
    className
  };
}

export function createDefaultAttributes(): Record<string, number> {
  return Object.keys(ATTRIBUTE_DEFINITIONS).reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as Record<string, number>
  );
}

export function randomizeAttributes(): Record<string, number> {
  const attributes = createDefaultAttributes();
  let remaining = TOTAL_ATTRIBUTE_POINTS;
  const keys = Object.keys(attributes);

  while (remaining > 0) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    attributes[key]++;
    remaining--;
  }

  return attributes;
}

export function getBuildRating(score: number): string {
  if (score > 90) return "S+";
  if (score > 80) return "S";
  if (score > 70) return "A";
  if (score > 60) return "B";
  if (score > 50) return "C";
  return "D";
}
