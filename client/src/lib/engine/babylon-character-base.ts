// ─── BabylonJS Character Base ─────────────────────────────────────────────
// Foundation class for animated 3D characters in BabylonJS.
// Ported from annihilate-dev CharacterBase.js.
//
// Handles GLTF loading, physics capsule, skeleton bone access,
// animation controller integration, and combat state machine wiring.
//
// USAGE:
//   const char = new BabylonCharacterBase(scene, {
//     modelPath: '/assets/models/character.glb',
//     weaponStyle: GREATSWORD,
//     position: new BABYLON.Vector3(0, 0, 0),
//   });
//   await char.load();
//   // In render loop: char.update(deltaTime);

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { type AnimSlot, type AnimClipMap } from './animation-slots';
import { type WeaponStyle } from './weapon-styles';
import { BabylonAnimController, createAnimController } from './babylon-anim-controller';
import {
  CombatStateMachine, buildCombatMachine, createDefaultActions,
  type FSMActions, type FSMGuards,
} from './combat-state-machine';

// ─── Types ────────────────────────────────────────────────────────────────

export interface CharacterOptions {
  /** Path to GLTF/GLB model */
  modelPath: string;
  /** Weapon style config (determines animations + combat FSM) */
  weaponStyle: WeaponStyle;
  /** Custom clip map override (uses weaponStyle.animSet if not provided) */
  clipMap?: AnimClipMap;
  /** Spawn position */
  position?: BABYLON.Vector3;
  /** Spawn rotation Y (radians) */
  rotationY?: number;
  /** Model scale */
  scale?: number;
  /** Character ID for FSM */
  characterId?: string;
  /** Physics capsule radius */
  bodyRadius?: number;
  /** Physics capsule height */
  bodyHeight?: number;
  /** Character mass */
  mass?: number;
  /** Base health */
  health?: number;
  /** Movement speed */
  speed?: number;
  /** Enable physics body */
  enablePhysics?: boolean;
}

export interface CharacterState {
  health: number;
  maxHealth: number;
  isAir: boolean;
  isAlive: boolean;
  fsmState: string;
  position: BABYLON.Vector3;
}

// ─── Character Base ───────────────────────────────────────────────────────

export class BabylonCharacterBase {
  // Scene
  readonly scene: BABYLON.Scene;
  readonly options: CharacterOptions;

  // Mesh & model
  rootMesh: BABYLON.AbstractMesh | null = null;
  meshes: BABYLON.AbstractMesh[] = [];
  skeleton: BABYLON.Skeleton | null = null;

  // Animation
  animController: BabylonAnimController | null = null;
  private rawAnimationGroups: BABYLON.AnimationGroup[] = [];

  // Combat
  fsm: CombatStateMachine | null = null;
  weaponStyle: WeaponStyle;

  // Physics
  physicsBody: BABYLON.PhysicsBody | null = null;

  // State
  health: number;
  maxHealth: number;
  speed: number;
  mass: number;
  isAir = false;
  isLoaded = false;

  // Position & rotation
  position: BABYLON.Vector3;
  rotationY = 0;

  // Facing direction (2D, XZ plane)
  facing = new BABYLON.Vector2(0, 1);
  direction = new BABYLON.Vector2(0, 0);

  /** Callback when character finishes loading */
  onLoaded: (() => void) | null = null;
  /** Callback when character takes damage */
  onDamage: ((amount: number) => void) | null = null;
  /** Callback when character dies */
  onDeath: (() => void) | null = null;

  constructor(scene: BABYLON.Scene, options: CharacterOptions) {
    this.scene = scene;
    this.options = options;
    this.weaponStyle = options.weaponStyle;
    this.health = options.health ?? 100;
    this.maxHealth = this.health;
    this.speed = options.speed ?? 5;
    this.mass = options.mass ?? 80;
    this.position = options.position?.clone() ?? BABYLON.Vector3.Zero();
    this.rotationY = options.rotationY ?? 0;
  }

  // ─── Loading ────────────────────────────────────────────────────────────

  /**
   * Load the GLTF model, set up animations, physics, and combat FSM.
   */
  async load(): Promise<void> {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      '',
      '',
      this.options.modelPath,
      this.scene,
    );

    this.meshes = result.meshes;
    this.rootMesh = result.meshes[0] ?? null;
    this.skeleton = result.skeletons[0] ?? null;
    this.rawAnimationGroups = result.animationGroups;

    // Position & scale
    if (this.rootMesh) {
      this.rootMesh.position = this.position;
      this.rootMesh.rotation.y = this.rotationY;
      const s = this.options.scale ?? 1;
      this.rootMesh.scaling = new BABYLON.Vector3(s, s, s);
    }

    // Stop all default-playing animations
    for (const ag of this.rawAnimationGroups) {
      ag.stop();
    }

    // Set up animation controller
    const clipMap = this.options.clipMap ?? this.weaponStyle.animSet;
    this.animController = createAnimController(
      this.rawAnimationGroups,
      clipMap,
      { blendSpeed: 8, autoDetectSlots: true },
    );

    // Set up combat FSM
    this.setupFSM();

    // Set up physics (optional)
    if (this.options.enablePhysics !== false) {
      this.setupPhysics();
    }

    // Start idle
    this.animController.fadeToSlot('idle');

    this.isLoaded = true;
    this.fsm?.send('loaded');
    this.onLoaded?.();
  }

  // ─── FSM Setup ──────────────────────────────────────────────────────────

  protected setupFSM(): void {
    const { machine } = buildCombatMachine(
      this.weaponStyle,
      this.options.characterId ?? 'character',
    );
    this.fsm = machine;

    // Create default actions that bridge FSM → AnimController
    if (this.animController) {
      const fadeToSlot = (slot: AnimSlot, fadeDuration?: number, speed?: number) => {
        this.animController?.fadeToSlot(slot, fadeDuration, speed);
      };
      const playOneShot = (slot: AnimSlot, returnSlot?: AnimSlot, speed?: number) => {
        this.animController?.playOneShot(slot, returnSlot, speed);
      };

      const defaultActions = createDefaultActions(fadeToSlot, playOneShot, this.weaponStyle);

      // Override physics-related actions
      const physicsActions: FSMActions = {
        jump: () => this.applyJump(),
        setMassZero: () => this.setMassZero(),
        restoreMass: () => this.restoreMass(),
      };

      machine.bindActions({ ...defaultActions, ...physicsActions });
    }

    // Default guards
    const guards: FSMGuards = {
      isCharged: () => false,
      isAir: () => this.isAir,
    };
    machine.bindGuards(guards);

    // Wire transition callback
    machine.onTransition = (from, to, event) => {
      this.onFSMTransition(from, to, event);
    };
  }

  /** Override in subclass for custom transition handling */
  protected onFSMTransition(from: string, to: string, event: string): void {
    // Base: no-op. Subclasses can add VFX, sound, etc.
  }

  // ─── Physics ────────────────────────────────────────────────────────────

  protected setupPhysics(): void {
    if (!this.rootMesh) return;

    // BabylonJS physics v2 — create aggregate with capsule shape
    const radius = this.options.bodyRadius ?? 0.5;
    const height = this.options.bodyHeight ?? 1.65;

    // Use a simple box aggregate as fallback (capsule requires PhysicsShapeCapsule)
    try {
      const aggregate = new BABYLON.PhysicsAggregate(
        this.rootMesh,
        BABYLON.PhysicsShapeType.CAPSULE,
        { mass: this.mass, radius, pointA: new BABYLON.Vector3(0, radius, 0), pointB: new BABYLON.Vector3(0, height - radius, 0) },
        this.scene,
      );
      this.physicsBody = aggregate.body;
      // Lock rotation
      this.physicsBody.setMassProperties({ inertia: BABYLON.Vector3.Zero() });
    } catch {
      // Physics might not be enabled in scene — skip silently
      console.warn('BabylonCharacterBase: Physics not available, skipping body creation');
    }
  }

  protected applyJump(): void {
    if (!this.physicsBody) return;
    const jumpVel = this.weaponStyle.stats.jumpVelocity;
    this.physicsBody.setLinearVelocity(new BABYLON.Vector3(0, jumpVel, 0));
  }

  protected setMassZero(): void {
    if (!this.physicsBody) return;
    this.physicsBody.setMassProperties({ mass: 0 });
  }

  protected restoreMass(): void {
    if (!this.physicsBody) return;
    this.physicsBody.setMassProperties({ mass: this.mass });
  }

  // ─── Update Loop ────────────────────────────────────────────────────────

  /**
   * Call every frame with delta time in seconds.
   */
  update(deltaTime: number): void {
    if (!this.isLoaded) return;

    // Update animation blending
    this.animController?.update(deltaTime);

    // Sync mesh position to physics (if physics enabled)
    if (this.physicsBody && this.rootMesh) {
      const pos = this.physicsBody.transformNode.position;
      this.rootMesh.position.copyFrom(pos);
      this.position.copyFrom(pos);
    }

    // Air state detection (override for physics-based check)
    this.updateAirState();
  }

  /** Override for physics-based ground check */
  protected updateAirState(): void {
    // Default: no-op. Subclass can raycast for ground.
  }

  // ─── Combat Reactions ───────────────────────────────────────────────────

  /** Take damage from an attack */
  takeDamage(amount: number, knockback?: BABYLON.Vector3): void {
    this.health = Math.max(0, this.health - amount);
    this.onDamage?.(amount);

    if (this.health <= 0) {
      this.die();
    } else {
      this.fsm?.send('hit');
      if (knockback && this.physicsBody) {
        this.physicsBody.applyImpulse(
          knockback,
          this.rootMesh?.position ?? BABYLON.Vector3.Zero(),
        );
      }
    }
  }

  /** Kill the character */
  die(): void {
    this.health = 0;
    this.animController?.fadeToSlot('dead');
    this.onDeath?.();
  }

  /** Check if alive */
  isAlive(): boolean {
    return this.health > 0;
  }

  // ─── Bone Access ────────────────────────────────────────────────────────

  /** Get a bone by name for weapon attachment */
  getBone(boneName: string): BABYLON.Bone | null {
    if (!this.skeleton) return null;
    return this.skeleton.bones.find(b => b.name === boneName) ?? null;
  }

  /** Get a bone's world transform matrix */
  getBoneWorldMatrix(boneName: string): BABYLON.Matrix | null {
    const bone = this.getBone(boneName);
    if (!bone) return null;
    return bone.getWorldMatrix();
  }

  // ─── Weapon Style ───────────────────────────────────────────────────────

  /** Switch weapon style at runtime */
  setWeaponStyle(style: WeaponStyle): void {
    this.weaponStyle = style;

    // Update clip map
    this.animController?.setClipMap(style.animSet);

    // Rebuild FSM
    this.setupFSM();

    // Reset to idle
    this.animController?.fadeToSlot('idle');
  }

  // ─── Query ──────────────────────────────────────────────────────────────

  /** Get current character state snapshot */
  getState(): CharacterState {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      isAir: this.isAir,
      isAlive: this.isAlive(),
      fsmState: this.fsm?.getState() ?? 'loading',
      position: this.position.clone(),
    };
  }

  /** Get all animation group names (for UI/preview) */
  getAnimationNames(): string[] {
    return this.rawAnimationGroups.map(ag => ag.name);
  }

  /** Preview a specific animation by name (for editor) */
  previewAnimation(name: string): void {
    this.animController?.fadeToAction(name);
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  dispose(): void {
    this.animController?.dispose();
    this.fsm?.dispose();

    // Remove physics
    if (this.physicsBody) {
      this.physicsBody.dispose();
      this.physicsBody = null;
    }

    // Remove meshes
    for (const mesh of this.meshes) {
      mesh.dispose();
    }
    this.meshes = [];
    this.rootMesh = null;
    this.skeleton = null;
    this.isLoaded = false;
  }
}
