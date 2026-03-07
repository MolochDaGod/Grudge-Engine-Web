// ─── Damage System ────────────────────────────────────────────────────────
// Centralized damage/heal pipeline with entity registry, resistances,
// armor, invincibility, crits, and modifier hooks.
// Ported from GrudgeStudioNPM DamageSystem patterns, TypeScript.

type DamageListener = (...args: unknown[]) => void;
type DamageEventType = 'damage' | 'death' | 'heal' | 'revive' | 'invincibilityStart' | 'invincibilityEnd' | 'entityRegistered' | 'entityUnregistered' | 'reset';

export interface DamageEntity {
  id: string;
  maxHealth: number;
  health: number;
  maxArmor: number;
  armor: number;
  resistances: Map<string, number>;
  weaknesses: Map<string, number>;
  invincible: boolean;
  invincibilityTimer: number;
  isDead: boolean;
  team: string;
  data: Record<string, unknown>;
}

export interface DamageResult {
  target: string;
  source: string | null;
  rawDamage: number;
  finalDamage: number;
  healthDamage: number;
  armorDamage: number;
  element: string;
  isCritical: boolean;
  previousHealth: number;
  currentHealth: number;
  isDead: boolean;
}

export interface HealResult {
  target: string;
  rawHeal: number;
  finalHeal: number;
  previousHealth: number;
  currentHealth: number;
  overheal: number;
}

export interface DamageOptions {
  element?: string;
  source?: string | null;
  critical?: boolean;
  critMultiplier?: number;
  ignoreArmor?: boolean;
  armorPenetration?: number;
}

type DamageModifier = (damage: number, target: DamageEntity, options: DamageOptions) => number;
type HealModifier = (amount: number, target: DamageEntity, options: Record<string, unknown>) => number;

export class DamageSystem {
  private entities: Map<string, DamageEntity> = new Map();
  private damageModifiers: DamageModifier[] = [];
  private healModifiers: HealModifier[] = [];
  private globalResistances: Map<string, number> = new Map();
  private globalWeaknesses: Map<string, number> = new Map();
  private listeners: Map<DamageEventType, DamageListener[]> = new Map();

  // ─── Event System ──────────────────────────────────────────────────────

  on(event: DamageEventType, callback: DamageListener): this {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
    return this;
  }

  off(event: DamageEventType, callback: DamageListener): this {
    const cbs = this.listeners.get(event);
    if (cbs) this.listeners.set(event, cbs.filter(cb => cb !== callback));
    return this;
  }

  private emit(event: DamageEventType, ...args: unknown[]) {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach(cb => cb(...args));
  }

  // ─── Entity Management ─────────────────────────────────────────────────

  registerEntity(id: string, options: {
    maxHealth?: number; health?: number; maxArmor?: number; armor?: number;
    resistances?: Record<string, number>; weaknesses?: Record<string, number>;
    invincible?: boolean; team?: string; data?: Record<string, unknown>;
  } = {}): DamageEntity {
    const entity: DamageEntity = {
      id,
      maxHealth: options.maxHealth ?? 100,
      health: options.health ?? options.maxHealth ?? 100,
      maxArmor: options.maxArmor ?? 0,
      armor: options.armor ?? options.maxArmor ?? 0,
      resistances: new Map(Object.entries(options.resistances ?? {})),
      weaknesses: new Map(Object.entries(options.weaknesses ?? {})),
      invincible: options.invincible ?? false,
      invincibilityTimer: 0,
      isDead: false,
      team: options.team ?? 'neutral',
      data: options.data ?? {},
    };
    this.entities.set(id, entity);
    this.emit('entityRegistered', id, entity);
    return entity;
  }

  unregisterEntity(id: string) {
    this.entities.delete(id);
    this.emit('entityUnregistered', id);
  }

  getEntity(id: string): DamageEntity | undefined {
    return this.entities.get(id);
  }

  // ─── Damage ────────────────────────────────────────────────────────────

  applyDamage(targetId: string, damage: number, options: DamageOptions = {}): DamageResult | null {
    const target = this.entities.get(targetId);
    if (!target) return null;
    if (target.isDead || target.invincible || target.invincibilityTimer > 0) return null;

    let finalDamage = damage;
    const element = options.element ?? 'physical';
    const source = options.source ?? null;
    const isCritical = options.critical ?? false;

    // Element resistances / weaknesses
    if (target.resistances.has(element)) {
      finalDamage *= (1 - target.resistances.get(element)!);
    }
    if (target.weaknesses.has(element)) {
      finalDamage *= (1 + target.weaknesses.get(element)!);
    }
    if (this.globalResistances.has(element)) {
      finalDamage *= (1 - this.globalResistances.get(element)!);
    }
    if (this.globalWeaknesses.has(element)) {
      finalDamage *= (1 + this.globalWeaknesses.get(element)!);
    }

    // Modifier pipeline
    for (const modifier of this.damageModifiers) {
      finalDamage = modifier(finalDamage, target, options);
    }

    // Crits
    if (isCritical) {
      finalDamage *= options.critMultiplier ?? 2;
    }

    finalDamage = Math.max(0, Math.round(finalDamage));

    // Armor absorption
    let armorDamage = 0;
    let healthDamage = finalDamage;

    if (target.armor > 0 && !options.ignoreArmor) {
      const armorAbsorb = options.armorPenetration
        ? finalDamage * (1 - options.armorPenetration)
        : finalDamage;
      armorDamage = Math.min(target.armor, armorAbsorb);
      target.armor -= armorDamage;
      healthDamage = finalDamage - armorDamage;
    }

    const previousHealth = target.health;
    target.health = Math.max(0, target.health - healthDamage);

    const result: DamageResult = {
      target: targetId,
      source,
      rawDamage: damage,
      finalDamage,
      healthDamage,
      armorDamage,
      element,
      isCritical,
      previousHealth,
      currentHealth: target.health,
      isDead: target.health <= 0,
    };

    this.emit('damage', result);

    if (result.isDead) {
      target.isDead = true;
      this.emit('death', targetId, source);
    }

    return result;
  }

  // ─── Healing ───────────────────────────────────────────────────────────

  applyHeal(targetId: string, amount: number, options: { revive?: boolean } = {}): HealResult | null {
    const target = this.entities.get(targetId);
    if (!target) return null;
    if (target.isDead && !options.revive) return null;

    let finalHeal = amount;
    for (const modifier of this.healModifiers) {
      finalHeal = modifier(finalHeal, target, options);
    }

    const previousHealth = target.health;

    if (options.revive && target.isDead) {
      target.isDead = false;
      target.health = Math.min(target.maxHealth, finalHeal);
      this.emit('revive', targetId, target.health);
    } else {
      target.health = Math.min(target.maxHealth, target.health + finalHeal);
    }

    const result: HealResult = {
      target: targetId,
      rawHeal: amount,
      finalHeal: target.health - previousHealth,
      previousHealth,
      currentHealth: target.health,
      overheal: finalHeal - (target.health - previousHealth),
    };

    this.emit('heal', result);
    return result;
  }

  // ─── Invincibility ─────────────────────────────────────────────────────

  setInvincible(targetId: string, duration: number) {
    const target = this.entities.get(targetId);
    if (!target) return;
    target.invincibilityTimer = duration;
    this.emit('invincibilityStart', targetId, duration);
  }

  // ─── Update ────────────────────────────────────────────────────────────

  update(deltaTime: number) {
    for (const [id, entity] of this.entities) {
      if (entity.invincibilityTimer > 0) {
        entity.invincibilityTimer -= deltaTime;
        if (entity.invincibilityTimer <= 0) {
          entity.invincibilityTimer = 0;
          this.emit('invincibilityEnd', id);
        }
      }
    }
  }

  // ─── Modifiers ─────────────────────────────────────────────────────────

  addDamageModifier(modifier: DamageModifier): () => void {
    this.damageModifiers.push(modifier);
    return () => {
      const index = this.damageModifiers.indexOf(modifier);
      if (index > -1) this.damageModifiers.splice(index, 1);
    };
  }

  addHealModifier(modifier: HealModifier): () => void {
    this.healModifiers.push(modifier);
    return () => {
      const index = this.healModifiers.indexOf(modifier);
      if (index > -1) this.healModifiers.splice(index, 1);
    };
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  getHealthPercentage(targetId: string): number {
    const target = this.entities.get(targetId);
    if (!target) return 0;
    return target.health / target.maxHealth;
  }

  isAlive(targetId: string): boolean {
    const target = this.entities.get(targetId);
    return !!target && !target.isDead;
  }

  getEntitiesByTeam(team: string): DamageEntity[] {
    const result: DamageEntity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.team === team) result.push(entity);
    }
    return result;
  }

  reset() {
    for (const entity of this.entities.values()) {
      entity.health = entity.maxHealth;
      entity.armor = entity.maxArmor;
      entity.isDead = false;
      entity.invincibilityTimer = 0;
    }
    this.emit('reset');
  }

  dispose() {
    this.entities.clear();
    this.damageModifiers = [];
    this.healModifiers = [];
    this.listeners.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const damageSystem = new DamageSystem();
