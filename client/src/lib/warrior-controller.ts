import * as BABYLON from '@babylonjs/core';
import { CharacterController, CharacterControllerOptions } from './character-controller';

export interface WarriorAnimationMap {
  idle: string;
  idleCombat: string;
  idleLookAround: string;
  idleFidget: string;
  walkForward: string;
  walkBackward: string;
  runForward: string;
  runBackward: string;
  strafeLeft: string;
  strafeRight: string;
  strafeRunLeft: string;
  strafeRunRight: string;
  jump: string;
  jumpLand: string;
  slash1: string;
  slash2: string;
  slash3: string;
  slash4: string;
  slash5: string;
  attackHeavy1: string;
  attackHeavy2: string;
  attackHeavy3: string;
  attackCombo: string;
  kick: string;
  blockStart: string;
  blockIdle: string;
  blockHit: string;
  crouchStart: string;
  crouchIdle: string;
  crouchWalk: string;
  crouchWalkLeft: string;
  crouchWalkRight: string;
  crouchBlock: string;
  crouchBlockIdle: string;
  crouchBlockHit: string;
  hitReact1: string;
  hitReact2: string;
  hitReact3: string;
  death1: string;
  death2: string;
  turnLeft: string;
  turnRight: string;
  turn180: string;
  turn180Right: string;
  drawSword1: string;
  drawSword2: string;
  sheathSword1: string;
  sheathSword2: string;
  casting1: string;
  casting2: string;
  powerUp: string;
}

export const WARRIOR_ANIMATION_FILES: WarriorAnimationMap = {
  idle: '/assets/animations/racalvin-warrior/idle.glb',
  idleCombat: '/assets/animations/racalvin-warrior/idle-combat.glb',
  idleLookAround: '/assets/animations/racalvin-warrior/idle-look-around.glb',
  idleFidget: '/assets/animations/racalvin-warrior/idle-fidget.glb',
  walkForward: '/assets/animations/racalvin-warrior/walk-forward.glb',
  walkBackward: '/assets/animations/racalvin-warrior/walk-backward.glb',
  runForward: '/assets/animations/racalvin-warrior/run-forward.glb',
  runBackward: '/assets/animations/racalvin-warrior/run-backward.glb',
  strafeLeft: '/assets/animations/racalvin-warrior/strafe-left.glb',
  strafeRight: '/assets/animations/racalvin-warrior/strafe-right.glb',
  strafeRunLeft: '/assets/animations/racalvin-warrior/strafe-run-left.glb',
  strafeRunRight: '/assets/animations/racalvin-warrior/strafe-run-right.glb',
  jump: '/assets/animations/racalvin-warrior/jump.glb',
  jumpLand: '/assets/animations/racalvin-warrior/jump-land.glb',
  slash1: '/assets/animations/racalvin-warrior/slash-1.glb',
  slash2: '/assets/animations/racalvin-warrior/slash-2.glb',
  slash3: '/assets/animations/racalvin-warrior/slash-3.glb',
  slash4: '/assets/animations/racalvin-warrior/slash-4.glb',
  slash5: '/assets/animations/racalvin-warrior/slash-5.glb',
  attackHeavy1: '/assets/animations/racalvin-warrior/attack-heavy-1.glb',
  attackHeavy2: '/assets/animations/racalvin-warrior/attack-heavy-2.glb',
  attackHeavy3: '/assets/animations/racalvin-warrior/attack-heavy-3.glb',
  attackCombo: '/assets/animations/racalvin-warrior/attack-combo.glb',
  kick: '/assets/animations/racalvin-warrior/kick.glb',
  blockStart: '/assets/animations/racalvin-warrior/block-start.glb',
  blockIdle: '/assets/animations/racalvin-warrior/block-idle.glb',
  blockHit: '/assets/animations/racalvin-warrior/block-hit.glb',
  crouchStart: '/assets/animations/racalvin-warrior/crouch-start.glb',
  crouchIdle: '/assets/animations/racalvin-warrior/crouch-idle.glb',
  crouchWalk: '/assets/animations/racalvin-warrior/crouch-walk.glb',
  crouchWalkLeft: '/assets/animations/racalvin-warrior/crouch-walk-left.glb',
  crouchWalkRight: '/assets/animations/racalvin-warrior/crouch-walk-right.glb',
  crouchBlock: '/assets/animations/racalvin-warrior/crouch-block.glb',
  crouchBlockIdle: '/assets/animations/racalvin-warrior/crouch-block-idle.glb',
  crouchBlockHit: '/assets/animations/racalvin-warrior/crouch-block-hit.glb',
  hitReact1: '/assets/animations/racalvin-warrior/hit-react-1.glb',
  hitReact2: '/assets/animations/racalvin-warrior/hit-react-2.glb',
  hitReact3: '/assets/animations/racalvin-warrior/hit-react-3.glb',
  death1: '/assets/animations/racalvin-warrior/death-1.glb',
  death2: '/assets/animations/racalvin-warrior/death-2.glb',
  turnLeft: '/assets/animations/racalvin-warrior/turn-left.glb',
  turnRight: '/assets/animations/racalvin-warrior/turn-right.glb',
  turn180: '/assets/animations/racalvin-warrior/turn-180.glb',
  turn180Right: '/assets/animations/racalvin-warrior/turn-180-right.glb',
  drawSword1: '/assets/animations/racalvin-warrior/draw-sword-1.glb',
  drawSword2: '/assets/animations/racalvin-warrior/draw-sword-2.glb',
  sheathSword1: '/assets/animations/racalvin-warrior/sheath-sword-1.glb',
  sheathSword2: '/assets/animations/racalvin-warrior/sheath-sword-2.glb',
  casting1: '/assets/animations/racalvin-warrior/casting-1.glb',
  casting2: '/assets/animations/racalvin-warrior/casting-2.glb',
  powerUp: '/assets/animations/racalvin-warrior/power-up.glb',
};

export const WARRIOR_MODEL_PATH = '/assets/animations/racalvin-warrior/character-model.glb';

export type WarriorState =
  | 'idle' | 'idle_combat' | 'idle_look' | 'idle_fidget'
  | 'walk_forward' | 'walk_backward'
  | 'run_forward' | 'run_backward'
  | 'sprint_forward'
  | 'strafe_left' | 'strafe_right'
  | 'strafe_run_left' | 'strafe_run_right'
  | 'jump' | 'jump_land' | 'fall'
  | 'slash_1' | 'slash_2' | 'slash_3' | 'slash_4' | 'slash_5'
  | 'attack_heavy_1' | 'attack_heavy_2' | 'attack_heavy_3' | 'attack_combo'
  | 'kick'
  | 'block_start' | 'block_idle' | 'block_hit'
  | 'crouch_idle' | 'crouch_walk' | 'crouch_walk_left' | 'crouch_walk_right'
  | 'crouch_block' | 'crouch_block_idle' | 'crouch_block_hit'
  | 'hit_react' | 'death'
  | 'turn_left' | 'turn_right' | 'turn_180'
  | 'draw_sword' | 'sheath_sword'
  | 'casting' | 'power_up'
  | 'dodge';

const STATE_TO_ANIM: Record<WarriorState, keyof WarriorAnimationMap> = {
  idle: 'idle',
  idle_combat: 'idleCombat',
  idle_look: 'idleLookAround',
  idle_fidget: 'idleFidget',
  walk_forward: 'walkForward',
  walk_backward: 'walkBackward',
  run_forward: 'runForward',
  run_backward: 'runBackward',
  sprint_forward: 'runForward',
  strafe_left: 'strafeLeft',
  strafe_right: 'strafeRight',
  strafe_run_left: 'strafeRunLeft',
  strafe_run_right: 'strafeRunRight',
  jump: 'jump',
  jump_land: 'jumpLand',
  fall: 'jump',
  slash_1: 'slash1',
  slash_2: 'slash2',
  slash_3: 'slash3',
  slash_4: 'slash4',
  slash_5: 'slash5',
  attack_heavy_1: 'attackHeavy1',
  attack_heavy_2: 'attackHeavy2',
  attack_heavy_3: 'attackHeavy3',
  attack_combo: 'attackCombo',
  kick: 'kick',
  block_start: 'blockStart',
  block_idle: 'blockIdle',
  block_hit: 'blockHit',
  crouch_idle: 'crouchIdle',
  crouch_walk: 'crouchWalk',
  crouch_walk_left: 'crouchWalkLeft',
  crouch_walk_right: 'crouchWalkRight',
  crouch_block: 'crouchBlock',
  crouch_block_idle: 'crouchBlockIdle',
  crouch_block_hit: 'crouchBlockHit',
  hit_react: 'hitReact1',
  death: 'death1',
  turn_left: 'turnLeft',
  turn_right: 'turnRight',
  turn_180: 'turn180',
  draw_sword: 'drawSword1',
  sheath_sword: 'sheathSword1',
  casting: 'casting1',
  power_up: 'powerUp',
  dodge: 'crouchWalk',
};

interface WarriorInputActions {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  jumpPressed: boolean;
  attackLight: boolean;
  attackLightPressed: boolean;
  attackHeavy: boolean;
  attackHeavyPressed: boolean;
  block: boolean;
  dodge: boolean;
  dodgePressed: boolean;
  crouch: boolean;
  crouchToggled: boolean;
  special1: boolean; special2: boolean; special3: boolean; special4: boolean; special5: boolean;
  special6: boolean; special7: boolean; special8: boolean; special9: boolean; special0: boolean;
}

class SpringSimulator {
  position = 0;
  velocity = 0;
  target = 0;
  damping = 0.8;
  mass = 50;

  simulate(dt: number): void {
    const spring = 1 / this.mass;
    const accel = (this.target - this.position) * spring;
    this.velocity += accel * dt * 60;
    this.velocity *= Math.pow(1 - this.damping, dt * 60);
    this.position += this.velocity * dt * 60;
  }

  reset(): void {
    this.position = 0;
    this.velocity = 0;
  }
}

class AngleSpring {
  angle = 0;
  velocity = 0;
  target = 0;
  damping = 0.5;
  mass = 10;

  simulate(dt: number): void {
    const spring = 1 / this.mass;
    let diff = this.target - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.velocity += diff * spring * dt * 60;
    this.velocity *= Math.pow(1 - this.damping, dt * 60);
    this.angle += this.velocity * dt * 60;
  }
}

export interface WarriorControllerOptions {
  scene: BABYLON.Scene;
  canvas: HTMLCanvasElement;
  characterMesh: BABYLON.AbstractMesh;
  walkSpeed?: number;
  runSpeed?: number;
  sprintSpeed?: number;
  jumpForce?: number;
  gravity?: number;
  cameraDistance?: number;
  cameraHeight?: number;
}

export class WarriorPlayerController {
  private scene: BABYLON.Scene;
  private canvas: HTMLCanvasElement;
  private character: BABYLON.AbstractMesh;
  private camera: BABYLON.ArcRotateCamera;

  private animationGroups: Map<string, BABYLON.AnimationGroup> = new Map();
  private animationWeights: Map<string, number> = new Map();
  private blendSpeed = 8.0;

  private walkSpeed: number;
  private runSpeed: number;
  private sprintSpeed: number;
  private jumpForce: number;
  private gravity: number;

  private state: WarriorState = 'idle';
  private stateTimer = 0;
  private prevState: WarriorState = 'idle';

  private velocitySpring = new SpringSimulator();
  private rotationSpring = new AngleSpring();
  private verticalVelocity = 0;
  private isGrounded = true;
  private isCrouching = false;
  private comboIndex = 0;
  private comboTimer = 0;
  private comboWindow = 0.8;
  private dodgeCooldown = 0;
  private dodgeDirection = BABYLON.Vector3.Zero();

  private orientation = new BABYLON.Vector3(0, 0, 1);
  private arcadeVelocity = BABYLON.Vector3.Zero();

  private actions: WarriorInputActions = {
    forward: false, backward: false, left: false, right: false,
    sprint: false, jump: false, jumpPressed: false,
    attackLight: false, attackLightPressed: false,
    attackHeavy: false, attackHeavyPressed: false,
    block: false, dodge: false, dodgePressed: false,
    crouch: false, crouchToggled: false,
    special1: false, special2: false, special3: false, special4: false, special5: false,
    special6: false, special7: false, special8: false, special9: false, special0: false,
  };

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;
  private contextMenuHandler: (e: Event) => void;
  private beforeRenderObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
  private originalCamera: BABYLON.Camera | null = null;
  private isActive = false;
  private specialAnimPlaying = false;
  private specialAnimTimer = 0;

  private idleTimer = 0;
  private idleVariantInterval = 8;

  // Combat stats
  private health = 100;
  private maxHealth = 100;
  private stamina = 100;
  private maxStamina = 100;
  private staminaRegen = 18;
  private staminaDrainBlock = 12;
  private staminaRegenDelay = 0;
  private isBlocking = false;

  constructor(options: WarriorControllerOptions) {
    this.scene = options.scene;
    this.canvas = options.canvas;
    this.character = options.characterMesh;
    this.walkSpeed = options.walkSpeed ?? 3.5;
    this.runSpeed = options.runSpeed ?? 6;
    this.sprintSpeed = options.sprintSpeed ?? 10;
    this.jumpForce = options.jumpForce ?? 8;
    this.gravity = options.gravity ?? 20;

    this.velocitySpring.damping = 0.8;
    this.velocitySpring.mass = 50;
    this.rotationSpring.damping = 0.5;
    this.rotationSpring.mass = 10;

    const camDist = options.cameraDistance ?? 7;
    const camH = options.cameraHeight ?? 2.5;

    this.camera = new BABYLON.ArcRotateCamera(
      'warriorCamera', -Math.PI / 2, Math.PI / 3, camDist,
      this.character.position.clone(), this.scene
    );
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 14;
    this.camera.lowerBetaLimit = 0.2;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.1;
    this.camera.panningSensibility = 0;
    this.camera.angularSensibilityX = 800;
    this.camera.angularSensibilityY = 800;
    this.camera.target.y += camH;

    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.keyUpHandler = this.handleKeyUp.bind(this);
    this.mouseDownHandler = this.handleMouseDown.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    this.contextMenuHandler = (e: Event) => e.preventDefault();

    console.log('[WarriorController] Created with full Mixamo animation set');
  }

  async loadAnimations(): Promise<void> {
    const skeleton = this.character.skeleton ||
      this.character.getChildMeshes().find(m => m.skeleton)?.skeleton;

    if (!skeleton) {
      console.warn('[WarriorController] No skeleton found on character — cannot retarget animations');
      return;
    }

    // Build bone name lookup map once (both full Mixamo names and short names)
    const boneMap = new Map<string, BABYLON.Bone>();
    skeleton.bones.forEach(b => {
      boneMap.set(b.name, b);
      boneMap.set(b.name.toLowerCase(), b);
      const short = b.name.replace(/^mixamorig[:\.]?/i, '');
      if (short) {
        boneMap.set(short, b);
        boneMap.set(short.toLowerCase(), b);
      }
    });

    const entries = Object.entries(WARRIOR_ANIMATION_FILES) as [keyof WarriorAnimationMap, string][];
    const BATCH_SIZE = 4;
    let loaded = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async ([key, path]) => {
          try {
            const folder = path.substring(0, path.lastIndexOf('/') + 1);
            const filename = path.substring(path.lastIndexOf('/') + 1);

            // LoadAssetContainerAsync gives an isolated container per file —
            // container.animationGroups contains ONLY animations from this file.
            const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
              folder, filename, this.scene
            );

            if (container.animationGroups.length === 0) {
              container.dispose();
              return;
            }

            const ag = container.animationGroups[0];
            ag.name = key as string;

            // Retarget: remap each targeted animation's target from the
            // container's temporary bones to our character's skeleton bones.
            ag.targetedAnimations.forEach(ta => {
              if (!ta.target || !ta.target.name) return;
              const tName = ta.target.name;
              const tLower = tName.toLowerCase();
              const short = tName.replace(/^mixamorig[:\.]?/i, '');
              const shortLower = short.toLowerCase();
              const bone =
                boneMap.get(tName) ||
                boneMap.get(tLower) ||
                boneMap.get(short) ||
                boneMap.get(shortLower);
              if (bone) ta.target = bone;
            });

            // Extract animation groups from the container so they survive disposal,
            // then dispose the container to clean up its meshes/skeletons.
            const extracted = container.animationGroups.splice(0);
            container.dispose();

            // Register in the scene and store in our map
            extracted.forEach(g => this.scene.animationGroups.push(g));
            ag.stop();
            this.animationGroups.set(key, ag);
            loaded++;
          } catch (e) {
            console.warn(`[WarriorController] Failed to load animation ${String(key)}: ${(e as Error).message}`);
          }
        })
      );
    }

    console.log(`[WarriorController] Loaded ${loaded}/${entries.length} animations`);

    if (!this.animationGroups.has('idle')) {
      const first = this.animationGroups.values().next().value;
      if (first) this.animationGroups.set('idle', first);
    }
  }

  private retargetAnimationGroup(ag: BABYLON.AnimationGroup): void {
    const skeleton = this.character.skeleton ||
      this.character.getChildMeshes().find(m => m.skeleton)?.skeleton;
    if (!skeleton) return;

    const boneMap = new Map<string, BABYLON.Bone>();
    skeleton.bones.forEach(b => {
      boneMap.set(b.name.toLowerCase(), b);
      const shortName = b.name.replace(/^mixamorig[:\.]?/i, '').toLowerCase();
      if (shortName) boneMap.set(shortName, b);
    });

    ag.targetedAnimations.forEach(ta => {
      const target = ta.target;
      if (target && target.name) {
        const tName = target.name.toLowerCase();
        const shortName = target.name.replace(/^mixamorig[:\.]?/i, '').toLowerCase();
        const bone = boneMap.get(tName) || boneMap.get(shortName);
        if (bone && bone !== target) {
          ta.target = bone;
        }
      }
    });
  }

  setAnimationGroups(groups: BABYLON.AnimationGroup[]): void {
    groups.forEach(ag => {
      const name = ag.name.toLowerCase();
      if (name.includes('idle') && !name.includes('combat') && !name.includes('look') && !name.includes('fidget')) {
        this.animationGroups.set('idle', ag);
      } else if (name.includes('idle') && name.includes('combat')) {
        this.animationGroups.set('idleCombat', ag);
      } else if (name.includes('walk') && !name.includes('back') && !name.includes('crouch')) {
        this.animationGroups.set('walkForward', ag);
      } else if (name.includes('walk') && name.includes('back')) {
        this.animationGroups.set('walkBackward', ag);
      } else if (name.includes('run') && !name.includes('back') && !name.includes('strafe')) {
        this.animationGroups.set('runForward', ag);
      } else if (name.includes('run') && name.includes('back')) {
        this.animationGroups.set('runBackward', ag);
      } else if (name.includes('jump') && !name.includes('land')) {
        this.animationGroups.set('jump', ag);
      } else if (name.includes('land') || (name.includes('jump') && name.includes('land'))) {
        this.animationGroups.set('jumpLand', ag);
      } else if (name.includes('slash') || name.includes('attack')) {
        if (!this.animationGroups.has('slash1')) this.animationGroups.set('slash1', ag);
        else if (!this.animationGroups.has('slash2')) this.animationGroups.set('slash2', ag);
      } else if (name.includes('block') && name.includes('idle')) {
        this.animationGroups.set('blockIdle', ag);
      } else if (name.includes('block')) {
        this.animationGroups.set('blockStart', ag);
      } else if (name.includes('death') || name.includes('die')) {
        this.animationGroups.set('death1', ag);
      } else if (name.includes('hit') || name.includes('impact')) {
        this.animationGroups.set('hitReact1', ag);
      } else if (name.includes('dodge') || name.includes('roll')) {
        this.animationGroups.set('crouchWalk', ag);
      }
      this.animationGroups.set(name, ag);
    });
    console.log(`[WarriorController] Set ${groups.length} animation groups, mapped ${this.animationGroups.size} keys`);
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.character.setEnabled(true);
    this.character.isVisible = true;
    this.character.getChildMeshes().forEach(child => {
      child.setEnabled(true);
      child.isVisible = true;
    });

    this.originalCamera = this.scene.activeCamera;
    this.scene.activeCamera = this.camera;
    this.camera.attachControl(this.canvas, true);
    this.camera.target = this.character.position.clone();
    this.camera.target.y += 2.5;

    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('mouseup', this.mouseUpHandler);
    this.canvas.addEventListener('contextmenu', this.contextMenuHandler);

    this.beforeRenderObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.update();
    });

    this.animationGroups.forEach((ag, name) => {
      const isLoop = this.isLoopingAnim(name);
      ag.start(isLoop, 1.0);
      const weight = name === 'idle' ? 1 : 0;
      ag.setWeightForAllAnimatables(weight);
      this.animationWeights.set(name, weight);
    });

    this.setState('idle');
    this.velocitySpring.reset();

    if (this.character.rotationQuaternion) {
      const euler = this.character.rotationQuaternion.toEulerAngles();
      this.rotationSpring.angle = euler.y;
      this.rotationSpring.target = euler.y;
    }

    console.log('[WarriorController] Activated');
    console.log('  WASD: Move | Shift: Sprint | Space: Jump | Ctrl: Dodge/Roll');
    console.log('  LMB: Slash Combo | RMB: Heavy Attack | F: Block | C: Crouch');
    console.log('  1-0: Special Animations (Draw Sword, Cast, Power Up, etc.)');
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;

    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
    this.canvas.removeEventListener('contextmenu', this.contextMenuHandler);

    if (this.beforeRenderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
      this.beforeRenderObserver = null;
    }

    this.camera.detachControl();
    if (this.originalCamera) {
      this.scene.activeCamera = this.originalCamera;
      this.originalCamera.attachControl(this.canvas, true);
    }

    this.animationGroups.forEach(ag => ag.stop());
    this.resetActions();
    console.log('[WarriorController] Deactivated');
  }

  dispose(): void {
    this.deactivate();
    this.camera.dispose();
    this.animationGroups.clear();
    this.animationWeights.clear();
  }

  getCharacter(): BABYLON.AbstractMesh { return this.character; }
  getState(): WarriorState { return this.state; }

  private isLoopingAnim(name: string): boolean {
    const oneShot = [
      'slash1','slash2','slash3','slash4','slash5',
      'attackHeavy1','attackHeavy2','attackHeavy3','attackCombo',
      'kick','jump','jumpLand','blockStart','blockHit',
      'crouchStart','crouchBlock','crouchBlockHit',
      'hitReact1','hitReact2','hitReact3','death1','death2',
      'drawSword1','drawSword2','sheathSword1','sheathSword2',
      'casting1','casting2','powerUp','turn180','turn180Right',
    ];
    return !oneShot.includes(name);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isActive) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.key.toLowerCase()) {
      case 'w': this.actions.forward = true; break;
      case 's': this.actions.backward = true; break;
      case 'a': this.actions.left = true; break;
      case 'd': this.actions.right = true; break;
      case 'shift': this.actions.sprint = true; break;
      case ' ':
        e.preventDefault();
        if (!this.actions.jump) { this.actions.jump = true; this.actions.jumpPressed = true; }
        break;
      case 'control':
        e.preventDefault();
        if (!this.actions.dodge) { this.actions.dodge = true; this.actions.dodgePressed = true; }
        break;
      case 'c':
        this.actions.crouch = !this.actions.crouch;
        this.actions.crouchToggled = true;
        break;
      case 'f': this.actions.block = true; break;
      case '1': this.actions.special1 = true; break;
      case '2': this.actions.special2 = true; break;
      case '3': this.actions.special3 = true; break;
      case '4': this.actions.special4 = true; break;
      case '5': this.actions.special5 = true; break;
      case '6': this.actions.special6 = true; break;
      case '7': this.actions.special7 = true; break;
      case '8': this.actions.special8 = true; break;
      case '9': this.actions.special9 = true; break;
      case '0': this.actions.special0 = true; break;
    }
    this.onInputChange();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (!this.isActive) return;
    switch (e.key.toLowerCase()) {
      case 'w': this.actions.forward = false; break;
      case 's': this.actions.backward = false; break;
      case 'a': this.actions.left = false; break;
      case 'd': this.actions.right = false; break;
      case 'shift': this.actions.sprint = false; break;
      case ' ': this.actions.jump = false; break;
      case 'control': this.actions.dodge = false; break;
      case 'f': this.actions.block = false; break;
    }
    this.onInputChange();
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.isActive) return;
    if (e.button === 0) {
      this.actions.attackLight = true;
      this.actions.attackLightPressed = true;
    } else if (e.button === 2) {
      this.actions.attackHeavy = true;
      this.actions.attackHeavyPressed = true;
    }
    this.onInputChange();
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.isActive) return;
    if (e.button === 0) this.actions.attackLight = false;
    else if (e.button === 2) this.actions.attackHeavy = false;
  }

  private resetActions(): void {
    Object.keys(this.actions).forEach(k => {
      (this.actions as any)[k] = false;
    });
  }

  private onInputChange(): void {
    if (this.isInLockedState()) {
      this.clearPressedFlags();
      return;
    }

    if (this.checkSpecialKeys()) return;

    if (this.actions.dodgePressed && this.dodgeCooldown <= 0) {
      this.startDodge();
      return;
    }

    if (this.actions.block) {
      if (this.isCrouching) {
        this.setState('crouch_block');
      } else {
        this.setState('block_start');
      }
      return;
    }

    if (this.actions.attackLightPressed) {
      this.startSlashCombo();
      return;
    }

    if (this.actions.attackHeavyPressed) {
      this.startHeavyAttack();
      return;
    }

    if (this.actions.jumpPressed && this.isGrounded) {
      this.startJump();
      return;
    }

    if (this.actions.crouchToggled) {
      this.isCrouching = this.actions.crouch;
      this.actions.crouchToggled = false;
      if (this.isCrouching) {
        this.setState('crouch_idle');
      } else if (!this.anyMovement()) {
        this.setState('idle');
      }
    }

    this.clearPressedFlags();
  }

  private checkSpecialKeys(): boolean {
    const specials: [boolean, WarriorState, keyof WarriorAnimationMap][] = [
      [this.actions.special1, 'draw_sword', 'drawSword1'],
      [this.actions.special2, 'sheath_sword', 'sheathSword1'],
      [this.actions.special3, 'casting', 'casting1'],
      [this.actions.special4, 'power_up', 'powerUp'],
      [this.actions.special5, 'kick', 'kick'],
      [this.actions.special6, 'turn_180', 'turn180'],
      [this.actions.special7, 'idle_look', 'idleLookAround'],
      [this.actions.special8, 'idle_fidget', 'idleFidget'],
      [this.actions.special9, 'attack_combo', 'attackCombo'],
      [this.actions.special0, 'death', 'death1'],
    ];

    for (const [pressed, state, animKey] of specials) {
      if (pressed) {
        this.playSpecialAnimation(state, animKey);
        this.clearSpecialKeys();
        return true;
      }
    }
    return false;
  }

  private clearSpecialKeys(): void {
    this.actions.special1 = this.actions.special2 = this.actions.special3 =
    this.actions.special4 = this.actions.special5 = this.actions.special6 =
    this.actions.special7 = this.actions.special8 = this.actions.special9 =
    this.actions.special0 = false;
  }

  private clearPressedFlags(): void {
    this.actions.jumpPressed = false;
    this.actions.attackLightPressed = false;
    this.actions.attackHeavyPressed = false;
    this.actions.dodgePressed = false;
  }

  private playSpecialAnimation(state: WarriorState, animKey: keyof WarriorAnimationMap): void {
    this.specialAnimPlaying = true;
    this.specialAnimTimer = 0;
    this.setState(state);

    const ag = this.animationGroups.get(animKey);
    if (ag) {
      ag.start(false, 1.0);
      ag.onAnimationGroupEndObservable.addOnce(() => {
        this.specialAnimPlaying = false;
        this.setState('idle');
      });
    } else {
      setTimeout(() => {
        this.specialAnimPlaying = false;
        this.setState('idle');
      }, 2000);
    }
  }

  private isInLockedState(): boolean {
    if (this.specialAnimPlaying) return true;
    const locked: WarriorState[] = [
      'slash_1','slash_2','slash_3','slash_4','slash_5',
      'attack_heavy_1','attack_heavy_2','attack_heavy_3','attack_combo',
      'kick','hit_react','death','dodge',
      'draw_sword','sheath_sword','casting','power_up',
    ];
    return locked.includes(this.state);
  }

  private startSlashCombo(): void {
    const slashes: WarriorState[] = ['slash_1','slash_2','slash_3','slash_4','slash_5'];
    if (this.comboTimer > 0 && this.comboIndex < slashes.length - 1) {
      this.comboIndex++;
    } else {
      this.comboIndex = 0;
    }
    this.comboTimer = this.comboWindow;
    this.setState(slashes[this.comboIndex]);
    this.clearPressedFlags();
    // Drain stamina per slash
    this.stamina = Math.max(0, this.stamina - 8);
    this.staminaRegenDelay = 1.2;
  }

  private startHeavyAttack(): void {
    const heavies: WarriorState[] = ['attack_heavy_1','attack_heavy_2','attack_heavy_3'];
    const idx = Math.floor(Math.random() * heavies.length);
    this.setState(heavies[idx]);
    this.clearPressedFlags();
    // Heavy attacks drain more stamina
    this.stamina = Math.max(0, this.stamina - 18);
    this.staminaRegenDelay = 1.5;
  }

  private startJump(): void {
    this.verticalVelocity = this.jumpForce;
    this.isGrounded = false;
    this.setState('jump');
  }

  private startDodge(): void {
    this.dodgeCooldown = 0.8;
    const dir = this.getMovementDirection();
    this.dodgeDirection = dir.length() > 0 ? dir.normalize() : this.orientation.clone();
    this.setState('dodge');
    this.clearPressedFlags();
    // Dodge rolls drain stamina
    this.stamina = Math.max(0, this.stamina - 20);
    this.staminaRegenDelay = 1.0;
  }

  private anyMovement(): boolean {
    return this.actions.forward || this.actions.backward || this.actions.left || this.actions.right;
  }

  private getMovementDirection(): BABYLON.Vector3 {
    const camAlpha = this.camera.alpha;
    const forward = new BABYLON.Vector3(Math.sin(camAlpha), 0, Math.cos(camAlpha));
    const right = new BABYLON.Vector3(forward.z, 0, -forward.x);
    let dir = BABYLON.Vector3.Zero();
    if (this.actions.forward) dir.addInPlace(forward);
    if (this.actions.backward) dir.subtractInPlace(forward);
    if (this.actions.left) dir.subtractInPlace(right);
    if (this.actions.right) dir.addInPlace(right);
    return dir;
  }

  private setState(newState: WarriorState): void {
    if (this.state === newState && !this.specialAnimPlaying) return;
    this.prevState = this.state;
    this.state = newState;
    this.stateTimer = 0;

    switch (newState) {
      case 'idle': case 'idle_combat': case 'idle_look': case 'idle_fidget':
        this.velocitySpring.target = 0;
        this.velocitySpring.damping = 0.6;
        this.velocitySpring.mass = 10;
        break;
      case 'walk_forward': case 'walk_backward':
        this.velocitySpring.target = this.walkSpeed;
        this.velocitySpring.damping = 0.8;
        this.velocitySpring.mass = 50;
        break;
      case 'run_forward': case 'run_backward':
        this.velocitySpring.target = this.runSpeed;
        break;
      case 'sprint_forward':
        this.velocitySpring.target = this.sprintSpeed;
        break;
      case 'strafe_left': case 'strafe_right':
        this.velocitySpring.target = this.walkSpeed;
        break;
      case 'strafe_run_left': case 'strafe_run_right':
        this.velocitySpring.target = this.runSpeed;
        break;
      case 'crouch_idle':
        this.velocitySpring.target = 0;
        break;
      case 'crouch_walk': case 'crouch_walk_left': case 'crouch_walk_right':
        this.velocitySpring.target = this.walkSpeed * 0.5;
        break;
      case 'dodge':
        this.velocitySpring.target = 12;
        break;
    }
  }

  private update(): void {
    if (!this.isActive) return;
    const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.05);
    this.stateTimer += dt;
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);

    if (this.comboTimer <= 0) this.comboIndex = 0;

    // Stamina: drain while blocking, regen when idle
    this.isBlocking = this.state === 'block_idle' || this.state === 'block_start' || this.state === 'crouch_block' || this.state === 'crouch_block_idle';
    if (this.isBlocking) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrainBlock * dt);
      this.staminaRegenDelay = 0.8;
    } else {
      if (this.staminaRegenDelay > 0) {
        this.staminaRegenDelay -= dt;
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * dt);
      }
    }

    if (this.state === 'death') {
      this.updateCamera(dt);
      this.blendToAnimation(this.getTargetAnim(), dt);
      return;
    }

    if (this.specialAnimPlaying) {
      this.specialAnimTimer += dt;
      this.updateCamera(dt);
      this.blendToAnimation(this.getTargetAnim(), dt);
      return;
    }

    this.updateCombatStates(dt);
    this.checkGrounded();

    if (!this.isGrounded && this.state !== 'jump' && this.state !== 'fall' && !this.isInLockedState()) {
      this.setState('fall');
    }

    if (this.state === 'jump_land' && this.stateTimer > 0.15) {
      if (this.anyMovement()) {
        this.setState(this.actions.sprint ? 'sprint_forward' : 'walk_forward');
      } else {
        this.setState('idle');
      }
    }

    if (!this.isInLockedState() && this.isGrounded) {
      this.updateMovementState();
    }

    this.updateIdleVariants(dt);
    this.updatePhysics(dt);
    this.updateRotation(dt);
    this.updateCamera(dt);
    this.blendToAnimation(this.getTargetAnim(), dt);
  }

  private updateMovementState(): void {
    const moving = this.anyMovement();
    if (this.actions.block) {
      if (this.isCrouching) {
        this.setState('crouch_block');
      } else {
        this.setState(this.stateTimer > 0.2 ? 'block_idle' : 'block_start');
      }
      return;
    }

    if (this.isCrouching) {
      if (moving) {
        if (this.actions.left && !this.actions.forward && !this.actions.backward) {
          this.setState('crouch_walk_left');
        } else if (this.actions.right && !this.actions.forward && !this.actions.backward) {
          this.setState('crouch_walk_right');
        } else {
          this.setState('crouch_walk');
        }
      } else {
        this.setState('crouch_idle');
      }
      return;
    }

    if (!moving) {
      if (this.state !== 'idle' && this.state !== 'idle_combat' && 
          this.state !== 'idle_look' && this.state !== 'idle_fidget') {
        this.setState('idle');
      }
      return;
    }

    const onlyStrafe = !this.actions.forward && !this.actions.backward;
    if (onlyStrafe && this.actions.left) {
      this.setState(this.actions.sprint ? 'strafe_run_left' : 'strafe_left');
    } else if (onlyStrafe && this.actions.right) {
      this.setState(this.actions.sprint ? 'strafe_run_right' : 'strafe_right');
    } else if (this.actions.backward) {
      this.setState(this.actions.sprint ? 'run_backward' : 'walk_backward');
    } else if (this.actions.sprint) {
      this.setState('sprint_forward');
    } else if (this.actions.forward) {
      this.setState('run_forward');
    } else {
      this.setState('walk_forward');
    }
  }

  private updateIdleVariants(dt: number): void {
    if (this.state === 'idle') {
      this.idleTimer += dt;
      if (this.idleTimer > this.idleVariantInterval) {
        this.idleTimer = 0;
        const variants: WarriorState[] = ['idle', 'idle_combat', 'idle_look', 'idle_fidget'];
        const pick = variants[Math.floor(Math.random() * variants.length)];
        if (pick !== 'idle') {
          this.setState(pick);
          setTimeout(() => {
            if (this.state === pick && !this.isInLockedState()) {
              this.setState('idle');
            }
          }, 3000);
        }
      }
    } else {
      this.idleTimer = 0;
    }
  }

  private updateCombatStates(dt: number): void {
    const attackStates: WarriorState[] = [
      'slash_1','slash_2','slash_3','slash_4','slash_5',
      'attack_heavy_1','attack_heavy_2','attack_heavy_3','attack_combo','kick',
    ];
    if (attackStates.includes(this.state)) {
      const duration = this.state.startsWith('attack_heavy') ? 1.2 : 
                       this.state === 'attack_combo' ? 2.0 : 
                       this.state === 'kick' ? 0.9 : 0.7;
      if (this.stateTimer > duration) {
        this.setState(this.anyMovement() ? 'walk_forward' : 'idle_combat');
      }
      return;
    }

    if (this.state === 'hit_react' && this.stateTimer > 0.5) {
      this.setState('idle');
    }

    if (this.state === 'dodge' && this.stateTimer > 0.5) {
      this.setState(this.anyMovement() ? 'walk_forward' : 'idle');
    }
  }

  private checkGrounded(): void {
    const ray = new BABYLON.Ray(
      this.character.position.add(new BABYLON.Vector3(0, 0.3, 0)),
      BABYLON.Vector3.Down(), 0.5
    );
    const pick = this.scene.pickWithRay(ray, (mesh) => 
      mesh !== this.character && !this.character.getChildMeshes().includes(mesh as BABYLON.Mesh)
    );
    const wasGrounded = this.isGrounded;
    this.isGrounded = pick?.hit === true;

    if (this.isGrounded && !wasGrounded && (this.state === 'jump' || this.state === 'fall')) {
      this.verticalVelocity = 0;
      this.setState('jump_land');
    }
  }

  private updatePhysics(dt: number): void {
    if (!this.isGrounded) {
      this.verticalVelocity -= this.gravity * dt;
    } else if (this.verticalVelocity < 0) {
      this.verticalVelocity = 0;
    }

    this.velocitySpring.simulate(dt);

    const dir = this.getMovementDirection();
    if (dir.length() > 0.01) {
      dir.normalize();
      this.orientation = BABYLON.Vector3.Lerp(this.orientation, dir, dt * 10);
      this.orientation.normalize();
    }

    let speed = Math.abs(this.velocitySpring.position);
    if (this.state === 'dodge') {
      this.character.position.addInPlace(this.dodgeDirection.scale(12 * dt));
    } else if (this.anyMovement() && !this.isInLockedState()) {
      const vel = this.orientation.scale(speed * dt);
      if (this.actions.backward) {
        this.character.position.subtractInPlace(vel);
      } else {
        this.character.position.addInPlace(vel);
      }
    }

    this.character.position.y += this.verticalVelocity * dt;
    if (this.character.position.y < 0) {
      this.character.position.y = 0;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    }
  }

  private updateRotation(dt: number): void {
    if (this.isInLockedState() && this.state !== 'dodge') return;
    if (this.actions.backward && !this.actions.forward) return;

    const dir = this.getMovementDirection();
    if (dir.length() > 0.01) {
      dir.normalize();
      const targetAngle = Math.atan2(dir.x, dir.z);
      this.rotationSpring.target = targetAngle;
    }

    this.rotationSpring.simulate(dt);

    if (this.character.rotationQuaternion) {
      BABYLON.Quaternion.FromEulerAnglesToRef(0, this.rotationSpring.angle, 0, this.character.rotationQuaternion);
    } else {
      this.character.rotation.y = this.rotationSpring.angle;
    }
  }

  private updateCamera(dt: number): void {
    const target = this.character.position.clone();
    target.y += 2.5;
    this.camera.target = BABYLON.Vector3.Lerp(this.camera.target, target, dt * 8);
  }

  private getTargetAnim(): string {
    const animKey = STATE_TO_ANIM[this.state];
    if (animKey && this.animationGroups.has(animKey)) {
      return animKey;
    }
    if (this.animationGroups.has('idle')) return 'idle';
    return this.animationGroups.keys().next().value || '';
  }

  private blendToAnimation(targetAnim: string, dt: number): void {
    if (!targetAnim) return;

    this.animationGroups.forEach((ag, name) => {
      if (!this.animationWeights.has(name)) {
        const isLoop = this.isLoopingAnim(name);
        ag.start(isLoop, 1.0);
        ag.setWeightForAllAnimatables(0);
        this.animationWeights.set(name, 0);
      }
    });

    this.animationGroups.forEach((ag, name) => {
      const currentW = this.animationWeights.get(name) || 0;
      const targetW = name === targetAnim ? 1 : 0;
      const newW = currentW + (targetW - currentW) * Math.min(1, this.blendSpeed * dt);
      this.animationWeights.set(name, newW);
      ag.setWeightForAllAnimatables(newW);
    });
  }

  // Public combat stat accessors (matches CharacterController interface for HUD compatibility)
  getHealth(): number { return this.health; }
  getMaxHealth(): number { return this.maxHealth; }
  getStamina(): number { return this.stamina; }
  getMaxStamina(): number { return this.maxStamina; }
  getHealthPercent(): number { return (this.health / this.maxHealth) * 100; }
  getStaminaPercent(): number { return (this.stamina / this.maxStamina) * 100; }

  takeDamage(damage: number): void {
    this.health = Math.max(0, this.health - damage);
    if (this.health <= 0 && this.state !== 'death') {
      this.setState('death');
    } else if (!this.isInLockedState()) {
      this.setState('hit_react');
    }
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  getIsBlocking(): boolean { return this.isBlocking; }
  getPosition(): BABYLON.Vector3 { return this.character.position.clone(); }
}

export async function spawnWarriorPlayer(
  scene: BABYLON.Scene,
  canvas: HTMLCanvasElement,
  position?: BABYLON.Vector3,
  options?: Partial<WarriorControllerOptions>
): Promise<WarriorPlayerController> {
  console.log('[WarriorController] Spawning warrior player...');

  const result = await BABYLON.SceneLoader.ImportMeshAsync(
    '', '', WARRIOR_MODEL_PATH, scene
  );

  const rootMesh = result.meshes[0];
  rootMesh.name = 'WarriorPlayer';
  rootMesh.id = 'warrior-player';

  if (position) {
    rootMesh.position = position.clone();
  }

  const scaleFactor = 1.0;
  rootMesh.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);

  if (!rootMesh.rotationQuaternion) {
    rootMesh.rotationQuaternion = BABYLON.Quaternion.Identity();
  }

  rootMesh.metadata = {
    ...rootMesh.metadata,
    tags: ['player', 'warrior'],
    gameObjectId: 'warrior-player',
    isPlayer: true,
  };

  rootMesh.getChildMeshes().forEach(child => {
    child.isPickable = false;
  });

  const controller = new WarriorPlayerController({
    scene,
    canvas,
    characterMesh: rootMesh,
    ...options,
  });

  if (result.animationGroups.length > 0) {
    controller.setAnimationGroups(result.animationGroups);
  }

  await controller.loadAnimations();

  return controller;
}
