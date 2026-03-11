// ─── BabylonJS Weapon Attachment ──────────────────────────────────────────
// Hitbox body attached to a skeleton bone for melee damage detection.
// Ported from annihilate-dev WeaponAttachment.js.
//
// The hitbox follows a bone each frame. When the combat FSM enters a
// state tagged 'canDamage', collisions dispatch damage events.

import * as BABYLON from '@babylonjs/core';
import {
  type WeaponStyle, type HitboxConfig, type CombatTag,
} from './weapon-styles';
import { type CombatStateMachine } from './combat-state-machine';
import { type BabylonCharacterBase } from './babylon-character-base';

// ─── Types ────────────────────────────────────────────────────────────────

export interface WeaponAttachmentOptions {
  /** Debug visualization — show hitbox mesh */
  debug?: boolean;
  /** Collision group bitmask */
  collisionGroup?: number;
  /** Collision mask bitmask */
  collisionMask?: number;
}

export interface DamageEvent {
  attacker: BabylonCharacterBase;
  target: BABYLON.AbstractMesh;
  tags: CombatTag[];
  weaponStyle: WeaponStyle;
  hitPoint: BABYLON.Vector3;
}

export type DamageCallback = (event: DamageEvent) => void;

// ─── Weapon Attachment ────────────────────────────────────────────────────

export class BabylonWeaponAttachment {
  private scene: BABYLON.Scene;
  private character: BabylonCharacterBase;
  private fsm: CombatStateMachine;
  private weaponStyle: WeaponStyle;

  // Bone tracking
  private boneName: string;
  private bone: BABYLON.Bone | null = null;
  private offsetPosition: BABYLON.Vector3;
  private offsetRotation: BABYLON.Vector3;

  // Hitbox
  private hitboxMesh: BABYLON.AbstractMesh | null = null;
  private hitboxConfig: HitboxConfig;

  // Debug
  private debugMesh: BABYLON.Mesh | null = null;

  // State
  private isActive = false;
  private hitTargets = new Set<BABYLON.AbstractMesh>();
  private onDamage: DamageCallback | null = null;

  // Off-hand (shield etc.)
  private offhandAttachment: BabylonWeaponAttachment | null = null;

  constructor(
    scene: BABYLON.Scene,
    character: BabylonCharacterBase,
    fsm: CombatStateMachine,
    weaponStyle: WeaponStyle,
    options: WeaponAttachmentOptions = {},
  ) {
    this.scene = scene;
    this.character = character;
    this.fsm = fsm;
    this.weaponStyle = weaponStyle;

    this.boneName = weaponStyle.attachBone;
    this.hitboxConfig = weaponStyle.hitbox;

    const off = weaponStyle.attachOffset;
    this.offsetPosition = new BABYLON.Vector3(off.position.x, off.position.y, off.position.z);
    this.offsetRotation = new BABYLON.Vector3(off.rotation.x, off.rotation.y, off.rotation.z);

    // Find bone
    this.bone = character.getBone(this.boneName);

    // Create hitbox
    this.createHitbox(options);

    // Create off-hand if needed
    if (weaponStyle.offhandBone && weaponStyle.shieldHitbox) {
      this.offhandAttachment = BabylonWeaponAttachment.createOffhand(
        scene, character, fsm, weaponStyle, options,
      );
    }
  }

  // ─── Hitbox Creation ────────────────────────────────────────────────────

  private createHitbox(options: WeaponAttachmentOptions): void {
    const cfg = this.hitboxConfig;

    if (cfg.shape === 'box') {
      const he = cfg.halfExtents;
      this.hitboxMesh = BABYLON.MeshBuilder.CreateBox(
        `hitbox_${this.character.options.characterId ?? 'char'}`,
        { width: he.x * 2, height: he.y * 2, depth: he.z * 2 },
        this.scene,
      );
    } else if (cfg.shape === 'sphere') {
      this.hitboxMesh = BABYLON.MeshBuilder.CreateSphere(
        `hitbox_${this.character.options.characterId ?? 'char'}`,
        { diameter: cfg.radius * 2 },
        this.scene,
      );
    }

    if (this.hitboxMesh) {
      this.hitboxMesh.isVisible = false;
      this.hitboxMesh.isPickable = false;

      // Store reference on mesh metadata
      this.hitboxMesh.metadata = {
        isWeaponHitbox: true,
        attachment: this,
        character: this.character,
      };

      // Debug visualization
      if (options.debug) {
        this.setupDebugMesh();
      }
    }
  }

  private setupDebugMesh(): void {
    if (!this.hitboxMesh) return;

    // Make a visible copy
    this.debugMesh = this.hitboxMesh.clone(`debug_${this.hitboxMesh.name}`) as BABYLON.Mesh;
    this.debugMesh.isVisible = true;
    this.debugMesh.isPickable = false;

    const mat = new BABYLON.StandardMaterial('hitbox_debug_mat', this.scene);
    mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
    mat.alpha = 0.3;
    mat.wireframe = true;
    this.debugMesh.material = mat;
  }

  // ─── Off-hand Factory ───────────────────────────────────────────────────

  static createOffhand(
    scene: BABYLON.Scene,
    character: BabylonCharacterBase,
    fsm: CombatStateMachine,
    weaponStyle: WeaponStyle,
    options: WeaponAttachmentOptions = {},
  ): BabylonWeaponAttachment | null {
    if (!weaponStyle.offhandBone || !weaponStyle.shieldHitbox) return null;

    // Create a minimal weapon style for the off-hand
    const offhandStyle: WeaponStyle = {
      ...weaponStyle,
      attachBone: weaponStyle.offhandBone,
      attachOffset: weaponStyle.offhandOffset ?? weaponStyle.attachOffset,
      hitbox: weaponStyle.shieldHitbox,
    };

    return new BabylonWeaponAttachment(scene, character, fsm, offhandStyle, options);
  }

  // ─── Update ─────────────────────────────────────────────────────────────

  /**
   * Call every frame. Syncs hitbox to bone position, checks for damage.
   */
  update(): void {
    this.syncToBone();

    // Check if FSM allows damage
    const canDamage = this.fsm.hasTag('canDamage');

    if (canDamage && !this.isActive) {
      // Just entered damage window — clear hit list
      this.isActive = true;
      this.hitTargets.clear();
    } else if (!canDamage && this.isActive) {
      // Left damage window
      this.isActive = false;
      this.hitTargets.clear();
    }

    // Check for intersections when active
    if (this.isActive && this.hitboxMesh) {
      this.checkCollisions();
    }

    // Update off-hand
    this.offhandAttachment?.update();
  }

  private syncToBone(): void {
    if (!this.bone || !this.hitboxMesh || !this.character.rootMesh) return;

    // Get bone world matrix
    const boneMatrix = this.bone.getWorldMatrix();

    // Apply offset
    const offsetMatrix = BABYLON.Matrix.Compose(
      BABYLON.Vector3.One(),
      BABYLON.Quaternion.FromEulerAngles(
        this.offsetRotation.x,
        this.offsetRotation.y,
        this.offsetRotation.z,
      ),
      this.offsetPosition,
    );

    const finalMatrix = offsetMatrix.multiply(boneMatrix);

    // Decompose and apply to hitbox mesh
    const pos = new BABYLON.Vector3();
    const rot = new BABYLON.Quaternion();
    const scl = new BABYLON.Vector3();
    finalMatrix.decompose(scl, rot, pos);

    this.hitboxMesh.position.copyFrom(pos);
    this.hitboxMesh.rotationQuaternion = rot;

    // Sync debug mesh
    if (this.debugMesh) {
      this.debugMesh.position.copyFrom(pos);
      this.debugMesh.rotationQuaternion = rot.clone();
    }
  }

  private checkCollisions(): void {
    if (!this.hitboxMesh) return;

    // Simple intersection test against scene meshes
    const hitboxBounds = this.hitboxMesh.getBoundingInfo().boundingBox;

    for (const mesh of this.scene.meshes) {
      // Skip self, non-pickable, or already-hit targets
      if (mesh === this.hitboxMesh || mesh === this.debugMesh) continue;
      if (!mesh.isPickable || !mesh.isEnabled()) continue;
      if (this.hitTargets.has(mesh)) continue;

      // Skip own character's meshes
      if (this.character.meshes.includes(mesh)) continue;

      // Check if mesh has a "damageable" metadata flag
      if (!mesh.metadata?.isDamageable && !mesh.metadata?.isCharacter) continue;

      // Bounding box intersection
      if (this.hitboxMesh.intersectsMesh(mesh, false)) {
        this.hitTargets.add(mesh);
        this.dispatchDamage(mesh);
      }
    }
  }

  private dispatchDamage(target: BABYLON.AbstractMesh): void {
    const event: DamageEvent = {
      attacker: this.character,
      target,
      tags: this.fsm.getTags(),
      weaponStyle: this.weaponStyle,
      hitPoint: this.hitboxMesh?.position.clone() ?? BABYLON.Vector3.Zero(),
    };

    this.onDamage?.(event);
  }

  // ─── API ────────────────────────────────────────────────────────────────

  /** Register damage callback */
  setOnDamage(callback: DamageCallback): void {
    this.onDamage = callback;
  }

  /** Attach a visible weapon mesh to the bone */
  attachWeaponMesh(weaponMesh: BABYLON.AbstractMesh): void {
    if (!this.bone || !this.character.skeleton || !this.character.rootMesh) return;
    weaponMesh.attachToBone(this.bone, this.character.rootMesh);
    weaponMesh.position = this.offsetPosition.clone();
    weaponMesh.rotation = this.offsetRotation.clone();
  }

  /** Get the off-hand attachment (shield etc.) */
  getOffhand(): BabylonWeaponAttachment | null {
    return this.offhandAttachment;
  }

  /** Check if currently in damage window */
  isDamageActive(): boolean {
    return this.isActive;
  }

  // ─── Factory ────────────────────────────────────────────────────────────

  /**
   * Create a weapon attachment from a WeaponStyle config.
   */
  static fromStyle(
    scene: BABYLON.Scene,
    character: BabylonCharacterBase,
    fsm: CombatStateMachine,
    weaponStyle: WeaponStyle,
    options?: WeaponAttachmentOptions,
  ): BabylonWeaponAttachment {
    return new BabylonWeaponAttachment(scene, character, fsm, weaponStyle, options);
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  dispose(): void {
    this.hitboxMesh?.dispose();
    this.debugMesh?.dispose();
    this.offhandAttachment?.dispose();
    this.hitboxMesh = null;
    this.debugMesh = null;
    this.offhandAttachment = null;
    this.hitTargets.clear();
  }
}
