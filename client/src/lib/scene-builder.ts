import * as BABYLON from '@babylonjs/core';
import { CharacterController, findPlayerCharacter } from './character-controller';
import { WarriorPlayerController } from './warrior-controller';
import { WarBearBehavior } from './warbear-behavior';
import { DragonBehavior } from './dragon-behavior';
import { createGrassEnvironment } from './grass-environment';

export interface SceneConfig {
  id: string;
  name: string;
  description: string;
  environment: 'forest' | 'desert' | 'dungeon' | 'sky' | 'custom';
  player: PlayerConfig;
  npcs: NPCConfig[];
  props: PropConfig[];
  lighting: LightingConfig;
}

export interface PlayerConfig {
  modelPath: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  walkSpeed: number;
  runSpeed: number;
  jumpForce: number;
  controllerType?: 'standard' | 'warrior';
}

export interface NPCConfig {
  id: string;
  name: string;
  type: 'warbear' | 'dragon' | 'patrol' | 'static';
  modelPath: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
  behaviorOptions?: {
    detectionRange?: number;
    attackRange?: number;
    patrolRadius?: number;
    moveSpeed?: number;
    flyHeight?: number;
  };
}

export interface PropConfig {
  id: string;
  name: string;
  modelPath?: string;
  primitiveType?: 'box' | 'sphere' | 'cylinder';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  material?: {
    color?: string;
    metallic?: number;
    roughness?: number;
  };
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export interface LightingConfig {
  ambientIntensity: number;
  ambientColor: string;
  sunIntensity: number;
  sunColor: string;
  sunDirection: { x: number; y: number; z: number };
  enableShadows: boolean;
  shadowQuality: 'low' | 'medium' | 'high';
}

export const PRESET_SCENES: SceneConfig[] = [
  {
    id: 'forest-adventure',
    name: 'Forest Adventure',
    description: 'An open forest clearing with a player character, companion War Bear, and circling Dragon',
    environment: 'forest',
    player: {
      modelPath: '/assets/characters/lizard/scene.gltf',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 4,
      runSpeed: 8,
      jumpForce: 8
    },
    npcs: [
      {
        id: 'warbear-companion',
        name: 'War Bear',
        type: 'warbear',
        modelPath: '/assets/characters/warbear/scene.gltf',
        position: { x: 8, y: 0, z: 5 },
        rotation: { x: 0, y: -45, z: 0 },
        scale: 1.2,
        behaviorOptions: {
          detectionRange: 25,
          attackRange: 3,
          patrolRadius: 12,
          moveSpeed: 4
        }
      },
      {
        id: 'dragon-guardian',
        name: 'Sky Dragon',
        type: 'dragon',
        modelPath: '/assets/characters/dragon/scene.gltf',
        position: { x: 0, y: 15, z: 30 },
        rotation: { x: 0, y: 180, z: 0 },
        scale: 0.4,
        behaviorOptions: {
          detectionRange: 50,
          flyHeight: 12,
          patrolRadius: 30,
          moveSpeed: 10
        }
      }
    ],
    props: [
      {
        id: 'tree1',
        name: 'Oak Tree',
        modelPath: '/assets/environments/trees/scene.gltf',
        position: { x: -15, y: 0, z: 10 },
        rotation: { x: 0, y: 45, z: 0 },
        scale: { x: 1.5, y: 1.5, z: 1.5 },
        castShadow: true,
        receiveShadow: false
      },
      {
        id: 'tree2',
        name: 'Pine Tree',
        modelPath: '/assets/environments/trees/scene.gltf',
        position: { x: 20, y: 0, z: -8 },
        rotation: { x: 0, y: 120, z: 0 },
        scale: { x: 1.2, y: 1.4, z: 1.2 },
        castShadow: true,
        receiveShadow: false
      },
      {
        id: 'rock1',
        name: 'Boulder',
        primitiveType: 'sphere',
        position: { x: -8, y: 0.5, z: -12 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 2, y: 1.5, z: 2 },
        material: { color: '#666666', roughness: 0.9, metallic: 0 },
        castShadow: true,
        receiveShadow: true
      },
      {
        id: 'rock2',
        name: 'Stone',
        primitiveType: 'sphere',
        position: { x: 12, y: 0.3, z: 15 },
        rotation: { x: 15, y: 30, z: 0 },
        scale: { x: 1, y: 0.8, z: 1.2 },
        material: { color: '#7a7a7a', roughness: 0.85, metallic: 0 },
        castShadow: true,
        receiveShadow: true
      }
    ],
    lighting: {
      ambientIntensity: 0.4,
      ambientColor: '#87ceeb',
      sunIntensity: 1.2,
      sunColor: '#fff5e0',
      sunDirection: { x: -1, y: -2, z: 1 },
      enableShadows: true,
      shadowQuality: 'high'
    }
  },
  {
    id: 'combat-arena',
    name: 'Combat Arena',
    description: 'A gladiator-style arena with two knights facing off',
    environment: 'desert',
    player: {
      modelPath: '/assets/characters/knight/scene.gltf',
      position: { x: -5, y: 0, z: 0 },
      rotation: { x: 0, y: 90, z: 0 },
      scale: 1,
      walkSpeed: 3,
      runSpeed: 6,
      jumpForce: 6
    },
    npcs: [
      {
        id: 'enemy-knight',
        name: 'Dark Knight',
        type: 'patrol',
        modelPath: '/assets/characters/knight/KnightAndSword.glb',
        position: { x: 5, y: 0, z: 0 },
        rotation: { x: 0, y: -90, z: 0 },
        scale: 1,
        behaviorOptions: {
          detectionRange: 15,
          attackRange: 2,
          patrolRadius: 8,
          moveSpeed: 3
        }
      }
    ],
    props: [
      {
        id: 'pillar1',
        name: 'Stone Pillar',
        primitiveType: 'cylinder',
        position: { x: -12, y: 2, z: -12 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1.5, y: 4, z: 1.5 },
        material: { color: '#a0a0a0', roughness: 0.8, metallic: 0.1 },
        castShadow: true,
        receiveShadow: true
      },
      {
        id: 'pillar2',
        name: 'Stone Pillar',
        primitiveType: 'cylinder',
        position: { x: 12, y: 2, z: -12 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1.5, y: 4, z: 1.5 },
        material: { color: '#a0a0a0', roughness: 0.8, metallic: 0.1 },
        castShadow: true,
        receiveShadow: true
      },
      {
        id: 'pillar3',
        name: 'Stone Pillar',
        primitiveType: 'cylinder',
        position: { x: -12, y: 2, z: 12 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1.5, y: 4, z: 1.5 },
        material: { color: '#a0a0a0', roughness: 0.8, metallic: 0.1 },
        castShadow: true,
        receiveShadow: true
      },
      {
        id: 'pillar4',
        name: 'Stone Pillar',
        primitiveType: 'cylinder',
        position: { x: 12, y: 2, z: 12 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1.5, y: 4, z: 1.5 },
        material: { color: '#a0a0a0', roughness: 0.8, metallic: 0.1 },
        castShadow: true,
        receiveShadow: true
      }
    ],
    lighting: {
      ambientIntensity: 0.3,
      ambientColor: '#e8d5b0',
      sunIntensity: 1.5,
      sunColor: '#ffedd0',
      sunDirection: { x: 0, y: -1.5, z: 0.5 },
      enableShadows: true,
      shadowQuality: 'high'
    }
  },
  {
    id: 'warrior-battle',
    name: 'Warrior Battle',
    description: 'Orc Warrior with 52 combat animations vs War Bear and Dragon in a forest arena',
    environment: 'forest',
    player: {
      modelPath: '/assets/animations/racalvin-warrior/character-model.glb',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 3.5,
      runSpeed: 6,
      jumpForce: 8,
      controllerType: 'warrior',
    },
    npcs: [
      {
        id: 'warbear-enemy',
        name: 'War Bear',
        type: 'warbear',
        modelPath: '/assets/characters/warbear/scene.gltf',
        position: { x: 15, y: 0, z: 10 },
        rotation: { x: 0, y: -120, z: 0 },
        scale: 1.2,
        behaviorOptions: {
          detectionRange: 20,
          attackRange: 3,
          patrolRadius: 10,
          moveSpeed: 4
        }
      },
      {
        id: 'dragon-boss',
        name: 'Fire Dragon',
        type: 'dragon',
        modelPath: '/assets/characters/dragon/scene.gltf',
        position: { x: 0, y: 20, z: 40 },
        rotation: { x: 0, y: 180, z: 0 },
        scale: 0.5,
        behaviorOptions: {
          detectionRange: 60,
          flyHeight: 15,
          patrolRadius: 25,
          moveSpeed: 12
        }
      }
    ],
    props: [
      {
        id: 'tree1',
        name: 'Forest Tree',
        modelPath: '/assets/environments/trees/scene.gltf',
        position: { x: -20, y: 0, z: 15 },
        rotation: { x: 0, y: 30, z: 0 },
        scale: { x: 1.5, y: 1.5, z: 1.5 },
        castShadow: true,
        receiveShadow: false
      },
      {
        id: 'tree2',
        name: 'Forest Tree',
        modelPath: '/assets/environments/trees/scene.gltf',
        position: { x: 25, y: 0, z: -10 },
        rotation: { x: 0, y: 150, z: 0 },
        scale: { x: 1.3, y: 1.6, z: 1.3 },
        castShadow: true,
        receiveShadow: false
      },
      {
        id: 'rock1',
        name: 'Arena Stone',
        primitiveType: 'sphere',
        position: { x: -10, y: 0.5, z: -15 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 3, y: 1.5, z: 3 },
        material: { color: '#555555', roughness: 0.9, metallic: 0 },
        castShadow: true,
        receiveShadow: true
      }
    ],
    lighting: {
      ambientIntensity: 0.35,
      ambientColor: '#8ab4cc',
      sunIntensity: 1.3,
      sunColor: '#ffeedd',
      sunDirection: { x: -1, y: -2, z: 1 },
      enableShadows: true,
      shadowQuality: 'high'
    }
  },
  {
    id: 'dragons-lair',
    name: "Dragon's Lair",
    description: 'A mountainous area with multiple dragons circling overhead',
    environment: 'sky',
    player: {
      modelPath: '/assets/characters/lizard/scene.gltf',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 4,
      runSpeed: 8,
      jumpForce: 10
    },
    npcs: [
      {
        id: 'dragon1',
        name: 'Fire Dragon',
        type: 'dragon',
        modelPath: '/assets/characters/dragon/scene.gltf',
        position: { x: -20, y: 20, z: 20 },
        rotation: { x: 0, y: 45, z: 0 },
        scale: 0.5,
        behaviorOptions: {
          flyHeight: 18,
          patrolRadius: 25,
          moveSpeed: 12,
          detectionRange: 60
        }
      },
      {
        id: 'dragon2',
        name: 'Ice Dragon',
        type: 'dragon',
        modelPath: '/assets/characters/dragon/scene.gltf',
        position: { x: 25, y: 25, z: -15 },
        rotation: { x: 0, y: -120, z: 0 },
        scale: 0.4,
        behaviorOptions: {
          flyHeight: 22,
          patrolRadius: 20,
          moveSpeed: 8,
          detectionRange: 45
        }
      }
    ],
    props: [
      {
        id: 'mountain1',
        name: 'Mountain Peak',
        primitiveType: 'cylinder',
        position: { x: -30, y: 5, z: 30 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 8, y: 10, z: 8 },
        material: { color: '#5a5a6a', roughness: 0.95, metallic: 0 },
        castShadow: true,
        receiveShadow: true
      },
      {
        id: 'mountain2',
        name: 'Mountain Peak',
        primitiveType: 'cylinder',
        position: { x: 35, y: 4, z: -25 },
        rotation: { x: 5, y: 0, z: 3 },
        scale: { x: 6, y: 8, z: 6 },
        material: { color: '#6a6a7a', roughness: 0.9, metallic: 0 },
        castShadow: true,
        receiveShadow: true
      }
    ],
    lighting: {
      ambientIntensity: 0.5,
      ambientColor: '#c0d8ff',
      sunIntensity: 0.8,
      sunColor: '#ffd0a0',
      sunDirection: { x: 1, y: -1, z: 0 },
      enableShadows: true,
      shadowQuality: 'medium'
    }
  },

  // ─── DEMO SCENES ──────────────────────────────────────────────────────────

  {
    id: 'demo-mmo',
    name: '🏰 MMO Village Demo',
    description: 'A living medieval village with player, NPC guards, merchants, and atmospheric lighting — ideal for MMO prototyping',
    environment: 'forest',
    player: {
      modelPath: '/assets/characters/kaykit/Barbarian.glb',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 4,
      runSpeed: 8,
      jumpForce: 7
    },
    npcs: [
      {
        id: 'guard-1',
        name: 'Village Guard',
        type: 'patrol',
        modelPath: '/assets/characters/kaykit/Knight.glb',
        position: { x: 12, y: 0, z: 5 },
        rotation: { x: 0, y: -90, z: 0 },
        scale: 1,
        behaviorOptions: { patrolRadius: 8, moveSpeed: 2.5, detectionRange: 20, attackRange: 2 }
      },
      {
        id: 'guard-2',
        name: 'Gate Guard',
        type: 'static',
        modelPath: '/assets/characters/kaykit/Knight.glb',
        position: { x: -12, y: 0, z: 8 },
        rotation: { x: 0, y: 90, z: 0 },
        scale: 1,
        behaviorOptions: { patrolRadius: 4, moveSpeed: 1.5, detectionRange: 15, attackRange: 2 }
      },
      {
        id: 'merchant',
        name: 'Traveling Merchant',
        type: 'static',
        modelPath: '/assets/characters/kaykit/Rogue.glb',
        position: { x: 6, y: 0, z: -10 },
        rotation: { x: 0, y: 135, z: 0 },
        scale: 1,
        behaviorOptions: { patrolRadius: 3, moveSpeed: 1, detectionRange: 10, attackRange: 1 }
      }
    ],
    props: [
      { id: 'mmo-barrel-1', name: 'Market Barrel', modelPath: '/assets/structures/medieval/detail-barrel.glb', position: { x: 8, y: 0, z: -8 }, rotation: { x: 0, y: 45, z: 0 }, scale: { x: 1, y: 1, z: 1 }, castShadow: true, receiveShadow: true },
      { id: 'mmo-barrel-2', name: 'Market Barrel', modelPath: '/assets/structures/medieval/detail-barrel.glb', position: { x: 10, y: 0, z: -8 }, rotation: { x: 0, y: -20, z: 0 }, scale: { x: 1, y: 1, z: 1 }, castShadow: true, receiveShadow: true },
      { id: 'mmo-crate-1', name: 'Supply Crate', modelPath: '/assets/structures/medieval/detail-crate.glb', position: { x: 9, y: 0, z: -11 }, rotation: { x: 0, y: 15, z: 0 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, castShadow: true, receiveShadow: true },
      { id: 'mmo-column-1', name: 'Stone Column', modelPath: '/assets/structures/medieval/column.glb', position: { x: -14, y: 0, z: -5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, castShadow: true, receiveShadow: true },
      { id: 'mmo-column-2', name: 'Stone Column', modelPath: '/assets/structures/medieval/column.glb', position: { x: -14, y: 0, z: 5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, castShadow: true, receiveShadow: true },
      { id: 'mmo-fence-1', name: 'Wooden Fence', modelPath: '/assets/structures/medieval/fence-wood.glb', position: { x: -5, y: 0, z: 15 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, castShadow: true, receiveShadow: true },
      { id: 'mmo-fence-2', name: 'Wooden Fence', modelPath: '/assets/structures/medieval/fence-wood.glb', position: { x: 0, y: 0, z: 15 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, castShadow: true, receiveShadow: true },
      { id: 'mmo-tree-1', name: 'Village Tree', modelPath: '/assets/environments/trees/scene.gltf', position: { x: -20, y: 0, z: -10 }, rotation: { x: 0, y: 30, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, castShadow: true, receiveShadow: false },
      { id: 'mmo-tree-2', name: 'Village Tree', modelPath: '/assets/environments/trees/scene.gltf', position: { x: 18, y: 0, z: 12 }, rotation: { x: 0, y: 90, z: 0 }, scale: { x: 1.3, y: 1.4, z: 1.3 }, castShadow: true, receiveShadow: false },
      { id: 'mmo-platform', name: 'Market Platform', primitiveType: 'box', position: { x: 6, y: -0.1, z: -9 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 6, y: 0.2, z: 6 }, material: { color: '#8B7355', roughness: 0.9, metallic: 0 }, castShadow: false, receiveShadow: true }
    ],
    lighting: {
      ambientIntensity: 0.45,
      ambientColor: '#b0d4f1',
      sunIntensity: 1.3,
      sunColor: '#fff5d0',
      sunDirection: { x: -0.8, y: -2, z: 0.6 },
      enableShadows: true,
      shadowQuality: 'high'
    }
  },

  {
    id: 'demo-fps',
    name: '🔫 FPS Dungeon Demo',
    description: 'A dark dungeon maze with corridor modules, skeleton and monster enemies — built for FPS and action game prototyping',
    environment: 'dungeon',
    player: {
      modelPath: '/assets/characters/kaykit/Rogue.glb',
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 5,
      runSpeed: 9,
      jumpForce: 7
    },
    npcs: [
      {
        id: 'skeleton-guard-1',
        name: 'Skeleton Warrior',
        type: 'patrol',
        modelPath: '/assets/monsters/quaternius/Skeleton.glb',
        position: { x: 15, y: 0.5, z: 0 },
        rotation: { x: 0, y: 180, z: 0 },
        scale: 1,
        behaviorOptions: { detectionRange: 18, attackRange: 2, patrolRadius: 8, moveSpeed: 3 }
      },
      {
        id: 'skeleton-guard-2',
        name: 'Skeleton Archer',
        type: 'patrol',
        modelPath: '/assets/monsters/quaternius/Skeleton.glb',
        position: { x: 0, y: 0.5, z: 18 },
        rotation: { x: 0, y: -90, z: 0 },
        scale: 1,
        behaviorOptions: { detectionRange: 22, attackRange: 4, patrolRadius: 6, moveSpeed: 2.5 }
      },
      {
        id: 'slime-1',
        name: 'Cave Slime',
        type: 'patrol',
        modelPath: '/assets/monsters/quaternius/Slime.glb',
        position: { x: -12, y: 0.5, z: 12 },
        rotation: { x: 0, y: 45, z: 0 },
        scale: 1.2,
        behaviorOptions: { detectionRange: 12, attackRange: 1.5, patrolRadius: 5, moveSpeed: 2 }
      },
      {
        id: 'bat-1',
        name: 'Cave Bat',
        type: 'dragon',
        modelPath: '/assets/monsters/quaternius/Bat.glb',
        position: { x: 8, y: 6, z: -12 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 0.8,
        behaviorOptions: { flyHeight: 5, patrolRadius: 10, moveSpeed: 6, detectionRange: 20 }
      }
    ],
    props: [
      { id: 'fps-corridor-1', name: 'Main Corridor', modelPath: '/assets/structures/dungeon/corridor.glb', position: { x: 6, y: 0, z: 0 }, rotation: { x: 0, y: 90, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'fps-corridor-2', name: 'Side Corridor', modelPath: '/assets/structures/dungeon/corridor.glb', position: { x: 0, y: 0, z: 6 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'fps-room-1', name: 'Guard Room', modelPath: '/assets/structures/dungeon/room-large.glb', position: { x: 12, y: 0, z: 12 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'fps-gate', name: 'Dungeon Gate', modelPath: '/assets/structures/dungeon/gate.glb', position: { x: -6, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'fps-firstaid', name: 'First Aid Kit', modelPath: '/assets/props/survival/First_Aid_Kit.glb', position: { x: 3, y: 0.5, z: -5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.5, y: 0.5, z: 0.5 }, castShadow: true, receiveShadow: true },
      { id: 'fps-arrow', name: 'Arrows', modelPath: '/assets/weapons/kaykit/arrow.gltf', position: { x: -3, y: 0.2, z: 4 }, rotation: { x: 0, y: 45, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, castShadow: true, receiveShadow: true },
      { id: 'fps-wall-1', name: 'Stone Wall', primitiveType: 'box', position: { x: 0, y: 1.5, z: -8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 12, y: 3, z: 0.5 }, material: { color: '#3a3a4a', roughness: 0.95, metallic: 0 }, castShadow: true, receiveShadow: true },
      { id: 'fps-wall-2', name: 'Stone Wall', primitiveType: 'box', position: { x: 0, y: 1.5, z: 25 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 12, y: 3, z: 0.5 }, material: { color: '#3a3a4a', roughness: 0.95, metallic: 0 }, castShadow: true, receiveShadow: true },
      { id: 'fps-pillar-1', name: 'Dungeon Pillar', primitiveType: 'cylinder', position: { x: -10, y: 1.5, z: 10 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.8, y: 3, z: 0.8 }, material: { color: '#2a2a3a', roughness: 1, metallic: 0 }, castShadow: true, receiveShadow: true },
      { id: 'fps-pillar-2', name: 'Dungeon Pillar', primitiveType: 'cylinder', position: { x: 10, y: 1.5, z: 10 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.8, y: 3, z: 0.8 }, material: { color: '#2a2a3a', roughness: 1, metallic: 0 }, castShadow: true, receiveShadow: true }
    ],
    lighting: {
      ambientIntensity: 0.15,
      ambientColor: '#4040a0',
      sunIntensity: 0.4,
      sunColor: '#ff8844',
      sunDirection: { x: 0, y: -1, z: 0 },
      enableShadows: true,
      shadowQuality: 'medium'
    }
  },

  {
    id: 'demo-survival',
    name: '🪓 Survival Camp Demo',
    description: 'A wilderness survival scene with campfire, tools, resources, and hostile wildlife — built for survival game prototyping',
    environment: 'forest',
    player: {
      modelPath: '/assets/characters/kaykit/Barbarian.glb',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 3.5,
      runSpeed: 7,
      jumpForce: 7
    },
    npcs: [
      {
        id: 'hostile-bear',
        name: 'Wild Bear',
        type: 'warbear',
        modelPath: '/assets/characters/warbear/scene.gltf',
        position: { x: -20, y: 0, z: -15 },
        rotation: { x: 0, y: 60, z: 0 },
        scale: 1.1,
        behaviorOptions: { detectionRange: 22, attackRange: 3, patrolRadius: 14, moveSpeed: 4.5 }
      },
      {
        id: 'patrol-bear',
        name: 'Roaming Bear',
        type: 'warbear',
        modelPath: '/assets/characters/warbear/scene.gltf',
        position: { x: 25, y: 0, z: 20 },
        rotation: { x: 0, y: -120, z: 0 },
        scale: 1,
        behaviorOptions: { detectionRange: 18, attackRange: 3, patrolRadius: 18, moveSpeed: 3.5 }
      }
    ],
    props: [
      { id: 'surv-fire', name: 'Campfire', modelPath: '/assets/props/survival/Fire.glb', position: { x: 0, y: 0, z: 3 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, castShadow: false, receiveShadow: true },
      { id: 'surv-axe', name: 'Wood Axe', modelPath: '/assets/props/survival/Axe.glb', position: { x: 2, y: 0.1, z: 1 }, rotation: { x: 0, y: 30, z: 0 }, scale: { x: 0.6, y: 0.6, z: 0.6 }, castShadow: true, receiveShadow: true },
      { id: 'surv-trap', name: 'Bear Trap', modelPath: '/assets/props/survival/Bear_Trap.glb', position: { x: -5, y: 0, z: 8 }, rotation: { x: 0, y: 45, z: 0 }, scale: { x: 0.7, y: 0.7, z: 0.7 }, castShadow: true, receiveShadow: true },
      { id: 'surv-firstaid', name: 'First Aid Kit', modelPath: '/assets/props/survival/First_Aid_Kit.glb', position: { x: 1.5, y: 0.1, z: -1 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.6, y: 0.6, z: 0.6 }, castShadow: true, receiveShadow: true },
      { id: 'surv-basket', name: 'Storage Basket', modelPath: '/assets/props/survival/Basket.glb', position: { x: -1.5, y: 0, z: 2 }, rotation: { x: 0, y: -20, z: 0 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, castShadow: true, receiveShadow: true },
      { id: 'surv-blankets', name: 'Bedroll', modelPath: '/assets/props/survival/Blankets.glb', position: { x: -2, y: 0, z: -2 }, rotation: { x: 0, y: 10, z: 0 }, scale: { x: 0.7, y: 0.7, z: 0.7 }, castShadow: true, receiveShadow: true },
      { id: 'surv-compass', name: 'Compass', modelPath: '/assets/props/survival/Compass.glb', position: { x: -3, y: 0.3, z: -3 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.5, y: 0.5, z: 0.5 }, castShadow: true, receiveShadow: true },
      { id: 'surv-tree-1', name: 'Tall Pine', modelPath: '/assets/environments/trees/scene.gltf', position: { x: 8, y: 0, z: -12 }, rotation: { x: 0, y: 20, z: 0 }, scale: { x: 1.6, y: 1.8, z: 1.6 }, castShadow: true, receiveShadow: false },
      { id: 'surv-tree-2', name: 'Dense Oak', modelPath: '/assets/environments/trees/scene.gltf', position: { x: -12, y: 0, z: 5 }, rotation: { x: 0, y: 80, z: 0 }, scale: { x: 1.4, y: 1.5, z: 1.4 }, castShadow: true, receiveShadow: false },
      { id: 'surv-tree-3', name: 'Forest Tree', modelPath: '/assets/environments/trees/scene.gltf', position: { x: -8, y: 0, z: 18 }, rotation: { x: 0, y: 140, z: 0 }, scale: { x: 1.5, y: 1.6, z: 1.5 }, castShadow: true, receiveShadow: false },
      { id: 'surv-rock', name: 'River Rock', primitiveType: 'sphere', position: { x: 6, y: 0.3, z: 10 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1, z: 1.8 }, material: { color: '#6b6b6b', roughness: 0.9, metallic: 0 }, castShadow: true, receiveShadow: true },
      { id: 'surv-rock-2', name: 'Small Stone', primitiveType: 'sphere', position: { x: 7, y: 0.2, z: 11 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.8, y: 0.6, z: 0.9 }, material: { color: '#797979', roughness: 0.85, metallic: 0 }, castShadow: true, receiveShadow: true }
    ],
    lighting: {
      ambientIntensity: 0.3,
      ambientColor: '#7aab7a',
      sunIntensity: 1.0,
      sunColor: '#ffedd0',
      sunDirection: { x: -1, y: -1.8, z: 0.8 },
      enableShadows: true,
      shadowQuality: 'high'
    }
  },

  {
    id: 'demo-rts',
    name: '⚔️ RTS Battlefield Demo',
    description: 'An open medieval battlefield with castle walls, multiple troop squads, and siege props — built for RTS strategy game prototyping',
    environment: 'desert',
    player: {
      modelPath: '/assets/characters/kaykit/Knight.glb',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 4,
      runSpeed: 8,
      jumpForce: 6
    },
    npcs: [
      {
        id: 'rts-ally-1',
        name: 'Allied Knight',
        type: 'patrol',
        modelPath: '/assets/characters/kaykit/Knight.glb',
        position: { x: 8, y: 0, z: 4 },
        rotation: { x: 0, y: 180, z: 0 },
        scale: 1,
        behaviorOptions: { detectionRange: 25, attackRange: 2, patrolRadius: 6, moveSpeed: 3 }
      },
      {
        id: 'rts-ally-2',
        name: 'Allied Barbarian',
        type: 'patrol',
        modelPath: '/assets/characters/kaykit/Barbarian.glb',
        position: { x: -8, y: 0, z: 4 },
        rotation: { x: 0, y: 180, z: 0 },
        scale: 1,
        behaviorOptions: { detectionRange: 20, attackRange: 2.5, patrolRadius: 8, moveSpeed: 3.5 }
      },
      {
        id: 'rts-enemy-1',
        name: 'Enemy Knight',
        type: 'patrol',
        modelPath: '/assets/characters/knight/KnightAndSword.glb',
        position: { x: 8, y: 0, z: -20 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        behaviorOptions: { detectionRange: 20, attackRange: 2, patrolRadius: 10, moveSpeed: 3 }
      },
      {
        id: 'rts-enemy-2',
        name: 'Enemy Mage',
        type: 'patrol',
        modelPath: '/assets/characters/kaykit/Mage.glb',
        position: { x: -5, y: 0, z: -22 },
        rotation: { x: 0, y: 30, z: 0 },
        scale: 1,
        behaviorOptions: { detectionRange: 30, attackRange: 6, patrolRadius: 5, moveSpeed: 2 }
      }
    ],
    props: [
      { id: 'rts-battlement-1', name: 'Castle Battlement', modelPath: '/assets/structures/medieval/battlement.glb', position: { x: -10, y: 0, z: -28 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'rts-battlement-2', name: 'Castle Battlement', modelPath: '/assets/structures/medieval/battlement.glb', position: { x: -6, y: 0, z: -28 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'rts-battlement-3', name: 'Castle Battlement', modelPath: '/assets/structures/medieval/battlement.glb', position: { x: -2, y: 0, z: -28 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'rts-battlement-4', name: 'Castle Battlement', modelPath: '/assets/structures/medieval/battlement.glb', position: { x: 2, y: 0, z: -28 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'rts-battlement-5', name: 'Castle Battlement', modelPath: '/assets/structures/medieval/battlement.glb', position: { x: 6, y: 0, z: -28 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'rts-corner-l', name: 'Corner Battlement L', modelPath: '/assets/structures/medieval/battlement-corner-inner.glb', position: { x: -14, y: 0, z: -28 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'rts-corner-r', name: 'Corner Battlement R', modelPath: '/assets/structures/medieval/battlement-corner-outer.glb', position: { x: 10, y: 0, z: -28 }, rotation: { x: 0, y: 90, z: 0 }, scale: { x: 2, y: 2, z: 2 }, castShadow: true, receiveShadow: true },
      { id: 'rts-column-1', name: 'Guard Tower', modelPath: '/assets/structures/medieval/column.glb', position: { x: -14, y: 0, z: -28 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 4, z: 1.5 }, castShadow: true, receiveShadow: true },
      { id: 'rts-barrel-1', name: 'Supply Barrel', modelPath: '/assets/structures/medieval/detail-barrel.glb', position: { x: 4, y: 0, z: 10 }, rotation: { x: 0, y: 30, z: 0 }, scale: { x: 1, y: 1, z: 1 }, castShadow: true, receiveShadow: true },
      { id: 'rts-barrel-2', name: 'Supply Barrel', modelPath: '/assets/structures/medieval/detail-barrel.glb', position: { x: 6, y: 0, z: 10 }, rotation: { x: 0, y: -20, z: 0 }, scale: { x: 1, y: 1, z: 1 }, castShadow: true, receiveShadow: true },
      { id: 'rts-crate-1', name: 'Ammo Crate', modelPath: '/assets/structures/medieval/detail-crate.glb', position: { x: 5, y: 0, z: 12 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, castShadow: true, receiveShadow: true },
      { id: 'rts-divider', name: 'Battlefield Line', primitiveType: 'box', position: { x: 0, y: 0.05, z: -12 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 40, y: 0.1, z: 0.3 }, material: { color: '#cc2222', roughness: 1, metallic: 0 }, castShadow: false, receiveShadow: false },
      { id: 'rts-spawn-marker', name: 'Allied Spawn', primitiveType: 'cylinder', position: { x: 0, y: 0.1, z: 8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 3, y: 0.1, z: 3 }, material: { color: '#2244cc', roughness: 1, metallic: 0 }, castShadow: false, receiveShadow: false }
    ],
    lighting: {
      ambientIntensity: 0.35,
      ambientColor: '#e8d8b0',
      sunIntensity: 1.6,
      sunColor: '#ffeecc',
      sunDirection: { x: 0.5, y: -1.5, z: -0.5 },
      enableShadows: true,
      shadowQuality: 'high'
    }
  }
];

export class PlayableScene {
  private scene: BABYLON.Scene;
  private canvas: HTMLCanvasElement;
  private config: SceneConfig;
  
  private playerController: CharacterController | null = null;
  private npcBehaviors: Map<string, WarBearBehavior | DragonBehavior> = new Map();
  private loadedMeshes: Map<string, BABYLON.AbstractMesh> = new Map();
  private animationGroups: Map<string, BABYLON.AnimationGroup[]> = new Map();
  private shadowGenerator: BABYLON.ShadowGenerator | null = null;
  
  private isActive: boolean = false;
  private onLogCallback: ((type: string, message: string) => void) | null = null;

  constructor(scene: BABYLON.Scene, canvas: HTMLCanvasElement, config: SceneConfig) {
    this.scene = scene;
    this.canvas = canvas;
    this.config = config;
  }

  setLogCallback(callback: (type: string, message: string) => void): void {
    this.onLogCallback = callback;
  }

  private log(type: 'info' | 'warning' | 'error', message: string): void {
    console.log(`[PlayableScene] ${message}`);
    if (this.onLogCallback) {
      this.onLogCallback(type, message);
    }
  }

  async build(): Promise<void> {
    this.log('info', `Building scene: ${this.config.name}`);
    
    await this.setupEnvironment();
    await this.loadPlayer();
    await this.loadNPCs();
    await this.loadProps();
    this.setupLighting();
    
    this.log('info', `Scene "${this.config.name}" built successfully`);
  }

  private async setupEnvironment(): Promise<void> {
    if (this.config.environment === 'forest' || this.config.environment === 'custom') {
      createGrassEnvironment({ scene: this.scene, groundSize: 100 });
      this.log('info', 'Created forest environment with grass and sky');
    } else if (this.config.environment === 'desert') {
      this.createDesertEnvironment();
      this.log('info', 'Created desert environment');
    } else if (this.config.environment === 'sky') {
      this.createSkyEnvironment();
      this.log('info', 'Created sky environment');
    }
  }

  private createDesertEnvironment(): void {
    const ground = BABYLON.MeshBuilder.CreateGround('desertGround', {
      width: 80,
      height: 80,
      subdivisions: 16
    }, this.scene);
    
    const sandMaterial = new BABYLON.StandardMaterial('sandMaterial', this.scene);
    sandMaterial.diffuseColor = new BABYLON.Color3(0.85, 0.75, 0.55);
    sandMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = sandMaterial;
    ground.receiveShadows = true;
    
    const skybox = BABYLON.MeshBuilder.CreateBox('skyBox', { size: 500 }, this.scene);
    const skyMaterial = new BABYLON.StandardMaterial('skyMaterial', this.scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.85, 0.7);
    skyMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.35, 0.3);
    skybox.material = skyMaterial;
  }

  private createSkyEnvironment(): void {
    const ground = BABYLON.MeshBuilder.CreateGround('skyGround', {
      width: 120,
      height: 120,
      subdivisions: 32
    }, this.scene);
    
    const rockMaterial = new BABYLON.StandardMaterial('rockMaterial', this.scene);
    rockMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.45);
    rockMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    ground.material = rockMaterial;
    ground.receiveShadows = true;
    
    const skybox = BABYLON.MeshBuilder.CreateBox('skyBox', { size: 600 }, this.scene);
    const skyMaterial = new BABYLON.StandardMaterial('skyMaterial', this.scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.75, 0.95);
    skyMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.4, 0.6);
    skybox.material = skyMaterial;
  }

  private async loadPlayer(): Promise<void> {
    const playerConfig = this.config.player;
    
    try {
      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        '',
        '',
        playerConfig.modelPath,
        this.scene
      );
      
      const rootMesh = result.meshes[0];
      rootMesh.name = 'Player';
      rootMesh.id = 'player-mesh';
      
      rootMesh.position = new BABYLON.Vector3(
        playerConfig.position.x,
        playerConfig.position.y,
        playerConfig.position.z
      );
      
      rootMesh.rotation = new BABYLON.Vector3(
        BABYLON.Tools.ToRadians(playerConfig.rotation.x),
        BABYLON.Tools.ToRadians(playerConfig.rotation.y),
        BABYLON.Tools.ToRadians(playerConfig.rotation.z)
      );
      
      rootMesh.scaling = new BABYLON.Vector3(
        playerConfig.scale,
        playerConfig.scale,
        playerConfig.scale
      );
      
      result.meshes.forEach(mesh => {
        mesh.isPickable = true;
        if (this.shadowGenerator) {
          this.shadowGenerator.addShadowCaster(mesh);
        }
      });
      
      this.loadedMeshes.set('player', rootMesh);
      this.animationGroups.set('player', result.animationGroups);
      
      const isWarrior = playerConfig.controllerType === 'warrior' || playerConfig.modelPath.includes('racalvin-warrior');
      
      if (isWarrior) {
        const warriorCtrl = new WarriorPlayerController({
          scene: this.scene,
          canvas: this.canvas,
          characterMesh: rootMesh,
          walkSpeed: playerConfig.walkSpeed || 3.5,
          runSpeed: playerConfig.runSpeed || 6,
          sprintSpeed: 10,
          jumpForce: playerConfig.jumpForce || 8,
          gravity: 20,
          cameraDistance: 7,
          cameraHeight: 2.5,
        });
        if (result.animationGroups.length > 0) {
          warriorCtrl.setAnimationGroups(result.animationGroups);
        }
        try { await warriorCtrl.loadAnimations(); } catch(e) { /* animations load best-effort */ }
        this.playerController = warriorCtrl as any;
      } else {
        this.playerController = new CharacterController({
          scene: this.scene,
          canvas: this.canvas,
          characterMesh: rootMesh,
          animationGroups: result.animationGroups,
          walkSpeed: playerConfig.walkSpeed,
          runSpeed: playerConfig.runSpeed,
          jumpForce: playerConfig.jumpForce,
          gravity: 20,
          cameraDistance: 8,
          cameraHeight: 3
        });
      }
      
      this.log('info', `Player loaded: ${playerConfig.modelPath} (${isWarrior ? 'Warrior' : 'Standard'}) with ${result.animationGroups.length} animations`);
    } catch (error) {
      this.log('error', `Failed to load player model: ${error}`);
    }
  }

  private async loadNPCs(): Promise<void> {
    for (const npcConfig of this.config.npcs) {
      try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
          '',
          '',
          npcConfig.modelPath,
          this.scene
        );
        
        const rootMesh = result.meshes[0];
        rootMesh.name = npcConfig.name;
        rootMesh.id = npcConfig.id;
        
        rootMesh.position = new BABYLON.Vector3(
          npcConfig.position.x,
          npcConfig.position.y,
          npcConfig.position.z
        );
        
        rootMesh.rotation = new BABYLON.Vector3(
          BABYLON.Tools.ToRadians(npcConfig.rotation.x),
          BABYLON.Tools.ToRadians(npcConfig.rotation.y),
          BABYLON.Tools.ToRadians(npcConfig.rotation.z)
        );
        
        rootMesh.scaling = new BABYLON.Vector3(
          npcConfig.scale,
          npcConfig.scale,
          npcConfig.scale
        );
        
        result.meshes.forEach(mesh => {
          mesh.isPickable = true;
          if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(mesh);
          }
        });
        
        this.loadedMeshes.set(npcConfig.id, rootMesh);
        this.animationGroups.set(npcConfig.id, result.animationGroups);
        
        let behavior: WarBearBehavior | DragonBehavior | null = null;
        
        if (npcConfig.type === 'warbear') {
          behavior = new WarBearBehavior({
            scene: this.scene,
            mesh: rootMesh,
            animationGroups: result.animationGroups,
            detectionRange: npcConfig.behaviorOptions?.detectionRange ?? 20,
            attackRange: npcConfig.behaviorOptions?.attackRange ?? 3,
            patrolRadius: npcConfig.behaviorOptions?.patrolRadius ?? 15,
            moveSpeed: npcConfig.behaviorOptions?.moveSpeed ?? 4
          });
        } else if (npcConfig.type === 'dragon') {
          behavior = new DragonBehavior({
            scene: this.scene,
            mesh: rootMesh,
            animationGroups: result.animationGroups,
            detectionRange: npcConfig.behaviorOptions?.detectionRange ?? 50,
            flyHeight: npcConfig.behaviorOptions?.flyHeight ?? 15,
            patrolRadius: npcConfig.behaviorOptions?.patrolRadius ?? 25,
            moveSpeed: npcConfig.behaviorOptions?.moveSpeed ?? 10
          });
        }
        
        if (behavior) {
          this.npcBehaviors.set(npcConfig.id, behavior);
        }
        
        this.log('info', `NPC loaded: ${npcConfig.name} (${npcConfig.type}) with ${result.animationGroups.length} animations`);
      } catch (error) {
        this.log('error', `Failed to load NPC ${npcConfig.name}: ${error}`);
      }
    }
  }

  private async loadProps(): Promise<void> {
    for (const propConfig of this.config.props) {
      try {
        let mesh: BABYLON.Mesh;
        
        if (propConfig.modelPath) {
          const result = await BABYLON.SceneLoader.ImportMeshAsync(
            '',
            '',
            propConfig.modelPath,
            this.scene
          );
          mesh = result.meshes[0] as BABYLON.Mesh;
        } else if (propConfig.primitiveType) {
          switch (propConfig.primitiveType) {
            case 'box':
              mesh = BABYLON.MeshBuilder.CreateBox(propConfig.id, { size: 1 }, this.scene);
              break;
            case 'sphere':
              mesh = BABYLON.MeshBuilder.CreateSphere(propConfig.id, { diameter: 1 }, this.scene);
              break;
            case 'cylinder':
              mesh = BABYLON.MeshBuilder.CreateCylinder(propConfig.id, { height: 1, diameter: 1 }, this.scene);
              break;
            default:
              mesh = BABYLON.MeshBuilder.CreateBox(propConfig.id, { size: 1 }, this.scene);
          }
          
          if (propConfig.material) {
            const mat = new BABYLON.PBRMaterial(`${propConfig.id}_mat`, this.scene);
            if (propConfig.material.color) {
              mat.albedoColor = BABYLON.Color3.FromHexString(propConfig.material.color);
            }
            mat.metallic = propConfig.material.metallic ?? 0;
            mat.roughness = propConfig.material.roughness ?? 0.5;
            mesh.material = mat;
          }
        } else {
          continue;
        }
        
        mesh.name = propConfig.name;
        mesh.id = propConfig.id;
        
        mesh.position = new BABYLON.Vector3(
          propConfig.position.x,
          propConfig.position.y,
          propConfig.position.z
        );
        
        mesh.rotation = new BABYLON.Vector3(
          BABYLON.Tools.ToRadians(propConfig.rotation.x),
          BABYLON.Tools.ToRadians(propConfig.rotation.y),
          BABYLON.Tools.ToRadians(propConfig.rotation.z)
        );
        
        mesh.scaling = new BABYLON.Vector3(
          propConfig.scale.x,
          propConfig.scale.y,
          propConfig.scale.z
        );
        
        if (propConfig.castShadow && this.shadowGenerator) {
          this.shadowGenerator.addShadowCaster(mesh);
        }
        
        if (propConfig.receiveShadow) {
          mesh.receiveShadows = true;
        }
        
        this.loadedMeshes.set(propConfig.id, mesh);
        this.log('info', `Prop loaded: ${propConfig.name}`);
      } catch (error) {
        this.log('warning', `Failed to load prop ${propConfig.name}: ${error}`);
      }
    }
  }

  private setupLighting(): void {
    const lightConfig = this.config.lighting;
    
    const ambientLight = new BABYLON.HemisphericLight(
      'ambientLight',
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    ambientLight.intensity = lightConfig.ambientIntensity;
    ambientLight.diffuse = BABYLON.Color3.FromHexString(lightConfig.ambientColor);
    
    const sunLight = new BABYLON.DirectionalLight(
      'sunLight',
      new BABYLON.Vector3(
        lightConfig.sunDirection.x,
        lightConfig.sunDirection.y,
        lightConfig.sunDirection.z
      ),
      this.scene
    );
    sunLight.intensity = lightConfig.sunIntensity;
    sunLight.diffuse = BABYLON.Color3.FromHexString(lightConfig.sunColor);
    sunLight.position = new BABYLON.Vector3(
      -lightConfig.sunDirection.x * 20,
      -lightConfig.sunDirection.y * 20,
      -lightConfig.sunDirection.z * 20
    );
    
    if (lightConfig.enableShadows) {
      const shadowMapSize = lightConfig.shadowQuality === 'high' ? 2048 : 
                            lightConfig.shadowQuality === 'medium' ? 1024 : 512;
      
      this.shadowGenerator = new BABYLON.ShadowGenerator(shadowMapSize, sunLight);
      this.shadowGenerator.useBlurExponentialShadowMap = true;
      this.shadowGenerator.blurKernel = 32;
      this.shadowGenerator.depthScale = 50;
      
      this.log('info', `Shadow generator created with ${shadowMapSize}px map`);
    }
  }

  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    
    if (this.playerController) {
      this.playerController.activate();
      this.log('info', 'Player controller activated - WASD to move, Shift to run, Space to jump');
    }
    
    this.npcBehaviors.forEach((behavior, id) => {
      behavior.start();
      this.log('info', `NPC behavior started: ${id}`);
    });
  }

  stop(): void {
    if (!this.isActive) return;
    this.isActive = false;
    
    if (this.playerController) {
      this.playerController.deactivate();
      this.log('info', 'Player controller deactivated');
    }
    
    this.npcBehaviors.forEach((behavior, id) => {
      behavior.stop();
      this.log('info', `NPC behavior stopped: ${id}`);
    });
  }

  dispose(): void {
    this.stop();
    
    if (this.playerController) {
      this.playerController.dispose();
      this.playerController = null;
    }
    
    this.npcBehaviors.forEach(behavior => behavior.stop());
    this.npcBehaviors.clear();
    
    this.loadedMeshes.forEach(mesh => mesh.dispose());
    this.loadedMeshes.clear();
    
    this.animationGroups.clear();
    
    if (this.shadowGenerator) {
      this.shadowGenerator.dispose();
      this.shadowGenerator = null;
    }
    
    this.log('info', 'Playable scene disposed');
  }

  getPlayerController(): CharacterController | null {
    return this.playerController;
  }

  getNPCBehaviors(): Map<string, WarBearBehavior | DragonBehavior> {
    return this.npcBehaviors;
  }

  getConfig(): SceneConfig {
    return this.config;
  }
}

export async function buildPlayableScene(
  scene: BABYLON.Scene,
  canvas: HTMLCanvasElement,
  configId: string,
  logCallback?: (type: string, message: string) => void
): Promise<PlayableScene | null> {
  const config = PRESET_SCENES.find(c => c.id === configId);
  
  if (!config) {
    console.error(`Scene config not found: ${configId}`);
    return null;
  }
  
  const playableScene = new PlayableScene(scene, canvas, config);
  
  if (logCallback) {
    playableScene.setLogCallback(logCallback);
  }
  
  await playableScene.build();
  return playableScene;
}
