import * as BABYLON from '@babylonjs/core';

export interface CombatStats {
  maxHealth: number;
  health: number;
  maxStamina: number;
  stamina: number;
  staminaRegen: number;
  poise: number;
  maxPoise: number;
  poiseRegen: number;
  defense: number;
  attackPower: number;
}

export interface AttackData {
  name: string;
  damage: number;
  staminaCost: number;
  poiseDamage: number;
  range: number;
  windupTime: number;
  activeTime: number;
  recoveryTime: number;
  isCharge?: boolean;
  chargeMultiplier?: number;
}

export interface HitResult {
  hit: boolean;
  blocked: boolean;
  damage: number;
  staggered: boolean;
  guardBroken: boolean;
}

export type CombatEventType = 
  | 'damage_dealt' 
  | 'damage_taken' 
  | 'block_success' 
  | 'guard_broken' 
  | 'stagger' 
  | 'death'
  | 'stamina_depleted';

export interface CombatEvent {
  type: CombatEventType;
  source?: CombatEntity;
  target?: CombatEntity;
  damage?: number;
  attack?: AttackData;
}

export type CombatEventListener = (event: CombatEvent) => void;

export const PLAYER_ATTACKS: Record<string, AttackData> = {
  light: {
    name: 'Light Attack',
    damage: 15,
    staminaCost: 12,
    poiseDamage: 10,
    range: 2.5,
    windupTime: 0.2,
    activeTime: 0.3,
    recoveryTime: 0.4
  },
  heavy: {
    name: 'Heavy Attack',
    damage: 30,
    staminaCost: 25,
    poiseDamage: 25,
    range: 3.0,
    windupTime: 0.5,
    activeTime: 0.4,
    recoveryTime: 0.6
  },
  charge: {
    name: 'Charge Attack',
    damage: 20,
    staminaCost: 35,
    poiseDamage: 40,
    range: 3.5,
    windupTime: 0.8,
    activeTime: 0.5,
    recoveryTime: 0.7,
    isCharge: true,
    chargeMultiplier: 2.0
  }
};

export const ENEMY_ATTACKS: Record<string, AttackData> = {
  swipe: {
    name: 'Swipe',
    damage: 20,
    staminaCost: 0,
    poiseDamage: 15,
    range: 3.0,
    windupTime: 0.4,
    activeTime: 0.3,
    recoveryTime: 0.5
  },
  slam: {
    name: 'Slam',
    damage: 35,
    staminaCost: 0,
    poiseDamage: 30,
    range: 4.0,
    windupTime: 0.8,
    activeTime: 0.4,
    recoveryTime: 0.8
  },
  charge: {
    name: 'Bear Charge',
    damage: 45,
    staminaCost: 0,
    poiseDamage: 50,
    range: 5.0,
    windupTime: 1.0,
    activeTime: 0.6,
    recoveryTime: 1.0,
    isCharge: true
  }
};

export class CombatEntity {
  public mesh: BABYLON.AbstractMesh;
  public stats: CombatStats;
  public isBlocking: boolean = false;
  public isInvulnerable: boolean = false;
  public currentAttack: AttackData | null = null;
  public attackPhase: 'none' | 'windup' | 'active' | 'recovery' = 'none';
  public attackTimer: number = 0;
  public chargeTime: number = 0;
  
  private listeners: CombatEventListener[] = [];
  private staminaRegenDelay: number = 0;
  private poiseRegenDelay: number = 0;

  constructor(mesh: BABYLON.AbstractMesh, stats: Partial<CombatStats> = {}) {
    this.mesh = mesh;
    this.stats = {
      maxHealth: stats.maxHealth ?? 100,
      health: stats.health ?? stats.maxHealth ?? 100,
      maxStamina: stats.maxStamina ?? 100,
      stamina: stats.stamina ?? stats.maxStamina ?? 100,
      staminaRegen: stats.staminaRegen ?? 15,
      poise: stats.poise ?? stats.maxPoise ?? 50,
      maxPoise: stats.maxPoise ?? 50,
      poiseRegen: stats.poiseRegen ?? 10,
      defense: stats.defense ?? 0,
      attackPower: stats.attackPower ?? 1.0
    };
  }

  addEventListener(listener: CombatEventListener): void {
    this.listeners.push(listener);
  }

  removeEventListener(listener: CombatEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) this.listeners.splice(index, 1);
  }

  private emit(event: CombatEvent): void {
    this.listeners.forEach(l => l(event));
  }

  update(deltaTime: number): void {
    if (this.staminaRegenDelay > 0) {
      this.staminaRegenDelay -= deltaTime;
    } else if (this.stats.stamina < this.stats.maxStamina && !this.isBlocking) {
      this.stats.stamina = Math.min(
        this.stats.maxStamina, 
        this.stats.stamina + this.stats.staminaRegen * deltaTime
      );
    }

    if (this.poiseRegenDelay > 0) {
      this.poiseRegenDelay -= deltaTime;
    } else if (this.stats.poise < this.stats.maxPoise) {
      this.stats.poise = Math.min(
        this.stats.maxPoise, 
        this.stats.poise + this.stats.poiseRegen * deltaTime
      );
    }

    if (this.attackPhase !== 'none' && this.currentAttack) {
      this.attackTimer -= deltaTime;
      
      if (this.attackPhase === 'windup' && this.attackTimer <= 0) {
        this.attackPhase = 'active';
        this.attackTimer = this.currentAttack.activeTime;
      } else if (this.attackPhase === 'active' && this.attackTimer <= 0) {
        this.attackPhase = 'recovery';
        this.attackTimer = this.currentAttack.recoveryTime;
      } else if (this.attackPhase === 'recovery' && this.attackTimer <= 0) {
        this.attackPhase = 'none';
        this.currentAttack = null;
        this.chargeTime = 0;
      }
    }
  }

  canAttack(): boolean {
    return this.attackPhase === 'none' && this.stats.health > 0;
  }

  startAttack(attack: AttackData): boolean {
    if (!this.canAttack()) return false;
    if (this.stats.stamina < attack.staminaCost) {
      this.emit({ type: 'stamina_depleted', source: this });
      return false;
    }

    this.stats.stamina -= attack.staminaCost;
    this.staminaRegenDelay = 1.5;
    this.currentAttack = attack;
    this.attackPhase = 'windup';
    this.attackTimer = attack.windupTime;
    this.isBlocking = false;
    
    return true;
  }

  startChargeAttack(attack: AttackData): boolean {
    if (!attack.isCharge) return this.startAttack(attack);
    if (!this.canAttack()) return false;
    
    this.currentAttack = attack;
    this.attackPhase = 'windup';
    this.attackTimer = 9999;
    this.chargeTime = 0;
    this.isBlocking = false;
    
    return true;
  }

  releaseChargeAttack(): AttackData | null {
    if (!this.currentAttack?.isCharge || this.attackPhase !== 'windup') return null;
    
    const minChargeTime = this.currentAttack.windupTime;
    const chargeMultiplier = Math.min(
      this.currentAttack.chargeMultiplier ?? 2.0,
      1 + (this.chargeTime / minChargeTime)
    );
    
    if (this.stats.stamina < this.currentAttack.staminaCost) {
      this.attackPhase = 'none';
      this.currentAttack = null;
      this.emit({ type: 'stamina_depleted', source: this });
      return null;
    }

    this.stats.stamina -= this.currentAttack.staminaCost;
    this.staminaRegenDelay = 2.0;
    
    const chargedAttack: AttackData = {
      ...this.currentAttack,
      damage: Math.floor(this.currentAttack.damage * chargeMultiplier),
      poiseDamage: Math.floor(this.currentAttack.poiseDamage * chargeMultiplier)
    };
    
    this.attackPhase = 'active';
    this.attackTimer = this.currentAttack.activeTime;
    
    return chargedAttack;
  }

  isInActiveAttackPhase(): boolean {
    return this.attackPhase === 'active';
  }

  startBlock(): boolean {
    if (this.attackPhase !== 'none') return false;
    this.isBlocking = true;
    return true;
  }

  stopBlock(): void {
    this.isBlocking = false;
  }

  useStamina(amount: number): boolean {
    if (this.stats.stamina < amount) return false;
    this.stats.stamina -= amount;
    this.staminaRegenDelay = 1.0;
    return true;
  }

  receiveAttack(attacker: CombatEntity, attack: AttackData): HitResult {
    const result: HitResult = {
      hit: true,
      blocked: false,
      damage: 0,
      staggered: false,
      guardBroken: false
    };

    if (this.isInvulnerable || this.stats.health <= 0) {
      result.hit = false;
      return result;
    }

    const baseDamage = attack.damage * attacker.stats.attackPower;
    
    if (this.isBlocking) {
      const blockStaminaCost = attack.poiseDamage * 0.5;
      
      if (this.stats.stamina >= blockStaminaCost) {
        this.stats.stamina -= blockStaminaCost;
        this.staminaRegenDelay = 1.0;
        result.blocked = true;
        result.damage = Math.floor(baseDamage * 0.15);
        
        this.emit({ type: 'block_success', source: attacker, target: this, attack, damage: result.damage });
      } else {
        result.guardBroken = true;
        result.damage = Math.floor(baseDamage * 0.8);
        this.stats.stamina = 0;
        this.staminaRegenDelay = 2.5;
        this.isBlocking = false;
        
        this.emit({ type: 'guard_broken', source: attacker, target: this, attack, damage: result.damage });
      }
    } else {
      result.damage = Math.max(1, Math.floor(baseDamage - this.stats.defense));
      
      this.stats.poise -= attack.poiseDamage;
      this.poiseRegenDelay = 3.0;
      
      if (this.stats.poise <= 0) {
        result.staggered = true;
        this.stats.poise = this.stats.maxPoise * 0.5;
        this.emit({ type: 'stagger', source: attacker, target: this, attack, damage: result.damage });
      }
    }

    this.stats.health = Math.max(0, this.stats.health - result.damage);
    
    if (result.damage > 0) {
      this.emit({ type: 'damage_taken', source: attacker, target: this, attack, damage: result.damage });
      attacker.emit({ type: 'damage_dealt', source: attacker, target: this, attack, damage: result.damage });
    }

    if (this.stats.health <= 0) {
      this.emit({ type: 'death', target: this });
    }

    return result;
  }

  heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
  }

  isDead(): boolean {
    return this.stats.health <= 0;
  }

  getHealthPercent(): number {
    return this.stats.health / this.stats.maxHealth;
  }

  getStaminaPercent(): number {
    return this.stats.stamina / this.stats.maxStamina;
  }

  getPoisePercent(): number {
    return this.stats.poise / this.stats.maxPoise;
  }
}

export class CombatManager {
  private entities: Map<string, CombatEntity> = new Map();
  private scene: BABYLON.Scene;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  registerEntity(id: string, entity: CombatEntity): void {
    this.entities.set(id, entity);
  }

  unregisterEntity(id: string): void {
    this.entities.delete(id);
  }

  getEntity(id: string): CombatEntity | undefined {
    return this.entities.get(id);
  }

  update(deltaTime: number): void {
    this.entities.forEach(entity => entity.update(deltaTime));
  }

  checkHit(attacker: CombatEntity, attack: AttackData, targetIds?: string[]): Map<string, HitResult> {
    const results = new Map<string, HitResult>();
    
    const targets = targetIds 
      ? targetIds.map(id => ({ id, entity: this.entities.get(id) })).filter(t => t.entity)
      : Array.from(this.entities.entries()).map(([id, entity]) => ({ id, entity }));

    for (const { id, entity } of targets) {
      if (!entity || entity === attacker) continue;
      
      const distance = BABYLON.Vector3.Distance(
        attacker.mesh.position, 
        entity.mesh.position
      );
      
      if (distance <= attack.range) {
        const forward = attacker.mesh.getDirection(BABYLON.Axis.Z);
        const toTarget = entity.mesh.position.subtract(attacker.mesh.position).normalize();
        const dot = BABYLON.Vector3.Dot(forward, toTarget);
        
        if (dot > 0.3) {
          const result = entity.receiveAttack(attacker, attack);
          results.set(id, result);
        }
      }
    }

    return results;
  }

  clear(): void {
    this.entities.clear();
  }
}

let globalCombatManager: CombatManager | null = null;

export function getCombatManager(scene?: BABYLON.Scene): CombatManager {
  if (!globalCombatManager && scene) {
    globalCombatManager = new CombatManager(scene);
  }
  return globalCombatManager!;
}

export function resetCombatManager(): void {
  if (globalCombatManager) {
    globalCombatManager.clear();
  }
  globalCombatManager = null;
}
