import * as BABYLON from '@babylonjs/core';

export type CharacterState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land';

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
}

export interface InputActions {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  jump: boolean;
  jumpJustPressed: boolean;
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
    jumpJustPressed: false
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
  private beforeRenderObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
  
  private originalCamera: BABYLON.Camera | null = null;
  private isActive: boolean = false;
  
  private debugMode: boolean = false;

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
    
    if (options.animationGroups) {
      options.animationGroups.forEach(ag => {
        const name = ag.name.toLowerCase();
        this.animationGroups.set(name, ag);
        
        if (name.includes('idle') || name.includes('stand')) {
          this.animationGroups.set('idle', ag);
        }
        if (name.includes('walk') && !name.includes('run')) {
          this.animationGroups.set('walk', ag);
        }
        if (name.includes('run') || name.includes('sprint')) {
          this.animationGroups.set('run', ag);
        }
        if (name.includes('jump')) {
          this.animationGroups.set('jump', ag);
        }
        if (name.includes('fall')) {
          this.animationGroups.set('fall', ag);
        }
        if (name.includes('land')) {
          this.animationGroups.set('land', ag);
        }
      });
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
      jumpJustPressed: false
    };
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
    }
    
    this.onInputChange();
  }

  private onInputChange(): void {
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
    }
    
    this.actions.jumpJustPressed = false;
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
    
    // Step 1: Check support (what surface the character is on)
    this.checkGrounded();
    
    // Step 2: Update state machine based on support and input
    if (!this.isGrounded && this.state !== 'jump' && this.state !== 'fall') {
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
    
    // Step 3: Calculate desired velocity based on state
    if (this.state === 'walk' || this.state === 'run') {
      this.setVelocityTarget(this.actions.run ? this.runSpeed : this.walkSpeed);
    }
    
    // Set orientation target based on camera-relative input
    this.setCameraRelativeOrientationTarget();
    
    // Step 4: Simulate spring-based movement (velocity integration)
    this.springMovement(dt);
    this.springRotation(dt);
    
    // Apply gravity (integrate vertical velocity)
    if (!this.isGrounded) {
      this.verticalVelocity -= this.gravity * dt;
      // Terminal velocity clamp
      this.verticalVelocity = Math.max(this.verticalVelocity, -50);
    }
    
    // Integrate vertical position
    this.character.position.y += this.verticalVelocity * dt;
    
    // Ground plane safety check
    if (this.character.position.y < 0) {
      this.character.position.y = 0;
      this.isGrounded = true;
      this.verticalVelocity = 0;
    }
    
    // Apply character rotation
    this.applyRotation();
    
    // Update animation blending
    const targetAnim = this.getAnimationForState();
    this.blendToAnimation(targetAnim, dt);
    
    // Update camera with collision avoidance
    this.updateCamera(dt);
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
  const meshes = scene.meshes.filter(m => 
    m.name !== 'grid' && 
    m.name !== 'skyBox' && 
    m.name !== 'ground' &&
    !m.name.startsWith('__') &&
    m.getTotalVertices() > 100
  );
  
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
  
  const characterMesh = meshes.find(m => 
    m.name.toLowerCase().includes('character') ||
    m.name.toLowerCase().includes('player') ||
    m.name.toLowerCase().includes('knight') ||
    m.name.toLowerCase().includes('hero')
  );
  
  if (characterMesh) {
    return { mesh: characterMesh, animationGroups: [] };
  }
  
  const largestMesh = meshes
    .filter(m => m.parent === null)
    .sort((a, b) => b.getTotalVertices() - a.getTotalVertices())[0];
  
  return { mesh: largestMesh || null, animationGroups: [] };
}
