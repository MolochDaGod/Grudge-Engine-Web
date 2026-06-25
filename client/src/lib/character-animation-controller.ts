/**
 * GrudgeController — THE canonical character controller for all 3D games in Grudge Studio.
 *
 * This is the single controller you use everywhere for grudge6 / 25-bone Meshy characters
 * (R3F, plain Three, launcher embeds, training, actual games).
 *
 * See CANONICAL_MAP.md → "The Grudge Controller" section.
 *
 * Features (low cost, deterministic):
 * - Full animation state machine using animation-manifest.ts (the one source)
 * - Weapon-specific clips via getClipForWeaponSkill (maps T0 1-5 exactly)
 * - Hand bone grips for mesh weapons/armour (no fingers, cheap Object3D attachments)
 * - Directional dodge that returns velocity impulse
 * - performSkill(slot) using canonical weaponSkills mapping
 * - Locomotion + combat states + equip
 * - Simple input-driven update()
 *
 * Usage (any 3D Grudge project):
 *   const ctrl = new GrudgeController(scene, mixer, actions);
 *   ctrl.equip(weaponMesh, 'right', 'sword');
 *   ctrl.update(delta, { forward: 1, attack: false, skillSlot: 3 });
 *   const action = ctrl.useSkill(1);   // main attack for current weapon
 *
 * T0 hotkeys (the ones you specified):
 *   1 main attack | 2 first skill | 3 maneuver/trap/tele | 4 heavy | 5 unique
 *
 * Always use Grudge 6 race characters from grudge6.grudge-studio.com (or local /assets/characters/races).
 */

import * as THREE from 'three';
import {
  WEAPON_ANIM_MAP,
  BASE_LOCOMOTION,
  WeaponSlot,
  getClipForWeaponSkill,
  resolveClipName,
} from './animation-manifest';

export type AnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'talk'           // Q&A
  | 'answer'         // Q&A
  | 'gesture'        // Q&A hand wave etc.
  | 'attack'
  | 'heavy'
  | 'cast'
  | 'equip'
  | 'hit'
  | 'death'
  | 'dodge_forward' | 'dodge_backward' | 'dodge_left' | 'dodge_right';

export type Hand = 'left' | 'right';

export interface GripOffset {
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

export class GrudgeController {
  private scene: THREE.Group;
  private mixer: THREE.AnimationMixer;
  private actions: Record<string, THREE.AnimationAction>;
  private currentState: AnimationState = 'idle';
  private currentWeapon: WeaponSlot = 'unarmed';
  private currentGrips: Record<Hand, THREE.Object3D | null> = { left: null, right: null };
  private equippedItems: Record<Hand, THREE.Object3D | null> = { left: null, right: null };

  // Pre-defined cheap deterministic grip offsets for your 25-bone Meshy rigs.
  // Tune these once per weapon category + common states. Store in JSON if you want data-driven.
  private static GRIP_OFFSETS: Record<string, Record<Hand, GripOffset>> = {
    unarmed: {
      left: { position: new THREE.Vector3(0, 0.01, 0.05), rotation: new THREE.Euler(-0.2, 0.1, 0) },
      right: { position: new THREE.Vector3(0, 0.01, 0.05), rotation: new THREE.Euler(-0.2, -0.1, 0) },
    },
    sword: {
      left: { position: new THREE.Vector3(0, 0, 0.08), rotation: new THREE.Euler(0, 0, 0) },
      right: { position: new THREE.Vector3(0, 0, 0.08), rotation: new THREE.Euler(0, 0, 0) },
    },
    staff: {
      left: { position: new THREE.Vector3(0.02, 0.03, 0.06), rotation: new THREE.Euler(-0.3, 0, 0) },
      right: { position: new THREE.Vector3(0.02, 0.03, 0.06), rotation: new THREE.Euler(-0.3, 0, 0) },
    },
    bow: {
      left: { position: new THREE.Vector3(0, 0.02, 0.04), rotation: new THREE.Euler(-0.5, 1.2, 0) },
      right: { position: new THREE.Vector3(0, 0.02, 0.04), rotation: new THREE.Euler(-0.5, 1.2, 0) },
    },
    // Add your other weapon categories here (axe, gun, etc.)
    gun: {
      left: { position: new THREE.Vector3(0.05, 0.02, 0.0), rotation: new THREE.Euler(-0.1, 1.4, 0.1) }, // support hand
      right: { position: new THREE.Vector3(0, 0.01, 0.04), rotation: new THREE.Euler(-0.2, -0.1, 0) }, // trigger hand
    },
    default: {
      left: { position: new THREE.Vector3(0, 0.02, 0.08), rotation: new THREE.Euler(-0.3, 0, 0) },
      right: { position: new THREE.Vector3(0, 0.02, 0.08), rotation: new THREE.Euler(-0.3, 0, 0) },
    },
  };

  constructor(scene: THREE.Group, mixer: THREE.AnimationMixer, actions: Record<string, THREE.AnimationAction>, initialWeapon: WeaponSlot = 'unarmed') {
    this.scene = scene;
    this.mixer = mixer;
    this.actions = actions;
    this.currentWeapon = initialWeapon;

    this.findAndCreateGrips();
    this.setState('idle');
  }

  /** Preferred name for new code. */
  static create = GrudgeController;

  private findAndCreateGrips() {
    // Meshy 25-bone no-finger friendly name patterns.
    // Adjust if your exact export uses different casing.
    const handPatterns = {
      left: ['lefthand', 'left_hand', 'l_hand', 'leftwrist', 'l_wrist'],
      right: ['righthand', 'right_hand', 'r_hand', 'rightwrist', 'r_wrist'],
    };

    this.scene.traverse((obj: any) => {
      if (obj.isBone) {
        const name = obj.name.toLowerCase().replace(/mixamorig:|_| /g, '');

        (['left', 'right'] as Hand[]).forEach((side) => {
          if (!this.currentGrips[side] && handPatterns[side].some(p => name.includes(p))) {
            const grip = new THREE.Object3D();
            grip.name = `${side}HandGrip`;
            obj.add(grip);
            this.currentGrips[side] = grip;
          }
        });
      }
    });
  }

  /** Set the current weapon — this changes which animation clips are used (deterministic) */
  setWeapon(weapon: WeaponSlot) {
    if (weapon === this.currentWeapon) return;
    this.currentWeapon = weapon;
    // Re-apply current state with new weapon's clip map
    this.setState(this.currentState, 0.1);
  }

  /** Resolve the actual clip name for current weapon + state using the manifest */
  private resolveClipName(state: AnimationState): string | null {
    // Prefer manifest helper
    try {
      // @ts-ignore - state may be a locomotion key
      const fromManifest = resolveClipName(this.currentWeapon, state as any);
      if (fromManifest) return fromManifest;
    } catch {}
    const weaponMap = WEAPON_ANIM_MAP[this.currentWeapon] || WEAPON_ANIM_MAP.unarmed;
    const baseMap = BASE_LOCOMOTION;
    const clipName = weaponMap[state as any] ?? baseMap[state as any] ?? null;
    return clipName;
  }

  /** Intuitive deterministic API — call from your AI or input system */
  setState(newState: AnimationState, fadeTime = 0.2) {
    if (newState === this.currentState && this.currentWeapon === this.currentWeapon) return; // simplified

    const fromAction = this.actions[this.currentState];
    const clipName = this.resolveClipName(newState);
    let toAction = clipName ? this.actions[clipName] || this.actions[newState] : this.actions[newState] || this.actions['idle'];

    if (!toAction && this.actions['idle']) {
      toAction = this.actions['idle'];
    }

    if (fromAction && toAction && fromAction !== toAction) {
      fromAction.fadeOut(fadeTime);
      toAction.reset().fadeIn(fadeTime).play();
    } else if (toAction) {
      toAction.reset().play();
    }

    this.currentState = newState;

    // Re-apply current equipment grips for the new animation pose (cheap & deterministic)
    this.reapplyEquipmentGrips();
  }

  /** Equip a weapon/prop to a hand using pre-defined cheap grip for current state */
  equip(item: THREE.Object3D, hand: Hand = 'right', weaponCategory: WeaponSlot = 'unarmed') {
    this.unequip(hand);
    this.setWeapon(weaponCategory);

    const grip = this.currentGrips[hand];
    if (!grip) {
      console.warn(`No ${hand} hand grip found on 25-bone rig. Falling back to root.`);
      this.scene.add(item);
      this.equippedItems[hand] = item;
      return;
    }

    const offsets = CharacterAnimationController.GRIP_OFFSETS[weaponCategory] ||
                    CharacterAnimationController.GRIP_OFFSETS.default;
    const off = offsets[hand];

    item.position.copy(off.position);
    item.rotation.copy(off.rotation);
    grip.add(item);

    this.equippedItems[hand] = item;
    item.userData.equippedHand = hand;
    item.userData.weaponCategory = weaponCategory;

    // Ensure gun (and weapons) render correctly
    item.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (weaponCategory === 'gun') {
          child.material = child.material || new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
        }
      }
    });
  }

  unequip(hand: Hand = 'right') {
    const item = this.equippedItems[hand];
    if (item) {
      const parent = item.parent;
      if (parent) parent.remove(item);
      this.equippedItems[hand] = null;
    }
  }

  private reapplyEquipmentGrips() {
    (['left', 'right'] as Hand[]).forEach(hand => {
      const item = this.equippedItems[hand];
      if (item && item.userData.weaponCategory) {
        this.equip(item, hand, item.userData.weaponCategory);
      }
    });
  }

  /** Call every frame — super cheap */
  update(delta: number, aimTarget?: THREE.Vector3) {
    this.mixer.update(delta);

    if (this.currentWeapon === 'gun' && aimTarget) {
      this.aimGun(aimTarget);
    }
  }

  /** For your AI: get current state intuitively */
  getState() { return this.currentState; }

  /** Simple IK for guns/aiming - adjusts grip orientation towards target.
   * Call in update when using gun and aiming state.
   * Keeps low-cost, no full solver.
   */
  aimGun(target: THREE.Vector3, hand: Hand = 'right') {
    const grip = this.currentGrips[hand];
    if (!grip) return;

    // Get world position of grip
    const gripWorld = new THREE.Vector3();
    grip.getWorldPosition(gripWorld);

    // Direction from grip to target
    const dir = target.clone().sub(gripWorld).normalize();

    // Compute look rotation (simple)
    const lookQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1), // forward in grip local?
      dir
    );

    // Apply to grip, blended or direct for aim
    grip.quaternion.slerp(lookQuat, 0.5); // smooth

    // For better arm IK, traverse to find arm bones and rotate them, but this grip offset works for attachment
  }

  /** Helper for AI to know if we can attack etc. (deterministic rules) */
  canPerform(action: string) {
    // Simple cheap rules you can expand
    const state = this.currentState;
    if (action === 'attack') return !['death', 'hit'].includes(state);
    if (action === 'talk') return state === 'idle' || state === 'talk';
    return true;
  }

  /** Dodge - intuitive deterministic dodge in direction (follows reference animator UX).
   * Plays specific dodge anim when available (dodge_forward etc from manifest/EXTRA).
   * Returns velocity impulse + duration for the calling game controller / physics to apply.
   * See canonical map + Voxel-Forge-Core animator reference for desired dodge + hotkey feel.
   */
  dodge(direction: 'forward' | 'backward' | 'left' | 'right' = 'backward', fadeTime = 0.08) {
    // Prefer weapon or direction specific if loaded in actions
    const candidates = [
      `dodge_${direction}`,
      'dodge_forward',
      'dodge',
      'roll',
      'evade',
    ];
    let played = false;
    for (const c of candidates) {
      const act = this.actions[c];
      if (act) {
        this.setState(c as any, fadeTime);
        played = true;
        break;
      }
    }
    if (!played) {
      this.setState('dodge', fadeTime);
    }

    const vel = this.getDodgeVelocity(direction);
    // Caller (three-demo or full game controller) should apply this to character root for root-motion feel
    return { duration: 0.55, velocity: vel, direction };
  }

  private getDodgeVelocity(dir: string) {
    const speed = 7.5;
    switch (dir) {
      case 'forward': return { x: 0, y: 0, z: -speed };
      case 'backward': return { x: 0, y: 0, z: speed };
      case 'left': return { x: -speed, y: 0, z: 0 };
      case 'right': return { x: speed, y: 0, z: 0 };
      default: return { x: 0, y: 0, z: speed };
    }
  }

  /**
   * THE canonical skill trigger (T0 1-5 hotkeys).
   * Uses getClipForWeaponSkill from the manifest (which mirrors the canonical
   * weaponSkills.ts in the launcher shared folder).
   *
   * See docs/CANONICAL_MAP.md
   */
  performSkill(slot: 1 | 2 | 3 | 4 | 5, weapon: WeaponSlot = this.currentWeapon) {
    if (weapon !== this.currentWeapon) this.setWeapon(weapon);

    const clipName = getClipForWeaponSkill(weapon, slot);

    let actionState: AnimationState = 'attack';
    if (slot === 3) {
      return { type: 'maneuver', ...this.dodge('backward') };
    }
    if (slot === 4) actionState = 'heavy' as any;
    if (slot === 5) actionState = 'cast' as any;

    const target = this.actions[clipName] || this.actions[actionState as string] || this.actions['attack'] || this.actions['idle'];
    if (target) {
      // one-shot style play for skills
      target.reset().fadeIn(0.05).play();
      // let it finish then we can go back to locomotion in a real game loop
      setTimeout(() => {
        if (this.currentState !== 'death' && this.currentState !== 'hit') {
          this.setState('idle', 0.15);
        }
      }, 650);
    } else {
      this.setState(actionState, 0.06);
    }

    return {
      type: slot === 1 ? 'main' : slot === 4 ? 'heavy' : slot === 5 ? 'unique' : 'skill',
      slot,
      weapon,
      clip: clipName,
      duration: 0.7,
    };
  }
}

// Simple example deterministic AI for Q&A NPCs (one per race)
// No heavy cost — just timers + distance checks.
export class SimpleNpcAI {
  private controller: GrudgeController;
  private stateTimer = 0;
  private playerDistance = 10;

  constructor(controller: GrudgeController) {
    this.controller = controller;
  }

  update(delta: number, playerPos: THREE.Vector3, npcPos: THREE.Vector3) {
    this.playerDistance = playerPos.distanceTo(npcPos);
    this.stateTimer += delta;

    const current = this.controller.getState();

    // Intuitive deterministic rules for Q&A NPC
    if (this.playerDistance < 3 && current !== 'talk' && current !== 'answer') {
      this.controller.setState('talk', 0.3);
      // Optionally equip a "mic" or note prop
      // this.controller.equip(yourMicModel, 'right', 'unarmed');
    } else if (this.playerDistance > 8 && current === 'talk') {
      this.controller.setState('idle', 0.4);
    }

    // Cycle through gestures/answers every few seconds while talking
    if (current === 'talk' && this.stateTimer > 4) {
      this.controller.setState(Math.random() > 0.5 ? 'answer' : 'gesture', 0.25);
      this.stateTimer = 0;
    }
    if ((current === 'answer' || current === 'gesture') && this.stateTimer > 3) {
      this.controller.setState('talk', 0.25);
      this.stateTimer = 0;
    }
  }
}
