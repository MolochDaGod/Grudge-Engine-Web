import * as BABYLON from '@babylonjs/core';
import { AIBehavior, AIBehaviorOptions, AIState } from './ai-behaviors';

export interface DragonOptions extends AIBehaviorOptions {
  flyHeight?: number;
  flyHeightVariation?: number;
  circleRadius?: number;
  circleSpeed?: number;
  swoopSpeed?: number;
  swoopDistance?: number;
  hoverBobAmount?: number;
  hoverBobSpeed?: number;
  breathAttackRange?: number;
}

export class DragonBehavior extends AIBehavior {
  private flyHeight: number;
  private flyHeightVariation: number;
  private circleRadius: number;
  private circleSpeed: number;
  private swoopSpeed: number;
  private swoopDistance: number;
  private hoverBobAmount: number;
  private hoverBobSpeed: number;
  private breathAttackRange: number;
  
  private circleAngle: number = 0;
  private circleCenter: BABYLON.Vector3;
  private targetFlyHeight: number;
  private currentFlyHeight: number;
  private heightVelocity: number = 0;
  
  private swoopStartPosition: BABYLON.Vector3 | null = null;
  private swoopTargetPosition: BABYLON.Vector3 | null = null;
  private swoopProgress: number = 0;
  
  private hoverTime: number = 0;
  private baseY: number;
  
  private wingFlapSpeed: number = 1.0;
  private bankAngle: number = 0;
  private targetBankAngle: number = 0;
  
  private attackCooldown: number = 0;
  private isBreathingFire: boolean = false;

  constructor(options: DragonOptions) {
    super({
      ...options,
      moveSpeed: options.moveSpeed ?? 8,
      detectionRange: options.detectionRange ?? 40,
      attackRange: options.attackRange ?? 5,
      patrolRadius: options.patrolRadius ?? 25,
    });
    
    this.flyHeight = options.flyHeight ?? 8;
    this.flyHeightVariation = options.flyHeightVariation ?? 3;
    this.circleRadius = options.circleRadius ?? 15;
    this.circleSpeed = options.circleSpeed ?? 0.3;
    this.swoopSpeed = options.swoopSpeed ?? 15;
    this.swoopDistance = options.swoopDistance ?? 20;
    this.hoverBobAmount = options.hoverBobAmount ?? 0.5;
    this.hoverBobSpeed = options.hoverBobSpeed ?? 2;
    this.breathAttackRange = options.breathAttackRange ?? 12;
    
    this.circleCenter = this.homePosition.clone();
    this.targetFlyHeight = this.flyHeight;
    this.currentFlyHeight = this.flyHeight;
    this.baseY = this.homePosition.y + this.flyHeight;
    
    this.mesh.position.y = this.baseY;
  }

  protected setupAnimations(groups: BABYLON.AnimationGroup[]): void {
    groups.forEach(ag => {
      const name = ag.name.toLowerCase();
      
      this.animationGroups.set(name, ag);
      
      if (name.includes('fly') || name.includes('flap') || name.includes('glide')) {
        this.animationGroups.set('fly', ag);
      }
      if (name.includes('idle') || name.includes('hover')) {
        this.animationGroups.set('hover', ag);
      }
      if (name.includes('attack') || name.includes('bite')) {
        this.animationGroups.set('attack', ag);
      }
      if (name.includes('breath') || name.includes('fire')) {
        this.animationGroups.set('breath', ag);
      }
      if (name.includes('land')) {
        this.animationGroups.set('land', ag);
      }
      if (name.includes('die') || name.includes('death')) {
        this.animationGroups.set('die', ag);
      }
    });
    
    if (groups.length > 0 && !this.animationGroups.has('fly')) {
      this.animationGroups.set('fly', groups[0]);
    }
    
    console.log(`[Dragon] Loaded ${this.animationGroups.size} animations:`, 
      Array.from(this.animationGroups.keys()).join(', '));
  }

  protected updateState(deltaTime: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
    this.hoverTime += deltaTime;
    
    this.updateFlightPhysics(deltaTime);
    this.updateBanking(deltaTime);
    
    switch (this.state) {
      case 'fly_idle':
        this.updateFlyIdle(deltaTime);
        break;
      case 'fly_circle':
        this.updateFlyCircle(deltaTime);
        break;
      case 'fly_swoop':
        this.updateFlySwoop(deltaTime);
        break;
      case 'fly_hover':
        this.updateFlyHover(deltaTime);
        break;
      case 'chase':
        this.updateChase(deltaTime);
        break;
      case 'attack':
        this.updateAttack(deltaTime);
        break;
      case 'return':
        this.updateReturn(deltaTime);
        break;
      case 'dead':
        this.updateDead(deltaTime);
        break;
      default:
        this.setState('fly_idle');
    }
  }

  private updateFlightPhysics(deltaTime: number): void {
    const heightDiff = this.targetFlyHeight - this.currentFlyHeight;
    this.heightVelocity += heightDiff * 2 * deltaTime;
    this.heightVelocity *= 0.95;
    this.currentFlyHeight += this.heightVelocity * deltaTime * 60;
    
    const bobOffset = Math.sin(this.hoverTime * this.hoverBobSpeed) * this.hoverBobAmount;
    this.mesh.position.y = this.homePosition.y + this.currentFlyHeight + bobOffset;
  }

  private updateBanking(deltaTime: number): void {
    this.bankAngle = BABYLON.Scalar.Lerp(this.bankAngle, this.targetBankAngle, deltaTime * 3);
    this.mesh.rotation.z = this.bankAngle;
  }

  private updateFlyIdle(deltaTime: number): void {
    this.wingFlapSpeed = 1.0;
    this.targetBankAngle = 0;
    
    const player = this.findNearestTarget();
    if (player) {
      const distance = BABYLON.Vector3.Distance(this.mesh.position, player.position);
      if (distance < this.detectionRange) {
        this.setTarget(player);
        
        if (Math.random() < 0.5) {
          this.setState('fly_swoop');
        } else {
          this.circleCenter = player.position.clone();
          this.setState('fly_circle');
        }
        return;
      }
    }
    
    if (this.stateTimer > 3 + Math.random() * 5) {
      this.circleCenter = this.homePosition.clone();
      this.circleAngle = Math.random() * Math.PI * 2;
      this.setState('fly_circle');
    }
  }

  private updateFlyCircle(deltaTime: number): void {
    this.circleAngle += this.circleSpeed * deltaTime;
    
    const targetX = this.circleCenter.x + Math.cos(this.circleAngle) * this.circleRadius;
    const targetZ = this.circleCenter.z + Math.sin(this.circleAngle) * this.circleRadius;
    const targetPos = new BABYLON.Vector3(targetX, this.mesh.position.y, targetZ);
    
    const direction = targetPos.subtract(this.mesh.position);
    direction.y = 0;
    direction.normalize();
    
    this.mesh.position.x += direction.x * this.moveSpeed * deltaTime;
    this.mesh.position.z += direction.z * this.moveSpeed * deltaTime;
    
    const tangentAngle = this.circleAngle + Math.PI / 2;
    this.mesh.rotation.y = tangentAngle;
    
    this.targetBankAngle = -0.3;
    this.wingFlapSpeed = 0.8;
    
    this.targetFlyHeight = this.flyHeight + Math.sin(this.circleAngle * 2) * this.flyHeightVariation;
    
    if (this.target) {
      this.updateTarget();
      const distance = this.getDistanceToTarget();
      
      if (distance < this.breathAttackRange && this.attackCooldown <= 0) {
        this.setState('attack');
        return;
      }
      
      if (distance < this.swoopDistance && Math.random() < deltaTime * 0.5) {
        this.setState('fly_swoop');
        return;
      }
      
      if (distance > this.detectionRange * 1.5) {
        this.setTarget(null);
        this.circleCenter = this.homePosition.clone();
      } else {
        this.circleCenter = BABYLON.Vector3.Lerp(
          this.circleCenter, 
          this.target.position, 
          deltaTime * 0.5
        );
      }
    }
    
    if (this.stateTimer > 10 + Math.random() * 10) {
      if (this.target) {
        this.setState('fly_swoop');
      } else {
        this.setState('fly_idle');
      }
    }
  }

  private updateFlySwoop(deltaTime: number): void {
    if (!this.swoopStartPosition) {
      this.swoopStartPosition = this.mesh.position.clone();
      
      if (this.target) {
        this.swoopTargetPosition = this.target.position.clone();
        this.swoopTargetPosition.y += 1;
      } else {
        const angle = Math.random() * Math.PI * 2;
        this.swoopTargetPosition = new BABYLON.Vector3(
          this.homePosition.x + Math.cos(angle) * this.swoopDistance,
          this.homePosition.y + 2,
          this.homePosition.z + Math.sin(angle) * this.swoopDistance
        );
      }
      this.swoopProgress = 0;
    }
    
    const swoopDuration = BABYLON.Vector3.Distance(this.swoopStartPosition, this.swoopTargetPosition!) / this.swoopSpeed;
    this.swoopProgress += deltaTime / swoopDuration;
    
    const t = this.swoopProgress;
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    
    const newPos = BABYLON.Vector3.Lerp(this.swoopStartPosition, this.swoopTargetPosition!, easeT);
    
    const swoopDepth = this.flyHeight * 0.6;
    const swoopCurve = Math.sin(t * Math.PI);
    newPos.y -= swoopCurve * swoopDepth;
    
    const moveDir = newPos.subtract(this.mesh.position);
    if (moveDir.length() > 0.01) {
      this.lookAt(this.mesh.position.add(moveDir));
    }
    
    this.mesh.position = newPos;
    
    const pitch = -swoopCurve * 0.5;
    this.mesh.rotation.x = pitch;
    
    this.wingFlapSpeed = 1.5;
    this.targetBankAngle = 0;
    
    if (this.swoopProgress >= 1) {
      this.swoopStartPosition = null;
      this.swoopTargetPosition = null;
      this.mesh.rotation.x = 0;
      
      if (this.target) {
        const distance = this.getDistanceToTarget();
        if (distance < this.attackRange) {
          this.performSwoopAttack();
        }
        this.circleCenter = this.target.position.clone();
        this.setState('fly_circle');
      } else {
        this.setState('fly_idle');
      }
    }
  }

  private updateFlyHover(deltaTime: number): void {
    this.wingFlapSpeed = 1.2;
    this.targetBankAngle = 0;
    
    this.targetFlyHeight = this.flyHeight * 0.5;
    
    if (this.target) {
      this.lookAt(this.target.position);
      
      if (this.stateTimer > 2 && this.attackCooldown <= 0) {
        this.setState('attack');
        return;
      }
    }
    
    if (this.stateTimer > 4) {
      this.targetFlyHeight = this.flyHeight;
      this.setState('fly_circle');
    }
  }

  private updateChase(deltaTime: number): void {
    if (!this.target) {
      this.setState('fly_idle');
      return;
    }
    
    this.updateTarget();
    const distance = this.getDistanceToTarget();
    
    if (distance > this.detectionRange * 2) {
      this.setTarget(null);
      this.setState('return');
      return;
    }
    
    const targetPos = this.target.position.clone();
    targetPos.y = this.mesh.position.y;
    
    this.moveTowards(targetPos, this.moveSpeed * 1.2, deltaTime);
    
    this.wingFlapSpeed = 1.3;
    
    if (distance < this.swoopDistance && this.mesh.position.y > this.target.position.y + this.flyHeight * 0.5) {
      this.setState('fly_swoop');
    } else if (distance < this.breathAttackRange && this.attackCooldown <= 0) {
      this.setState('attack');
    }
  }

  private updateAttack(deltaTime: number): void {
    if (!this.target) {
      this.setState('fly_idle');
      return;
    }
    
    this.lookAt(this.target.position);
    this.wingFlapSpeed = 0.8;
    
    if (!this.isBreathingFire) {
      this.isBreathingFire = true;
      this.performBreathAttack();
    }
    
    if (this.stateTimer > 2.5) {
      this.isBreathingFire = false;
      this.attackCooldown = 5;
      
      this.targetFlyHeight = this.flyHeight + this.flyHeightVariation;
      this.circleCenter = this.target.position.clone();
      this.setState('fly_circle');
    }
  }

  private updateReturn(deltaTime: number): void {
    const targetPos = this.homePosition.clone();
    targetPos.y = this.mesh.position.y;
    
    const reached = this.moveTowards(targetPos, this.moveSpeed * 0.7, deltaTime);
    this.targetFlyHeight = this.flyHeight;
    
    const player = this.findNearestTarget();
    if (player) {
      const distance = BABYLON.Vector3.Distance(this.mesh.position, player.position);
      if (distance < this.detectionRange * 0.6) {
        this.setTarget(player);
        this.setState('fly_circle');
        return;
      }
    }
    
    if (reached) {
      this.setState('fly_idle');
    }
  }

  private updateDead(deltaTime: number): void {
    this.mesh.position.y -= 5 * deltaTime;
    this.mesh.rotation.x = BABYLON.Scalar.Lerp(this.mesh.rotation.x, -Math.PI / 4, deltaTime * 2);
    this.mesh.rotation.z = BABYLON.Scalar.Lerp(this.mesh.rotation.z, Math.PI / 6, deltaTime);
    
    if (this.mesh.position.y < this.homePosition.y) {
      this.mesh.position.y = this.homePosition.y;
      this.mesh.rotation.x = -Math.PI / 4;
    }
  }

  private performSwoopAttack(): void {
    console.log(`[Dragon] ${this.mesh.name} SWOOP ATTACK for 25 damage!`);
  }

  private performBreathAttack(): void {
    console.log(`[Dragon] ${this.mesh.name} BREATH ATTACK for 40 damage!`);
    
    const breathAnim = this.animationGroups.get('breath') || this.animationGroups.get('attack');
    if (breathAnim) {
      breathAnim.start(false, 1.0, breathAnim.from, breathAnim.to, false);
    }
  }

  protected onStateEnter(state: AIState): void {
    this.animationGroups.forEach((_, name) => {
      if (name !== 'fly' && name !== 'hover') {
        this.setAnimationWeight(name, 0);
      }
    });
    
    this.setAnimationWeight('fly', 1);
    
    switch (state) {
      case 'fly_idle':
        this.targetFlyHeight = this.flyHeight;
        break;
      case 'fly_circle':
        this.circleAngle = Math.atan2(
          this.mesh.position.z - this.circleCenter.z,
          this.mesh.position.x - this.circleCenter.x
        );
        break;
      case 'fly_swoop':
        this.swoopStartPosition = null;
        this.swoopProgress = 0;
        break;
      case 'fly_hover':
        break;
      case 'attack':
        this.isBreathingFire = false;
        break;
      case 'dead':
        this.stop();
        break;
    }
  }

  protected onStateExit(state: AIState): void {
    if (state === 'fly_swoop') {
      this.mesh.rotation.x = 0;
    }
    if (state === 'attack') {
      this.isBreathingFire = false;
    }
  }

  public takeDamage(amount: number): void {
    super.takeDamage(amount);
    
    if (this.state !== 'dead') {
      this.targetFlyHeight = this.flyHeight + this.flyHeightVariation;
      
      if (!this.target) {
        const player = this.findNearestTarget();
        if (player) {
          this.setTarget(player);
          this.setState('fly_swoop');
        }
      }
    }
  }

  public land(): void {
    this.targetFlyHeight = 0;
    console.log(`[Dragon] ${this.mesh.name} is landing...`);
  }

  public takeoff(): void {
    this.targetFlyHeight = this.flyHeight;
    console.log(`[Dragon] ${this.mesh.name} is taking off...`);
  }

  public setCircleCenter(position: BABYLON.Vector3): void {
    this.circleCenter = position.clone();
  }

  public getFlightHeight(): number {
    return this.currentFlyHeight;
  }
}
