/**
 * havok-character-controller.ts — Grudge Warlords Havok Character Controller
 *
 * Based on ergoudan (https://github.com/armomu/ergoudan) — MIT licence.
 * Extended with weapon-based animation states, race support, and
 * combat ↔ harvest mode toggle.
 *
 * Physics model (same as ergoudan)
 * ─────────────────────────────────
 *   A transparent PhysicsAggregate capsule is the actual physics body.
 *   The visual character mesh attaches as a child.
 *   Velocity is set directly via physicsBody.setLinearVelocity().
 *   Stair climbing is done by bumping the Y velocity when a stair-edge
 *   raycast hits.
 *
 * Modes
 * ─────
 *   Harvest mode  (Tab, default): W always faces away from camera.
 *                                 Character turns to face move direction.
 *   Combat mode   (Tab toggle):   Mouse target is kept in front of character.
 *                                 Strafing uses the 8-directional rifle/bow set.
 *
 * Weapon states
 * ─────────────
 *   Weapon slot changes drive which Mixamo clip set to blend.
 *   See animation-manifest.ts for the full mapping.
 *
 * Usage
 * ─────
 *   const ctrl = await HavokCharacterController.create(scene, canvas, {
 *     race: 'orc',
 *     charClass: 'warrior',
 *   });
 *   ctrl.equip('sword_shield');
 *   ctrl.toggleCombatMode();
 *   ctrl.setHP(0.03); // below 5% → injured animations
 */

import * as BABYLON from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import {
  type Race,
  type CharClass,
  type WeaponSlot,
  type LocomotionState,
  RACE_MODEL_PATHS,
  RACE_SCALE,
  RACE_SPEED,
  resolveClipName,
  findAnimationGroup,
  XBOT_FALLBACK,
} from './animation-manifest';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HavokControllerOptions {
  race?:        Race;
  charClass?:   CharClass;
  modelUrl?:    string;           // override race model path
  walkSpeed?:   number;           // units/s default 6
  runSpeed?:    number;           // units/s default 13
  jumpHeight?:  number;           // approx metres default 3.5
  gravity?:     number;           // default 30
  cameraRadius?: number;          // arc-rotate radius default 8
  cameraHeightOffset?: number;    // camera target height default 1.6
}

export type ControllerMode = 'harvest' | 'combat';

// 8-directional input map key names (ergoudan pattern)
interface InputMap { [code: string]: boolean }

// ── Constants ──────────────────────────────────────────────────────────────────

const CAPSULE_HEIGHT  = 1.8;   // metres
const CAPSULE_RADIUS  = 0.35;
const FOOT_RAY_LEN    = 0.4;   // ground detection below capsule
const STAIR_RAY_LEN   = 0.28;  // stair-edge detection forward
const MAX_SLOPE_DEG   = 30;
const BLEND_STEP      = 0.08;  // weight blend per animation frame
const INJURED_HP_THRESHOLD = 0.05;

// ── HavokCharacterController ──────────────────────────────────────────────────

export class HavokCharacterController {

  // Babylon objects
  private scene:      BABYLON.Scene;
  private canvas:     HTMLCanvasElement;
  private capsule:    BABYLON.Mesh;
  private meshRoot:   BABYLON.AbstractMesh;
  private container:  BABYLON.AssetContainer;
  private camera:     BABYLON.ArcRotateCamera;
  private aggregate:  BABYLON.PhysicsAggregate;
  private physEngine: BABYLON.IPhysicsEngine;

  // Configuration
  readonly race:      Race;
  readonly charClass: CharClass;
  private walkSpeed:  number;
  private runSpeed:   number;
  private jumpLimit:  number;
  private gravity:    number;

  // Race-speed multipliers
  private raceWalkMult: number;
  private raceRunMult:  number;

  // Physics state (ergoudan pattern)
  private velocity         = new BABYLON.Vector3(0, -9.8, 0);
  private footRaycast      = new BABYLON.PhysicsRaycastResult();
  private staircaseRaycast = new BABYLON.PhysicsRaycastResult();
  private staircaseRay!:   BABYLON.Ray;
  private jumpState = {
    jump:      false,
    fall:      false,
    hasTask:   false,
    startY:    0,
    limit:     3.5,
  };
  private staircaseState = { task: false, height: 0 };

  // Input
  private inputMap:   InputMap = {};
  private isMoving:   boolean  = false;

  // Mode
  private mode:       ControllerMode = 'harvest';
  private equippedWeapon: WeaponSlot = 'unarmed';
  private hpRatio:    number         = 1;

  // Animation
  private animGroups: BABYLON.AnimationGroup[] = [];
  private curAnim:    number = 0;
  private oldAnim:    number = 0;
  private curWeight:  number = 1;
  private oldWeight:  number = 0;
  // Named lookup  (clipName → index)
  private animIndex:  Map<string, number> = new Map();

  // Observers
  private beforeRenderObs!:  BABYLON.Observer<BABYLON.Scene>;
  private beforeAnimObs!:    BABYLON.Observer<BABYLON.Scene>;

  private isActive = false;

  // ── Private constructor (use ::create) ────────────────────────────────────

  private constructor(
    scene:   BABYLON.Scene,
    canvas:  HTMLCanvasElement,
    opts:    Required<HavokControllerOptions>,
    capsule: BABYLON.Mesh,
    root:    BABYLON.AbstractMesh,
    anims:   BABYLON.AnimationGroup[],
    container: BABYLON.AssetContainer,
  ) {
    this.scene     = scene;
    this.canvas    = canvas;
    this.capsule   = capsule;
    this.meshRoot  = root;
    this.container = container;
    this.animGroups = anims;
    this.race      = (opts.race      ?? 'human') as Race;
    this.charClass = (opts.charClass ?? 'warrior') as CharClass;
    this.walkSpeed = opts.walkSpeed   ?? 6;
    this.runSpeed  = opts.runSpeed    ?? 13;
    this.jumpLimit = opts.jumpHeight  ?? 3.5;
    this.gravity   = opts.gravity     ?? 30;

    const raceSpd  = RACE_SPEED[this.race] ?? { walk: 1, run: 1 };
    this.raceWalkMult = raceSpd.walk;
    this.raceRunMult  = raceSpd.run;

    this.physEngine = scene.getPhysicsEngine()!;

    // ── PhysicsAggregate capsule (ergoudan pattern) ─────────────────────────
    const agg = new BABYLON.PhysicsAggregate(
      capsule,
      BABYLON.PhysicsShapeType.CAPSULE,
      { mass: 75, friction: 0.8, restitution: 0 },
      scene,
    );
    agg.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
    agg.body.disablePreStep = false;
    agg.body.setMassProperties({ inertia: new BABYLON.Vector3(0, 0, 0) }); // lock rotation
    this.aggregate = agg;

    // ── Stair-edge ray (attached forward at ankle height) ──────────────────
    // @ts-ignore — new Ray() with no args works at runtime
    this.staircaseRay = new BABYLON.Ray();
    const stairHelper = new BABYLON.RayHelper(this.staircaseRay);
    stairHelper.attachToMesh(
      root,
      new BABYLON.Vector3(0, -0.7, 1), // direction: down-forward
      new BABYLON.Vector3(0, 0.3, 0.4), // offset from mesh origin
      STAIR_RAY_LEN,
    );

    // ── Camera ──────────────────────────────────────────────────────────────
    this.camera = new BABYLON.ArcRotateCamera(
      'grudgeCharCam',
      -Math.PI / 2,
      Math.PI / 3,
      opts.cameraRadius ?? 8,
      capsule.position.clone(),
      scene,
    );
    this.camera.lowerRadiusLimit  = 2;
    this.camera.upperRadiusLimit  = 18;
    this.camera.lowerBetaLimit    = 0.15;
    this.camera.upperBetaLimit    = Math.PI / 2 - 0.05;
    this.camera.angularSensibilityX = 800;
    this.camera.angularSensibilityY = 800;
    this.camera.panningSensibility  = 0;

    // ── Build animation index map ───────────────────────────────────────────
    anims.forEach((ag, i) => {
      const key = ag.name.toLowerCase().replace(/[_\s-]+/g, ' ').trim();
      this.animIndex.set(key, i);
      this.animIndex.set(ag.name, i); // also raw name
    });

    // ── Input ───────────────────────────────────────────────────────────────
    scene.actionManager = scene.actionManager ?? new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (e) => {
        this.inputMap[e.sourceEvent.code] = true;
        if (e.sourceEvent.code === 'Tab') {
          e.sourceEvent.preventDefault();
          this.toggleMode();
        }
      }),
    );
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, (e) => {
        this.inputMap[e.sourceEvent.code] = false;
      }),
    );
  }

  // ── Public factory ──────────────────────────────────────────────────────────

  /**
   * Create and initialise a controller — async because it loads the model and
   * boots Havok.
   */
  static async create(
    scene:  BABYLON.Scene,
    canvas: HTMLCanvasElement,
    opts:   HavokControllerOptions = {},
  ): Promise<HavokCharacterController> {

    // 1. Boot Havok if not already running
    if (!scene.getPhysicsEngine()) {
      const havok = await HavokPhysics();
      const plugin = new BABYLON.HavokPlugin(true, havok);
      scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), plugin);
    }

    // 2. Resolve model URL
    const race     = (opts.race      ?? 'human') as Race;
    const scale    = RACE_SCALE[race] ?? 1;
    const rawUrl   = opts.modelUrl ?? RACE_MODEL_PATHS[race] ?? XBOT_FALLBACK;
    const rootUrl  = rawUrl.substring(0, rawUrl.lastIndexOf('/') + 1);
    const filename = rawUrl.substring(rawUrl.lastIndexOf('/') + 1);

    // 3. Load model
    let container: BABYLON.AssetContainer;
    try {
      container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
        rootUrl, filename, scene,
      );
    } catch {
      console.warn(`[HavokCtrl] Model not found: ${rawUrl} — using X-Bot fallback`);
      const fbUrl = XBOT_FALLBACK;
      const fbRoot = fbUrl.substring(0, fbUrl.lastIndexOf('/') + 1);
      const fbFile = fbUrl.substring(fbUrl.lastIndexOf('/') + 1);
      container = await BABYLON.SceneLoader.LoadAssetContainerAsync(fbRoot, fbFile, scene);
    }

    container.addAllToScene();

    const [meshRoot] = container.meshes;

    // 4. Invisible capsule (physics body)
    const capsule = BABYLON.MeshBuilder.CreateCapsule(
      '__grudge_capsule__',
      { height: CAPSULE_HEIGHT + CAPSULE_RADIUS * 2, radius: CAPSULE_RADIUS },
      scene,
    );
    capsule.visibility = 0;
    capsule.position.set(0, CAPSULE_HEIGHT / 2 + 0.1, 0);

    // 5. Scale and parent mesh to capsule
    meshRoot.scaling.setAll(scale);
    meshRoot.position.y = -(CAPSULE_HEIGHT / 2 + CAPSULE_RADIUS);
    capsule.addChild(meshRoot);

    // 6. Start all animations at weight 0 (idle at 1)
    const anims = container.animationGroups;
    anims.forEach((ag, i) => {
      ag.start(true, 1.0);
      ag.setWeightForAllAnimatables(i === 0 ? 1 : 0);
    });

    const required: Required<HavokControllerOptions> = {
      race:              opts.race        ?? 'human',
      charClass:         opts.charClass   ?? 'warrior',
      modelUrl:          rawUrl,
      walkSpeed:         opts.walkSpeed   ?? 6,
      runSpeed:          opts.runSpeed    ?? 13,
      jumpHeight:        opts.jumpHeight  ?? 3.5,
      gravity:           opts.gravity     ?? 30,
      cameraRadius:      opts.cameraRadius ?? 8,
      cameraHeightOffset: opts.cameraHeightOffset ?? 1.6,
    };

    return new HavokCharacterController(
      scene, canvas, required, capsule, meshRoot, anims, container,
    );
  }

  // ── Activation ──────────────────────────────────────────────────────────────

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.scene.activeCamera?.detachControl();
    this.scene.activeCamera = this.camera;
    this.camera.attachControl(this.canvas, true);
    this.camera.setTarget(this.capsule.position.clone());

    this.beforeRenderObs = this.scene.onBeforeRenderObservable.add(
      this.onBeforeRender.bind(this),
    )!;
    this.beforeAnimObs = this.scene.onBeforeAnimationsObservable.add(
      this.onBeforeAnimations.bind(this),
    )!;

    this.playAnim(0); // idle
    console.log('[HavokCtrl] activated — Tab toggles combat/harvest mode');
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;

    this.scene.onBeforeRenderObservable.remove(this.beforeRenderObs);
    this.scene.onBeforeAnimationsObservable.remove(this.beforeAnimObs);
    this.camera.detachControl();
    this.animGroups.forEach(ag => ag.stop());
    this.inputMap = {};
    console.log('[HavokCtrl] deactivated');
  }

  dispose(): void {
    this.deactivate();
    this.aggregate.dispose();
    this.camera.dispose();
    this.container.removeAllFromScene();
    this.container.dispose();
  }

  // ── Public controls ──────────────────────────────────────────────────────────

  /** Equip a weapon and switch to its animation set */
  equip(weapon: WeaponSlot): void {
    this.equippedWeapon = weapon;
  }

  /** Set the current HP ratio (0–1). Below 5% triggers injured animations. */
  setHP(ratio: number): void {
    this.hpRatio = Math.max(0, Math.min(1, ratio));
  }

  /** Toggle combat / harvest mode (also bound to Tab) */
  toggleMode(): void {
    this.mode = this.mode === 'harvest' ? 'combat' : 'harvest';
    console.log(`[HavokCtrl] mode → ${this.mode}`);
  }

  getMode(): ControllerMode     { return this.mode; }
  getWeapon(): WeaponSlot        { return this.equippedWeapon; }
  getCamera(): BABYLON.ArcRotateCamera { return this.camera; }
  getMesh(): BABYLON.AbstractMesh      { return this.meshRoot; }

  // ── Render loop ──────────────────────────────────────────────────────────────

  private onBeforeRender(): void {
    const { x, y, z } = this.capsule.position;

    // ── Ground / foot raycast ──────────────────────────────────────────────
    const footOrigin = new BABYLON.Vector3(x, y - CAPSULE_HEIGHT / 2, z);
    const footEnd    = new BABYLON.Vector3(x, y - CAPSULE_HEIGHT / 2 - FOOT_RAY_LEN, z);
    (this.physEngine as any).raycastToRef(footOrigin, footEnd, this.footRaycast);

    // ── Stair-edge raycast ─────────────────────────────────────────────────
    const sStart = this.staircaseRay.origin.add(new BABYLON.Vector3(0, 0, 0.02));
    const sEnd   = sStart.add(new BABYLON.Vector3(0, -STAIR_RAY_LEN * 2.4, 0));
    (this.physEngine as any).raycastToRef(sStart, sEnd, this.staircaseRaycast);

    this.updateState();
    this.updateCamera();
  }

  private updateState(): void {
    const isRunning = this.inputMap['ShiftLeft'] || this.inputMap['ShiftRight'];

    // ── Determine move direction ───────────────────────────────────────────
    const dirs = {
      W: this.inputMap['KeyW'],
      S: this.inputMap['KeyS'],
      A: this.inputMap['KeyA'],
      D: this.inputMap['KeyD'],
    };
    this.isMoving = dirs.W || dirs.S || dirs.A || dirs.D;

    // ── Slope check ────────────────────────────────────────────────────────
    let slopeTooSteep = false;
    if (this.footRaycast.hasHit) {
      const n = this.footRaycast.hitNormalWorld;
      const angleDeg = BABYLON.Tools.ToDegrees(
        Math.acos(BABYLON.Vector3.Dot(new BABYLON.Vector3(0, 1, 0), n)),
      );
      slopeTooSteep = angleDeg > MAX_SLOPE_DEG;
    }

    // ── Stair climbing (ergoudan) ──────────────────────────────────────────
    if (
      this.staircaseState.task &&
      !this.jumpState.jump &&
      this.capsule.position.y - CAPSULE_HEIGHT / 2 < this.staircaseState.height &&
      this.isMoving
    ) {
      this.velocity.y = 9.8;
    }
    if (
      this.velocity.y > 0 &&
      this.staircaseState.task &&
      !this.staircaseRaycast.hasHit &&
      this.capsule.position.y - CAPSULE_HEIGHT / 2 >= this.staircaseState.height
    ) {
      this.velocity.y = -9.8;
      this.staircaseState.task = false;
    }

    // ── Jump (ergoudan) ────────────────────────────────────────────────────
    if (this.inputMap['Space'] && !this.jumpState.jump && !this.jumpState.hasTask && this.footRaycast.hasHit) {
      this.jumpState.jump     = true;
      this.jumpState.startY   = this.capsule.position.y;
      this.jumpState.hasTask  = false;
    }
    if (this.jumpState.jump && !this.jumpState.hasTask && this.footRaycast.hasHit) {
      this.jumpState.hasTask = true;
      this.velocity.y = 9.8;
    }
    if (
      !this.footRaycast.hasHit &&
      this.capsule.position.y > this.jumpState.startY + this.jumpLimit &&
      this.jumpState.jump
    ) {
      this.jumpState.jump = false;
      this.jumpState.fall = true;
      this.velocity.y = -9.8;
    }

    // ── Movement & velocity ────────────────────────────────────────────────
    if (this.isMoving && !this.jumpState.jump && !slopeTooSteep) {
      const speed = (isRunning ? this.runSpeed * this.raceRunMult : this.walkSpeed * this.raceWalkMult);
      const dir   = this.computeMoveDirection(dirs, isRunning);

      this.velocity.x = dir.x * speed;
      this.velocity.z = dir.z * speed;

      // Face toward movement in harvest mode, or face camera target in combat
      if (this.mode === 'harvest' && (dir.x !== 0 || dir.z !== 0)) {
        const targetY = Math.atan2(dir.x, dir.z);
        const current = this.getYRotation();
        let   delta   = targetY - current;
        while (delta >  Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        this.setYRotation(current + delta * 0.15);
      }

      if (this.staircaseRaycast.hasHit && !this.jumpState.jump) {
        this.staircaseState.task   = true;
        this.staircaseState.height = this.staircaseRaycast.hitPointWorld.y;
      }
    } else if (!this.isMoving) {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // ── In combat mode, character faces camera forward ─────────────────────
    if (this.mode === 'combat') {
      const fwd = this.camera.target.subtract(this.camera.position);
      fwd.y = 0;
      if (fwd.length() > 0.01) {
        const targetY = Math.atan2(fwd.x, fwd.z);
        const current = this.getYRotation();
        let delta = targetY - current;
        while (delta >  Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        this.setYRotation(current + delta * 0.18);
      }
    }

    this.aggregate.body.setLinearVelocity(this.velocity);

    // ── Gravity ────────────────────────────────────────────────────────────
    if (!this.footRaycast.hasHit && !this.jumpState.jump) {
      this.velocity.y = Math.max(this.velocity.y - this.gravity * 0.016, -40);
    } else if (this.footRaycast.hasHit && this.velocity.y < 0) {
      this.velocity.y = -9.8;
    }

    // ── Choose animation state ─────────────────────────────────────────────
    this.driveAnimations(dirs, isRunning);
  }

  // ── Animation driver ─────────────────────────────────────────────────────────

  private driveAnimations(
    dirs: { W: boolean; S: boolean; A: boolean; D: boolean },
    isRunning: boolean,
  ): void {
    let state: LocomotionState;

    // Injured override
    if (this.hpRatio < INJURED_HP_THRESHOLD) {
      state = this.isMoving ? 'injured_walk' : 'injured_idle';
    } else if (!this.footRaycast.hasHit && !this.jumpState.jump) {
      state = 'fall';
    } else if (this.jumpState.jump) {
      state = 'jump';
    } else if (!this.isMoving) {
      state = this.mode === 'combat' ? 'combat_idle' : 'idle';
    } else if (this.mode === 'combat') {
      // 8-directional strafing for combat
      if      ( dirs.W && !dirs.A && !dirs.D && !dirs.S) state = 'combat_strafe_fwd';
      else if ( dirs.S && !dirs.A && !dirs.D && !dirs.W) state = 'combat_strafe_bwd';
      else if ( dirs.A && !dirs.W && !dirs.D && !dirs.S) state = 'combat_strafe_left';
      else if ( dirs.D && !dirs.W && !dirs.A && !dirs.S) state = 'combat_strafe_right';
      else if (isRunning)                                 state = 'combat_run';
      else                                                state = 'combat_strafe_fwd';
    } else {
      // 8-directional harvest locomotion
      if      ( dirs.W && !dirs.A && !dirs.D)  state = isRunning ? 'run' : 'walk_fwd';
      else if ( dirs.S && !dirs.A && !dirs.D)  state = 'walk_bwd';
      else if ( dirs.A && !dirs.W && !dirs.S)  state = 'walk_left';
      else if ( dirs.D && !dirs.W && !dirs.S)  state = 'walk_right';
      else if ( dirs.W && dirs.A)              state = 'walk_fwd_left';
      else if ( dirs.W && dirs.D)              state = 'walk_fwd_right';
      else if ( dirs.S && dirs.A)              state = 'walk_bwd_left';
      else if ( dirs.S && dirs.D)              state = 'walk_bwd_right';
      else                                     state = 'run';
    }

    const clipName = resolveClipName(this.equippedWeapon, state);
    if (!clipName) return;

    const group = findAnimationGroup(this.animGroups, clipName);
    if (!group) return;

    const idx = this.animGroups.indexOf(group as BABYLON.AnimationGroup);
    if (idx !== this.curAnim) this.playAnim(idx);
  }

  /** Switch to a new animation with weight blend */
  private playAnim(idx: number): void {
    if (idx === this.curAnim) return;
    this.oldAnim   = this.curAnim;
    this.oldWeight = this.curWeight;
    this.curAnim   = idx;
    this.curWeight = 0;
  }

  private onBeforeAnimations(): void {
    // Fade current clip in
    if (this.curWeight < 1) {
      this.curWeight = BABYLON.Scalar.Clamp(this.curWeight + BLEND_STEP, 0, 1);
      this.animGroups[this.curAnim]?.setWeightForAllAnimatables(this.curWeight);
      this.animGroups.forEach((ag, i) => {
        if (i !== this.curAnim && i !== this.oldAnim) ag.setWeightForAllAnimatables(0);
      });
    }
    // Fade old clip out
    if (this.oldWeight > 0) {
      this.oldWeight = BABYLON.Scalar.Clamp(this.oldWeight - BLEND_STEP, 0, 1);
      this.animGroups[this.oldAnim]?.setWeightForAllAnimatables(this.oldWeight);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Compute the world-space move direction from WASD relative to the camera.
   * In combat mode, W = camera-forward; A/D strafe.
   */
  private computeMoveDirection(
    dirs: { W: boolean; S: boolean; A: boolean; D: boolean },
    _isRunning: boolean,
  ): BABYLON.Vector3 {
    const alpha = this.camera.alpha;
    let mx = 0, mz = 0;

    if (dirs.W) { mx += Math.sin(alpha);       mz += Math.cos(alpha); }
    if (dirs.S) { mx -= Math.sin(alpha);       mz -= Math.cos(alpha); }
    if (dirs.A) { mx += Math.sin(alpha + Math.PI / 2); mz += Math.cos(alpha + Math.PI / 2); }
    if (dirs.D) { mx += Math.sin(alpha - Math.PI / 2); mz += Math.cos(alpha - Math.PI / 2); }

    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 0) { mx /= len; mz /= len; }
    return new BABYLON.Vector3(mx, 0, mz);
  }

  private getYRotation(): number {
    if (this.meshRoot.rotationQuaternion) {
      return this.meshRoot.rotationQuaternion.toEulerAngles().y;
    }
    return this.meshRoot.rotation.y;
  }

  private setYRotation(y: number): void {
    if (this.meshRoot.rotationQuaternion) {
      this.meshRoot.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(0, y, 0);
    } else {
      this.meshRoot.rotation.y = y;
    }
  }

  private updateCamera(): void {
    const heightOffset = 1.6;
    const target = this.capsule.position.clone();
    target.y += heightOffset;
    this.camera.target = BABYLON.Vector3.Lerp(this.camera.target, target, 0.1);
  }

  // ── Trigger one-shot actions (call from UI / ability system) ─────────────────

  /**
   * Play a one-shot animation clip by name and return to the locomotion
   * state when it finishes.  Useful for attack_1, cast_1, dodge, etc.
   */
  playAction(clipName: string, speedRatio = 1): Promise<void> {
    const group = findAnimationGroup(this.animGroups, clipName) as BABYLON.AnimationGroup | null;
    if (!group) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const idx = this.animGroups.indexOf(group);
      const prevAnim = this.curAnim;
      this.playAnim(idx);

      group.onAnimationGroupEndObservable.addOnce(() => {
        this.playAnim(prevAnim);
        resolve();
      });

      group.speedRatio = speedRatio;
      group.start(false, speedRatio);
    });
  }
}

// ── Quick-spawn helper ────────────────────────────────────────────────────────

/**
 * Convenience: initialise Havok, load a race character, and attach the
 * controller to the scene.  Pass a `shadowGenerator` to enable character
 * shadow casting.
 *
 * @example
 *   const ctrl = await spawnGrudgeCharacter(scene, canvas, {
 *     race: 'elf', charClass: 'ranger',
 *   });
 *   ctrl.equip('bow');
 *   ctrl.activate();
 */
export async function spawnGrudgeCharacter(
  scene:           BABYLON.Scene,
  canvas:          HTMLCanvasElement,
  opts:            HavokControllerOptions = {},
  shadowGenerator?: BABYLON.ShadowGenerator,
): Promise<HavokCharacterController> {
  const ctrl = await HavokCharacterController.create(scene, canvas, opts);

  if (shadowGenerator) {
    ctrl.getMesh().getChildMeshes().forEach(m => shadowGenerator.addShadowCaster(m));
    shadowGenerator.addShadowCaster(ctrl.getMesh());
  }

  ctrl.activate();
  return ctrl;
}

export default HavokCharacterController;
