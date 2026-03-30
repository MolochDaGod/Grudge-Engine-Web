import * as BABYLON from '@babylonjs/core';
import { CombatEntity, CombatEvent, PLAYER_ATTACKS, getCombatManager, HitResult } from './combat-system';

export type CharacterState = 
  | 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land'
  | 'attack_light' | 'attack_heavy' | 'attack_charge' | 'attack_recovery'
  | 'block' | 'block_hit' | 'guard_broken' | 'hit' | 'stagger' | 'dodge' | 'dead';

export interface CombatCallbacks {
  onDamageDealt?: (target: string, damage: number) => void;
  onDamageTaken?: (source: string, damage: number) => void;
  onBlock?: (damage: number) => void;
  onDeath?: () => void;
  onStaminaDepleted?: () => void;
  onStatsChanged?: (health: number, maxHealth: number, stamina: number, maxStamina: number) => void;
}

export interface CharacterControllerOptions {
  scene: BABYLON.Scene;
  canvas: HTMLCanvasElement;
  characterMesh: BABYLON.AbstractMesh;
  animationGroups?: BABYLON.AnimationGroup[];
  walkSpeed?: number;
  runSpeed?: number;
  jumpForce?: number;
  gravity?: number;
  cameraDistance?: number;
  cameraHeight?: number;
  maxHealth?: number;
  maxStamina?: number;
  combatCallbacks?: CombatCallbacks;
}

export interface InputActions {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  jump: boolean;
  jumpJustPressed: boolean;
  attack: boolean;
  attackJustPressed: boolean;
  heavyAttack: boolean;
  heavyAttackJustPressed: boolean;
  block: boolean;
  dodge: boolean;
  dodgeJustPressed: boolean;
}

class VelocitySimulator {
  public position: BABYLON.Vector3 = BABYLON.Vector3.Zero();
  public velocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
  public target: BABYLON.Vector3 = BABYLON.Vector3.Zero();
  public damping: number = 0.8;
  public mass: number = 50;

  simulate(timeStep: number): void {
    const spring = 1 / this.mass;
    const damper = this.damping;
    
    const acceleration = this.target.subtract(this.position).scale(spring);
    this.velocity.addInPlace(acceleration.scale(timeStep * 60));
    this.velocity.scaleInPlace(Math.pow(1 - damper, timeStep * 60));
    this.position.addInPlace(this.velocity.scale(timeStep * 60));
  }

  init(): void {
    this.position = BABYLON.Vector3.Zero();
    this.velocity = BABYLON.Vector3.Zero();
  }
}

class RotationSimulator {
  public angle: number = 0;
  public velocity: number = 0;
  public target: number = 0;
  public damping: number = 0.5;
  public mass: number = 10;

  simulate(timeStep: number): void {
    const spring = 1 / this.mass;
    const damper = this.damping;
    
    let diff = this.target - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    const acceleration = diff * spring;
    this.velocity += acceleration * timeStep * 60;
    this.velocity *= Math.pow(1 - damper, timeStep * 60);
    this.angle += this.velocity * timeStep * 60;
  }
}

export class CharacterController {
  private scene: BABYLON.Scene;
  private canvas: HTMLCanvasElement;
  private character: BABYLON.AbstractMesh;
  private camera: BABYLON.ArcRotateCamera;
  private animationGroups: Map<string, BABYLON.AnimationGroup> = new Map();
  
  private walkSpeed: number;
  private runSpeed: number;
  private jumpForce: number;
  private gravity: number;
  private cameraDistance: number;
  private cameraHeight: number;
  
  private actions: InputActions = {
    up: false,
    down: false,
    left: false,
    right: false,
    run: false,
    jump: false,
    jumpJustPressed: false,
    attack: false,
    attackJustPressed: false,
    heavyAttack: false,
    heavyAttackJustPressed: false,
    block: false,
    dodge: false,
    dodgeJustPressed: false
  };
  
  private state: CharacterState = 'idle';
  private stateTimer: number = 0;
  
  private velocitySimulator: VelocitySimulator = new VelocitySimulator();
  private rotationSimulator: RotationSimulator = new RotationSimulator();
  
  private verticalVelocity: number = 0;
  private isGrounded: boolean = true;
  private groundCheckRay: BABYLON.Ray | null = null;
  private rayHelper: BABYLON.RayHelper | null = null;
  
  private orientation: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 1);
  private arcadeVelocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
  
  private animationWeights: Map<string, number> = new Map();
  private blendSpeed: number = 8.0;
  
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;
  private beforeRenderObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
  
  private originalCamera: BABYLON.Camera | null = null;
  private isActive: boolean = false;
  
  private debugMode: boolean = false;
  
  public combatEntity: CombatEntity;
  private combatCallbacks: CombatCallbacks;
  private dodgeDirection: BABYLON.Vector3 = BABYLON.Vector3.Zero();
  private dodgeSpeed: number = 12;
  private dodgeDuration: number = 0.4;
  private dodgeCooldown: number = 0;
  private hitRecoveryTime: number = 0.5;
  private attackHitChecked: boolean = false;
  private chargeStartTime: number = 0;

  constructor(options: CharacterControllerOptions) {
    this.scene = options.scene;
    this.canvas = options.canvas;
    this.character = options.characterMesh;
    this.walkSpeed = options.walkSpeed ?? 4;
    this.runSpeed = options.runSpeed ?? 8;
    this.jumpForce = options.jumpForce ?? 8;
    this.gravity = options.gravity ?? 20;
    this.cameraDistance = options.cameraDistance ?? 6;
    this.cameraHeight = options.cameraHeight ?? 2;
    
    this.velocitySimulator.damping = 0.8;
    this.velocitySimulator.mass = 50;
    this.rotationSimulator.damping = 0.5;
    this.rotationSimulator.mass = 10;
    
    this.combatCallbacks = options.combatCallbacks ?? {};
    this.combatEntity = new CombatEntity(this.character, {
      maxHealth: options.maxHealth ?? 100,
      maxStamina: options.maxStamina ?? 100,
      staminaRegen: 20,
      maxPoise: 40,
      defense: 5,
      attackPower: 1.0
    });
    
    this.combatEntity.addEventListener(this.handleCombatEvent.bind(this));
    
    this.mouseDownHandler = this.handleMouseDown.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    
    console.log(`[CharacterController] Received ${options.animationGroups?.length || 0} animation groups for ${this.character.name}`);
    
    if (options.animationGroups && options.animationGroups.length > 0) {
      console.log(`[CharacterController] Animation names: ${options.animationGroups.map(ag => ag.name).join(', ')}`);
      
      // Get first animation as fallback
      const defaultAnim = options.animationGroups[0];
      
      options.animationGroups.forEach(ag => {
        const name = ag.name.toLowerCase();
        this.animationGroups.set(name, ag);
        
        // Use "motion" as a generic animation for movement states
        if (name === 'motion' || name.includes('locomotion')) {
          this.animationGroups.set('walk', ag);
          this.animationGroups.set('run', ag);
          this.animationGroups.set('idle', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → walk, run, idle (motion/locomotion)`);
        }
        
        if (name.includes('idle') || name.includes('stand')) {
          this.animationGroups.set('idle', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → idle`);
        }
        if (name.includes('walk') && !name.includes('run')) {
          this.animationGroups.set('walk', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → walk`);
        }
        if (name.includes('run') || name.includes('sprint')) {
          this.animationGroups.set('run', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → run`);
        }
        if (name.includes('jump')) {
          this.animationGroups.set('jump', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → jump`);
        }
        if (name.includes('fall')) {
          this.animationGroups.set('fall', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → fall`);
        }
        if (name.includes('land')) {
          this.animationGroups.set('land', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → land`);
        }
        if (name.includes('slash') || name.includes('attack') || name.includes('swing')) {
          if (!this.animationGroups.has('attack_light')) {
            this.animationGroups.set('attack_light', ag);
            console.log(`[CharacterController] Mapped '${ag.name}' → attack_light`);
          } else if (!this.animationGroups.has('attack_heavy')) {
            this.animationGroups.set('attack_heavy', ag);
            console.log(`[CharacterController] Mapped '${ag.name}' → attack_heavy`);
          }
        }
        if (name.includes('block') || name.includes('guard') || name.includes('defend')) {
          this.animationGroups.set('block', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → block`);
        }
        if (name.includes('hit') || name.includes('impact') || name.includes('hurt')) {
          this.animationGroups.set('hit', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → hit`);
        }
        if (name.includes('dodge') || name.includes('roll') || name.includes('evade')) {
          this.animationGroups.set('dodge', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → dodge`);
        }
        if (name.includes('die') || name.includes('death')) {
          this.animationGroups.set('dead', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → dead`);
        }
        if (name.includes('stagger') || name.includes('stun')) {
          this.animationGroups.set('stagger', ag);
          console.log(`[CharacterController] Mapped '${ag.name}' → stagger`);
        }
      });
      
      // Fallback: if we have no idle animation, use the first available animation
      if (!this.animationGroups.has('idle') && defaultAnim) {
        this.animationGroups.set('idle', defaultAnim);
        console.log(`[CharacterController] Fallback: using '${defaultAnim.name}' as idle`);
      }
      
      console.log(`[CharacterController] Total mapped animations: ${this.animationGroups.size}`);
    } else {
      console.warn(`[CharacterController] No animations provided - character will not animate`);
    }
    
    this.camera = new BABYLON.ArcRotateCamera(
      'characterCamera',
      -Math.PI / 2,
      Math.PI / 3,
      this.cameraDistance,
      this.character.position.clone(),
      this.scene
    );
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 12;
    this.camera.lowerBetaLimit = 0.2;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.1;
    this.camera.panningSensibility = 0;
    this.camera.angularSensibilityX = 800;
    this.camera.angularSensibilityY = 800;
    
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.keyUpHandler = this.handleKeyUp.bind(this);
    
    console.log('[CharacterController] Created with Sketchbook-style movement');
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    
    // Ensure character is visible and above ground
    this.character.setEnabled(true);
    this.character.isVisible = true;
    
    // Position character above ground at center
    this.character.position.x = 0;
    this.character.position.y = 0.1; // Slightly above ground
    this.character.position.z = 0;
    
    // Make all child meshes visible too
    this.character.getChildMeshes().forEach(child => {
      child.setEnabled(true);
      child.isVisible = true;
    });
    
    this.originalCamera = this.scene.activeCamera;
    this.scene.activeCamera = this.camera;
    this.camera.attachControl(this.canvas, true);
    
    // Position camera to look at character
    this.camera.target = this.character.position.clone();
    this.camera.target.y += this.cameraHeight;
    
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    window.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    
    const combatManager = getCombatManager(this.scene);
    combatManager.registerEntity('player', this.combatEntity);
    
    this.beforeRenderObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.update();
    });
    
    this.animationGroups.forEach((ag, name) => {
      ag.start(true, 1.0);
      const weight = name === 'idle' ? 1 : 0;
      ag.setWeightForAllAnimatables(weight);
      this.animationWeights.set(name, weight);
    });
    
    this.setState('idle');
    this.velocitySimulator.init();
    
    if (this.character.rotationQuaternion) {
      const euler = this.character.rotationQuaternion.toEulerAngles();
      this.rotationSimulator.angle = euler.y;
      this.rotationSimulator.target = euler.y;
    }
    
    console.log('[CharacterController] Activated - WASD to move, Shift to run, Space to jump');
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    window.removeEventListener('mousedown', this.mouseDownHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
    
    const combatManager = getCombatManager(this.scene);
    combatManager.unregisterEntity('player');
    
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
    
    if (this.rayHelper) {
      this.rayHelper.dispose();
      this.rayHelper = null;
    }
    
    this.resetActions();
    
    console.log('[CharacterController] Deactivated');
  }

  dispose(): void {
    this.deactivate();
    this.camera.dispose();
  }

  private resetActions(): void {
    this.actions = {
      up: false,
      down: false,
      left: false,
      right: false,
      run: false,
      jump: false,
      jumpJustPressed: false,
      attack: false,
      attackJustPressed: false,
      heavyAttack: false,
      heavyAttackJustPressed: false,
      block: false,
      dodge: false,
      dodgeJustPressed: false
    };
  }
  
  private handleCombatEvent(event: CombatEvent): void {
    switch (event.type) {
      case 'damage_taken':
        console.log(`[Combat] Player took ${event.damage} damage! HP: ${this.combatEntity.stats.health}/${this.combatEntity.stats.maxHealth}`);
        this.combatCallbacks.onDamageTaken?.(event.source?.mesh.name ?? 'unknown', event.damage ?? 0);
        this.notifyStatsChanged();
        break;
      case 'damage_dealt':
        console.log(`[Combat] Player dealt ${event.damage} damage to ${event.target?.mesh.name}!`);
        this.combatCallbacks.onDamageDealt?.(event.target?.mesh.name ?? 'unknown', event.damage ?? 0);
        break;
      case 'block_success':
        console.log(`[Combat] Block successful! Chip damage: ${event.damage}`);
        this.combatCallbacks.onBlock?.(event.damage ?? 0);
        this.notifyStatsChanged();
        break;
      case 'guard_broken':
        console.log(`[Combat] Guard broken!`);
        this.setState('guard_broken');
        this.notifyStatsChanged();
        break;
      case 'stagger':
        console.log(`[Combat] Player staggered!`);
        this.setState('stagger');
        break;
      case 'death':
        console.log(`[Combat] Player died!`);
        this.setState('dead');
        this.combatCallbacks.onDeath?.();
        break;
      case 'stamina_depleted':
        console.log(`[Combat] Stamina depleted!`);
        this.combatCallbacks.onStaminaDepleted?.();
        break;
    }
  }
  
  private notifyStatsChanged(): void {
    this.combatCallbacks.onStatsChanged?.(
      this.combatEntity.stats.health,
      this.combatEntity.stats.maxHealth,
      this.combatEntity.stats.stamina,
      this.combatEntity.stats.maxStamina
    );
  }
  
  private handleMouseDown(e: MouseEvent): void {
    if (!this.isActive) return;
    
    if (e.button === 0) {
      if (!this.actions.attack) {
        this.actions.attackJustPressed = true;
      }
      this.actions.attack = true;
    } else if (e.button === 2) {
      if (!this.actions.heavyAttack) {
        this.actions.heavyAttackJustPressed = true;
      }
      this.actions.heavyAttack = true;
    }
    
    this.onInputChange();
  }
  
  private handleMouseUp(e: MouseEvent): void {
    if (!this.isActive) return;
    
    if (e.button === 0) {
      this.actions.attack = false;
      this.actions.attackJustPressed = false;
      
      if (this.state === 'attack_charge') {
        this.releaseChargeAttack();
      }
    } else if (e.button === 2) {
      this.actions.heavyAttack = false;
      this.actions.heavyAttackJustPressed = false;
    }
    
    this.onInputChange();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isActive) return;
    
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.actions.up = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.actions.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.actions.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.actions.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.actions.run = true;
        break;
      case 'Space':
        if (!this.actions.jump) {
          this.actions.jumpJustPressed = true;
        }
        this.actions.jump = true;
        break;
      case 'KeyF':
        this.actions.block = true;
        break;
      case 'KeyQ':
        if (!this.actions.dodge) {
          this.actions.dodgeJustPressed = true;
        }
        this.actions.dodge = true;
        break;
    }
    
    this.onInputChange();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (!this.isActive) return;
    
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.actions.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.actions.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.actions.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.actions.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.actions.run = false;
        break;
      case 'Space':
        this.actions.jump = false;
        this.actions.jumpJustPressed = false;
        break;
      case 'KeyF':
        this.actions.block = false;
        break;
      case 'KeyQ':
        this.actions.dodge = false;
        this.actions.dodgeJustPressed = false;
        break;
    }
    
    this.onInputChange();
  }

  private onInputChange(): void {
    const isCombatState = this.isInCombatState();
    
    if (isCombatState) {
      this.actions.jumpJustPressed = false;
      this.actions.attackJustPressed = false;
      this.actions.dodgeJustPressed = false;
      return;
    }
    
    if (this.actions.dodgeJustPressed && this.canDodge()) {
      this.startDodge();
      return;
    }
    
    if (this.actions.block && this.canBlock()) {
      this.setState('block');
      this.combatEntity.startBlock();
      return;
    }
    
    if (this.actions.attackJustPressed && this.combatEntity.canAttack()) {
      this.startLightAttack();
      return;
    }
    
    if (this.actions.heavyAttackJustPressed && this.combatEntity.canAttack()) {
      this.startChargeAttack();
      return;
    }
    
    if (this.state === 'idle') {
      if (this.actions.jumpJustPressed && this.isGrounded) {
        this.setState('jump');
        return;
      }
      if (this.anyDirection()) {
        this.setState(this.actions.run ? 'run' : 'walk');
      }
    } else if (this.state === 'walk') {
      if (this.actions.jumpJustPressed && this.isGrounded) {
        this.setState('jump');
        return;
      }
      if (!this.anyDirection()) {
        this.setState('idle');
      } else if (this.actions.run) {
        this.setState('run');
      }
    } else if (this.state === 'run') {
      if (this.actions.jumpJustPressed && this.isGrounded) {
        this.setState('jump');
        return;
      }
      if (!this.anyDirection()) {
        this.setState('idle');
      } else if (!this.actions.run) {
        this.setState('walk');
      }
    } else if (this.state === 'block') {
      if (!this.actions.block) {
        this.combatEntity.stopBlock();
        this.setState('idle');
      }
    }
    
    this.actions.jumpJustPressed = false;
    this.actions.attackJustPressed = false;
    this.actions.dodgeJustPressed = false;
  }
  
  private isInCombatState(): boolean {
    return ['attack_light', 'attack_heavy', 'attack_charge', 'attack_recovery', 
            'hit', 'stagger', 'guard_broken', 'dodge', 'dead'].includes(this.state);
  }
  
  private canDodge(): boolean {
    return this.dodgeCooldown <= 0 && 
           this.combatEntity.useStamina(20) && 
           !this.isInCombatState();
  }
  
  private canBlock(): boolean {
    return !this.isInCombatState() && this.state !== 'jump' && this.state !== 'fall';
  }
  
  private startLightAttack(): void {
    if (this.combatEntity.startAttack(PLAYER_ATTACKS.light)) {
      this.setState('attack_light');
      this.attackHitChecked = false;
      console.log('[Combat] Light attack started');
    }
  }
  
  private startChargeAttack(): void {
    if (this.combatEntity.startChargeAttack(PLAYER_ATTACKS.charge)) {
      this.setState('attack_charge');
      this.chargeStartTime = performance.now();
      this.attackHitChecked = false;
      console.log('[Combat] Charge attack started - hold to charge, release to attack');
    }
  }
  
  private releaseChargeAttack(): void {
    const chargedAttack = this.combatEntity.releaseChargeAttack();
    if (chargedAttack) {
      this.setState('attack_heavy');
      this.attackHitChecked = false;
      console.log(`[Combat] Charge released! Damage: ${chargedAttack.damage}`);
    }
  }
  
  private startDodge(): void {
    this.dodgeCooldown = 0.8;
    this.combatEntity.isInvulnerable = true;
    
    const moveDir = this.getCameraRelativeMovementVector();
    if (moveDir.length() > 0.1) {
      this.dodgeDirection = moveDir.normalize();
    } else {
      const forward = this.character.getDirection(BABYLON.Axis.Z).negate();
      this.dodgeDirection = new BABYLON.Vector3(forward.x, 0, forward.z).normalize();
    }
    
    this.setState('dodge');
    console.log('[Combat] Dodge started');
  }
  
  private checkAttackHit(): void {
    if (this.attackHitChecked || !this.combatEntity.isInActiveAttackPhase()) return;
    if (!this.combatEntity.currentAttack) return;
    
    this.attackHitChecked = true;
    const combatManager = getCombatManager(this.scene);
    const results = combatManager.checkHit(this.combatEntity, this.combatEntity.currentAttack);
    
    results.forEach((result, targetId) => {
      if (result.hit) {
        console.log(`[Combat] Hit ${targetId}! Damage: ${result.damage}, Blocked: ${result.blocked}, Staggered: ${result.staggered}`);
      }
    });
  }

  private anyDirection(): boolean {
    return this.actions.up || this.actions.down || this.actions.left || this.actions.right;
  }

  private setState(newState: CharacterState): void {
    if (this.state === newState) return;
    
    const prevState = this.state;
    this.state = newState;
    this.stateTimer = 0;
    
    switch (newState) {
      case 'idle':
        this.velocitySimulator.damping = 0.6;
        this.velocitySimulator.mass = 10;
        this.setVelocityTarget(0);
        this.combatEntity.isInvulnerable = false;
        break;
      case 'walk':
        this.velocitySimulator.damping = 0.8;
        this.velocitySimulator.mass = 50;
        this.setVelocityTarget(this.walkSpeed);
        break;
      case 'run':
        this.velocitySimulator.damping = 0.8;
        this.velocitySimulator.mass = 50;
        this.setVelocityTarget(this.runSpeed);
        break;
      case 'jump':
        this.verticalVelocity = this.jumpForce;
        this.isGrounded = false;
        break;
      case 'fall':
        break;
      case 'land':
        this.velocitySimulator.damping = 0.6;
        break;
      case 'attack_light':
      case 'attack_heavy':
        this.setVelocityTarget(0);
        this.velocitySimulator.damping = 0.9;
        break;
      case 'attack_charge':
        this.setVelocityTarget(0);
        this.combatEntity.chargeTime = 0;
        break;
      case 'block':
        this.setVelocityTarget(0);
        this.velocitySimulator.damping = 0.9;
        break;
      case 'dodge':
        this.combatEntity.isInvulnerable = true;
        break;
      case 'hit':
      case 'stagger':
      case 'guard_broken':
        this.setVelocityTarget(0);
        this.combatEntity.stopBlock();
        break;
      case 'dead':
        this.setVelocityTarget(0);
        this.combatEntity.stopBlock();
        break;
    }
    
    console.log(`[CharacterController] State: ${prevState} -> ${newState}`);
  }

  private setVelocityTarget(speed: number): void {
    this.arcadeVelocity = new BABYLON.Vector3(0, 0, speed);
  }

  private getCameraRelativeMovementVector(): BABYLON.Vector3 {
    const cameraAlpha = this.camera.alpha;
    
    let moveX = 0;
    let moveZ = 0;
    
    if (this.actions.up) {
      moveX += Math.sin(cameraAlpha);
      moveZ += Math.cos(cameraAlpha);
    }
    if (this.actions.down) {
      moveX -= Math.sin(cameraAlpha);
      moveZ -= Math.cos(cameraAlpha);
    }
    if (this.actions.left) {
      moveX += Math.sin(cameraAlpha + Math.PI / 2);
      moveZ += Math.cos(cameraAlpha + Math.PI / 2);
    }
    if (this.actions.right) {
      moveX += Math.sin(cameraAlpha - Math.PI / 2);
      moveZ += Math.cos(cameraAlpha - Math.PI / 2);
    }
    
    const result = new BABYLON.Vector3(moveX, 0, moveZ);
    if (result.length() > 0) {
      result.normalize();
    }
    return result;
  }

  private setCameraRelativeOrientationTarget(): void {
    const moveVector = this.getCameraRelativeMovementVector();
    if (moveVector.length() > 0.1) {
      this.rotationSimulator.target = Math.atan2(moveVector.x, moveVector.z);
    }
  }

  /**
   * Check support/ground following Babylon.js PhysicsCharacterController pattern
   * This determines what surface the character is standing on
   */
  private checkGrounded(): void {
    const rayOrigin = this.character.position.clone();
    rayOrigin.y += 0.5;
    
    // Cast ray downward to detect ground (similar to checkSupport in Babylon.js)
    const down = new BABYLON.Vector3(0, -1, 0);
    const rayLength = 0.7;
    
    this.groundCheckRay = new BABYLON.Ray(rayOrigin, down, rayLength);
    
    const pickInfo = this.scene.pickWithRay(this.groundCheckRay, (mesh) => {
      return mesh !== this.character && 
             !mesh.name.includes('skyBox') && 
             !mesh.name.includes('grid') &&
             mesh.isPickable &&
             mesh.name !== 'raycastHelper' &&
             !mesh.name.startsWith('__');
    });
    
    const wasGrounded = this.isGrounded;
    this.isGrounded = pickInfo?.hit ?? false;
    
    // Check slope angle if we hit ground
    if (pickInfo?.hit && pickInfo.getNormal) {
      const normal = pickInfo.getNormal(true);
      if (normal) {
        const slopeAngle = Math.acos(BABYLON.Vector3.Dot(normal, BABYLON.Vector3.Up())) * (180 / Math.PI);
        // If slope is too steep, treat as not grounded (can't stand on it)
        if (slopeAngle > 45) {
          this.isGrounded = false;
        }
      }
    }
    
    // Trigger landing state when hitting ground from fall
    if (!wasGrounded && this.isGrounded && this.verticalVelocity < -2) {
      this.setState('land');
    }
    
    // Snap to ground and reset vertical velocity
    if (this.isGrounded && this.verticalVelocity < 0) {
      this.verticalVelocity = 0;
      if (pickInfo?.pickedPoint) {
        // Smooth ground snapping
        this.character.position.y = BABYLON.Scalar.Lerp(
          this.character.position.y,
          pickInfo.pickedPoint.y,
          0.5
        );
      }
    }
  }

  /**
   * Main update loop following Babylon.js PhysicsCharacterController pattern:
   * 1. Check support (ground detection)
   * 2. Get desired velocity based on state and input
   * 3. Set and integrate velocity
   * 4. Update position
   */
  private update(): void {
    if (!this.isActive) return;
    
    const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.05);
    this.stateTimer += dt;
    
    this.combatEntity.update(dt);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    
    if (this.state === 'dead') {
      this.updateCamera(dt);
      return;
    }
    
    this.updateCombatStates(dt);
    
    this.checkGrounded();
    
    if (!this.isGrounded && this.state !== 'jump' && this.state !== 'fall' && !this.isInCombatState()) {
      this.setState('fall');
    }
    
    if (this.state === 'land' && this.stateTimer > 0.1) {
      if (this.anyDirection()) {
        this.setState(this.actions.run ? 'run' : 'walk');
      } else {
        this.setState('idle');
      }
    }
    
    if (this.state === 'jump' && this.verticalVelocity < 0) {
      this.setState('fall');
    }
    
    if (this.state === 'walk' || this.state === 'run') {
      this.setVelocityTarget(this.actions.run ? this.runSpeed : this.walkSpeed);
    }
    
    // Only update rotation target when actually moving
    if (this.anyDirection() && (!this.isInCombatState() || this.state === 'block')) {
      this.setCameraRelativeOrientationTarget();
    }
    
    if (this.state === 'dodge') {
      this.character.position.x += this.dodgeDirection.x * this.dodgeSpeed * dt;
      this.character.position.z += this.dodgeDirection.z * this.dodgeSpeed * dt;
    } else {
      this.springMovement(dt);
    }
    
    // Always simulate rotation for smooth transitions, but freeze target when idle
    if (!this.anyDirection() && !this.isInCombatState()) {
      // When idle, lock target to current angle to prevent drift
      this.rotationSimulator.target = this.rotationSimulator.angle;
    }
    this.springRotation(dt);
    
    if (!this.isGrounded) {
      this.verticalVelocity -= this.gravity * dt;
      this.verticalVelocity = Math.max(this.verticalVelocity, -50);
    }
    
    this.character.position.y += this.verticalVelocity * dt;
    
    if (this.character.position.y < 0) {
      this.character.position.y = 0;
      this.isGrounded = true;
      this.verticalVelocity = 0;
    }
    
    this.applyRotation();
    
    const targetAnim = this.getAnimationForState();
    this.blendToAnimation(targetAnim, dt);
    
    this.updateCamera(dt);
    
    this.notifyStatsChanged();
  }
  
  private updateCombatStates(dt: number): void {
    switch (this.state) {
      case 'attack_light':
      case 'attack_heavy':
        this.checkAttackHit();
        const attackDuration = PLAYER_ATTACKS.light.windupTime + PLAYER_ATTACKS.light.activeTime + PLAYER_ATTACKS.light.recoveryTime;
        if (this.stateTimer >= attackDuration) {
          this.setState('idle');
        }
        break;
        
      case 'attack_charge':
        this.combatEntity.chargeTime += dt;
        if (!this.actions.attack && !this.actions.heavyAttack) {
          this.releaseChargeAttack();
        }
        break;
        
      case 'dodge':
        if (this.stateTimer >= this.dodgeDuration) {
          this.combatEntity.isInvulnerable = false;
          this.setState('idle');
        }
        break;
        
      case 'hit':
        if (this.stateTimer >= this.hitRecoveryTime) {
          this.setState('idle');
        }
        break;
        
      case 'stagger':
        if (this.stateTimer >= 1.0) {
          this.setState('idle');
        }
        break;
        
      case 'guard_broken':
        if (this.stateTimer >= 1.5) {
          this.setState('idle');
        }
        break;
        
      case 'block':
        if (!this.actions.block) {
          this.combatEntity.stopBlock();
          this.setState('idle');
        }
        break;
    }
  }

  private springMovement(timeStep: number): void {
    this.velocitySimulator.target = this.arcadeVelocity.clone();
    this.velocitySimulator.simulate(timeStep);
    
    const speed = this.velocitySimulator.position.z;
    
    if (speed > 0.01 || this.anyDirection()) {
      const moveDirection = this.getCameraRelativeMovementVector();
      
      if (moveDirection.length() > 0.1) {
        this.character.position.x += moveDirection.x * speed * timeStep;
        this.character.position.z += moveDirection.z * speed * timeStep;
      }
    }
  }

  private springRotation(timeStep: number): void {
    this.rotationSimulator.simulate(timeStep);
  }

  private applyRotation(): void {
    if (this.character.rotationQuaternion) {
      const targetQuat = BABYLON.Quaternion.FromEulerAngles(0, this.rotationSimulator.angle, 0);
      this.character.rotationQuaternion = targetQuat;
    } else {
      this.character.rotation.y = this.rotationSimulator.angle;
    }
  }

  private getAnimationForState(): string {
    switch (this.state) {
      case 'idle':
        return 'idle';
      case 'walk':
        return this.animationGroups.has('walk') ? 'walk' : 'run';
      case 'run':
        return this.animationGroups.has('run') ? 'run' : 'walk';
      case 'jump':
        return this.animationGroups.has('jump') ? 'jump' : 'idle';
      case 'fall':
        return this.animationGroups.has('fall') ? 'fall' : 
               (this.animationGroups.has('jump') ? 'jump' : 'idle');
      case 'land':
        return this.animationGroups.has('land') ? 'land' : 'idle';
      case 'attack_light':
      case 'attack_heavy':
      case 'attack_charge':
        return this.animationGroups.has('attack_light') ? 'attack_light' : 'idle';
      case 'block':
      case 'block_hit':
        return this.animationGroups.has('block') ? 'block' : 'idle';
      case 'hit':
        return this.animationGroups.has('hit') ? 'hit' : 'idle';
      case 'stagger':
      case 'guard_broken':
        return this.animationGroups.has('stagger') ? 'stagger' : 
               (this.animationGroups.has('hit') ? 'hit' : 'idle');
      case 'dodge':
        return this.animationGroups.has('dodge') ? 'dodge' : 'run';
      case 'dead':
        return this.animationGroups.has('dead') ? 'dead' : 'idle';
      default:
        return 'idle';
    }
  }

  private blendToAnimation(targetAnim: string, deltaTime: number): void {
    this.animationGroups.forEach((ag, name) => {
      if (!this.animationWeights.has(name)) {
        this.animationWeights.set(name, 0);
        ag.start(true, 1.0);
        ag.setWeightForAllAnimatables(0);
      }
    });
    
    this.animationGroups.forEach((ag, name) => {
      const currentWeight = this.animationWeights.get(name) || 0;
      const targetWeight = name === targetAnim ? 1 : 0;
      
      const newWeight = currentWeight + (targetWeight - currentWeight) * Math.min(1, this.blendSpeed * deltaTime);
      this.animationWeights.set(name, newWeight);
      ag.setWeightForAllAnimatables(newWeight);
    });
  }

  private updateCamera(deltaTime: number): void {
    const targetPosition = this.character.position.clone();
    targetPosition.y += this.cameraHeight;
    
    // Smooth camera follow with lerp (following Babylon.js best practices)
    this.camera.target = BABYLON.Vector3.Lerp(
      this.camera.target, 
      targetPosition, 
      deltaTime * 8
    );
    
    // Camera collision detection to prevent clipping through geometry
    const cameraPosition = this.camera.position.clone();
    const directionToCamera = cameraPosition.subtract(targetPosition);
    const distanceToCamera = directionToCamera.length();
    
    if (distanceToCamera > 0.1) {
      directionToCamera.normalize();
      const ray = new BABYLON.Ray(targetPosition, directionToCamera, this.cameraDistance + 0.5);
      
      const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
        return mesh !== this.character && 
               !mesh.name.includes('skyBox') && 
               !mesh.name.includes('grid') &&
               mesh.isPickable &&
               !mesh.name.startsWith('__');
      });
      
      if (pickInfo?.hit && pickInfo.distance < this.cameraDistance) {
        // Move camera closer to avoid clipping
        const safeDistance = Math.max(pickInfo.distance - 0.3, this.camera.lowerRadiusLimit || 2);
        this.camera.radius = BABYLON.Scalar.Lerp(this.camera.radius, safeDistance, deltaTime * 10);
      } else {
        // Smoothly return to default distance
        this.camera.radius = BABYLON.Scalar.Lerp(this.camera.radius, this.cameraDistance, deltaTime * 5);
      }
    }
  }

  getCamera(): BABYLON.ArcRotateCamera {
    return this.camera;
  }

  getCharacter(): BABYLON.AbstractMesh {
    return this.character;
  }
  
  getHealth(): number {
    return this.combatEntity.stats.health;
  }
  
  getMaxHealth(): number {
    return this.combatEntity.stats.maxHealth;
  }
  
  getStamina(): number {
    return this.combatEntity.stats.stamina;
  }
  
  getMaxStamina(): number {
    return this.combatEntity.stats.maxStamina;
  }
  
  getHealthPercent(): number {
    return this.combatEntity.getHealthPercent();
  }
  
  getStaminaPercent(): number {
    return this.combatEntity.getStaminaPercent();
  }
  
  takeDamage(damage: number, attacker?: CombatEntity): void {
    if (attacker) {
      const attack = PLAYER_ATTACKS.light;
      this.combatEntity.receiveAttack(attacker, { ...attack, damage });
    } else {
      this.combatEntity.stats.health = Math.max(0, this.combatEntity.stats.health - damage);
      if (this.combatEntity.stats.health <= 0) {
        this.setState('dead');
      } else {
        this.setState('hit');
      }
    }
  }
  
  isDead(): boolean {
    return this.combatEntity.isDead();
  }

  isControllerActive(): boolean {
    return this.isActive;
  }

  getState(): CharacterState {
    return this.state;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

export function findPlayerCharacter(scene: BABYLON.Scene): { mesh: BABYLON.AbstractMesh | null; animationGroups: BABYLON.AnimationGroup[] } {
  // Exclude environment/terrain meshes that should never be used as a player
  const EXCLUDED_NAMES = ['grid', 'skyBox', 'ground', 'grassGround', 'terrain', 'plane', 'floor', 'water', 'ocean', 'sea', 'environment', 'sky', 'cloud'];
  const meshes = scene.meshes.filter(m => {
    const lname = m.name.toLowerCase();
    if (m.name.startsWith('__')) return false;
    if (EXCLUDED_NAMES.some(ex => lname === ex || lname.startsWith(ex + '_'))) return false;
    if (lname.includes('grass') || lname.includes('terrain') || lname.includes('ground')) return false;
    if (m.getTotalVertices() < 100) return false;
    return true;
  });
  
  const taggedPlayer = meshes.find(m => {
    const metadata = m.metadata as { tags?: string[] } | null;
    return metadata?.tags?.includes('player');
  });
  
  if (taggedPlayer) {
    const animGroups = scene.animationGroups.filter(ag => {
      return ag.targetedAnimations.some(ta => {
        let target = ta.target as BABYLON.Node;
        while (target) {
          if (target === taggedPlayer) return true;
          target = target.parent as BABYLON.Node;
        }
        return false;
      });
    });
    return { mesh: taggedPlayer, animationGroups: animGroups };
  }
  
  for (const mesh of meshes) {
    const animGroups = scene.animationGroups.filter(ag => {
      return ag.targetedAnimations.some(ta => {
        let target = ta.target as BABYLON.Node;
        while (target) {
          if (target === mesh || target.parent === mesh) return true;
          target = target.parent as BABYLON.Node;
        }
        return false;
      });
    });
    
    if (animGroups.length > 0) {
      return { mesh, animationGroups: animGroups };
    }
  }
  
  const characterMesh = meshes.find(m => {
    const lname = m.name.toLowerCase();
    return lname.includes('character') ||
      lname.includes('player') ||
      lname.includes('knight') ||
      lname.includes('hero') ||
      lname.includes('warrior') ||
      lname.includes('humanoid') ||
      lname.includes('npc') ||
      lname.includes('enemy');
  });
  
  if (characterMesh) {
    return { mesh: characterMesh, animationGroups: [] };
  }
  
  // No reliable player found — return null rather than guessing with largest mesh
  return { mesh: null, animationGroups: [] };
}
