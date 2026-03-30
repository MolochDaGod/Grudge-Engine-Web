/**
 * Scene Template Registry
 * Converts threejs-games examples into Babylon.js scene configs loadable from the Grudge Engine editor.
 * Assets are resolved via Grudge object storage (assets.grudge-studio.com).
 */

import type { SceneConfig } from '../scene-builder';

export type TemplateCategory =
  | 'games'
  | 'procedural'
  | 'terrain'
  | 'particles'
  | 'shaders'
  | 'ai'
  | 'physics'
  | 'characters';

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail: string; // URL to thumbnail on assets.grudge-studio.com
  tags: string[];
  config: SceneConfig;
}

const ASSETS_CDN = import.meta.env.VITE_ASSETS_URL || 'https://assets.grudge-studio.com';
const asset = (path: string) => `${ASSETS_CDN}/engine-templates/${path}`;

// ─── Game Templates ──────────────────────────────────────────────────────────

const platformerTemplate: SceneTemplate = {
  id: 'platformer-avatar',
  name: 'Platformer Arena',
  description: 'A floating platformer with random boxes — jump across platforms to survive',
  category: 'games',
  thumbnail: asset('thumbnails/random-boxes.jpg'),
  tags: ['platformer', 'jump', 'boxes', 'arcade'],
  config: {
    id: 'platformer-avatar',
    name: 'Platformer Arena',
    description: 'Floating box platformer with player character',
    environment: 'sky',
    player: {
      modelPath: asset('characters/avatar/model.glb'),
      position: { x: 0, y: 5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 5,
      runSpeed: 10,
      jumpForce: 12,
    },
    npcs: [],
    props: Array.from({ length: 40 }, (_, i) => ({
      id: `platform-${i}`,
      name: `Platform ${i}`,
      primitiveType: 'box' as const,
      position: {
        x: (Math.random() - 0.5) * 60,
        y: Math.random() * 30 - 5,
        z: (Math.random() - 0.5) * 60,
      },
      rotation: { x: 0, y: 0, z: 0 },
      scale: {
        x: 2 + Math.random() * 4,
        y: 0.5 + Math.random(),
        z: 2 + Math.random() * 4,
      },
      material: {
        color: `#${Math.floor(Math.random() * 0x606060 + 0x606060).toString(16)}`,
        roughness: 0.8,
        metallic: 0.1,
      },
      castShadow: true,
      receiveShadow: true,
    })),
    lighting: {
      ambientIntensity: 0.5,
      ambientColor: '#87ceeb',
      sunIntensity: 1.0,
      sunColor: '#ffffff',
      sunDirection: { x: -1, y: -2, z: 1 },
      enableShadows: true,
      shadowQuality: 'medium',
    },
  },
};

const rpgFantasyTemplate: SceneTemplate = {
  id: 'rpg-fantasy',
  name: 'RPG Fantasy — Kill the Orcs',
  description: 'A fantasy RPG scene with orcs, goblins, and a player knight on an open field',
  category: 'games',
  thumbnail: asset('thumbnails/rpg-fantasy.jpg'),
  tags: ['rpg', 'fantasy', 'combat', 'orcs', 'melee'],
  config: {
    id: 'rpg-fantasy',
    name: 'RPG Fantasy',
    description: 'Fantasy RPG with enemies and player knight',
    environment: 'forest',
    player: {
      modelPath: asset('characters/knight/model.glb'),
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 4,
      runSpeed: 8,
      jumpForce: 8,
      controllerType: 'warrior',
    },
    npcs: [
      {
        id: 'orc-1', name: 'Orc Warrior', type: 'patrol',
        modelPath: asset('characters/orc/model.glb'),
        position: { x: 15, y: 0, z: 10 },
        rotation: { x: 0, y: 180, z: 0 }, scale: 1.2,
        behaviorOptions: { detectionRange: 20, attackRange: 2.5, patrolRadius: 15, moveSpeed: 3 },
      },
      {
        id: 'orc-2', name: 'Orc Berserker', type: 'wander',
        modelPath: asset('characters/orc-ogre/model.glb'),
        position: { x: -20, y: 0, z: 15 },
        rotation: { x: 0, y: 90, z: 0 }, scale: 1.5,
        behaviorOptions: { detectionRange: 25, attackRange: 3, patrolRadius: 20, moveSpeed: 2.5 },
      },
      {
        id: 'goblin-1', name: 'Goblin Scout', type: 'patrol',
        modelPath: asset('characters/goblin/model.glb'),
        position: { x: 10, y: 0, z: -15 },
        rotation: { x: 0, y: 0, z: 0 }, scale: 0.8,
        behaviorOptions: { detectionRange: 15, attackRange: 1.5, patrolRadius: 12, moveSpeed: 5 },
      },
    ],
    props: [
      {
        id: 'tree-1', name: 'Oak Tree',
        modelPath: asset('environment/trees/oak.glb'),
        position: { x: -10, y: 0, z: 8 }, rotation: { x: 0, y: 30, z: 0 },
        scale: { x: 1.5, y: 1.5, z: 1.5 }, castShadow: true, receiveShadow: false,
      },
      {
        id: 'rock-1', name: 'Boulder', primitiveType: 'sphere',
        position: { x: 8, y: 0.5, z: -8 }, rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 2, y: 1.5, z: 2 },
        material: { color: '#666666', roughness: 0.9, metallic: 0 },
        castShadow: true, receiveShadow: true,
      },
    ],
    lighting: {
      ambientIntensity: 0.35,
      ambientColor: '#8fbc8f',
      sunIntensity: 1.3,
      sunColor: '#fff5d0',
      sunDirection: { x: -1, y: -2, z: 1 },
      enableShadows: true,
      shadowQuality: 'high',
    },
  },
};

const fpsMazeTemplate: SceneTemplate = {
  id: 'fps-maze',
  name: 'FPS Maze',
  description: 'First-person shooter in a procedural maze with enemies',
  category: 'games',
  thumbnail: asset('thumbnails/fps-maze.jpg'),
  tags: ['fps', 'shooter', 'maze', 'firstperson'],
  config: {
    id: 'fps-maze',
    name: 'FPS Maze',
    description: 'First-person maze shooter',
    environment: 'dungeon',
    player: {
      modelPath: asset('characters/soldier/model.glb'),
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 5,
      runSpeed: 9,
      jumpForce: 7,
    },
    npcs: Array.from({ length: 6 }, (_, i) => ({
      id: `enemy-${i}`, name: `Guard ${i + 1}`, type: 'patrol' as const,
      modelPath: asset('characters/zombie-guard/model.glb'),
      position: { x: (i % 3) * 20 - 20, y: 0, z: Math.floor(i / 3) * 20 - 10 },
      rotation: { x: 0, y: Math.random() * 360, z: 0 }, scale: 1,
      behaviorOptions: { detectionRange: 18, attackRange: 2, patrolRadius: 10, moveSpeed: 3 },
    })),
    props: [],
    lighting: {
      ambientIntensity: 0.15,
      ambientColor: '#1a1a2e',
      sunIntensity: 0.3,
      sunColor: '#aaaacc',
      sunDirection: { x: 0, y: -1, z: 0 },
      enableShadows: true,
      shadowQuality: 'medium',
    },
  },
};

const tpsGraveyardTemplate: SceneTemplate = {
  id: 'tps-graveyard',
  name: 'Graveyard Survival',
  description: 'Third-person zombie survival in a dark graveyard',
  category: 'games',
  thumbnail: asset('thumbnails/graveyard-survival.jpg'),
  tags: ['tps', 'survival', 'horror', 'zombies', 'thirdperson'],
  config: {
    id: 'tps-graveyard',
    name: 'Graveyard Survival',
    description: 'Third-person zombie survival',
    environment: 'custom',
    player: {
      modelPath: asset('characters/partisan/model.glb'),
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 4,
      runSpeed: 7,
      jumpForce: 6,
    },
    npcs: Array.from({ length: 8 }, (_, i) => ({
      id: `zombie-${i}`, name: `Zombie ${i + 1}`,
      type: 'wander' as const,
      modelPath: asset(`characters/zombie-${['barefoot', 'cop', 'doctor', 'guard'][i % 4]}/model.glb`),
      position: {
        x: (Math.random() - 0.5) * 40,
        y: 0,
        z: (Math.random() - 0.5) * 40,
      },
      rotation: { x: 0, y: Math.random() * 360, z: 0 }, scale: 1,
      behaviorOptions: { detectionRange: 15, attackRange: 1.5, patrolRadius: 20, moveSpeed: 2 },
    })),
    props: [],
    lighting: {
      ambientIntensity: 0.1,
      ambientColor: '#0d0d1a',
      sunIntensity: 0.2,
      sunColor: '#6666aa',
      sunDirection: { x: -0.5, y: -1, z: 0.5 },
      enableShadows: true,
      shadowQuality: 'high',
    },
  },
};

const flightSimTemplate: SceneTemplate = {
  id: 'flight-warplane',
  name: 'Warplane Flight Sim',
  description: 'Arcade flight game over endless ocean with obstacles',
  category: 'games',
  thumbnail: asset('thumbnails/warplane.jpg'),
  tags: ['flight', 'arcade', 'plane', 'sky'],
  config: {
    id: 'flight-warplane',
    name: 'Warplane',
    description: 'Arcade flight simulation',
    environment: 'sky',
    player: {
      modelPath: asset('vehicles/warplane/model.glb'),
      position: { x: 0, y: 50, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 20,
      runSpeed: 40,
      jumpForce: 0,
    },
    npcs: [],
    props: [],
    lighting: {
      ambientIntensity: 0.6,
      ambientColor: '#87ceeb',
      sunIntensity: 1.5,
      sunColor: '#fffbe0',
      sunDirection: { x: -1, y: -3, z: 1 },
      enableShadows: false,
      shadowQuality: 'low',
    },
  },
};

// ─── Procedural Templates ────────────────────────────────────────────────────

const proceduralCityTemplate: SceneTemplate = {
  id: 'procedural-city-night',
  name: 'Night City',
  description: 'Procedurally generated neon-lit city at night',
  category: 'procedural',
  thumbnail: asset('thumbnails/city-night.jpg'),
  tags: ['city', 'procedural', 'night', 'neon', 'urban'],
  config: {
    id: 'procedural-city-night',
    name: 'Night City',
    description: 'Procedural city at night',
    environment: 'custom',
    player: {
      modelPath: asset('characters/avatar/model.glb'),
      position: { x: 0, y: 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 5,
      runSpeed: 10,
      jumpForce: 8,
    },
    npcs: [],
    props: [], // Generated procedurally at runtime via procedural-generation module
    lighting: {
      ambientIntensity: 0.05,
      ambientColor: '#0a0a1a',
      sunIntensity: 0.1,
      sunColor: '#4444ff',
      sunDirection: { x: 0, y: -1, z: 0 },
      enableShadows: true,
      shadowQuality: 'medium',
    },
  },
};

const castleBuilderTemplate: SceneTemplate = {
  id: 'procedural-castle',
  name: 'Castle Builder',
  description: 'Procedurally generated medieval castle with towers and walls',
  category: 'procedural',
  thumbnail: asset('thumbnails/castle.jpg'),
  tags: ['castle', 'procedural', 'medieval', 'fortress'],
  config: {
    id: 'procedural-castle',
    name: 'Castle Builder',
    description: 'Procedural medieval castle',
    environment: 'forest',
    player: {
      modelPath: asset('characters/knight/model.glb'),
      position: { x: 0, y: 0, z: -20 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 4,
      runSpeed: 7,
      jumpForce: 7,
    },
    npcs: [],
    props: [],
    lighting: {
      ambientIntensity: 0.4,
      ambientColor: '#c0d0e0',
      sunIntensity: 1.2,
      sunColor: '#ffe8c0',
      sunDirection: { x: -1, y: -2, z: 0.5 },
      enableShadows: true,
      shadowQuality: 'high',
    },
  },
};

// ─── Terrain Templates ───────────────────────────────────────────────────────

const heightmapTerrainTemplate: SceneTemplate = {
  id: 'terrain-heightmap',
  name: 'Heightmap Terrain',
  description: 'Terrain generated from heightmap data with grass and hills',
  category: 'terrain',
  thumbnail: asset('thumbnails/heightmap.jpg'),
  tags: ['terrain', 'heightmap', 'landscape', 'hills'],
  config: {
    id: 'terrain-heightmap',
    name: 'Heightmap Terrain',
    description: 'Realistic heightmap terrain',
    environment: 'forest',
    player: {
      modelPath: asset('characters/avatar/model.glb'),
      position: { x: 0, y: 10, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 5,
      runSpeed: 9,
      jumpForce: 8,
    },
    npcs: [],
    props: [],
    lighting: {
      ambientIntensity: 0.45,
      ambientColor: '#90c0e0',
      sunIntensity: 1.4,
      sunColor: '#fff0d0',
      sunDirection: { x: -1, y: -2, z: 1 },
      enableShadows: true,
      shadowQuality: 'high',
    },
  },
};

// ─── AI Demo Templates ───────────────────────────────────────────────────────

const aiPatrolDemoTemplate: SceneTemplate = {
  id: 'ai-patrol-demo',
  name: 'AI Patrol & Pursue',
  description: 'Demonstrates AI behaviors: patrol, pursue, wander, flee, follow, defend',
  category: 'ai',
  thumbnail: asset('thumbnails/patrol.jpg'),
  tags: ['ai', 'patrol', 'pursue', 'wander', 'flee', 'npc', 'behavior'],
  config: {
    id: 'ai-patrol-demo',
    name: 'AI Behavior Demo',
    description: 'AI state machine showcase',
    environment: 'forest',
    player: {
      modelPath: asset('characters/avatar/model.glb'),
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 5,
      runSpeed: 9,
      jumpForce: 8,
    },
    npcs: [
      {
        id: 'patrol-npc', name: 'Patroller', type: 'patrol',
        modelPath: asset('characters/soldier/model.glb'),
        position: { x: 10, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }, scale: 1,
        behaviorOptions: { detectionRange: 20, attackRange: 2, patrolRadius: 15, moveSpeed: 3 },
      },
      {
        id: 'wander-npc', name: 'Wanderer', type: 'wander' as const,
        modelPath: asset('characters/goblin/model.glb'),
        position: { x: -15, y: 0, z: 10 },
        rotation: { x: 0, y: 0, z: 0 }, scale: 0.9,
        behaviorOptions: { detectionRange: 12, attackRange: 1.5, patrolRadius: 25, moveSpeed: 2 },
      },
      {
        id: 'warbear-npc', name: 'Companion Bear', type: 'warbear',
        modelPath: asset('characters/warbear/model.glb'),
        position: { x: 5, y: 0, z: 5 },
        rotation: { x: 0, y: 0, z: 0 }, scale: 1.2,
        behaviorOptions: { detectionRange: 30, attackRange: 3, patrolRadius: 10, moveSpeed: 4 },
      },
      {
        id: 'dragon-npc', name: 'Sky Dragon', type: 'dragon',
        modelPath: asset('characters/dragon/model.glb'),
        position: { x: 0, y: 15, z: 30 },
        rotation: { x: 0, y: 180, z: 0 }, scale: 0.4,
        behaviorOptions: { detectionRange: 50, flyHeight: 12, patrolRadius: 30, moveSpeed: 10 },
      },
    ],
    props: [],
    lighting: {
      ambientIntensity: 0.4,
      ambientColor: '#87ceeb',
      sunIntensity: 1.2,
      sunColor: '#fff5e0',
      sunDirection: { x: -1, y: -2, z: 1 },
      enableShadows: true,
      shadowQuality: 'high',
    },
  },
};

// ─── Physics Templates ───────────────────────────────────────────────────────

const physicsPlaygroundTemplate: SceneTemplate = {
  id: 'physics-playground',
  name: 'Physics Playground',
  description: 'Interactive physics sandbox with balls, walls, and cannons',
  category: 'physics',
  thumbnail: asset('thumbnails/ball-shoot-wall.jpg'),
  tags: ['physics', 'havok', 'rapier', 'sandbox', 'cannon'],
  config: {
    id: 'physics-playground',
    name: 'Physics Playground',
    description: 'Physics sandbox',
    environment: 'custom',
    player: {
      modelPath: asset('characters/avatar/model.glb'),
      position: { x: 0, y: 2, z: -10 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 5,
      runSpeed: 9,
      jumpForce: 10,
    },
    npcs: [],
    props: [],
    lighting: {
      ambientIntensity: 0.4,
      ambientColor: '#e0e0f0',
      sunIntensity: 1.0,
      sunColor: '#ffffff',
      sunDirection: { x: -1, y: -2, z: 1 },
      enableShadows: true,
      shadowQuality: 'medium',
    },
  },
};

// ─── Space Template ──────────────────────────────────────────────────────────

const spaceSceneTemplate: SceneTemplate = {
  id: 'space-exploration',
  name: 'Space Exploration',
  description: 'Flying through space with planets, stars, and nebulae',
  category: 'games',
  thumbnail: asset('thumbnails/flying-through-space.jpg'),
  tags: ['space', 'planets', 'stars', 'flight', 'exploration'],
  config: {
    id: 'space-exploration',
    name: 'Space Exploration',
    description: 'Space flight scene',
    environment: 'sky',
    player: {
      modelPath: asset('vehicles/spaceship/model.glb'),
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 30,
      runSpeed: 60,
      jumpForce: 0,
    },
    npcs: [],
    props: [],
    lighting: {
      ambientIntensity: 0.05,
      ambientColor: '#000011',
      sunIntensity: 2.0,
      sunColor: '#ffffff',
      sunDirection: { x: -1, y: -0.5, z: 1 },
      enableShadows: false,
      shadowQuality: 'low',
    },
  },
};

// ─── Character Gallery ───────────────────────────────────────────────────────

const characterGalleryTemplate: SceneTemplate = {
  id: 'character-gallery',
  name: 'Character Gallery',
  description: 'Browse fantasy, horror, and military characters with animations',
  category: 'characters',
  thumbnail: asset('thumbnails/demon.jpg'),
  tags: ['characters', 'gallery', 'fantasy', 'horror', 'military', 'animations'],
  config: {
    id: 'character-gallery',
    name: 'Character Gallery',
    description: 'Animated character showcase',
    environment: 'custom',
    player: {
      modelPath: asset('characters/avatar/model.glb'),
      position: { x: 0, y: 0, z: -8 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 4,
      runSpeed: 7,
      jumpForce: 6,
    },
    npcs: [
      { id: 'demon', name: 'Demon', type: 'static' as const, modelPath: asset('characters/demon/model.glb'), position: { x: -8, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 },
      { id: 'sorceress', name: 'Sorceress', type: 'static' as const, modelPath: asset('characters/sorceress/model.glb'), position: { x: -4, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 },
      { id: 'troll', name: 'Troll', type: 'static' as const, modelPath: asset('characters/troll/model.glb'), position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 },
      { id: 'golem', name: 'Golem', type: 'static' as const, modelPath: asset('characters/golem/model.glb'), position: { x: 4, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1.2 },
      { id: 'skeleton', name: 'Skeleton', type: 'static' as const, modelPath: asset('characters/skeleton/model.glb'), position: { x: 8, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 },
    ],
    props: [],
    lighting: {
      ambientIntensity: 0.5,
      ambientColor: '#d0d0e0',
      sunIntensity: 1.0,
      sunColor: '#ffffff',
      sunDirection: { x: -1, y: -2, z: 1 },
      enableShadows: true,
      shadowQuality: 'high',
    },
  },
};

// ─── Particle Showcase ───────────────────────────────────────────────────────

const particleShowcaseTemplate: SceneTemplate = {
  id: 'particle-showcase',
  name: 'Particle Effects',
  description: 'Fire, rain, snow, smoke, and star particle systems',
  category: 'particles',
  thumbnail: asset('thumbnails/fire.jpg'),
  tags: ['particles', 'fire', 'rain', 'snow', 'smoke', 'effects', 'vfx'],
  config: {
    id: 'particle-showcase',
    name: 'Particle Showcase',
    description: 'Particle effect demos',
    environment: 'custom',
    player: {
      modelPath: asset('characters/avatar/model.glb'),
      position: { x: 0, y: 0, z: -10 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 5,
      runSpeed: 9,
      jumpForce: 8,
    },
    npcs: [],
    props: [],
    lighting: {
      ambientIntensity: 0.2,
      ambientColor: '#1a1a2e',
      sunIntensity: 0.5,
      sunColor: '#ffcc88',
      sunDirection: { x: -1, y: -2, z: 1 },
      enableShadows: true,
      shadowQuality: 'medium',
    },
  },
};

// ─── Shader Gallery ──────────────────────────────────────────────────────────

const shaderGalleryTemplate: SceneTemplate = {
  id: 'shader-gallery',
  name: 'Shader Gallery',
  description: 'Toon, lava, marble, voronoi, and wood shader demos',
  category: 'shaders',
  thumbnail: asset('thumbnails/toon-shader.jpg'),
  tags: ['shaders', 'toon', 'lava', 'marble', 'voronoi', 'materials'],
  config: {
    id: 'shader-gallery',
    name: 'Shader Gallery',
    description: 'Custom shader showcase',
    environment: 'custom',
    player: {
      modelPath: asset('characters/avatar/model.glb'),
      position: { x: 0, y: 0, z: -8 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 4,
      runSpeed: 7,
      jumpForce: 6,
    },
    npcs: [],
    props: [
      { id: 'shader-sphere-1', name: 'Toon Sphere', primitiveType: 'sphere', position: { x: -6, y: 1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, material: { color: '#ff6644', roughness: 1, metallic: 0 }, castShadow: true, receiveShadow: false },
      { id: 'shader-sphere-2', name: 'Lava Sphere', primitiveType: 'sphere', position: { x: -2, y: 1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, material: { color: '#ff2200', roughness: 0.5, metallic: 0.3 }, castShadow: true, receiveShadow: false },
      { id: 'shader-sphere-3', name: 'Marble Sphere', primitiveType: 'sphere', position: { x: 2, y: 1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, material: { color: '#e8e0d8', roughness: 0.3, metallic: 0.1 }, castShadow: true, receiveShadow: false },
      { id: 'shader-sphere-4', name: 'Voronoi Sphere', primitiveType: 'sphere', position: { x: 6, y: 1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, material: { color: '#4488ff', roughness: 0.4, metallic: 0.5 }, castShadow: true, receiveShadow: false },
    ],
    lighting: {
      ambientIntensity: 0.4,
      ambientColor: '#e0e0f0',
      sunIntensity: 1.0,
      sunColor: '#ffffff',
      sunDirection: { x: -1, y: -2, z: 1 },
      enableShadows: true,
      shadowQuality: 'medium',
    },
  },
};

// ─── Tank Sim ────────────────────────────────────────────────────────────────

const tankSimTemplate: SceneTemplate = {
  id: 'tank-sim',
  name: 'Tank Driving',
  description: 'Physics-based tank simulation on open terrain',
  category: 'physics',
  thumbnail: asset('thumbnails/physics-tank.jpg'),
  tags: ['tank', 'vehicle', 'physics', 'driving', 'simulation'],
  config: {
    id: 'tank-sim',
    name: 'Tank Driving',
    description: 'Physics tank simulation',
    environment: 'desert',
    player: {
      modelPath: asset('vehicles/tank/model.glb'),
      position: { x: 0, y: 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      walkSpeed: 8,
      runSpeed: 15,
      jumpForce: 0,
    },
    npcs: [],
    props: [],
    lighting: {
      ambientIntensity: 0.5,
      ambientColor: '#f0e0c0',
      sunIntensity: 1.5,
      sunColor: '#fff0c0',
      sunDirection: { x: -1, y: -3, z: 0.5 },
      enableShadows: true,
      shadowQuality: 'medium',
    },
  },
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const SCENE_TEMPLATES: SceneTemplate[] = [
  // Games
  platformerTemplate,
  rpgFantasyTemplate,
  fpsMazeTemplate,
  tpsGraveyardTemplate,
  flightSimTemplate,
  spaceSceneTemplate,
  // Procedural
  proceduralCityTemplate,
  castleBuilderTemplate,
  // Terrain
  heightmapTerrainTemplate,
  // AI
  aiPatrolDemoTemplate,
  // Physics
  physicsPlaygroundTemplate,
  tankSimTemplate,
  // Characters
  characterGalleryTemplate,
  // Particles
  particleShowcaseTemplate,
  // Shaders
  shaderGalleryTemplate,
];

export function getTemplatesByCategory(category: TemplateCategory): SceneTemplate[] {
  return SCENE_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string): SceneTemplate | undefined {
  return SCENE_TEMPLATES.find(t => t.id === id);
}

export function searchTemplates(query: string): SceneTemplate[] {
  const q = query.toLowerCase();
  return SCENE_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.includes(q))
  );
}

export const TEMPLATE_CATEGORIES: { key: TemplateCategory; label: string; icon: string }[] = [
  { key: 'games', label: 'Games', icon: '🎮' },
  { key: 'procedural', label: 'Procedural', icon: '🏗️' },
  { key: 'terrain', label: 'Terrain', icon: '⛰️' },
  { key: 'ai', label: 'AI Behaviors', icon: '🤖' },
  { key: 'physics', label: 'Physics', icon: '⚡' },
  { key: 'characters', label: 'Characters', icon: '🧙' },
  { key: 'particles', label: 'Particles', icon: '✨' },
  { key: 'shaders', label: 'Shaders', icon: '🎨' },
];
