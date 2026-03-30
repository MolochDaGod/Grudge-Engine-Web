import * as BABYLON from '@babylonjs/core';
import { AIBehavior, AIBehaviorOptions, AIState } from './ai-behaviors';
import { CombatEntity, ENEMY_ATTACKS, getCombatManager } from './combat-system';

export interface WarBearOptions extends AIBehaviorOptions {
  aggroRange?: number;
  attackCooldown?: number;
  roarChance?: number;
  maxHealth?: number;
}

export class WarBearBehavior extends AIBehavior {
  private aggroRange: number;
  private attackCooldown: number;
  private attackTimer: number = 0;
  private roarChance: number;
  private isAttacking: boolean = false;
  private currentAttack: 'attack00' | 'attack01' | 'activeSkill' = 'attack00';
  private patrolWaitTime: number = 0;
  private stunDuration: number = 0;
  
  public combatEntity: CombatEntity;
  private hasDealtDamage: boolean = false;

  constructor(options: WarBearOptions) {
    super({
      ...options,
      moveSpeed: options.moveSpeed ?? 4,
      detectionRange: options.detectionRange ?? 20,
      attackRange: options.attackRange ?? 3,
      patrolRadius: options.patrolRadius ?? 15,
    });
    
    this.aggroRange = options.aggroRange ?? 12;
    this.attackCooldown = options.attackCooldown ?? 2.0;
    this.roarChance = options.roarChance ?? 0.3;
    
    this.combatEntity = new CombatEntity(this.mesh, {
      maxHealth: options.maxHealth ?? 200,
      maxStamina: 100,
      staminaRegen: 0,
      maxPoise: 80,
      defense: 10,
      attackPower: 1.5
    });
    
    this.combatEntity.addEventListener((event) => {
      if (event.type === 'damage_taken') {
        console.log(`[WarBear] ${this.mesh.name} took ${event.damage} damage! HP: ${this.combatEntity.stats.health}/${this.combatEntity.stats.maxHealth}`);
        if (this.state !== 'attack') {
          this.playHitReaction();
        }
      }
      if (event.type === 'stagger') {
        console.log(`[WarBear] ${this.mesh.name} STAGGERED!`);
        this.stun(1.5);
      }
      if (event.type === 'death') {
        console.log(`[WarBear] ${this.mesh.name} DEFEATED!`);
        this.setState('dead');
      }
    });
  }
  
  public start(): void {
    super.start();
    const combatManager = getCombatManager(this.scene);
    combatManager.registerEntity(this.mesh.name, this.combatEntity);
  }
  
  public stop(): void {
    super.stop();
    const combatManager = getCombatManager(this.scene);
    combatManager.unregisterEntity(this.mesh.name);
  }
  
  private playHitReaction(): void {
    const hitAnim = this.animationGroups.get('hit');
    if (hitAnim) {
      hitAnim.start(false, 1.5, hitAnim.from, hitAnim.to, false);
    }
  }

  protected setupAnimations(groups: BABYLON.AnimationGroup[]): void {
    groups.forEach(ag => {
      const name = ag.name.toLowerCase();
      
      if (name.includes('stand') && !name.includes('lobby')) {
        this.animationGroups.set('idle', ag);
      }
      if (name.includes('lobbystand00')) {
        this.animationGroups.set('idle_alt', ag);
      }
      if (name.includes('move')) {
        this.animationGroups.set('walk', ag);
      }
      if (name.includes('attack00')) {
        this.animationGroups.set('attack00', ag);
      }
      if (name.includes('attack01')) {
        this.animationGroups.set('attack01', ag);
      }
      if (name.includes('activeskill') && !name.includes('return')) {
        this.animationGroups.set('activeSkill', ag);
      }
      if (name.includes('activeskill_return')) {
        this.animationGroups.set('activeSkill_return', ag);
      }
      if (name.includes('hit')) {
        this.animationGroups.set('hit', ag);
      }
      if (name.includes('stun')) {
        this.animationGroups.set('stun', ag);
      }
      if (name.includes('die')) {
        this.animationGroups.set('die', ag);
      }
      if (name.includes('lobbyintro')) {
        this.animationGroups.set('roar', ag);
      }
      
      this.animationGroups.set(name, ag);
    });
    
    console.log(`[WarBear] Loaded ${this.animationGroups.size} animations:`, 
      Array.from(this.animationGroups.keys()).join(', '));
  }

  protected updateState(deltaTime: number): void {
    this.attackTimer = Math.max(0, this.attackTimer - deltaTime);
    
    if (this.stunDuration > 0) {
      this.stunDuration -= deltaTime;
      if (this.stunDuration <= 0) {
        this.setState('idle');
      }
      return;
    }
    
    switch (this.state) {
      case 'idle':
        this.updateIdle(deltaTime);
        break;
      case 'patrol':
        this.updatePatrol(deltaTime);
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
        break;
    }
  }

  private updateIdle(deltaTime: number): void {
    const player = this.findNearestTarget();
    if (player) {
      const distance = BABYLON.Vector3.Distance(this.mesh.position, player.position);
      
      if (distance < this.aggroRange) {
        this.setTarget(player);
        
        if (Math.random() < this.roarChance) {
          this.playRoar();
        }
        
        this.setState('chase');
        return;
      }
    }
    
    if (this.stateTimer > 3 + Math.random() * 4) {
      this.patrolTarget = this.generatePatrolPoint();
      this.setState('patrol');
    }
  }

  private updatePatrol(deltaTime: number): void {
    const player = this.findNearestTarget();
    if (player) {
      const distance = BABYLON.Vector3.Distance(this.mesh.position, player.position);
      if (distance < this.aggroRange) {
        this.setTarget(player);
        this.setState('chase');
        return;
      }
    }
    
    if (this.patrolWaitTime > 0) {
      this.patrolWaitTime -= deltaTime;
      this.setAnimationWeight('idle', 1);
      this.setAnimationWeight('walk', 0);
      
      if (this.patrolWaitTime <= 0) {
        this.patrolTarget = this.generatePatrolPoint();
      }
      return;
    }
    
    if (this.patrolTarget) {
      const reached = this.moveTowards(this.patrolTarget, this.moveSpeed * 0.5, deltaTime);
      
      this.setAnimationWeight('walk', 1);
      this.setAnimationWeight('idle', 0);
      
      if (reached) {
        this.patrolWaitTime = 2 + Math.random() * 3;
      }
    }
    
    if (this.getDistanceToHome() > this.patrolRadius * 2) {
      this.setState('return');
    }
  }

  private updateChase(deltaTime: number): void {
    if (!this.target) {
      this.setState('return');
      return;
    }
    
    this.updateTarget();
    const distance = this.getDistanceToTarget();
    
    if (distance > this.detectionRange * 1.5) {
      this.setTarget(null);
      this.setState('return');
      return;
    }
    
    if (distance <= this.attackRange && this.attackTimer <= 0) {
      this.setState('attack');
      return;
    }
    
    this.moveTowards(this.target.position, this.moveSpeed, deltaTime);
    
    this.setAnimationWeight('walk', 1);
    this.setAnimationWeight('idle', 0);
  }

  private updateAttack(deltaTime: number): void {
    if (!this.target) {
      this.setState('idle');
      return;
    }
    
    this.lookAt(this.target.position);
    
    this.setAnimationWeight('walk', 0);
    this.setAnimationWeight('idle', 0);
    
    if (!this.isAttacking) {
      this.isAttacking = true;
      this.performAttack();
    }
    
    this.tryDealDamage();
    
    const attackDuration = this.currentAttack === 'activeSkill' ? 2.5 : 1.5;
    
    if (this.stateTimer >= attackDuration) {
      this.isAttacking = false;
      this.attackTimer = this.attackCooldown;
      
      this.updateTarget();
      const distance = this.getDistanceToTarget();
      
      if (distance > this.attackRange) {
        this.setState('chase');
      } else if (distance > this.detectionRange * 1.5) {
        this.setTarget(null);
        this.setState('return');
      } else {
        this.setState('chase');
      }
    }
  }

  private performAttack(): void {
    const rand = Math.random();
    this.hasDealtDamage = false;
    
    if (rand < 0.2 && this.animationGroups.has('activeSkill')) {
      this.currentAttack = 'activeSkill';
      this.setAnimationWeight('activeSkill', 1);
      console.log(`[WarBear] ${this.mesh.name} uses ACTIVE SKILL!`);
    } else if (rand < 0.6 && this.animationGroups.has('attack01')) {
      this.currentAttack = 'attack01';
      this.setAnimationWeight('attack01', 1);
      this.setAnimationWeight('attack00', 0);
    } else {
      this.currentAttack = 'attack00';
      this.setAnimationWeight('attack00', 1);
      this.setAnimationWeight('attack01', 0);
    }
  }
  
  private tryDealDamage(): void {
    if (this.hasDealtDamage || !this.target) return;
    
    const attackHitTime = this.currentAttack === 'activeSkill' ? 0.8 : 0.5;
    if (this.stateTimer < attackHitTime) return;
    
    this.hasDealtDamage = true;
    
    const distance = this.getDistanceToTarget();
    if (distance > this.attackRange + 1) return;
    
    const combatManager = getCombatManager(this.scene);
    const playerEntity = combatManager.getEntity('player');
    if (!playerEntity) return;
    
    const attack = this.currentAttack === 'activeSkill' ? ENEMY_ATTACKS.charge : ENEMY_ATTACKS.swipe;
    const result = playerEntity.receiveAttack(this.combatEntity, attack);
    
    if (result.hit) {
      if (result.blocked) {
        console.log(`[WarBear] Attack blocked! Chip damage: ${result.damage}`);
      } else {
        console.log(`[WarBear] ${this.mesh.name} attacks for ${result.damage} damage!`);
      }
    }
  }

  private updateReturn(deltaTime: number): void {
    const reached = this.moveTowards(this.homePosition, this.moveSpeed * 0.7, deltaTime);
    
    this.setAnimationWeight('walk', 1);
    this.setAnimationWeight('idle', 0);
    
    const player = this.findNearestTarget();
    if (player) {
      const distance = BABYLON.Vector3.Distance(this.mesh.position, player.position);
      if (distance < this.aggroRange * 0.7) {
        this.setTarget(player);
        this.setState('chase');
        return;
      }
    }
    
    if (reached) {
      this.setState('idle');
    }
  }

  private playRoar(): void {
    const roarAnim = this.animationGroups.get('roar');
    if (roarAnim) {
      roarAnim.start(false, 1.0, roarAnim.from, roarAnim.to, false);
      console.log(`[WarBear] ${this.mesh.name} ROARS!`);
    }
  }

  protected onStateEnter(state: AIState): void {
    this.animationGroups.forEach((_, name) => {
      this.setAnimationWeight(name, 0);
    });
    
    switch (state) {
      case 'idle':
        this.setAnimationWeight('idle', 1);
        break;
      case 'patrol':
        this.patrolTarget = this.generatePatrolPoint();
        break;
      case 'chase':
        break;
      case 'attack':
        this.isAttacking = false;
        break;
      case 'return':
        break;
      case 'dead':
        this.setAnimationWeight('die', 1);
        const dieAnim = this.animationGroups.get('die');
        if (dieAnim) {
          dieAnim.start(false, 1.0, dieAnim.from, dieAnim.to, false);
        }
        break;
    }
  }

  protected onStateExit(state: AIState): void {
    if (state === 'attack') {
      this.setAnimationWeight('attack00', 0);
      this.setAnimationWeight('attack01', 0);
      this.setAnimationWeight('activeSkill', 0);
    }
  }

  public takeDamage(amount: number): void {
    super.takeDamage(amount);
    
    if (this.state !== 'dead') {
      const hitAnim = this.animationGroups.get('hit');
      if (hitAnim) {
        hitAnim.start(false, 1.0, hitAnim.from, hitAnim.to, false);
      }
      
      if (!this.target) {
        const player = this.findNearestTarget();
        if (player) {
          this.setTarget(player);
          this.setState('chase');
        }
      }
    }
  }

  public stun(duration: number): void {
    this.stunDuration = duration;
    const stunAnim = this.animationGroups.get('stun');
    if (stunAnim) {
      this.setAnimationWeight('stun', 1);
    }
    console.log(`[WarBear] ${this.mesh.name} is STUNNED for ${duration}s!`);
  }
}
