import type { GameObject } from '@shared/schema';

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
  controllerType?: 'warrior' | 'character';
}

export const WARRIOR_PREFAB: CharacterPrefabConfig = {
  id: 'prefab-warrior',
  name: 'Warrior Player',
  description: 'Orc Warrior with 52 Mixamo animations, full combat system, hotkeys 1-0',
  modelPath: '/assets/animations/racalvin-warrior/character-model.glb',
  textures: {},
  animations: [
    'idle', 'idle-combat', 'idle-look-around', 'idle-fidget',
    'walk-forward', 'walk-backward', 'run-forward', 'run-backward',
    'strafe-left', 'strafe-right', 'strafe-run-left', 'strafe-run-right',
    'jump', 'jump-land',
    'slash-1', 'slash-2', 'slash-3', 'slash-4', 'slash-5',
    'attack-heavy-1', 'attack-heavy-2', 'attack-heavy-3', 'attack-combo',
    'kick', 'block-start', 'block-idle', 'block-hit',
    'crouch-start', 'crouch-idle', 'crouch-walk', 'crouch-walk-left', 'crouch-walk-right',
    'crouch-block', 'crouch-block-idle', 'crouch-block-hit',
    'hit-react-1', 'hit-react-2', 'hit-react-3',
    'death-1', 'death-2',
    'turn-left', 'turn-right', 'turn-180', 'turn-180-right',
    'draw-sword-1', 'draw-sword-2', 'sheath-sword-1', 'sheath-sword-2',
    'casting-1', 'casting-2', 'power-up',
  ],
  defaultAnimation: 'idle',
  scale: 1,
  colliderType: 'capsule',
  colliderSize: { x: 0.5, y: 1.8, z: 0.5 },
  tags: ['character', 'humanoid', 'warrior', 'player', 'orc'],
  layer: 5,
  controllerType: 'warrior',
};

export const KNIGHT_PREFAB: CharacterPrefabConfig = {
  id: 'knight-character',
  name: 'Knight with Sword',
  description: 'A medieval knight character with sword, armor, and animations',
  modelPath: '/assets/characters/knight/KnightAndSword.glb',
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
  WARRIOR_PREFAB,
  KNIGHT_PREFAB,
];

export function createCharacterGameObject(config: CharacterPrefabConfig): GameObject {
  const id = crypto.randomUUID();
  const isWarrior = config.controllerType === 'warrior';

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
          scriptType: isWarrior ? 'warriorController' : 'characterController',
          moveSpeed: 5,
          rotationSpeed: 120,
          jumpForce: 8,
          animations: config.animations,
          defaultAnimation: config.defaultAnimation,
          ...(isWarrior ? { animationCount: config.animations.length, controllerType: 'warrior' } : {}),
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
