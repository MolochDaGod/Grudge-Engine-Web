import * as BABYLON from '@babylonjs/core';

export interface ThirdPersonControllerOptions {
  scene: BABYLON.Scene;
  canvas: HTMLCanvasElement;
  characterMesh: BABYLON.AbstractMesh;
  animationGroups?: BABYLON.AnimationGroup[];
  walkSpeed?: number;
  runSpeed?: number;
  rotationSpeed?: number;
  cameraDistance?: number;
  cameraHeight?: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  shift: boolean;
}

export class ThirdPersonController {
  private scene: BABYLON.Scene;
  private canvas: HTMLCanvasElement;
  private character: BABYLON.AbstractMesh;
  private camera: BABYLON.ArcRotateCamera;
  private animationGroups: Map<string, BABYLON.AnimationGroup> = new Map();
  
  private walkSpeed: number;
  private runSpeed: number;
  private rotationSpeed: number;
  private cameraDistance: number;
  private cameraHeight: number;
  
  private input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false
  };
  
  private currentAnimation: string = '';
  private targetRotation: number = 0;
  private velocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
  
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private beforeRenderObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
  
  private originalCamera: BABYLON.Camera | null = null;
  private isActive: boolean = false;
  
  private animationWeights: Map<string, number> = new Map();
  private blendSpeed: number = 5.0;

  constructor(options: ThirdPersonControllerOptions) {
    this.scene = options.scene;
    this.canvas = options.canvas;
    this.character = options.characterMesh;
    this.walkSpeed = options.walkSpeed ?? 0.08;
    this.runSpeed = options.runSpeed ?? 0.16;
    this.rotationSpeed = options.rotationSpeed ?? 0.1;
    this.cameraDistance = options.cameraDistance ?? 8;
    this.cameraHeight = options.cameraHeight ?? 3;
    
    if (options.animationGroups) {
      options.animationGroups.forEach(ag => {
        const name = ag.name.toLowerCase();
        this.animationGroups.set(name, ag);
        
        if (name.includes('idle') || name.includes('stand')) {
          this.animationGroups.set('idle', ag);
        }
        if (name.includes('walk')) {
          this.animationGroups.set('walk', ag);
        }
        if (name.includes('run') || name.includes('sprint')) {
          this.animationGroups.set('run', ag);
        }
      });
    }
    
    this.camera = new BABYLON.ArcRotateCamera(
      'thirdPersonCamera',
      -Math.PI / 2,
      Math.PI / 3,
      this.cameraDistance,
      this.character.position.clone(),
      this.scene
    );
    this.camera.lowerRadiusLimit = 3;
    this.camera.upperRadiusLimit = 15;
    this.camera.lowerBetaLimit = 0.3;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.1;
    
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.keyUpHandler = this.handleKeyUp.bind(this);
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    
    this.originalCamera = this.scene.activeCamera;
    this.scene.activeCamera = this.camera;
    this.camera.attachControl(this.canvas, true);
    
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    
    this.beforeRenderObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.update();
    });
    
    // Initialize all animations for blending
    this.animationGroups.forEach((ag, name) => {
      ag.start(true, 1.0);
      ag.setWeightForAllAnimatables(name === 'idle' ? 1 : 0);
      this.animationWeights.set(name, name === 'idle' ? 1 : 0);
    });
    this.currentAnimation = 'idle';
    
    console.log('[ThirdPersonController] Activated');
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
    
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      shift: false
    };
    
    console.log('[ThirdPersonController] Deactivated');
  }

  dispose(): void {
    this.deactivate();
    this.camera.dispose();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isActive) return;
    
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.shift = true;
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (!this.isActive) return;
    
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.shift = false;
        break;
    }
  }

  private update(): void {
    if (!this.isActive) return;
    
    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
    
    const isMoving = this.input.forward || this.input.backward || this.input.left || this.input.right;
    const isRunning = this.input.shift && isMoving;
    const speed = (isRunning ? this.runSpeed : this.walkSpeed) * deltaTime * 60;
    
    let targetAnim = 'idle';
    
    if (isMoving) {
      const cameraDirection = this.camera.alpha;
      
      let moveDirection = new BABYLON.Vector3(0, 0, 0);
      
      if (this.input.forward) {
        moveDirection.x += Math.sin(cameraDirection);
        moveDirection.z += Math.cos(cameraDirection);
      }
      if (this.input.backward) {
        moveDirection.x -= Math.sin(cameraDirection);
        moveDirection.z -= Math.cos(cameraDirection);
      }
      if (this.input.left) {
        moveDirection.x += Math.sin(cameraDirection + Math.PI / 2);
        moveDirection.z += Math.cos(cameraDirection + Math.PI / 2);
      }
      if (this.input.right) {
        moveDirection.x += Math.sin(cameraDirection - Math.PI / 2);
        moveDirection.z += Math.cos(cameraDirection - Math.PI / 2);
      }
      
      if (moveDirection.length() > 0) {
        moveDirection.normalize();
        
        this.targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
        
        // Handle rotation - support both Euler and Quaternion
        if (this.character.rotationQuaternion) {
          // GLB models use quaternion rotation
          const targetQuat = BABYLON.Quaternion.FromEulerAngles(0, this.targetRotation, 0);
          this.character.rotationQuaternion = BABYLON.Quaternion.Slerp(
            this.character.rotationQuaternion,
            targetQuat,
            this.rotationSpeed * deltaTime * 10
          );
        } else {
          // Euler rotation for other meshes
          let currentRotation = this.character.rotation.y;
          let rotationDiff = this.targetRotation - currentRotation;
          
          while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
          while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
          
          this.character.rotation.y += rotationDiff * this.rotationSpeed * deltaTime * 10;
        }
        
        // Apply movement scaled by deltaTime
        this.character.position.x += moveDirection.x * speed;
        this.character.position.z += moveDirection.z * speed;
      }
      
      if (isRunning && this.animationGroups.has('run')) {
        targetAnim = 'run';
      } else if (this.animationGroups.has('walk')) {
        targetAnim = 'walk';
      }
    }
    
    // Update animation blending
    this.blendToAnimation(targetAnim, deltaTime);
    
    // Smooth camera follow
    const targetPosition = this.character.position.clone();
    targetPosition.y += this.cameraHeight;
    this.camera.target = BABYLON.Vector3.Lerp(this.camera.target, targetPosition, deltaTime * 5);
  }
  
  private blendToAnimation(targetAnim: string, deltaTime: number): void {
    // Initialize weights if needed
    this.animationGroups.forEach((ag, name) => {
      if (!this.animationWeights.has(name)) {
        this.animationWeights.set(name, 0);
        ag.start(true, 1.0);
        ag.setWeightForAllAnimatables(0);
      }
    });
    
    // Blend weights
    this.animationGroups.forEach((ag, name) => {
      const currentWeight = this.animationWeights.get(name) || 0;
      const targetWeight = name === targetAnim ? 1 : 0;
      
      // Lerp weight towards target
      const newWeight = currentWeight + (targetWeight - currentWeight) * Math.min(1, this.blendSpeed * deltaTime);
      this.animationWeights.set(name, newWeight);
      
      // Apply weight to animation group
      ag.setWeightForAllAnimatables(newWeight);
    });
    
    this.currentAnimation = targetAnim;
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
