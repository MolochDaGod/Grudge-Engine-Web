import * as BABYLON from '@babylonjs/core';

export type AIState = 
  | 'idle' 
  | 'patrol' 
  | 'chase' 
  | 'attack' 
  | 'flee' 
  | 'return' 
  | 'dead'
  | 'fly_idle'
  | 'fly_circle'
  | 'fly_swoop'
  | 'fly_hover';

export interface AITarget {
  mesh: BABYLON.AbstractMesh;
  position: BABYLON.Vector3;
  lastSeenTime: number;
}

export interface AIBehaviorOptions {
  scene: BABYLON.Scene;
  mesh: BABYLON.AbstractMesh;
  animationGroups?: BABYLON.AnimationGroup[];
  detectionRange?: number;
  attackRange?: number;
  moveSpeed?: number;
  turnSpeed?: number;
  patrolRadius?: number;
  homePosition?: BABYLON.Vector3;
}

class SmoothValue {
  public current: number = 0;
  public target: number = 0;
  public velocity: number = 0;
  public smoothTime: number = 0.3;

  update(deltaTime: number): number {
    const omega = 2 / this.smoothTime;
    const x = omega * deltaTime;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = this.current - this.target;
    const temp = (this.velocity + omega * change) * deltaTime;
    this.velocity = (this.velocity - omega * temp) * exp;
    this.current = this.target - (change + temp) * exp;
    return this.current;
  }

  set(value: number): void {
    this.current = value;
    this.target = value;
    this.velocity = 0;
  }
}

export abstract class AIBehavior {
  protected scene: BABYLON.Scene;
  protected mesh: BABYLON.AbstractMesh;
  protected animationGroups: Map<string, BABYLON.AnimationGroup> = new Map();
  
  protected state: AIState = 'idle';
  protected stateTimer: number = 0;
  protected previousState: AIState = 'idle';
  
  protected target: AITarget | null = null;
  protected homePosition: BABYLON.Vector3;
  protected patrolTarget: BABYLON.Vector3 | null = null;
  
  protected detectionRange: number;
  protected attackRange: number;
  protected moveSpeed: number;
  protected turnSpeed: number;
  protected patrolRadius: number;
  
  protected rotationY: SmoothValue = new SmoothValue();
  protected animationWeights: Map<string, number> = new Map();
  protected blendSpeed: number = 5.0;
  
  protected isActive: boolean = false;
  protected beforeRenderObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;

  constructor(options: AIBehaviorOptions) {
    this.scene = options.scene;
    this.mesh = options.mesh;
    this.detectionRange = options.detectionRange ?? 15;
    this.attackRange = options.attackRange ?? 2;
    this.moveSpeed = options.moveSpeed ?? 3;
    this.turnSpeed = options.turnSpeed ?? 5;
    this.patrolRadius = options.patrolRadius ?? 10;
    this.homePosition = options.homePosition ?? this.mesh.position.clone();
    
    this.rotationY.set(this.mesh.rotation.y);
    
    if (options.animationGroups) {
      this.setupAnimations(options.animationGroups);
    }
  }

  protected abstract setupAnimations(groups: BABYLON.AnimationGroup[]): void;
  protected abstract updateState(deltaTime: number): void;
  protected abstract onStateEnter(state: AIState): void;
  protected abstract onStateExit(state: AIState): void;

  public start(): void {
    if (this.isActive) return;
    this.isActive = true;
    
    this.beforeRenderObserver = this.scene.onBeforeRenderObservable.add(() => {
      const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
      this.update(deltaTime);
    });
    
    this.setState('idle');
    console.log(`[AI] ${this.mesh.name} behavior started`);
  }

  public stop(): void {
    if (!this.isActive) return;
    this.isActive = false;
    
    if (this.beforeRenderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
      this.beforeRenderObserver = null;
    }
    
    this.animationGroups.forEach(ag => ag.stop());
    console.log(`[AI] ${this.mesh.name} behavior stopped`);
  }

  protected update(deltaTime: number): void {
    this.stateTimer += deltaTime;
    this.updateState(deltaTime);
    this.updateAnimationBlending(deltaTime);
    
    this.rotationY.update(deltaTime);
    this.mesh.rotation.y = this.rotationY.current;
  }

  protected setState(newState: AIState): void {
    if (this.state === newState) return;
    
    this.onStateExit(this.state);
    this.previousState = this.state;
    this.state = newState;
    this.stateTimer = 0;
    this.onStateEnter(newState);
    
    console.log(`[AI] ${this.mesh.name}: ${this.previousState} → ${newState}`);
  }

  protected setTarget(mesh: BABYLON.AbstractMesh | null): void {
    if (mesh) {
      this.target = {
        mesh,
        position: mesh.position.clone(),
        lastSeenTime: Date.now()
      };
    } else {
      this.target = null;
    }
  }

  protected updateTarget(): void {
    if (this.target) {
      this.target.position = this.target.mesh.position.clone();
      this.target.lastSeenTime = Date.now();
    }
  }

  protected getDistanceToTarget(): number {
    if (!this.target) return Infinity;
    return BABYLON.Vector3.Distance(this.mesh.position, this.target.position);
  }

  protected getDistanceToHome(): number {
    return BABYLON.Vector3.Distance(this.mesh.position, this.homePosition);
  }

  protected lookAt(targetPosition: BABYLON.Vector3, instant: boolean = false): void {
    const direction = targetPosition.subtract(this.mesh.position);
    direction.y = 0;
    if (direction.lengthSquared() < 0.001) return;
    
    const targetRotation = Math.atan2(direction.x, direction.z);
    
    if (instant) {
      this.rotationY.set(targetRotation);
    } else {
      this.rotationY.target = targetRotation;
    }
  }

  protected moveTowards(targetPosition: BABYLON.Vector3, speed: number, deltaTime: number): boolean {
    const direction = targetPosition.subtract(this.mesh.position);
    direction.y = 0;
    const distance = direction.length();
    
    if (distance < 0.1) return true;
    
    direction.normalize();
    const moveAmount = Math.min(speed * deltaTime, distance);
    this.mesh.position.addInPlace(direction.scale(moveAmount));
    
    this.lookAt(targetPosition);
    return distance < 0.5;
  }

  protected generatePatrolPoint(): BABYLON.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.patrolRadius;
    return new BABYLON.Vector3(
      this.homePosition.x + Math.cos(angle) * radius,
      this.homePosition.y,
      this.homePosition.z + Math.sin(angle) * radius
    );
  }

  protected findNearestTarget(tag: string = 'player'): BABYLON.AbstractMesh | null {
    let nearest: BABYLON.AbstractMesh | null = null;
    let nearestDist = this.detectionRange;
    
    this.scene.meshes.forEach(mesh => {
      if (mesh.metadata?.tags?.includes(tag) || mesh.name.toLowerCase().includes('player')) {
        const dist = BABYLON.Vector3.Distance(this.mesh.position, mesh.position);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = mesh;
        }
      }
    });
    
    return nearest;
  }

  protected setAnimationWeight(name: string, weight: number): void {
    this.animationWeights.set(name, Math.max(0, Math.min(1, weight)));
  }

  protected updateAnimationBlending(deltaTime: number): void {
    this.animationGroups.forEach((ag, name) => {
      const targetWeight = this.animationWeights.get(name) ?? 0;
      const currentWeight = ag.weight ?? (ag.isPlaying ? 1 : 0);
      const newWeight = BABYLON.Scalar.Lerp(currentWeight, targetWeight, this.blendSpeed * deltaTime);
      
      if (newWeight > 0.01) {
        if (!ag.isPlaying) {
          ag.start(true, 1.0, ag.from, ag.to, false);
        }
        ag.weight = newWeight;
      } else if (ag.isPlaying && currentWeight <= 0.01) {
        ag.stop();
        ag.weight = 0;
      }
    });
  }

  public getState(): AIState {
    return this.state;
  }

  public isAlive(): boolean {
    return this.state !== 'dead';
  }

  public takeDamage(amount: number): void {
    console.log(`[AI] ${this.mesh.name} took ${amount} damage`);
  }

  public die(): void {
    this.setState('dead');
  }
}
