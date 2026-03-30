import * as BABYLON from '@babylonjs/core';
import type { CharacterPrefabConfig } from './character-prefab';
import type { RaceId } from '@shared/character-schema';
import { ModularCharacter, createModularCharacter } from '../modular-character';

// ---------------------------------------------------------------------------
// Race prefab configs (one per race)
// ---------------------------------------------------------------------------

function makeRacePrefab(
  raceId: RaceId,
  displayName: string,
  description: string,
  tags: string[],
): CharacterPrefabConfig {
  return {
    id: `race-${raceId}`,
    name: displayName,
    description,
    modelPath: `/assets/characters/races/${raceId}/${raceId}-base.fbx`,
    textures: {},
    animations: [],
    defaultAnimation: 'idle',
    scale: 1,
    colliderType: 'capsule',
    colliderSize: { x: 0.5, y: 1.8, z: 0.5 },
    tags: ['character', 'humanoid', 'modular', raceId, ...tags],
    layer: 5,
    controllerType: 'character',
  };
}

export const BARBARIAN_PREFAB = makeRacePrefab(
  'barbarian',
  'Barbarian',
  'Tribal warrior race — strong melee fighters with heavy weapons and shields. Uses BRB character model.',
  ['barbarian', 'melee', 'warrior'],
);

export const DWARF_PREFAB = makeRacePrefab(
  'dwarf',
  'Dwarf',
  'Stout mountain folk — master smiths and sturdy fighters. Uses DWF character model.',
  ['dwarf', 'tank', 'crafter'],
);

export const ELF_PREFAB = makeRacePrefab(
  'elf',
  'Elf',
  'Graceful woodland race — skilled archers and cavalry mages. Uses ELF character model.',
  ['elf', 'archer', 'mage'],
);

export const ORC_PREFAB = makeRacePrefab(
  'orc',
  'Orc',
  'Fierce war-bred race — aggressive fighters with siege weapons. Uses ORC character model.',
  ['orc', 'melee', 'siege'],
);

export const UNDEAD_PREFAB = makeRacePrefab(
  'undead',
  'Undead',
  'Risen dead race — dark mages and relentless fighters. Uses UD character model.',
  ['undead', 'mage', 'dark'],
);

export const HUMAN_PREFAB = makeRacePrefab(
  'human',
  'Human',
  'Versatile kingdom race — balanced fighters, mages, and cavalry. Uses WK character model.',
  ['human', 'balanced', 'knight'],
);

export const RACE_CHARACTER_PREFABS: CharacterPrefabConfig[] = [
  BARBARIAN_PREFAB,
  DWARF_PREFAB,
  ELF_PREFAB,
  ORC_PREFAB,
  UNDEAD_PREFAB,
  HUMAN_PREFAB,
];

// ---------------------------------------------------------------------------
// Spawn helper — creates a full ModularCharacter from a race prefab
// ---------------------------------------------------------------------------

/**
 * Spawn a modular race character in the given scene.
 * Returns the ModularCharacter instance, which can then be equipped/animated.
 *
 * @example
 * ```ts
 * const character = await spawnRaceCharacter(scene, 'barbarian', {
 *   position: new BABYLON.Vector3(0, 0, 0),
 * });
 * await character.equip('weapon', 'equipment/BRB_weapon_sword_B.FBX', {
 *   weaponType: 'sword-shield',
 * });
 * character.animationState.play('idle');
 * ```
 */
export async function spawnRaceCharacter(
  scene: BABYLON.Scene,
  raceId: RaceId,
  options: {
    position?: BABYLON.Vector3;
    rotation?: number;
    scale?: number;
  } = {},
): Promise<ModularCharacter> {
  const character = await createModularCharacter(scene, raceId, {
    position: options.position ?? BABYLON.Vector3.Zero(),
    rotation: options.rotation,
    scale: options.scale,
  });

  // Auto-register any animations that came with the base model
  if (character.animationGroups.length > 0) {
    character.animationState.autoRegisterGroups(character.animationGroups);
  }

  // Try to play idle
  character.animationState.play('idle');

  return character;
}

/** Get the race prefab config for a given race ID */
export function getRacePrefab(raceId: RaceId): CharacterPrefabConfig | undefined {
  return RACE_CHARACTER_PREFABS.find((p) => p.id === `race-${raceId}`);
}
