import type { GameObject, Component, Transform } from '@shared/schema';

export interface CharacterPrefabConfig {
  id: string;
  name: string;
  description: string;
  modelPath: string;
  textures: {
    diffuse?: string;
    opacity?: string;
    normal?: string;
    specular?: string;
  };
  animations: string[];
  defaultAnimation?: string;
  scale: number;
  colliderType: 'capsule' | 'box' | 'sphere';
  colliderSize: { x: number; y: number; z: number };
  tags: string[];
  layer: number;
}

export const KNIGHT_PREFAB: CharacterPrefabConfig = {
  id: 'knight-character',
  name: 'Knight with Sword',
  description: 'A medieval knight character with sword, armor, and animations',
  modelPath: '/assets/characters/knight/KnightAndSword.FBX',
  textures: {
    diffuse: '/assets/characters/knight/KnightAndSword_Textures/Knight_diffuse.png',
    opacity: '/assets/characters/knight/KnightAndSword_Textures/Knight_opacity.png',
  },
  animations: ['Idle', 'Walk', 'Run', 'Attack', 'Death'],
  defaultAnimation: 'Idle',
  scale: 0.01,
  colliderType: 'capsule',
  colliderSize: { x: 0.5, y: 1.8, z: 0.5 },
  tags: ['character', 'humanoid', 'knight', 'player'],
  layer: 5,
};

export const CHARACTER_PREFABS: CharacterPrefabConfig[] = [
  KNIGHT_PREFAB,
];

export function createCharacterGameObject(config: CharacterPrefabConfig): GameObject {
  const id = crypto.randomUUID();
  
  return {
    id,
    name: config.name,
    visible: true,
    isStatic: false,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: config.scale, y: config.scale, z: config.scale },
    },
    components: [
      {
        id: crypto.randomUUID(),
        type: 'mesh',
        enabled: true,
        properties: {
          type: 'imported',
          modelPath: config.modelPath,
          textures: config.textures,
          castShadows: true,
          receiveShadows: true,
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'physics',
        enabled: true,
        properties: {
          colliderType: config.colliderType,
          colliderSize: config.colliderSize,
          mass: 70,
          isKinematic: false,
          useGravity: true,
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'script',
        enabled: true,
        properties: {
          scriptType: 'characterController',
          moveSpeed: 5,
          rotationSpeed: 120,
          jumpForce: 8,
          animations: config.animations,
          defaultAnimation: config.defaultAnimation,
        },
      },
    ],
    children: [],
    parentId: null,
    tags: config.tags,
    layer: config.layer,
    prefabId: config.id,
  };
}

export function getCharacterPrefabById(id: string): CharacterPrefabConfig | undefined {
  return CHARACTER_PREFABS.find(p => p.id === id);
}

export function getAllCharacterPrefabs(): CharacterPrefabConfig[] {
  return CHARACTER_PREFABS;
}
