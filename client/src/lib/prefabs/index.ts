export * from './character-prefab';
export * from './race-character-prefab';

import { CHARACTER_PREFABS, type CharacterPrefabConfig } from './character-prefab';
import { RACE_CHARACTER_PREFABS } from './race-character-prefab';

export interface PrefabCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  prefabs: CharacterPrefabConfig[];
}

export const PREFAB_CATEGORIES: PrefabCategory[] = [
  {
    id: 'characters',
    name: 'Characters',
    description: 'Humanoid and creature characters with animations',
    icon: 'user',
    prefabs: CHARACTER_PREFABS,
  },
  {
    id: 'race-characters',
    name: 'Race Characters (Modular)',
    description: '6 modular race characters with equipment slots and weapon-based animations',
    icon: 'users',
    prefabs: RACE_CHARACTER_PREFABS,
  },
];

export function getAllPrefabs(): CharacterPrefabConfig[] {
  return PREFAB_CATEGORIES.flatMap(cat => cat.prefabs);
}

export function getPrefabById(id: string): CharacterPrefabConfig | undefined {
  return getAllPrefabs().find(p => p.id === id);
}
