import type { ComponentBlueprint } from '@shared/schema';

export const componentRegistry: ComponentBlueprint[] = [
  // === RENDERING COMPONENTS ===
  {
    type: 'mesh',
    displayName: 'Mesh Renderer',
    description: 'Renders 3D geometry with mesh data',
    icon: 'Box',
    defaultProperties: { type: 'imported', modelPath: '', castShadow: true, receiveShadow: true },
    propertyDescriptors: [
      { key: 'type', label: 'Mesh Type', type: 'select', default: 'imported', options: ['imported', 'box', 'sphere', 'cylinder', 'capsule', 'plane', 'cone', 'torus'] },
      { key: 'modelPath', label: 'Model Path', type: 'string', default: '' },
      { key: 'castShadow', label: 'Cast Shadow', type: 'boolean', default: true },
      { key: 'receiveShadow', label: 'Receive Shadow', type: 'boolean', default: true },
    ]
  },
  {
    type: 'material',
    displayName: 'Material',
    description: 'Surface appearance with textures and shading',
    icon: 'Palette',
    defaultProperties: {
      type: 'pbr', albedoColor: '#6366f1', albedoTexture: '', normalTexture: '', metallicTexture: '',
      metallic: 0, roughness: 0.5, emissiveColor: '#000000', emissiveIntensity: 0, alphaMode: 'opaque', twoSided: false
    },
    propertyDescriptors: [
      { key: 'type', label: 'Material Type', type: 'select', default: 'pbr', options: ['pbr', 'standard', 'unlit'] },
      { key: 'albedoColor', label: 'Albedo Color', type: 'color', default: '#6366f1' },
      { key: 'albedoTexture', label: 'Albedo Texture', type: 'string', default: '' },
      { key: 'normalTexture', label: 'Normal Map', type: 'string', default: '' },
      { key: 'metallicTexture', label: 'Metallic Map', type: 'string', default: '' },
      { key: 'metallic', label: 'Metallic', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
      { key: 'roughness', label: 'Roughness', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'emissiveColor', label: 'Emissive Color', type: 'color', default: '#000000' },
      { key: 'emissiveIntensity', label: 'Emissive Intensity', type: 'number', default: 0, min: 0, max: 10, step: 0.1 },
      { key: 'alphaMode', label: 'Alpha Mode', type: 'select', default: 'opaque', options: ['opaque', 'blend', 'mask'] },
      { key: 'twoSided', label: 'Two Sided', type: 'boolean', default: false },
    ]
  },
  // === CHARACTER & ANIMATION COMPONENTS ===
  {
    type: 'controller',
    displayName: 'Character Controller',
    description: 'Third-person or first-person character movement',
    icon: 'Gamepad2',
    defaultProperties: {
      type: 'thirdPerson', walkSpeed: 4, runSpeed: 8, jumpForce: 8, gravity: 20,
      groundCheckDistance: 0.2, slopeLimit: 45, stepOffset: 0.3,
      cameraDistance: 6, cameraHeight: 2, canJump: true, canRun: true, canCrouch: false
    },
    propertyDescriptors: [
      { key: 'type', label: 'Controller Type', type: 'select', default: 'thirdPerson', options: ['thirdPerson', 'firstPerson', 'topDown', 'sidescroller'] },
      { key: 'walkSpeed', label: 'Walk Speed', type: 'number', default: 4, min: 0, max: 20, step: 0.5 },
      { key: 'runSpeed', label: 'Run Speed', type: 'number', default: 8, min: 0, max: 40, step: 0.5 },
      { key: 'jumpForce', label: 'Jump Force', type: 'number', default: 8, min: 0, max: 30, step: 0.5 },
      { key: 'gravity', label: 'Gravity', type: 'number', default: 20, min: 0, max: 50, step: 1 },
      { key: 'cameraDistance', label: 'Camera Distance', type: 'number', default: 6, min: 1, max: 20, step: 0.5 },
      { key: 'cameraHeight', label: 'Camera Height', type: 'number', default: 2, min: 0, max: 10, step: 0.5 },
      { key: 'canJump', label: 'Can Jump', type: 'boolean', default: true },
      { key: 'canRun', label: 'Can Run', type: 'boolean', default: true },
    ]
  },
  {
    type: 'animator',
    displayName: 'Animator Controller',
    description: 'State machine with transitions, parameters, and crossfade blending',
    icon: 'Play',
    defaultProperties: {
      controllerName: '', autoGenerate: true, defaultState: '',
      blendSpeed: 0.25, rootMotion: false, applyRootMotion: false
    },
    propertyDescriptors: [
      { key: 'controllerName', label: 'Controller Name', type: 'string', default: '' },
      { key: 'autoGenerate', label: 'Auto Generate States', type: 'boolean', default: true },
      { key: 'defaultState', label: 'Default State', type: 'string', default: '' },
      { key: 'blendSpeed', label: 'Blend Speed', type: 'number', default: 0.25, min: 0.01, max: 2, step: 0.01 },
      { key: 'rootMotion', label: 'Root Motion', type: 'boolean', default: false },
      { key: 'applyRootMotion', label: 'Apply Root Motion', type: 'boolean', default: false },
    ]
  },
  // === LIGHTING COMPONENTS ===
  {
    type: 'light',
    displayName: 'Light',
    description: 'Illuminates the scene',
    icon: 'Sun',
    defaultProperties: { type: 'point', color: '#ffffff', intensity: 1, range: 10, castShadows: true },
    propertyDescriptors: [
      { key: 'type', label: 'Light Type', type: 'select', default: 'point', options: ['point', 'directional', 'spot', 'hemispheric'] },
      { key: 'color', label: 'Color', type: 'color', default: '#ffffff' },
      { key: 'intensity', label: 'Intensity', type: 'number', default: 1, min: 0, max: 10, step: 0.1 },
      { key: 'range', label: 'Range', type: 'number', default: 10, min: 0, max: 100, step: 1 },
      { key: 'castShadows', label: 'Cast Shadows', type: 'boolean', default: true },
    ]
  },
  {
    type: 'camera',
    displayName: 'Camera',
    description: 'Viewpoint for rendering',
    icon: 'Camera',
    defaultProperties: { fov: 60, near: 0.1, far: 1000 },
    propertyDescriptors: [
      { key: 'fov', label: 'Field of View', type: 'number', default: 60, min: 30, max: 120, step: 1 },
      { key: 'near', label: 'Near Clip', type: 'number', default: 0.1, min: 0.01, max: 10, step: 0.01 },
      { key: 'far', label: 'Far Clip', type: 'number', default: 1000, min: 100, max: 10000, step: 100 },
    ]
  },
  // === PHYSICS COMPONENTS (Rapier) ===
  {
    type: 'physics',
    displayName: 'Rigidbody (Rapier)',
    description: 'Rapier WASM physics simulation with forces and constraints',
    icon: 'Atom',
    defaultProperties: {
      bodyType: 'dynamic', mass: 1, friction: 0.5, restitution: 0.3,
      linearDamping: 0, angularDamping: 0.05, gravityScale: 1,
      lockRotationX: false, lockRotationY: false, lockRotationZ: false, ccd: false
    },
    propertyDescriptors: [
      { key: 'bodyType', label: 'Body Type', type: 'select', default: 'dynamic', options: ['dynamic', 'kinematicPosition', 'kinematicVelocity', 'fixed'] },
      { key: 'mass', label: 'Mass', type: 'number', default: 1, min: 0, max: 1000, step: 0.1 },
      { key: 'friction', label: 'Friction', type: 'number', default: 0.5, min: 0, max: 1, step: 0.1 },
      { key: 'restitution', label: 'Bounciness', type: 'number', default: 0.3, min: 0, max: 1, step: 0.1 },
      { key: 'linearDamping', label: 'Linear Damping', type: 'number', default: 0, min: 0, max: 10, step: 0.1 },
      { key: 'angularDamping', label: 'Angular Damping', type: 'number', default: 0.05, min: 0, max: 10, step: 0.01 },
      { key: 'gravityScale', label: 'Gravity Scale', type: 'number', default: 1, min: -5, max: 5, step: 0.1 },
      { key: 'lockRotationX', label: 'Lock Rotation X', type: 'boolean', default: false },
      { key: 'lockRotationY', label: 'Lock Rotation Y', type: 'boolean', default: false },
      { key: 'lockRotationZ', label: 'Lock Rotation Z', type: 'boolean', default: false },
      { key: 'ccd', label: 'Continuous Collision', type: 'boolean', default: false },
    ]
  },
  {
    type: 'collider',
    displayName: 'Collider (Rapier)',
    description: 'Rapier collision shape - box, sphere, capsule, cylinder, trimesh, convex hull',
    icon: 'Square',
    defaultProperties: {
      shape: 'box', isTrigger: false, density: 1, friction: 0.5, restitution: 0.3,
      halfExtents: { x: 0.5, y: 0.5, z: 0.5 }, radius: 0.5, halfHeight: 0.5,
      offset: { x: 0, y: 0, z: 0 }, autoFit: true
    },
    propertyDescriptors: [
      { key: 'shape', label: 'Shape', type: 'select', default: 'box', options: ['box', 'sphere', 'capsule', 'cylinder', 'trimesh', 'convexHull'] },
      { key: 'isTrigger', label: 'Is Trigger', type: 'boolean', default: false },
      { key: 'density', label: 'Density', type: 'number', default: 1, min: 0, max: 100, step: 0.1 },
      { key: 'friction', label: 'Friction', type: 'number', default: 0.5, min: 0, max: 1, step: 0.1 },
      { key: 'restitution', label: 'Bounciness', type: 'number', default: 0.3, min: 0, max: 1, step: 0.1 },
      { key: 'radius', label: 'Radius', type: 'number', default: 0.5, min: 0.01, max: 50, step: 0.1 },
      { key: 'halfHeight', label: 'Half Height', type: 'number', default: 0.5, min: 0.01, max: 50, step: 0.1 },
      { key: 'autoFit', label: 'Auto Fit to Mesh', type: 'boolean', default: true },
    ]
  },
  // === BEHAVIOR COMPONENTS ===
  {
    type: 'script',
    displayName: 'Script',
    description: 'Custom behavior and game logic',
    icon: 'FileCode',
    defaultProperties: { scriptPath: '', scriptType: '', autoStart: true },
    propertyDescriptors: [
      { key: 'scriptPath', label: 'Script Path', type: 'string', default: '' },
      { key: 'scriptType', label: 'Script Type', type: 'select', default: '', options: ['', 'characterController', 'healthSystem', 'inventory', 'aiController', 'stateMachine', 'combat', 'followCamera', 'cameraShake', 'gameManager', 'inputManager', 'audioManager', 'eventBus'] },
      { key: 'autoStart', label: 'Auto Start', type: 'boolean', default: true },
    ]
  },
  {
    type: 'audio',
    displayName: 'Audio Source',
    description: 'Plays 3D spatial audio',
    icon: 'Volume2',
    defaultProperties: { audioPath: '', volume: 1, loop: false, playOnStart: false, spatialBlend: 1, minDistance: 1, maxDistance: 50 },
    propertyDescriptors: [
      { key: 'audioPath', label: 'Audio File', type: 'string', default: '' },
      { key: 'volume', label: 'Volume', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
      { key: 'loop', label: 'Loop', type: 'boolean', default: false },
      { key: 'playOnStart', label: 'Play On Start', type: 'boolean', default: false },
      { key: 'spatialBlend', label: 'Spatial Blend', type: 'number', default: 1, min: 0, max: 1, step: 0.1 },
      { key: 'minDistance', label: 'Min Distance', type: 'number', default: 1, min: 0, max: 100, step: 1 },
      { key: 'maxDistance', label: 'Max Distance', type: 'number', default: 50, min: 0, max: 500, step: 5 },
    ]
  },
  {
    type: 'particle',
    displayName: 'Particle System',
    description: 'Particle effects and VFX',
    icon: 'Sparkles',
    defaultProperties: { maxParticles: 1000, emitRate: 100, lifetime: 2, size: 0.1, color: '#ffffff', texture: '' },
    propertyDescriptors: [
      { key: 'maxParticles', label: 'Max Particles', type: 'number', default: 1000, min: 1, max: 10000, step: 100 },
      { key: 'emitRate', label: 'Emit Rate', type: 'number', default: 100, min: 1, max: 1000, step: 10 },
      { key: 'lifetime', label: 'Lifetime', type: 'number', default: 2, min: 0.1, max: 10, step: 0.1 },
      { key: 'size', label: 'Size', type: 'number', default: 0.1, min: 0.01, max: 10, step: 0.01 },
      { key: 'color', label: 'Color', type: 'color', default: '#ffffff' },
      { key: 'texture', label: 'Particle Texture', type: 'string', default: '' },
    ]
  },
  // === AI & BEHAVIOR COMPONENTS ===
  {
    type: 'aiBehavior',
    displayName: 'AI Behavior',
    description: 'NPC AI behavior and decision-making',
    icon: 'Brain',
    defaultProperties: {
      behaviorType: 'patrol', aggroRange: 10, attackRange: 2, patrolRadius: 5,
      patrolSpeed: 2, chaseSpeed: 6, returnSpeed: 3, targetTags: ['player'],
      fleeHealthThreshold: 0.2, alertOthers: true, alertRange: 15, customScript: ''
    },
    propertyDescriptors: [
      { key: 'behaviorType', label: 'Behavior Type', type: 'select', default: 'patrol', options: ['patrol', 'guard', 'chase', 'flee', 'follow', 'wander', 'stationary', 'custom'] },
      { key: 'aggroRange', label: 'Aggro Range', type: 'number', default: 10, min: 0, max: 100, step: 1 },
      { key: 'attackRange', label: 'Attack Range', type: 'number', default: 2, min: 0, max: 20, step: 0.5 },
      { key: 'patrolRadius', label: 'Patrol Radius', type: 'number', default: 5, min: 0, max: 50, step: 1 },
      { key: 'patrolSpeed', label: 'Patrol Speed', type: 'number', default: 2, min: 0, max: 10, step: 0.5 },
      { key: 'chaseSpeed', label: 'Chase Speed', type: 'number', default: 6, min: 0, max: 20, step: 0.5 },
      { key: 'fleeHealthThreshold', label: 'Flee Health %', type: 'number', default: 0.2, min: 0, max: 1, step: 0.05 },
      { key: 'alertOthers', label: 'Alert Others', type: 'boolean', default: true },
      { key: 'alertRange', label: 'Alert Range', type: 'number', default: 15, min: 0, max: 50, step: 1 },
    ]
  },
  // === NETWORK COMPONENTS ===
  {
    type: 'network',
    displayName: 'Network Identity',
    description: 'Multiplayer network synchronization',
    icon: 'Wifi',
    defaultProperties: {
      networkId: '', ownerId: '', isLocalPlayer: false, syncPosition: true,
      syncRotation: true, syncScale: false, syncAnimations: true,
      interpolation: 'smooth', updateRate: 20, priority: 'normal', isServerAuthority: true
    },
    propertyDescriptors: [
      { key: 'networkId', label: 'Network ID', type: 'string', default: '' },
      { key: 'ownerId', label: 'Owner ID', type: 'string', default: '' },
      { key: 'isLocalPlayer', label: 'Is Local Player', type: 'boolean', default: false },
      { key: 'syncPosition', label: 'Sync Position', type: 'boolean', default: true },
      { key: 'syncRotation', label: 'Sync Rotation', type: 'boolean', default: true },
      { key: 'syncScale', label: 'Sync Scale', type: 'boolean', default: false },
      { key: 'syncAnimations', label: 'Sync Animations', type: 'boolean', default: true },
      { key: 'interpolation', label: 'Interpolation', type: 'select', default: 'smooth', options: ['none', 'linear', 'smooth'] },
      { key: 'updateRate', label: 'Update Rate (Hz)', type: 'number', default: 20, min: 1, max: 60, step: 1 },
      { key: 'priority', label: 'Priority', type: 'select', default: 'normal', options: ['low', 'normal', 'high', 'critical'] },
      { key: 'isServerAuthority', label: 'Server Authority', type: 'boolean', default: true },
    ]
  },
  // === GAMEPLAY COMPONENTS ===
  {
    type: 'health',
    displayName: 'Health System',
    description: 'Health, damage, and death handling',
    icon: 'Heart',
    defaultProperties: {
      maxHealth: 100, currentHealth: 100, regeneration: 0, regenDelay: 3,
      invincibilityTime: 0.5, deathDelay: 2, respawnEnabled: false, respawnTime: 5,
      onDamageEffect: '', onDeathEffect: ''
    },
    propertyDescriptors: [
      { key: 'maxHealth', label: 'Max Health', type: 'number', default: 100, min: 1, max: 10000, step: 10 },
      { key: 'currentHealth', label: 'Current Health', type: 'number', default: 100, min: 0, max: 10000, step: 10 },
      { key: 'regeneration', label: 'Regen/sec', type: 'number', default: 0, min: 0, max: 100, step: 1 },
      { key: 'regenDelay', label: 'Regen Delay (s)', type: 'number', default: 3, min: 0, max: 30, step: 0.5 },
      { key: 'invincibilityTime', label: 'Invincibility (s)', type: 'number', default: 0.5, min: 0, max: 5, step: 0.1 },
      { key: 'respawnEnabled', label: 'Respawn Enabled', type: 'boolean', default: false },
      { key: 'respawnTime', label: 'Respawn Time (s)', type: 'number', default: 5, min: 0, max: 60, step: 1 },
    ]
  },
  {
    type: 'combat',
    displayName: 'Combat System',
    description: 'Attack, damage dealing, and combat mechanics',
    icon: 'Sword',
    defaultProperties: {
      baseDamage: 10, attackSpeed: 1, critChance: 0.1, critMultiplier: 2,
      range: 2, damageType: 'physical', knockbackForce: 5, comboEnabled: true,
      maxCombo: 3, attackAnimations: ['attack01', 'attack02', 'attack03']
    },
    propertyDescriptors: [
      { key: 'baseDamage', label: 'Base Damage', type: 'number', default: 10, min: 0, max: 1000, step: 1 },
      { key: 'attackSpeed', label: 'Attack Speed', type: 'number', default: 1, min: 0.1, max: 5, step: 0.1 },
      { key: 'critChance', label: 'Crit Chance', type: 'number', default: 0.1, min: 0, max: 1, step: 0.05 },
      { key: 'critMultiplier', label: 'Crit Multiplier', type: 'number', default: 2, min: 1, max: 5, step: 0.1 },
      { key: 'range', label: 'Attack Range', type: 'number', default: 2, min: 0.5, max: 50, step: 0.5 },
      { key: 'damageType', label: 'Damage Type', type: 'select', default: 'physical', options: ['physical', 'fire', 'ice', 'lightning', 'poison', 'holy', 'dark'] },
      { key: 'knockbackForce', label: 'Knockback', type: 'number', default: 5, min: 0, max: 50, step: 1 },
      { key: 'comboEnabled', label: 'Combo Enabled', type: 'boolean', default: true },
      { key: 'maxCombo', label: 'Max Combo', type: 'number', default: 3, min: 1, max: 10, step: 1 },
    ]
  },
  {
    type: 'inventory',
    displayName: 'Inventory',
    description: 'Item storage and equipment management',
    icon: 'Package',
    defaultProperties: {
      capacity: 20, weight: 0, maxWeight: 100, goldAmount: 0,
      equipSlots: ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet'],
      dropOnDeath: false, pickupRange: 2
    },
    propertyDescriptors: [
      { key: 'capacity', label: 'Slot Capacity', type: 'number', default: 20, min: 1, max: 100, step: 1 },
      { key: 'maxWeight', label: 'Max Weight', type: 'number', default: 100, min: 0, max: 1000, step: 10 },
      { key: 'goldAmount', label: 'Gold', type: 'number', default: 0, min: 0, max: 999999, step: 1 },
      { key: 'dropOnDeath', label: 'Drop on Death', type: 'boolean', default: false },
      { key: 'pickupRange', label: 'Pickup Range', type: 'number', default: 2, min: 0.5, max: 10, step: 0.5 },
    ]
  },
  {
    type: 'lod',
    displayName: 'Level of Detail',
    description: 'Distance-based mesh quality switching',
    icon: 'Layers',
    defaultProperties: {
      enabled: true,
      levels: [
        { distance: 0, meshPath: '' },
        { distance: 25, meshPath: '' },
        { distance: 50, meshPath: '' },
        { distance: 100, meshPath: '' }
      ],
      fadeTransition: true,
      transitionTime: 0.5
    },
    propertyDescriptors: [
      { key: 'enabled', label: 'LOD Enabled', type: 'boolean', default: true },
      { key: 'fadeTransition', label: 'Fade Transition', type: 'boolean', default: true },
      { key: 'transitionTime', label: 'Transition Time', type: 'number', default: 0.5, min: 0, max: 2, step: 0.1 },
    ]
  },
];
