// ─── Combat Controller ────────────────────────────────────────────────────
// Manages attack phases (startup/active/recovery), combos, blocking, stun.
// Ported from GrudgeStudioNPM CombatController patterns, TypeScript.

export type AttackPhase = 'startup' | 'active' | 'recovery' | 'combo';
export type CombatEventType = 'attackStart' | 'attackActive' | 'attackRecovery' | 'attackEnd' |
  'hit' | 'blocked' | 'blockStart' | 'blockEnd' | 'stunned' | 'stunEnd' | 'combo' | 'comboDropped';

export interface AttackConfig {
  damage: number;
  knockback: number;
  stunDuration: number;
  startup: number;
  active: number;
  recovery: number;
  cooldown: number;
  cancelable: boolean;
  comboNextWindow: number;
  comboChain: string[];
  canBlock: boolean;
  type: 'melee' | 'ranged' | 'spell';
  element: string;
}

interface ActiveAttack {
  name: string;
  phase: AttackPhase;
  timer: number;
  data: AttackConfig;
  nextAttack?: string;
}

type CombatListener = (...args: unknown[]) => void;

export class CombatController {
  private attacks: Map<string, AttackConfig> = new Map();

  isAttacking = false;
  isBlocking = false;
  isStunned = false;
  currentAttack: ActiveAttack | null = null;
  comboCounter = 0;
  comboTimer = 0;
  comboWindow: number;
  private comboBuffer: string[] = [];

  stunDuration = 0;
  attackCooldown = 0;
  blockCooldown = 0;

  private listeners: Map<CombatEventType, CombatListener[]> = new Map();

  constructor(options: { comboWindow?: number } = {}) {
    this.comboWindow = options.comboWindow ?? 0.5;
  }

  // ─── Event System ──────────────────────────────────────────────────────

  on(event: CombatEventType, callback: CombatListener): this {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
    return this;
  }

  off(event: CombatEventType, callback: CombatListener): this {
    const cbs = this.listeners.get(event);
    if (cbs) this.listeners.set(event, cbs.filter(cb => cb !== callback));
    return this;
  }

  private emit(event: CombatEventType, ...args: unknown[]) {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach(cb => cb(...args));
  }

  // ─── Registration ──────────────────────────────────────────────────────

  registerAttack(name: string, config: Partial<AttackConfig>): this {
    this.attacks.set(name, {
      damage: config.damage ?? 10,
      knockback: config.knockback ?? 5,
      stunDuration: config.stunDuration ?? 0.3,
      startup: config.startup ?? 0.1,
      active: config.active ?? 0.2,
      recovery: config.recovery ?? 0.3,
      cooldown: config.cooldown ?? 0.5,
      cancelable: config.cancelable ?? false,
      comboNextWindow: config.comboNextWindow ?? 0.3,
      comboChain: config.comboChain ?? [],
      canBlock: config.canBlock ?? true,
      type: config.type ?? 'melee',
      element: config.element ?? 'physical',
    });
    return this;
  }

  // ─── Actions ───────────────────────────────────────────────────────────

  attack(name: string): boolean {
    if (this.isStunned || this.attackCooldown > 0) return false;

    // Buffer combos during current attack
    if (this.isAttacking && this.currentAttack) {
      const current = this.attacks.get(this.currentAttack.name);
      if (current && current.cancelable && current.comboChain.includes(name)) {
        this.comboBuffer.push(name);
        return true;
      }
      return false;
    }

    const attackData = this.attacks.get(name);
    if (!attackData) return false;

    this.isAttacking = true;
    this.isBlocking = false;
    this.currentAttack = {
      name,
      phase: 'startup',
      timer: attackData.startup,
      data: attackData,
    };
    this.comboBuffer = [];
    this.emit('attackStart', name, attackData);
    return true;
  }

  block(active: boolean): boolean {
    if (this.isStunned || this.isAttacking) return false;

    const wasBlocking = this.isBlocking;
    this.isBlocking = active && this.blockCooldown <= 0;

    if (this.isBlocking && !wasBlocking) this.emit('blockStart');
    else if (!this.isBlocking && wasBlocking) this.emit('blockEnd');

    return this.isBlocking;
  }

  receiveHit(attackData: AttackConfig, attacker: unknown = null): { damage: number; knockback: number; stunDuration: number; blocked: boolean } {
    if (this.isBlocking && attackData.canBlock) {
      const blocked = {
        damage: attackData.damage * 0.1,
        knockback: attackData.knockback * 0.3,
        stunDuration: attackData.stunDuration * 0.2,
        blocked: true,
      };
      this.blockCooldown = 0.2;
      this.emit('blocked', blocked, attacker);
      return blocked;
    }

    const hit = {
      damage: attackData.damage,
      knockback: attackData.knockback,
      stunDuration: attackData.stunDuration,
      blocked: false,
    };
    this.applyStun(hit.stunDuration);
    this.emit('hit', hit, attacker);
    return hit;
  }

  applyStun(duration: number) {
    this.isStunned = true;
    this.stunDuration = duration;
    this.isAttacking = false;
    this.isBlocking = false;
    this.currentAttack = null;
    this.comboBuffer = [];
    this.emit('stunned', duration);
  }

  // ─── Update ────────────────────────────────────────────────────────────

  update(deltaTime: number): this {
    // Stun timer
    if (this.stunDuration > 0) {
      this.stunDuration -= deltaTime;
      if (this.stunDuration <= 0) {
        this.isStunned = false;
        this.emit('stunEnd');
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;
    if (this.blockCooldown > 0) this.blockCooldown -= deltaTime;

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.comboCounter = 0;
        this.emit('comboDropped');
      }
    }

    // Attack phase machine
    if (this.isAttacking && this.currentAttack) {
      this.currentAttack.timer -= deltaTime;

      if (this.currentAttack.timer <= 0) {
        switch (this.currentAttack.phase) {
          case 'startup':
            this.currentAttack.phase = 'active';
            this.currentAttack.timer = this.currentAttack.data.active;
            this.emit('attackActive', this.currentAttack.name, this.currentAttack.data);
            break;

          case 'active':
            this.currentAttack.phase = 'recovery';
            this.currentAttack.timer = this.currentAttack.data.recovery;
            this.emit('attackRecovery', this.currentAttack.name);

            // Check combo buffer
            if (this.comboBuffer.length > 0) {
              const nextAttack = this.comboBuffer.shift()!;
              if (this.currentAttack.data.comboChain.includes(nextAttack)) {
                this.currentAttack.timer = this.currentAttack.data.comboNextWindow;
                this.currentAttack.phase = 'combo';
                this.currentAttack.nextAttack = nextAttack;
              }
            }
            break;

          case 'combo': {
            const nextName = this.currentAttack.nextAttack!;
            this.endAttack();
            this.attack(nextName);
            break;
          }

          case 'recovery':
            this.endAttack();
            break;
        }
      }
    }

    return this;
  }

  private endAttack() {
    if (this.currentAttack) {
      this.attackCooldown = this.currentAttack.data.cooldown;
      this.emit('attackEnd', this.currentAttack.name);
    }
    this.isAttacking = false;
    this.currentAttack = null;
    this.comboBuffer = [];
  }

  incrementCombo() {
    this.comboCounter++;
    this.comboTimer = this.comboWindow;
    this.emit('combo', this.comboCounter);
  }

  getState() {
    return {
      isAttacking: this.isAttacking,
      isBlocking: this.isBlocking,
      isStunned: this.isStunned,
      currentAttack: this.currentAttack?.name ?? null,
      attackPhase: this.currentAttack?.phase ?? null,
      comboCounter: this.comboCounter,
      canAttack: !this.isStunned && !this.isAttacking && this.attackCooldown <= 0,
      canBlock: !this.isStunned && !this.isAttacking && this.blockCooldown <= 0,
    };
  }

  reset() {
    this.isAttacking = false;
    this.isBlocking = false;
    this.isStunned = false;
    this.currentAttack = null;
    this.comboCounter = 0;
    this.comboTimer = 0;
    this.comboBuffer = [];
    this.stunDuration = 0;
    this.attackCooldown = 0;
    this.blockCooldown = 0;
  }
}
